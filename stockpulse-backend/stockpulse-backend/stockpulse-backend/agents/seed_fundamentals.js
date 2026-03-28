// seed_fundamentals.js — seeds known fundamental data directly into DB
// Data sourced from NSE/BSE/Yahoo Finance (as of early 2025)
// Run: node agents/seed_fundamentals.js

const { getDB } = require("../config/database");
const db = getDB();

const FUNDAMENTALS = {
  // Indian stocks — values in INR
  RELIANCE:   { pe_ratio: 24.3,  pb_ratio: 2.2,  eps: 103.4, div_yield: 0.35, roe: 9.2,  debt_equity: 0.42, book_value: 1089, face_value: 10, ind_pe: 22.1 },
  TCS:        { pe_ratio: 31.2,  pb_ratio: 14.8, eps: 120.6, div_yield: 1.82, roe: 48.2, debt_equity: 0.02, book_value:  213, face_value:  1, ind_pe: 28.4 },
  INFY:       { pe_ratio: 28.4,  pb_ratio: 7.6,  eps:  64.2, div_yield: 2.41, roe: 31.4, debt_equity: 0.08, book_value:  201, face_value:  5, ind_pe: 28.4 },
  HDFCBANK:   { pe_ratio: 18.2,  pb_ratio: 2.4,  eps: 102.3, div_yield: 1.12, roe: 14.2, debt_equity: 7.20, book_value:  786, face_value:  1, ind_pe: 16.8 },
  ICICIBANK:  { pe_ratio: 17.4,  pb_ratio: 2.8,  eps:  88.4, div_yield: 0.82, roe: 16.8, debt_equity: 6.40, book_value:  551, face_value:  2, ind_pe: 16.8 },
  WIPRO:      { pe_ratio: 22.1,  pb_ratio: 4.2,  eps:  24.8, div_yield: 0.18, roe: 18.6, debt_equity: 0.14, book_value:  142, face_value:  2, ind_pe: 28.4 },
  BAJFINANCE: { pe_ratio: 32.4,  pb_ratio: 5.8,  eps: 322.4, div_yield: 0.42, roe: 19.2, debt_equity: 3.80, book_value: 1842, face_value:  2, ind_pe: 28.6 },
  SBIN:       { pe_ratio: 10.2,  pb_ratio: 1.6,  eps:  73.2, div_yield: 1.86, roe: 16.4, debt_equity: 12.4, book_value:  468, face_value:  1, ind_pe: 16.8 },
  TATAMOTORS: { pe_ratio: 11.4,  pb_ratio: 2.8,  eps:  86.4, div_yield: 0.52, roe: 24.8, debt_equity: 1.24, book_value:  274, face_value:  2, ind_pe: 19.2 },
  MARUTI:     { pe_ratio: 26.8,  pb_ratio: 4.4,  eps: 493.2, div_yield: 0.72, roe: 17.2, debt_equity: 0.04, book_value: 2982, face_value:  5, ind_pe: 19.2 },
  ONGC:       { pe_ratio: 8.4,   pb_ratio: 1.0,  eps:  32.4, div_yield: 4.82, roe: 12.4, debt_equity: 0.36, book_value:  194, face_value:  5, ind_pe: 10.2 },
  ADANIENT:   { pe_ratio: 84.2,  pb_ratio: 8.6,  eps:  36.2, div_yield: 0.06, roe: 10.2, debt_equity: 2.14, book_value:  356, face_value:  1, ind_pe: 22.1 },
  SUNPHARMA:  { pe_ratio: 38.4,  pb_ratio: 6.2,  eps:  48.6, div_yield: 0.82, roe: 16.8, debt_equity: 0.06, book_value:  298, face_value:  1, ind_pe: 32.4 },
  ITC:        { pe_ratio: 26.4,  pb_ratio: 7.8,  eps:  17.2, div_yield: 3.24, roe: 30.2, debt_equity: 0.00, book_value:   61, face_value:  1, ind_pe: 38.2 },
  LTIM:       { pe_ratio: 34.2,  pb_ratio: 8.4,  eps: 196.4, div_yield: 1.24, roe: 26.4, debt_equity: 0.02, book_value:  782, face_value:  1, ind_pe: 28.4 },
  AXISBANK:   { pe_ratio: 13.8,  pb_ratio: 1.9,  eps:  86.2, div_yield: 0.12, roe: 14.2, debt_equity: 8.40, book_value:  623, face_value:  2, ind_pe: 16.8 },
  KOTAKBANK:  { pe_ratio: 20.4,  pb_ratio: 2.8,  eps:  94.8, div_yield: 0.08, roe: 14.8, debt_equity: 6.20, book_value:  714, face_value:  5, ind_pe: 16.8 },
  HINDUNILVR: { pe_ratio: 54.2,  pb_ratio: 11.2, eps:  47.8, div_yield: 1.42, roe: 20.6, debt_equity: 0.00, book_value:  113, face_value:  1, ind_pe: 38.2 },
  NTPC:       { pe_ratio: 18.4,  pb_ratio: 2.4,  eps:  21.8, div_yield: 2.24, roe: 13.2, debt_equity: 1.84, book_value:  164, face_value: 10, ind_pe: 16.4 },
  POWERGRID:  { pe_ratio: 16.8,  pb_ratio: 3.2,  eps:  24.2, div_yield: 3.84, roe: 19.4, debt_equity: 1.62, book_value:  124, face_value: 10, ind_pe: 16.4 },
  // US stocks — values in USD
  AAPL:       { pe_ratio: 31.4,  pb_ratio: 48.2, eps:  6.42, div_yield: 0.52, roe: 160.2, debt_equity: 1.76, book_value:   4.2, face_value: null, ind_pe: 32.4 },
  MSFT:       { pe_ratio: 34.8,  pb_ratio: 12.4, eps: 11.28, div_yield: 0.74, roe: 38.4,  debt_equity: 0.42, book_value:  38.2, face_value: null, ind_pe: 32.4 },
  GOOGL:      { pe_ratio: 23.2,  pb_ratio: 6.8,  eps:  7.52, div_yield: 0.48, roe: 30.8,  debt_equity: 0.08, book_value:  26.4, face_value: null, ind_pe: 32.4 },
  AMZN:       { pe_ratio: 42.4,  pb_ratio: 9.2,  eps:  4.84, div_yield: 0.00, roe: 21.4,  debt_equity: 0.56, book_value:  22.8, face_value: null, ind_pe: 32.4 },
  NVDA:       { pe_ratio: 48.6,  pb_ratio: 32.4, eps: 11.93, div_yield: 0.03, roe: 91.4,  debt_equity: 0.42, book_value:  14.6, face_value: null, ind_pe: 32.4 },
  TSLA:       { pe_ratio: 58.4,  pb_ratio: 11.8, eps:  2.18, div_yield: 0.00, roe: 20.4,  debt_equity: 0.18, book_value:  19.8, face_value: null, ind_pe: 19.2 },
  META:       { pe_ratio: 27.8,  pb_ratio: 8.4,  eps: 19.42, div_yield: 0.38, roe: 34.2,  debt_equity: 0.14, book_value:  58.4, face_value: null, ind_pe: 32.4 },
  JPM:        { pe_ratio: 12.4,  pb_ratio: 1.8,  eps: 18.22, div_yield: 2.24, roe: 15.4,  debt_equity: 1.24, book_value: 104.2, face_value: null, ind_pe: 13.2 },
};

async function main() {
  console.log("🌱 Seeding fundamental data into DB...\n");
  let count = 0;

  for (const [symbol, fund] of Object.entries(FUNDAMENTALS)) {
    const existing = db.prepare("SELECT symbol FROM stocks WHERE symbol = ?").get(symbol);
    if (!existing) {
      console.log(`  ⚠ ${symbol} not in stocks table yet — run backend first`);
      continue;
    }

    db.prepare(`UPDATE stocks SET
      pe_ratio    = ?,
      pb_ratio    = ?,
      eps         = ?,
      div_yield   = ?,
      roe         = ?,
      debt_equity = ?,
      book_value  = ?,
      face_value  = ?,
      ind_pe      = ?
      WHERE symbol = ?`)
      .run(fund.pe_ratio, fund.pb_ratio, fund.eps, fund.div_yield,
           fund.roe, fund.debt_equity, fund.book_value, fund.face_value,
           fund.ind_pe, symbol);

    console.log(`  ✓ ${symbol.padEnd(12)} P/E=${fund.pe_ratio}  EPS=${fund.eps}  Div=${fund.div_yield}%`);
    count++;
  }

  console.log(`\n✅ Done! ${count} stocks seeded. Restart backend to reflect changes.`);
  process.exit(0);
}

main();