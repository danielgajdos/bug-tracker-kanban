const mysql = require('mysql2/promise');

// Database setup
const dbConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  port: process.env.MYSQL_PORT || 3306,
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'bugtracker',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const db = mysql.createPool(dbConfig);

// Initialize database tables
async function initializeDatabase() {
  try {
    await db.execute(`CREATE TABLE IF NOT EXISTS bugs (
      id VARCHAR(36) PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status VARCHAR(20) DEFAULT 'reported',
      priority VARCHAR(20) DEFAULT 'medium',
      reporter_name VARCHAR(255) NOT NULL,
      reporter_email VARCHAR(255) NOT NULL,
      assignee VARCHAR(255),
      screenshots JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`);

    await db.execute(`CREATE TABLE IF NOT EXISTS comments (
      id VARCHAR(36) PRIMARY KEY,
      bug_id VARCHAR(36) NOT NULL,
      author VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (bug_id) REFERENCES bugs (id) ON DELETE CASCADE
    )`);

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

module.exports = { db, initializeDatabase };