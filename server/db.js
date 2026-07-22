const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DATABASE_URL = process.env.DATABASE_URL;

if (DATABASE_URL) {
  console.log('🔗 Connecting to PostgreSQL Cloud Database...');
  const { Pool } = require('pg');
  const deasync = require('deasync');

  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  function toPgSql(sql) {
    let index = 1;
    let pgSql = sql.replace(/\?/g, () => `$${index++}`);
    // Replace SQLite AUTOINCREMENT or specific SQLite functions if needed
    pgSql = pgSql.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY');
    pgSql = pgSql.replace(/DATETIME/gi, 'TIMESTAMP');
    pgSql = pgSql.replace(/CHECK\s*\(status IN \('open','resolved','pending','closed'\)\)/gi, '');
    return pgSql;
  }

  function querySync(text, params = []) {
    let done = false;
    let err = null;
    let result = null;

    const formattedSql = toPgSql(text);
    pool.query(formattedSql, params, (e, res) => {
      err = e;
      result = res;
      done = true;
    });

    while (!done) {
      deasync.runLoopOnce();
    }

    if (err) {
      console.error('PG Error:', err.message, 'SQL:', text);
      throw err;
    }
    return result;
  }

  // Auto-initialize Schema on Neon
  try {
    querySync(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        contact_person VARCHAR(255),
        phone VARCHAR(50),
        email VARCHAR(255),
        address TEXT,
        contract_type VARCHAR(50) DEFAULT 'standard',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS engineers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS visits (
        id SERIAL PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        engineer_id INTEGER REFERENCES engineers(id) ON DELETE SET NULL,
        visit_date DATE NOT NULL,
        problem TEXT,
        actions_taken TEXT,
        remarks TEXT,
        status VARCHAR(20) DEFAULT 'open',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS attachments (
        id SERIAL PRIMARY KEY,
        visit_id INTEGER NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'engineer',
        engineer_id INTEGER REFERENCES engineers(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // Seed admin user if not exists
    const bcrypt = require('bcryptjs');
    const existing = querySync('SELECT id FROM users WHERE username = $1', ['admin']);
    if (!existing.rows.length) {
      const hash = bcrypt.hashSync('admin123', 10);
      querySync("INSERT INTO users (username, password_hash, role) VALUES ($1, $2, 'admin')", ['admin', hash]);
      console.log('✅ Default admin user created: admin / admin123');
    }
    console.log('✅ PostgreSQL Schema Verified on Neon!');
  } catch (e) {
    console.error('PostgreSQL Schema Init:', e.message);
  }

  module.exports = {
    prepare(sql) {
      return {
        all(...params) {
          const res = querySync(sql, params);
          return res.rows;
        },
        get(...params) {
          const res = querySync(sql, params);
          return res.rows[0] || null;
        },
        run(...params) {
          let execSql = sql;
          if (sql.trim().toUpperCase().startsWith('INSERT') && !sql.toUpperCase().includes('RETURNING')) {
            execSql += ' RETURNING id';
          }
          const res = querySync(execSql, params);
          return {
            lastInsertRowid: res.rows[0]?.id || 0,
            changes: res.rowCount
          };
        },
        exec(sql) {
          return querySync(sql);
        }
      };
    },
    exec(sql) {
      return querySync(sql);
    }
  };

} else {
  // Local SQLite Fallback
  const DB_DIR = process.env.DATA_DIR || __dirname;
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  const DB_PATH = path.join(DB_DIR, 'fsm.db');
  const db = new DatabaseSync(DB_PATH);

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
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'engineer',
      engineer_id   INTEGER REFERENCES engineers(id) ON DELETE SET NULL,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed admin user if not exists
  const bcrypt = require('bcryptjs');
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!existing) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare("INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'admin')").run('admin', hash);
    console.log('✅ Default admin user created: admin / admin123');
  }

  module.exports = db;
}
