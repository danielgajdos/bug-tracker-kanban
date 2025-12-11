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
const { ConfidentialClientApplication } = require('@azure/msal-node');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ["https://itwo.railway.app", process.env.CLIENT_URL]
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
  'daniel.gajdos@external.issworld.com',
  'marian.fedoronko@external.issworld.com'
];

// Microsoft Auth Configuration
const msalConfig = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID || 'your-client-id',
    clientSecret: process.env.AZURE_CLIENT_SECRET || 'your-client-secret',
    authority: 'https://login.microsoftonline.com/common'
  }
};

const cca = new ConfidentialClientApplication(msalConfig);

// Auth middleware
const requireAuth = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.status(401).json({ error: 'Authentication required' });
  }
};

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ["https://itwo.up.railway.app", process.env.CLIENT_URL]
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
app.get('/auth/login', (req, res) => {
  const authCodeUrlParameters = {
    scopes: ['user.read'],
    redirectUri: `${req.protocol}://${req.get('host')}/auth/callback`,
  };

  cca.getAuthCodeUrl(authCodeUrlParameters).then((response) => {
    res.redirect(response);
  }).catch((error) => {
    console.error('Auth URL error:', error);
    res.status(500).json({ error: 'Authentication error' });
  });
});

app.get('/auth/callback', (req, res) => {
  const tokenRequest = {
    code: req.query.code,
    scopes: ['user.read'],
    redirectUri: `${req.protocol}://${req.get('host')}/auth/callback`,
  };

  cca.acquireTokenByCode(tokenRequest).then((response) => {
    // Get user info from token
    const userEmail = response.account.username;
    
    // Check if user is in whitelist
    if (!ALLOWED_USERS.includes(userEmail)) {
      return res.status(403).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>Access Denied</h2>
            <p>Your account (${userEmail}) is not authorized to access this application.</p>
            <p>Please contact an administrator if you believe this is an error.</p>
          </body>
        </html>
      `);
    }

    // Store user in session
    req.session.user = {
      email: userEmail,
      name: response.account.name || userEmail,
      id: response.account.homeAccountId
    };

    res.redirect('/');
  }).catch((error) => {
    console.error('Token acquisition error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  });
});

app.get('/auth/user', (req, res) => {
  if (req.session.user) {
    res.json(req.session.user);
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

app.post('/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
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
  const { title, description, priority, reporter_name, reporter_email } = req.body;
  const id = uuidv4();
  
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
  const { author, content } = req.body;
  const commentId = uuidv4();
  
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