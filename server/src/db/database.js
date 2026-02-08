/**
 * @module Database
 * @description Handles SQLite database connection and schema initialization.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../../../birdfeeder.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Could not connect to database', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

db.serialize(() => {
  // Sightings Table
  db.run(`CREATE TABLE IF NOT EXISTS sightings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    status TEXT DEFAULT 'recording', -- 'recording', 'ready'
    species TEXT,
    reason TEXT,
    timestamp DATETIME,
    lq_crop_path TEXT,
    hq_snapshot_path TEXT,
    hq_video_path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Users Table (for session auth)
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password_hash TEXT
  )`);

  // Subscriptions Table (for Web Push)
  db.run(`CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    endpoint TEXT UNIQUE,
    keys_json TEXT
  )`);
});

module.exports = db;
