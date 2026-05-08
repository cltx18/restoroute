/**
 * db.js
 * Singleton SQLite database connection.
 * Honors DATABASE_PATH env var so the file can live on a mounted volume.
 */
require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'data.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

module.exports = db;
