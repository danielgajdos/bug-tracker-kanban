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
    // Create sequence table for bug IDs
    await db.execute(`CREATE TABLE IF NOT EXISTS bug_sequence (
      id INT PRIMARY KEY DEFAULT 1,
      next_value INT NOT NULL DEFAULT 1
    )`);

    // Initialize sequence if empty
    const [seqRows] = await db.execute('SELECT COUNT(*) as count FROM bug_sequence');
    if (seqRows[0].count === 0) {
      await db.execute('INSERT INTO bug_sequence (id, next_value) VALUES (1, 1)');
    }

    await db.execute(`CREATE TABLE IF NOT EXISTS bugs (
      id VARCHAR(36) PRIMARY KEY,
      bug_number VARCHAR(20) UNIQUE NOT NULL,
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

    // Add bug_number column to existing bugs table if it doesn't exist
    try {
      await db.execute('ALTER TABLE bugs ADD COLUMN bug_number VARCHAR(20) UNIQUE');
    } catch (error) {
      // Column already exists, ignore error
    }

    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Function to get next bug number
async function getNextBugNumber() {
  try {
    // Get and increment the sequence in a transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
      const [rows] = await connection.execute('SELECT next_value FROM bug_sequence WHERE id = 1 FOR UPDATE');
      const nextValue = rows[0].next_value;
      
      await connection.execute('UPDATE bug_sequence SET next_value = next_value + 1 WHERE id = 1');
      
      await connection.commit();
      connection.release();
      
      // Format as ITWO-QA-XXXX
      return `ITWO-QA-${nextValue.toString().padStart(4, '0')}`;
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Error getting next bug number:', error);
    throw error;
  }
}

module.exports = { db, initializeDatabase, getNextBugNumber };