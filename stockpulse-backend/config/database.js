// config/database.js
// Uses Node's built-in node:sqlite (Node 22.5+) — no compilation, no memory sync issues
// Python agents read/write the same .db file directly — no more stale-data problem

const { DatabaseSync } = require("node:sqlite");
const path = require("path");
const fs   = require("fs");

const DB_PATH = path.resolve(process.env.DB_PATH || "./database/stockpulse.db");
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS articles (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    uuid         TEXT UNIQUE,
    symbol       TEXT,
    company      TEXT,
    headline     TEXT NOT NULL,
    full_text    TEXT,
    summary_20   TEXT,
    summary_long TEXT,
    source       TEXT,
    source_url   TEXT,
    image_url    TEXT,
    published_at TEXT,
    sentiment    TEXT,
    sentiment_score REAL,
    fetched_at   TEXT DEFAULT (datetime('now')),
    processed    INTEGER DEFAULT 0,
    agent_source TEXT
  );
  CREATE TABLE IF NOT EXISTS stocks (
    symbol TEXT PRIMARY KEY, name TEXT, sector TEXT, yahoo_symbol TEXT,
    price REAL, change_amt REAL, change_pct REAL,
    market_cap TEXT, pe_ratio REAL, pb_ratio REAL,
    eps REAL, roe REAL, debt_equity REAL,
    face_value REAL, book_value REAL, div_yield REAL,
    ind_pe REAL, week52_low REAL, week52_high REAL,
    day_open REAL, day_high REAL, day_low REAL,
    volume INTEGER, updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS price_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL, price REAL NOT NULL,
    volume INTEGER, timestamp TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS watchlists (
    user_id INTEGER NOT NULL,
    symbol  TEXT NOT NULL,
    added_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, symbol),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_art_sym  ON articles(symbol);
  CREATE INDEX IF NOT EXISTS idx_art_proc ON articles(processed);
  CREATE INDEX IF NOT EXISTS idx_ph_sym   ON price_history(symbol);
`;

let _db = null;

function initDB() {
  if (_db) return _db;
  const raw = new DatabaseSync(DB_PATH);
  raw.exec("PRAGMA journal_mode=WAL;");  // allows concurrent reads from Python
  raw.exec("PRAGMA synchronous=NORMAL;");
  raw.exec(SCHEMA);

  // Wrap in better-sqlite3-compatible API
  _db = {
    prepare(sql) {
      return {
        run(...args) {
          const params = args.length === 1 && Array.isArray(args[0]) ? args[0]
                       : args.length === 1 && typeof args[0] === "object" && args[0] !== null && !Array.isArray(args[0]) ? args[0]
                       : args;
          try {
            const stmt = raw.prepare(sql);
            return stmt.run(...(Array.isArray(params) ? params : [params]));
          } catch(e) {
            if (e.message?.includes("UNIQUE")) return { changes: 0, lastInsertRowid: 0 };
            throw e;
          }
        },
        get(...args) {
          const params = args.length === 1 && Array.isArray(args[0]) ? args[0]
                       : args.length === 1 && typeof args[0] === "object" && args[0] !== null && !Array.isArray(args[0]) ? args[0]
                       : args;
          const stmt = raw.prepare(sql);
          return stmt.get(...(Array.isArray(params) ? params : [params])) || null;
        },
        all(...args) {
          const params = args.length === 1 && Array.isArray(args[0]) ? args[0]
                       : args.length === 1 && typeof args[0] === "object" && args[0] !== null && !Array.isArray(args[0]) ? args[0]
                       : args;
          const stmt = raw.prepare(sql);
          return stmt.all(...(Array.isArray(params) ? params : [params])) || [];
        },
      };
    },
    exec(sql) { raw.exec(sql); },
    pragma(s)  { raw.exec(`PRAGMA ${s}`); },
  };

  // Migrations
  try { raw.exec("ALTER TABLE articles ADD COLUMN summary_long TEXT"); } catch {}
  try { raw.exec("ALTER TABLE stocks ADD COLUMN yahoo_symbol TEXT"); } catch {}
  try { raw.exec("ALTER TABLE stocks ADD COLUMN fund_unavailable INTEGER DEFAULT 0"); } catch {}
  // Financials cache table — stores income/balance/cashflow data
  raw.exec(`CREATE TABLE IF NOT EXISTS financials (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol      TEXT NOT NULL,
    period_type TEXT NOT NULL,
    period      TEXT NOT NULL,
    revenue     REAL,
    net_income  REAL,
    gross_profit REAL,
    ebit        REAL,
    eps         REAL,
    total_assets REAL,
    total_debt  REAL,
    equity      REAL,
    op_cashflow REAL,
    capex       REAL,
    free_cashflow REAL,
    fetched_at  TEXT DEFAULT (datetime('now')),
    UNIQUE(symbol, period_type, period)
  )`);
  // Add currency column to financials if missing (migration)
  try { raw.exec("ALTER TABLE financials ADD COLUMN currency TEXT"); } catch {}
  try { raw.exec("ALTER TABLE financials ADD COLUMN source TEXT"); } catch {}
  console.log("✅ Database ready at:", DB_PATH);
  return _db;
}

// Synchronous — no async needed
const dbReady = Promise.resolve(initDB());
function getDB() {
  if (!_db) initDB();
  return _db;
}

module.exports = { dbReady, getDB };