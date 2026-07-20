// Uses Node.js 22's built-in node:sqlite — no native compilation needed
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DB_DIR = process.env.DATA_DIR || __dirname;
const DB_PATH = path.join(DB_DIR, 'fsm.db');
const db = new DatabaseSync(DB_PATH);

// Pragmas via exec (node:sqlite doesn't have a .pragma() helper)
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    contact_person TEXT,
    phone         TEXT,
    email         TEXT,
    address       TEXT,
    contract_type TEXT    DEFAULT 'standard',
    notes         TEXT,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS engineers (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    email      TEXT,
    phone      TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS visits (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id   INTEGER NOT NULL,
    engineer_id   INTEGER,
    visit_date    DATE    NOT NULL,
    problem       TEXT,
    actions_taken TEXT,
    remarks       TEXT,
    status        TEXT DEFAULT 'open'
                       CHECK(status IN ('open','resolved','pending','closed')),
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (engineer_id) REFERENCES engineers(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS attachments (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    visit_id      INTEGER NOT NULL,
    filename      TEXT    NOT NULL,
    original_name TEXT    NOT NULL,
    uploaded_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (visit_id) REFERENCES visits(id) ON DELETE CASCADE
  );
`);

module.exports = db;
