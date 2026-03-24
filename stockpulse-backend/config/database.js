// config/database.js
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS articles (
    id           SERIAL PRIMARY KEY,
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
    fetched_at   TEXT DEFAULT (now()::text),
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
    volume INTEGER, updated_at TEXT DEFAULT (now()::text),
    fund_unavailable INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS price_history (
    id SERIAL PRIMARY KEY,
    symbol TEXT NOT NULL, price REAL NOT NULL,
    volume INTEGER, timestamp TEXT DEFAULT (now()::text)
  );
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, created_at TEXT DEFAULT (now()::text)
  );
  CREATE TABLE IF NOT EXISTS watchlists (
    user_id INTEGER NOT NULL,
    symbol  TEXT NOT NULL,
    added_at TEXT DEFAULT (now()::text),
    PRIMARY KEY (user_id, symbol),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS financials (
    id          SERIAL PRIMARY KEY,
    symbol      TEXT NOT NULL,
    period_type TEXT NOT NULL,
    period      TEXT NOT NULL,
    revenue     REAL, net_income REAL, gross_profit REAL,
    ebit        REAL, eps REAL, total_assets REAL,
    total_debt  REAL, equity REAL, op_cashflow REAL,
    capex       REAL, free_cashflow REAL, currency TEXT, source TEXT,
    fetched_at  TEXT DEFAULT (now()::text),
    UNIQUE(symbol, period_type, period)
  );
  CREATE INDEX IF NOT EXISTS idx_art_sym  ON articles(symbol);
  CREATE INDEX IF NOT EXISTS idx_art_proc ON articles(processed);
  CREATE INDEX IF NOT EXISTS idx_ph_sym   ON price_history(symbol);
`;

let _db = null;

async function initDB() {
  if (_db) return _db;
  await pool.query(SCHEMA);
  console.log("✅ PostgreSQL Database ready");

  _db = {
    prepare(sql) {
      // Convert SQLite ? placeholders to PostgreSQL $1, $2...
      let i = 0;
      const pgSql = sql.replace(/\?/g, () => `$${++i}`);
      return {
        async run(...args) {
          const params = args.length === 1 && Array.isArray(args[0]) ? args[0]
                       : args.length === 1 && typeof args[0] === "object" && args[0] !== null && !Array.isArray(args[0])
                         ? Object.values(args[0])
                       : args;
          try {
            const result = await pool.query(pgSql, params);
            return { changes: result.rowCount, lastInsertRowid: result.rows[0]?.id };
          } catch(e) {
            if (e.message?.includes("unique") || e.message?.includes("UNIQUE")) return { changes: 0, lastInsertRowid: 0 };
            throw e;
          }
        },
        async get(...args) {
          const params = args.length === 1 && Array.isArray(args[0]) ? args[0]
                       : args.length === 1 && typeof args[0] === "object" && args[0] !== null && !Array.isArray(args[0])
                         ? Object.values(args[0])
                       : args;
          const result = await pool.query(pgSql, params);
          return result.rows[0] || null;
        },
        async all(...args) {
          const params = args.length === 1 && Array.isArray(args[0]) ? args[0]
                       : args.length === 1 && typeof args[0] === "object" && args[0] !== null && !Array.isArray(args[0])
                         ? Object.values(args[0])
                       : args;
          const result = await pool.query(pgSql, params);
          return result.rows || [];
        },
      };
    },
    async exec(sql) { await pool.query(sql); },
    pragma()  {}, // no-op for PostgreSQL
  };

  return _db;
}

const dbReady = initDB();

function getDB() {
  if (!_db) throw new Error("DB not ready yet — await dbReady first");
  return _db;
}

module.exports = { dbReady, getDB };
