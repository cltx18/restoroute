/**
 * db.js
 * Singleton SQLite database connection.
 * Honors DATABASE_PATH env var so the file can live on a mounted volume.
 * Auto-creates the directory if it doesn't exist (Railway volume on first boot).
 */
require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'data.db');

// Ensure parent directory exists (e.g. /app/data on a Railway volume)
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log(`[db] Created directory ${dbDir}`);
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

module.exports = db;
