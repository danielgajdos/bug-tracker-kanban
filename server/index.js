const express = require('express');
const cors = require('cors');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const { Server } = require('socket.io');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ["https://itwodevqa.up.railway.app", "https://itwo.up.railway.app", process.env.CLIENT_URL]
      : "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 3001;

// Trust Railway proxy
app.set('trust proxy', 1);

// Whitelisted users
const ALLOWED_USERS = [
  'daniel.gajdos@gmail.com',
  'marianext244@gmail.com'
];

// Google Auth Configuration
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || 'your-google-client-id',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret',
  callbackURL: "/auth/google/callback"
}, (accessToken, refreshToken, profile, done) => {
  const userEmail = profile.emails[0].value;
  
  // Check if user is in whitelist
  if (!ALLOWED_USERS.includes(userEmail)) {
    return done(null, false, { message: 'Access denied' });
  }
  
  const user = {
    id: profile.id,
    email: userEmail,
    name: profile.displayName || userEmail,
    picture: profile.photos[0]?.value
  };
  
  return done(null, user);
}));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Auth middleware
const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    next();
  } else {
    res.status(401).json({ error: 'Authentication required' });
  }
};

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ["https://itwodevqa.up.railway.app", "https://itwo.up.railway.app", process.env.CLIENT_URL]
    : "http://localhost:5173",
  credentials: true
}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(passport.initialize());
app.use(passport.session());
app.use('/uploads', express.static('uploads'));
app.use(express.static(path.join(__dirname, '../client/dist')));

// Create uploads directory
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Database setup
const db = new sqlite3.Database('bugtracker.db');

// Initialize database tables
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS bugs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'reported',
    priority TEXT DEFAULT 'medium',
    reporter_name TEXT NOT NULL,
    reporter_email TEXT NOT NULL,
    assignee TEXT,
    screenshots TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    bug_id TEXT NOT NULL,
    author TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bug_id) REFERENCES bugs (id)
  )`);
});

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Auth Routes
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/failed' }),
  (req, res) => {
    res.redirect('/');
  }
);

app.get('/auth/failed', (req, res) => {
  res.status(403).send(`
    <html>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h2>Access Denied</h2>
        <p>Your Google account is not authorized to access this application.</p>
        <p>Please contact an administrator if you believe this is an error.</p>
        <a href="/" style="color: #3b82f6; text-decoration: none;">← Back to Login</a>
      </body>
    </html>
  `);
});

app.get('/auth/user', (req, res) => {
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

app.post('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// Upload image from clipboard
app.post('/api/upload-image', requireAuth, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image provided' });
  }
  
  res.json({ 
    url: `/uploads/${req.file.filename}`,
    filename: req.file.filename
  });
});

// Delete bug (only for Reported status)
app.delete('/api/bugs/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  
  // First check if bug exists and is in 'reported' status
  db.get('SELECT * FROM bugs WHERE id = ?', [id], (err, bug) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!bug) {
      res.status(404).json({ error: 'Bug not found' });
      return;
    }
    
    if (bug.status !== 'reported') {
      res.status(403).json({ error: 'Can only delete bugs in Reported status' });
      return;
    }
    
    // Delete comments first
    db.run('DELETE FROM comments WHERE bug_id = ?', [id], (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      // Delete the bug
      db.run('DELETE FROM bugs WHERE id = ?', [id], function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        
        io.emit('bugDeleted', { id });
        res.json({ message: 'Bug deleted successfully' });
      });
    });
  });
});

// API Routes
app.get('/api/bugs', requireAuth, (req, res) => {
  db.all('SELECT * FROM bugs ORDER BY created_at DESC', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Parse screenshots JSON
    const bugs = rows.map(bug => ({
      ...bug,
      screenshots: bug.screenshots ? JSON.parse(bug.screenshots) : []
    }));
    
    res.json(bugs);
  });
});

app.post('/api/bugs', requireAuth, upload.array('screenshots', 5), (req, res) => {
  const { title, description, priority } = req.body;
  const id = uuidv4();
  
  // Use authenticated user's info
  const reporter_name = req.user.name;
  const reporter_email = req.user.email;
  
  const screenshots = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
  
  const stmt = db.prepare(`
    INSERT INTO bugs (id, title, description, priority, reporter_name, reporter_email, screenshots)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run([
    id, title, description, priority, reporter_name, reporter_email, 
    JSON.stringify(screenshots)
  ], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    const newBug = {
      id,
      title,
      description,
      status: 'reported',
      priority,
      reporter_name,
      reporter_email,
      assignee: null,
      screenshots,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    io.emit('bugCreated', newBug);
    res.json(newBug);
  });
  
  stmt.finalize();
});

app.put('/api/bugs/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { status, assignee, priority } = req.body;
  
  const stmt = db.prepare(`
    UPDATE bugs 
    SET status = ?, assignee = ?, priority = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  
  stmt.run([status, assignee, priority, id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (this.changes === 0) {
      res.status(404).json({ error: 'Bug not found' });
      return;
    }
    
    // Get updated bug
    db.get('SELECT * FROM bugs WHERE id = ?', [id], (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      const updatedBug = {
        ...row,
        screenshots: row.screenshots ? JSON.parse(row.screenshots) : []
      };
      
      io.emit('bugUpdated', updatedBug);
      res.json(updatedBug);
    });
  });
  
  stmt.finalize();
});

app.get('/api/bugs/:id/comments', requireAuth, (req, res) => {
  const { id } = req.params;
  
  db.all('SELECT * FROM comments WHERE bug_id = ? ORDER BY created_at ASC', [id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/bugs/:id/comments', requireAuth, (req, res) => {
  const { id } = req.params;
  const { content } = req.body;
  const commentId = uuidv4();
  
  // Use authenticated user's info
  const author = req.user.name;
  
  const stmt = db.prepare(`
    INSERT INTO comments (id, bug_id, author, content)
    VALUES (?, ?, ?, ?)
  `);
  
  stmt.run([commentId, id, author, content], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    const newComment = {
      id: commentId,
      bug_id: id,
      author,
      content,
      created_at: new Date().toISOString()
    };
    
    io.emit('commentAdded', newComment);
    res.json(newComment);
  });
  
  stmt.finalize();
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});