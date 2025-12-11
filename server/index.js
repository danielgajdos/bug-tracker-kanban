const express = require('express');
const cors = require('cors');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const { Server } = require('socket.io');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
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

// Middleware
app.use(cors());
app.use(express.json());
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

// API Routes
app.get('/api/bugs', (req, res) => {
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

app.post('/api/bugs', upload.array('screenshots', 5), (req, res) => {
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

app.put('/api/bugs/:id', (req, res) => {
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

app.get('/api/bugs/:id/comments', (req, res) => {
  const { id } = req.params;
  
  db.all('SELECT * FROM comments WHERE bug_id = ? ORDER BY created_at ASC', [id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/bugs/:id/comments', (req, res) => {
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