const express = require('express');
const cors = require('cors');
const multer = require('multer');
const mysql = require('mysql2/promise');
const { Server } = require('socket.io');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const XLSX = require('xlsx');
const { BotFrameworkAdapter } = require('botbuilder');
const TeamsIntegration = require('./teams-integration');
const TeamsBugBot = require('./teams-bot');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ["https://itwodevqa.up.railway.app", "https://itwo.up.railway.app", "https://itwo.duckdns.org", process.env.CLIENT_URL]
      : "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 3001;

// Trust Railway proxy
app.set('trust proxy', 1);

// Health check endpoint (must be first, before any middleware)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// Force HTTPS in production (but allow health checks)
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    // Skip HTTPS redirect for health check endpoint
    if (req.path === '/health') {
      return next();
    }
    
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });

  // Add security headers
  app.use((req, res, next) => {
    res.setHeader('Strict-Transport-Security', 'max-age=300; includeSubDomains'); // Reduced max-age for easier reset
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });
}

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
    ? ["https://itwodevqa.up.railway.app", "https://itwo.up.railway.app", "https://itwo.duckdns.org", process.env.CLIENT_URL]
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
const { db, initializeDatabase, getNextBugNumber } = require('./database');

// Initialize database
initializeDatabase();

// Teams Integration Setup
let teamsIntegration = null;
let teamsBot = null;
let botAdapter = null;

