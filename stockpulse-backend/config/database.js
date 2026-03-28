const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes("railway")
    ? { rejectUnauthorized: false }
    : false,
});

pool.on("error", (err) => {
  console.error("PostgreSQL pool error:", err.message);
});

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS articles (
    id              SERIAL PRIMARY KEY,
    uuid            TEXT UNIQUE,
    symbol          TEXT,
    company         TEXT,
    headline        TEXT NOT NULL,
    full_text       TEXT,
    summary_20      TEXT,
    summary_long    TEXT,
    source          TEXT,
    source_url      TEXT,
    image_url       TEXT,
    published_at    TIMESTAMPTZ,
    sentiment       TEXT,
    sentiment_score REAL,
    importance      TEXT,
    fetched_at      TEXT DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS')),
    processed       INTEGER DEFAULT 0,
    agent_source    TEXT
  );
  CREATE TABLE IF NOT EXISTS stocks (
    symbol       TEXT PRIMARY KEY,
    name         TEXT,
    sector       TEXT,
    yahoo_symbol TEXT,
    price        REAL,
    change_amt   REAL,
    change_pct   REAL,
    market_cap   TEXT,
    pe_ratio     REAL,
    pb_ratio     REAL,
    eps          REAL,
    roe          REAL,
    debt_equity  REAL,
    face_value   REAL,
    book_value   REAL,
    div_yield    REAL,
    ind_pe       REAL,
    week52_low   REAL,
    week52_high  REAL,
    day_open     REAL,
    day_high     REAL,
    day_low      REAL,
    volume       INTEGER,
    updated_at   TEXT DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS')),
    fund_unavailable INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS price_history (
    id        SERIAL PRIMARY KEY,
    symbol    TEXT NOT NULL,
    price     REAL NOT NULL,
    volume    INTEGER,
    timestamp TEXT DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS'))
  );
  CREATE TABLE IF NOT EXISTS users (
    id         SERIAL PRIMARY KEY,
    name       TEXT NOT NULL,
    email      TEXT UNIQUE NOT NULL,
    password   TEXT NOT NULL,
    created_at TEXT DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS'))
  );
  CREATE TABLE IF NOT EXISTS pending_users (
    id         SERIAL PRIMARY KEY,
    name       TEXT NOT NULL,
    email      TEXT UNIQUE NOT NULL,
    password   TEXT NOT NULL,
    otp        TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS watchlists (
    user_id  INTEGER NOT NULL,
    symbol   TEXT NOT NULL,
    added_at TEXT DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS')),
    PRIMARY KEY (user_id, symbol),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS financials (
    id           SERIAL PRIMARY KEY,
    symbol       TEXT NOT NULL,
    period_type  TEXT NOT NULL,
    period       TEXT NOT NULL,
    revenue      REAL,
    net_income   REAL,
    gross_profit REAL,
    ebit         REAL,
    eps          REAL,
    total_assets REAL,
    total_debt   REAL,
    equity       REAL,
    op_cashflow  REAL,
    capex        REAL,
    free_cashflow REAL,
    fetched_at   TEXT DEFAULT (to_char(now(), 'YYYY-MM-DD HH24:MI:SS')),
    currency     TEXT,
    source       TEXT,
    UNIQUE(symbol, period_type, period)
  );
  CREATE INDEX IF NOT EXISTS idx_art_sym  ON articles(symbol);
  CREATE INDEX IF NOT EXISTS idx_art_proc ON articles(processed);
  CREATE INDEX IF NOT EXISTS idx_ph_sym   ON price_history(symbol);
`;

let _initialized = false;

async function initDB() {
  if (_initialized) return;
  await pool.query(SCHEMA);

  await pool.query(`
    ALTER TABLE articles ADD COLUMN IF NOT EXISTS uuid            TEXT;
    ALTER TABLE articles ADD COLUMN IF NOT EXISTS summary_long    TEXT;
    ALTER TABLE articles ADD COLUMN IF NOT EXISTS importance      TEXT;
    ALTER TABLE articles ADD COLUMN IF NOT EXISTS company         TEXT;
    ALTER TABLE articles ADD COLUMN IF NOT EXISTS sentiment_score REAL;
    ALTER TABLE articles ADD COLUMN IF NOT EXISTS agent_source    TEXT;
  `).catch(e => console.warn("⚠ Migration warning:", e.message));

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_art_uuid ON articles(uuid) WHERE uuid IS NOT NULL;
  `).catch(e => console.warn("⚠ Index warning:", e.message));

  console.log("✅ PostgreSQL database ready");
  _initialized = true;
}

const dbReady = initDB();

function getDB() {
  return pool;
}

module.exports = { dbReady, getDB };