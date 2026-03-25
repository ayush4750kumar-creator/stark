#!/usr/bin/env node
// seed_world_stocks.js
// One-time script to populate DB with stocks from all major world exchanges
// Sources (all free, no API key):
//   - NSE India:    ~1800 stocks via NSE's public CSV
//   - BSE India:    ~5000 stocks via BSE's public CSV
//   - US (SEC):     ~10000 tickers via SEC EDGAR company list
//   - LSE/EU/etc:   Major ETF holdings via Yahoo Finance screener
//
// Run: node agents/seed_world_stocks.js
// Safe to re-run — uses INSERT OR IGNORE

require("dotenv").config();
const { getDB } = require("../config/database");

const db = getDB();
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── helpers ─────────────────────────────────────────────────────
async function fetchText(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; StockPulse/1.0)" },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (e) {
    console.log(`  ✗ Fetch failed: ${url.slice(0, 80)} — ${e.message}`);
    return null;
  }
}

async function fetchJSON(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; StockPulse/1.0)" },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.log(`  ✗ Fetch failed: ${url.slice(0, 80)} — ${e.message}`);
    return null;
  }
}

function insertStocks(stocks) {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO stocks (symbol, name, sector, yahoo_symbol)
    VALUES (?, ?, ?, ?)
  `);
  let count = 0;
  for (const s of stocks) {
    if (!s.symbol || s.symbol.length > 20) continue;
    stmt.run(s.symbol.toUpperCase(), s.name || s.symbol, s.sector || "Unknown", s.yahooSymbol || s.symbol);
    count++;
  }
  return count;
}

// ── 1. NSE India — full equity list ─────────────────────────────
async function seedNSE() {
  console.log("\n📥 Fetching NSE India equity list...");
  // NSE provides a public CSV of all listed equities
  const csv = await fetchText("https://archives.nseindia.com/content/equities/EQUITY_L.csv");
  if (!csv) return 0;

  const lines = csv.split("\n").slice(1); // skip header
  const stocks = [];
  for (const line of lines) {
    const cols = line.split(",");
    if (cols.length < 3) continue;
    const symbol = cols[0]?.trim();
    const name   = cols[1]?.trim();
    const series = cols[2]?.trim();
    if (!symbol || series !== "EQ") continue; // only equity series
    stocks.push({
      symbol,
      name:        name || symbol,
      sector:      "Indian",
      yahooSymbol: `${symbol}.NS`,
    });
  }
  const count = insertStocks(stocks);
  console.log(`  ✓ NSE: inserted ${count} stocks`);
  return count;
}

// ── 2. BSE India — equity list ──────────────────────────────────
async function seedBSE() {
  console.log("\n📥 Fetching BSE India equity list...");
  // BSE provides a public list via their API
  const json = await fetchJSON("https://api.bseindia.com/BseIndiaAPI/api/ListofScripData/w?segment=Equity&status=Active");
  if (!json?.Table) {
    // Fallback: BSE CSV
    const csv = await fetchText("https://www.bseindia.com/corporates/List_Scrips.aspx");
    if (!csv) return 0;
    // BSE CSV is HTML — skip if blocked
    console.log("  ⚠ BSE: blocked, skipping");
    return 0;
  }
  const stocks = json.Table.map(r => ({
    symbol:      r.SCRIP_CD?.toString() || r.scrip_cd?.toString(),
    name:        r.Issuer_Name || r.ISSUER_NAME || r.LONG_NAME,
    sector:      r.INDUSTRY || "Indian",
    yahooSymbol: `${r.SCRIP_CD}.BO`,
  })).filter(s => s.symbol);
  const count = insertStocks(stocks);
  console.log(`  ✓ BSE: inserted ${count} stocks`);
  return count;
}

// ── 3. US Stocks — SEC EDGAR full company list ──────────────────
async function seedUS() {
  console.log("\n📥 Fetching US stocks from SEC EDGAR...");
  // SEC provides a JSON of all companies with tickers — completely free
  const json = await fetchJSON("https://www.sec.gov/files/company_tickers.json");
  if (!json) return 0;

  const stocks = Object.values(json).map(c => ({
    symbol:      c.ticker?.toUpperCase(),
    name:        c.title,
    sector:      "US",
    yahooSymbol: c.ticker?.toUpperCase(),
  })).filter(s => s.symbol && s.symbol.length <= 5 && /^[A-Z]+$/.test(s.symbol));

  const count = insertStocks(stocks);
  console.log(`  ✓ SEC/US: inserted ${count} stocks`);
  return count;
}

// ── 4. Yahoo Finance screener — top global stocks by market cap ─
async function seedYahooScreener() {
  console.log("\n📥 Fetching top global stocks from Yahoo Finance screener...");
  let totalCount = 0;
  const exchanges = [
    // London Stock Exchange
    { suffix: ".L",  count: 200, region: "gb", exchange: "LSE" },
    // Tokyo Stock Exchange
    { suffix: ".T",  count: 200, region: "jp", exchange: "TSE" },
    // Hong Kong
    { suffix: ".HK", count: 200, region: "hk", exchange: "HKEX" },
    // Germany (Frankfurt)
    { suffix: ".DE", count: 200, region: "de", exchange: "XETRA" },
    // Australia (ASX)
    { suffix: ".AX", count: 200, region: "au", exchange: "ASX" },
    // Canada (TSX)
    { suffix: ".TO", count: 200, region: "ca", exchange: "TSX" },
    // France
    { suffix: ".PA", count: 100, region: "fr", exchange: "Euronext" },
    // Switzerland
    { suffix: ".SW", count: 100, region: "ch", exchange: "SIX" },
  ];

  for (const exch of exchanges) {
    const url = `https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&lang=en-US&region=${exch.region}&scrIds=most_actives&count=${exch.count}`;
    const json = await fetchJSON(url);
    const quotes = json?.finance?.result?.[0]?.quotes || [];
    if (!quotes.length) {
      // Fallback: use Yahoo search for common exchange symbols
      console.log(`  ⚠ ${exch.exchange}: screener empty, skipping`);
      continue;
    }
    const stocks = quotes.map(q => ({
      symbol:      q.symbol?.replace(exch.suffix, "") || q.symbol,
      name:        q.shortName || q.longName || q.symbol,
      sector:      q.sector || exch.exchange,
      yahooSymbol: q.symbol,
    })).filter(s => s.symbol);
    const count = insertStocks(stocks);
    console.log(`  ✓ ${exch.exchange}: inserted ${count} stocks`);
    totalCount += count;
    await sleep(300);
  }
  return totalCount;
}

// ── 5. Nifty indices — all Nifty 500 + sector indices ───────────
async function seedNiftyIndices() {
  console.log("\n📥 Fetching Nifty index constituents...");
  const indices = [
    { name: "Nifty 500",       url: "https://archives.nseindia.com/content/indices/ind_nifty500list.csv" },
    { name: "Nifty Midcap 150",url: "https://archives.nseindia.com/content/indices/ind_niftymidcap150list.csv" },
    { name: "Nifty Smallcap 250", url: "https://archives.nseindia.com/content/indices/ind_niftysmallcap250list.csv" },
  ];
  let total = 0;
  for (const idx of indices) {
    const csv = await fetchText(idx.url);
    if (!csv) continue;
    const lines = csv.split("\n").slice(1);
    const stocks = [];
    for (const line of lines) {
      const cols = line.split(",");
      const symbol = cols[2]?.trim(); // col 2 = NSE symbol in these CSVs
      const name   = cols[1]?.trim();
      const sector = cols[3]?.trim();
      if (!symbol || symbol === "Symbol") continue;
      stocks.push({ symbol, name, sector: sector || "Indian", yahooSymbol: `${symbol}.NS` });
    }
    const count = insertStocks(stocks);
    console.log(`  ✓ ${idx.name}: inserted ${count} stocks`);
    total += count;
    await sleep(200);
  }
  return total;
}

// ── 6. S&P 500 + NASDAQ 100 + Dow 30 from Wikipedia ────────────
async function seedUSIndices() {
  console.log("\n📥 Fetching S&P 500 / NASDAQ 100 from Wikipedia...");
  let total = 0;

  // S&P 500 via Wikipedia table (public domain data)
  const sp500html = await fetchText("https://en.wikipedia.org/wiki/List_of_S%26P_500_companies");
  if (sp500html) {
    const matches = [...sp500html.matchAll(/title="([A-Z]{1,5})"[^>]*>([A-Z]{1,5})<\/a>/g)];
    // Better approach: parse the wikitable
    const rowMatches = [...sp500html.matchAll(/<tr[^>]*>[\s\S]*?<td[^>]*><a[^>]*>([A-Z.]{1,7})<\/a><\/td>[\s\S]*?<td[^>]*>([^<]+)<\/td>[\s\S]*?<td[^>]*>([^<]+)<\/td>/g)];
    const stocks = rowMatches.slice(0, 505).map(m => ({
      symbol:      m[1]?.trim(),
      name:        m[2]?.trim(),
      sector:      m[3]?.trim() || "US",
      yahooSymbol: m[1]?.trim(),
    })).filter(s => s.symbol && /^[A-Z.]{1,7}$/.test(s.symbol));
    const count = insertStocks(stocks);
    console.log(`  ✓ S&P 500: inserted ${count} stocks`);
    total += count;
  }

  // NASDAQ 100
  const nasdaqHtml = await fetchText("https://en.wikipedia.org/wiki/Nasdaq-100");
  if (nasdaqHtml) {
    const rowMatches = [...nasdaqHtml.matchAll(/<td[^>]*><a[^>]*title="[^"]*"[^>]*>([A-Z]{2,6})<\/a><\/td>/g)];
    const stocks = rowMatches.map(m => ({
      symbol:      m[1]?.trim(),
      name:        m[1]?.trim(),
      sector:      "US Tech",
      yahooSymbol: m[1]?.trim(),
    })).filter(s => s.symbol);
    const count = insertStocks(stocks);
    console.log(`  ✓ NASDAQ 100: inserted ${count} stocks`);
    total += count;
  }
  return total;
}

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log("🌍 StockPulse World Stock Seeder");
  console.log("═".repeat(50));

  const before = db.prepare("SELECT COUNT(*) as c FROM stocks").get().c;
  console.log(`📊 Current stocks in DB: ${before}`);

  let total = 0;
  total += await seedNSE();          await sleep(500);
  total += await seedNiftyIndices(); await sleep(500);
  total += await seedBSE();          await sleep(500);
  total += await seedUS();           await sleep(500);
  total += await seedUSIndices();    await sleep(500);
  total += await seedYahooScreener();

  const after = db.prepare("SELECT COUNT(*) as c FROM stocks").get().c;
  console.log("\n" + "═".repeat(50));
  console.log(`✅ Seeding complete!`);
  console.log(`   Before: ${before} stocks`);
  console.log(`   After:  ${after} stocks`);
  console.log(`   Added:  ${after - before} new stocks`);
  console.log(`\n💡 Now run the nightly pre-fetcher to get financials:`);
  console.log(`   node -e "require('./services/financialsService').prefetchAll()"`);
}

main().catch(console.error).finally(() => process.exit(0));