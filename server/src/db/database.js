/**
 * @module Database
 * @description Handles SQLite database connection and schema initialization.
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../../birdfeeder.sqlite');
console.log('DB Path used:', dbPath);

let db;
try {
  db = new DatabaseSync(dbPath);
  console.log('Connected to SQLite database via node:sqlite');
} catch (error) {
  console.error('Failed to connect to SQLite database:', error);
  process.exit(1);
}

// -----------------------------------------------------------------------------
// Ensuring tables exist before exporting
// -----------------------------------------------------------------------------
console.log('Initializing database schema...');
db.exec(`
  CREATE TABLE IF NOT EXISTS sightings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    status TEXT DEFAULT 'recording',
    species TEXT,
    reason TEXT,
    timestamp DATETIME,
    hq_snapshot_path TEXT,
    hq_video_path TEXT,
    motion_x REAL DEFAULT 50,
    motion_y REAL DEFAULT 50,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password_hash TEXT
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint TEXT UNIQUE,
    keys_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_notified_at DATETIME
  );

  CREATE TABLE IF NOT EXISTS system_status (
    service_name TEXT PRIMARY KEY,
    status TEXT,
    last_heartbeat DATETIME,
    metadata TEXT
  );

  CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    sess TEXT NOT NULL,
    expire INTEGER NOT NULL
  );
`);

// -----------------------------------------------------------------------------
// Auto-Migration for existing databases
// -----------------------------------------------------------------------------
try {
  db.exec("ALTER TABLE sightings ADD COLUMN motion_x REAL DEFAULT 50;");
  console.log("Migration: Added motion_x column to sightings table.");
} catch (e) {
  // Ignore error if column already exists
}

try {
  db.exec("ALTER TABLE sightings ADD COLUMN motion_y REAL DEFAULT 50;");
  console.log("Migration: Added motion_y column to sightings table.");
} catch (e) {
  // Ignore error if column already exists
}

console.log('Schema initialized successfully.');

module.exports = db;
