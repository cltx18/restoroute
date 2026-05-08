/**
 * init-db.js
 * Initializes the SQLite database schema and seeds the admin user.
 * Run with: npm run init-db
 */
require('dotenv').config();
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data.db');
const db = new Database(DB_PATH);

// Enable foreign keys
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('Creating tables...');

// Admin / single-user table (the platform owner)
db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Vendor accounts - each vendor that gets added to the round-robin
db.exec(`
  CREATE TABLE IF NOT EXISTS vendors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_name TEXT NOT NULL,
    contact_name TEXT,
    email TEXT UNIQUE NOT NULL,
    phone_number TEXT NOT NULL,
    service_area TEXT,
    services TEXT,                       -- comma-separated list of services
    password_hash TEXT NOT NULL,         -- temp password generated at create time
    temp_password TEXT,                  -- plaintext shown once to admin (cleared later)
    is_active INTEGER DEFAULT 1,         -- 0 = paused (skipped in rotation)
    rotation_order INTEGER DEFAULT 0,    -- position in the round-robin
    last_assigned_at DATETIME,
    total_calls INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Tracks the round-robin pointer (which vendor is next)
db.exec(`
  CREATE TABLE IF NOT EXISTS round_robin_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    next_vendor_index INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Inbound call log (records every call routed through the system)
db.exec(`
  CREATE TABLE IF NOT EXISTS calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    twilio_call_sid TEXT,
    caller_number TEXT,
    routed_to_vendor_id INTEGER,
    routed_to_phone TEXT,
    status TEXT,                         -- ringing, in-progress, completed, no-answer, failed
    duration INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (routed_to_vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
  );
`);

// Leads from the website form (service + zip submissions)
db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    name TEXT,
    phone TEXT,
    email TEXT,
    notes TEXT,
    routed_to_vendor_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (routed_to_vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
  );
`);

// Initialize round-robin pointer if missing
const rrRow = db.prepare('SELECT id FROM round_robin_state WHERE id = 1').get();
if (!rrRow) {
  db.prepare('INSERT INTO round_robin_state (id, next_vendor_index) VALUES (1, 0)').run();
  console.log('Initialized round-robin pointer.');
}

// Seed the admin user from env
const adminUsername = process.env.ADMIN_USERNAME || 'admin';
const adminPassword = process.env.ADMIN_PASSWORD || 'changeme123';

const existing = db.prepare('SELECT id FROM admins WHERE username = ?').get(adminUsername);
if (!existing) {
  const hash = bcrypt.hashSync(adminPassword, 10);
  db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(adminUsername, hash);
  console.log(`✓ Admin user created: ${adminUsername} / ${adminPassword}`);
  console.log('  → CHANGE THIS PASSWORD before deploying to production.');
} else {
  console.log(`Admin user "${adminUsername}" already exists.`);
}

console.log(`✓ Database ready at ${DB_PATH}`);
db.close();
