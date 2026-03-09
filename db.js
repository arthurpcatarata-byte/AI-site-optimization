const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'siteopt.db'));

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    size_sqft REAL NOT NULL,
    zoning TEXT NOT NULL,
    estimated_cost REAL NOT NULL,
    feasibility_score REAL,
    environmental_score REAL,
    market_score REAL,
    infrastructure_score REAL,
    regulatory_score REAL,
    ai_summary TEXT,
    ai_recommendations TEXT,
    ai_powered INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

module.exports = db;
