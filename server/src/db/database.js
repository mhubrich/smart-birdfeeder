/**
 * @module Database
 * @description Handles SQLite database connection and schema initialization using the Node.js built-in node:sqlite module.
 * Node.js v22.5+ is required.
 */

const { DatabaseSync } = require('node:sqlite');
const path = require('path');

// Determine the database path relative to the current file
const dbPath = path.resolve(__dirname, '../../../birdfeeder.sqlite');

let db;
try {
  // Initialize the database connection.
  // DatabaseSync is synchronous and creates the file if it doesn't exist.
  db = new DatabaseSync(dbPath);
  console.log('Connected to SQLite database via node:sqlite');
} catch (error) {
  console.error('Failed to connect to SQLite database:', error);
  process.exit(1);
}

// -----------------------------------------------------------------------------
// Schema Initialization
// Using db.exec() for multi-statement schema creation.
// -----------------------------------------------------------------------------
db.exec(`
  -- Sightings Table: Stores metadata and paths to media assets for bird visits.
  CREATE TABLE IF NOT EXISTS sightings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    status TEXT DEFAULT 'recording', -- 'recording', 'ready'
    species TEXT,
    reason TEXT,
    timestamp DATETIME,
    lq_crop_path TEXT,
    hq_snapshot_path TEXT,
    hq_video_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Users Table: Stores administrative account credentials.
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password_hash TEXT
  );

  -- Subscriptions Table: Stores Web Push notification endpoints for registered clients.
  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint TEXT UNIQUE,
    keys_json TEXT
  );
`);

module.exports = db;