if (process.env.TEAMS_APP_ID && process.env.TEAMS_APP_PASSWORD) {
  // Initialize Bot Framework Adapter
  botAdapter = new BotFrameworkAdapter({
    appId: process.env.TEAMS_APP_ID,
    appPassword: process.env.TEAMS_APP_PASSWORD
  });

  // Initialize Teams Integration
  teamsIntegration = new TeamsIntegration({
    clientId: process.env.TEAMS_CLIENT_ID || process.env.TEAMS_APP_ID,
    clientSecret: process.env.TEAMS_CLIENT_SECRET || process.env.TEAMS_APP_PASSWORD,
    tenantId: process.env.TEAMS_TENANT_ID || 'common'
  });

  // Initialize Teams Bot with bug creation callback
  teamsBot = new TeamsBugBot(teamsIntegration, async (bugData) => {
    try {
      const id = uuidv4();
      const bugNumber = await getNextBugNumber();
      
      const screenshots = bugData.screenshots || [];
      
      await db.execute(`
        INSERT INTO bugs (id, bug_number, title, description, priority, reporter_name, reporter_email, screenshots)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [id, bugNumber, bugData.title, bugData.description, bugData.priority, bugData.reporter_name, bugData.reporter_email, JSON.stringify(screenshots)]);
      
      const newBug = {
        id,
        bug_number: bugNumber,
        title: bugData.title,
        description: bugData.description,
        status: 'reported',
        priority: bugData.priority,
        reporter_name: bugData.reporter_name,
        reporter_email: bugData.reporter_email,
        assignee: null,
        screenshots,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      io.emit('bugCreated', newBug);
      return newBug;
    } catch (error) {
      console.error('Error creating bug from Teams:', error);
      return null;
    }
  });

  console.log('Teams integration initialized');
} else {
  console.log('Teams integration disabled - missing environment variables');
}

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
app.delete('/api/bugs/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // First check if bug exists and is in 'reported' status
    const [rows] = await db.execute('SELECT * FROM bugs WHERE id = ?', [id]);
    const bug = rows[0];
    
    if (!bug) {
      res.status(404).json({ error: 'Bug not found' });
      return;
    }
    
    if (bug.status !== 'reported' && bug.status !== 'returned') {
      res.status(403).json({ error: 'Can only delete bugs in Reported or Returned status' });
      return;
    }
    
    // Delete comments first (CASCADE should handle this, but let's be explicit)
    await db.execute('DELETE FROM comments WHERE bug_id = ?', [id]);
    
    // Delete the bug
    await db.execute('DELETE FROM bugs WHERE id = ?', [id]);
    
    io.emit('bugDeleted', { id });
    res.json({ message: 'Bug deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Teams Bot Endpoint
if (botAdapter && teamsBot) {
  app.post('/api/teams/messages', (req, res) => {
    botAdapter.processActivity(req, res, async (context) => {
      await teamsBot.run(context);
    });
  });

  // Teams webhook validation endpoint
  app.post('/api/teams/webhook', express.raw({ type: 'application/json' }), (req, res) => {
    const validationToken = req.query.validationToken;
    
    if (validationToken) {
      // Webhook validation
      res.status(200).send(validationToken);
      return;
    }

    // Process webhook notification
    try {
      const notification = JSON.parse(req.body);
      console.log('Teams webhook notification:', notification);
      
      // Process the notification (this would trigger message processing)
      // Implementation depends on your specific webhook setup
      
      res.status(200).send('OK');
    } catch (error) {
      console.error('Error processing Teams webhook:', error);
      res.status(400).send('Bad Request');
    }
  });
}

// API Routes
app.get('/api/bugs', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM bugs ORDER BY created_at DESC');
    
    // Parse screenshots JSON
    const bugs = rows.map(bug => ({
      ...bug,
      screenshots: bug.screenshots || []
    }));
    
    res.json(bugs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/bugs', requireAuth, upload.array('screenshots', 5), async (req, res) => {
  try {
    const { title, description, priority } = req.body;
    const id = uuidv4();
    const bugNumber = await getNextBugNumber();
    
    // Use authenticated user's info
    const reporter_name = req.user.name;
    const reporter_email = req.user.email;
    
    const screenshots = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];
    
    await db.execute(`
      INSERT INTO bugs (id, bug_number, title, description, priority, reporter_name, reporter_email, screenshots)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, bugNumber, title, description, priority, reporter_name, reporter_email, JSON.stringify(screenshots)]);
    
    const newBug = {
      id,
      bug_number: bugNumber,
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
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/bugs/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, assignee, priority } = req.body;
    
    const [result] = await db.execute(`
      UPDATE bugs 
      SET title = ?, description = ?, status = ?, assignee = ?, priority = ?
      WHERE id = ?
    `, [title, description, status, assignee, priority, id]);
    
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Bug not found' });
      return;
    }
    
    // Get updated bug
    const [rows] = await db.execute('SELECT * FROM bugs WHERE id = ?', [id]);
    const updatedBug = {
      ...rows[0],
      screenshots: rows[0].screenshots || []
    };
    
    io.emit('bugUpdated', updatedBug);
    res.json(updatedBug);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/bugs/:id/comments', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute('SELECT * FROM comments WHERE bug_id = ? ORDER BY created_at ASC', [id]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/bugs/:id/comments', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const commentId = uuidv4();
    
    // Use authenticated user's info
    const author = req.user.name;
    
    await db.execute(`
      INSERT INTO comments (id, bug_id, author, content)
      VALUES (?, ?, ?, ?)
    `, [commentId, id, author, content]);
    
    const newComment = {
      id: commentId,
      bug_id: id,
      author,
      content,
      created_at: new Date().toISOString()
    };
    
    io.emit('commentAdded', newComment);
    res.json(newComment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update comment
app.put('/api/bugs/:bugId/comments/:commentId', requireAuth, async (req, res) => {
  try {
    const { bugId, commentId } = req.params;
    const { content } = req.body;
    
    // First check if the comment exists and belongs to the current user
    const [rows] = await db.execute('SELECT * FROM comments WHERE id = ? AND bug_id = ?', [commentId, bugId]);
    const comment = rows[0];
    
    if (!comment) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }
    
    // Check if the comment belongs to the current user
    if (comment.author !== req.user.name) {
      res.status(403).json({ error: 'You can only edit your own comments' });
      return;
    }
    
    // Update the comment
    await db.execute(`
      UPDATE comments 
      SET content = ?
      WHERE id = ? AND bug_id = ?
    `, [content, commentId, bugId]);
    
    const updatedComment = {
      ...comment,
      content,
      updated_at: new Date().toISOString()
    };
    
    io.emit('commentUpdated', updatedComment);
    res.json(updatedComment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export bugs to Excel
app.get('/api/export/excel', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        b.id,
        b.title,
        b.description,
        b.status,
        b.priority,
        b.reporter_name,
        b.reporter_email,
        b.assignee,
        b.created_at,
        b.updated_at,
        GROUP_CONCAT(c.content SEPARATOR ' | ') as comments
      FROM bugs b
      LEFT JOIN comments c ON b.id = c.bug_id
      GROUP BY b.id
      ORDER BY b.created_at DESC
    `);

    // Prepare data for Excel
    const excelData = rows.map(bug => ({
      'Bug ID': bug.bug_number || bug.id,
      'Title': bug.title,
      'Description': bug.description || '',
      'Status': bug.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      'Priority': bug.priority.charAt(0).toUpperCase() + bug.priority.slice(1),
      'Reporter Name': bug.reporter_name,
      'Reporter Email': bug.reporter_email,
      'Created Date': new Date(bug.created_at).toLocaleDateString(),
      'Updated Date': new Date(bug.updated_at).toLocaleDateString(),
      'Comments': bug.comments || 'No comments'
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Auto-size columns
    const colWidths = [
      { wch: 15 }, // Bug ID
      { wch: 30 }, // Title
      { wch: 50 }, // Description
      { wch: 12 }, // Status
      { wch: 12 }, // Priority
      { wch: 20 }, // Reporter Name
      { wch: 25 }, // Reporter Email
      { wch: 12 }, // Created Date
      { wch: 12 }, // Updated Date
      { wch: 40 }  // Comments
    ];
    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Bug Reports');

    // Generate Excel file
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Set headers for file download
    const filename = `bug-reports-${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    
    res.send(excelBuffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});