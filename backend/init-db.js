/**
 * init-db.js
 * Initializes the SQLite database schema and seeds the admin user.
 * Idempotent: safe to run on every deploy.
 */
require('dotenv').config();
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, 'data.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log(`Using database at ${DB_PATH}`);

db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS vendors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_name TEXT NOT NULL,
    contact_name TEXT,
    email TEXT UNIQUE NOT NULL,
    phone_number TEXT NOT NULL,
    service_area TEXT,
    services TEXT,
    password_hash TEXT NOT NULL,
    temp_password TEXT,
    is_active INTEGER DEFAULT 1,
    rotation_order INTEGER DEFAULT 0,
    last_assigned_at DATETIME,
    total_calls INTEGER DEFAULT 0,
    must_change_password INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS round_robin_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    next_vendor_index INTEGER DEFAULT 0,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS calls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    twilio_call_sid TEXT,
    parent_call_sid TEXT,
    caller_number TEXT,
    routed_to_vendor_id INTEGER,
    routed_to_phone TEXT,
    status TEXT,
    duration INTEGER,
    recording_sid TEXT,
    recording_url TEXT,
    recording_duration INTEGER,
    transcription_sid TEXT,
    transcription_text TEXT,
    transcription_status TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (routed_to_vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    service TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    name TEXT,
    phone TEXT,
    email TEXT,
    notes TEXT,
    status TEXT DEFAULT 'new',
    routed_to_vendor_id INTEGER,
    vendor_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (routed_to_vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
  );
`);

// Migrations for previously-deployed databases
function addColumnIfMissing(table, column, definition) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.find((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`  + Added ${table}.${column}`);
  }
}

addColumnIfMissing('vendors', 'must_change_password', 'INTEGER DEFAULT 1');
addColumnIfMissing('calls', 'parent_call_sid', 'TEXT');
addColumnIfMissing('calls', 'recording_sid', 'TEXT');
addColumnIfMissing('calls', 'recording_url', 'TEXT');
addColumnIfMissing('calls', 'recording_duration', 'INTEGER');
addColumnIfMissing('calls', 'transcription_sid', 'TEXT');
addColumnIfMissing('calls', 'transcription_text', 'TEXT');
addColumnIfMissing('calls', 'transcription_status', 'TEXT');
addColumnIfMissing('calls', 'notes', 'TEXT');
addColumnIfMissing('leads', 'status', "TEXT DEFAULT 'new'");
addColumnIfMissing('leads', 'vendor_notes', 'TEXT');
addColumnIfMissing('leads', 'updated_at', 'DATETIME');

const rrRow = db.prepare('SELECT id FROM round_robin_state WHERE id = 1').get();
if (!rrRow) {
  db.prepare('INSERT INTO round_robin_state (id, next_vendor_index) VALUES (1, 0)').run();
}

const adminUsername = process.env.ADMIN_USERNAME || 'admin';
const adminPassword = process.env.ADMIN_PASSWORD || 'changeme123';

const existing = db.prepare('SELECT id FROM admins WHERE username = ?').get(adminUsername);
if (!existing) {
  const hash = bcrypt.hashSync(adminPassword, 10);
  db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(adminUsername, hash);
  console.log(`✓ Admin user created: ${adminUsername}`);
} else {
  console.log(`Admin user "${adminUsername}" already exists.`);
}

console.log(`✓ Database ready at ${DB_PATH}`);
db.close();
