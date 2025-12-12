const fs = require('fs');
const path = require('path');

class StorageManager {
  constructor() {
    this.useCloudStorage = process.env.USE_CLOUD_STORAGE === 'true';
    this.uploadsDir = 'uploads';
    
    // Ensure uploads directory exists
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  // Save file to local storage (Railway volume)
  async saveFile(buffer, filename) {
    const filepath = path.join(this.uploadsDir, filename);
    
    try {
      fs.writeFileSync(filepath, buffer);
      return `/uploads/${filename}`;
    } catch (error) {
      console.error('Error saving file:', error);
      throw error;
    }
  }

  // Get file from local storage
  getFile(filename) {
    const filepath = path.join(this.uploadsDir, filename);
    
    if (fs.existsSync(filepath)) {
      return fs.readFileSync(filepath);
    }
    
    throw new Error('File not found');
  }

  // Delete file from local storage
  deleteFile(filename) {
    const filepath = path.join(this.uploadsDir, filename);
    
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      return true;
    }
    
    return false;
  }

  // List all files in uploads directory
  listFiles() {
    try {
      return fs.readdirSync(this.uploadsDir);
    } catch (error) {
      console.error('Error listing files:', error);
      return [];
    }
  }

  // Get storage stats
  getStorageStats() {
    const files = this.listFiles();
    let totalSize = 0;
    
    files.forEach(file => {
      try {
        const filepath = path.join(this.uploadsDir, file);
        const stats = fs.statSync(filepath);
        totalSize += stats.size;
      } catch (error) {
        // Ignore errors for individual files
      }
    });
    
    return {
      fileCount: files.length,
      totalSize: totalSize,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2)
    };
  }
}

module.exports = new StorageManager();