const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes("railway")
    ? { rejectUnauthorized: false }
    : false,
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
    published_at TIMESTAMPTZ,
    sentiment    TEXT,
    sentiment_score REAL,
    fetched_at   TEXT DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS')),
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
    volume INTEGER, updated_at TEXT DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS')),
    fund_unavailable INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS price_history (
    id SERIAL PRIMARY KEY,
    symbol TEXT NOT NULL, price REAL NOT NULL,
    volume INTEGER, timestamp TEXT DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS'))
  );
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL, created_at TEXT DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS'))
  );
  CREATE TABLE IF NOT EXISTS watchlists (
    user_id INTEGER NOT NULL,
    symbol  TEXT NOT NULL,
    added_at TEXT DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS')),
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
    capex       REAL, free_cashflow REAL,
    fetched_at  TEXT DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS')),
    currency    TEXT,
    source      TEXT,
    UNIQUE(symbol, period_type, period)
  );
  CREATE INDEX IF NOT EXISTS idx_art_sym  ON articles(symbol);
  CREATE INDEX IF NOT EXISTS idx_art_proc ON articles(processed);
  CREATE INDEX IF NOT EXISTS idx_ph_sym   ON price_history(symbol);
`;

function flattenParams(args) {
  if (args.length === 1 && Array.isArray(args[0])) return args[0];
  if (args.length === 1 && typeof args[0] === "object" && args[0] !== null && !Array.isArray(args[0])) {
    return Object.values(args[0]);
  }
  return args;
}

function makeDB() {
  return {
    prepare(sql) {
      let i = 0;
      const pgSql = sql.replace(/\?/g, () => `$${++i}`);
      return {
        async run(...args) {
          const params = flattenParams(args);
          const finalSql = pgSql.match(/^INSERT/i) && !pgSql.includes("RETURNING")
            ? pgSql + " RETURNING id"
            : pgSql;
          try {
            const res = await pool.query(finalSql, params);
            return {
              changes: res.rowCount,
              lastInsertRowid: res.rows[0]?.id ?? null,
            };
          } catch (e) {
            if (e.code === "23505") return { changes: 0, lastInsertRowid: null };
            throw e;
          }
        },
        async get(...args) {
          const params = flattenParams(args);
          const res = await pool.query(pgSql + (pgSql.includes("LIMIT") ? "" : " LIMIT 1"), params);
          return res.rows[0] || null;
        },
        async all(...args) {
          const params = flattenParams(args);
          const res = await pool.query(pgSql, params);
          return res.rows || [];
        },
      };
    },
    async exec(sql) {
      await pool.query(sql);
    },
  };
}

let _db = null;

async function initDB() {
  if (_db) return _db;
  await pool.query(SCHEMA);
  console.log("✅ PostgreSQL database ready");
  _db = makeDB();
  return _db;
}

const dbReady = initDB();

function getDB() {
  if (!_db) throw new Error("DB not initialized yet. Await dbReady first.");
  return _db;
}

module.exports = { dbReady, getDB };
