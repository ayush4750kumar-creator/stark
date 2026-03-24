// services/sidebarAgent.js
// Pre-fetches ALL right sidebar category data on startup.
// Every category is cached in memory — frontend reads from cache instantly.
// Refreshes every 3 minutes in background.
// NO waiting — if cache is warm, response is < 5ms.

const https = require("https");

// ── In-memory cache ──────────────────────────────────────────────────────
const CACHE = {};          // category → { ts, data }
const CACHE_TTL = 3 * 60 * 1000; // 3 min
let   isWarming = false;

// ── All symbols needed per category ─────────────────────────────────────
const CATEGORY_SYMBOLS = {
  indices:  ["^NSEI","^BSESN","^NSEBANK","^NSEMDCP50","^CNXIT","^CNXPHARMA","^CNXFMCG","^CNXINFRA"],
  gold:     ["GC=F","GLD","IAU",
              "GOLDBEES.NS","HDFCGOLD.NS","AXISGOLD.NS","GOLD1.NS","SBIGOLD.NS",
              "GOLDIETF.NS","BSLGOLDETF.NS","QGOLDHALF.NS","GOLDBETA.NS","GOLDETF.NS",
              "LICMFGOLD.NS","GOLDCASE.NS","AONEGOLD.NS","EGOLD.NS","MOGOLD.NS","GROWWGOLD.NS"],
  silver:   ["SI=F","SLV",
              "SILVERETF.NS","HDFCSILVER.NS","AXISSILVER.NS","KOTAKSILVER.NS",
              "ICICISILVRETF.NS","BSLSILVETF.NS","MIRAESILVER.NS","SILVERIETF.NS",
              "AONESILVER.NS","ESILVER.NS","MOSILVER.NS","GROWWSLVR.NS","SBISILVRETF.NS"],
  tech:     ["TCS.NS","INFY.NS","WIPRO.NS","HCLTECH.NS","TECHM.NS",
              "LTIM.NS","PERSISTENT.NS","COFORGE.NS","MPHASIS.NS","HAPPSTMNDS.NS"],
  oil:      ["CL=F","RELIANCE.NS","ONGC.NS","IOC.NS","BPCL.NS","HINDPETRO.NS"],
  finance:  ["HDFCBANK.NS","ICICIBANK.NS","SBIN.NS","KOTAKBANK.NS",
              "AXISBANK.NS","BAJFINANCE.NS","JPM","BAC","GS"],
  us:       ["^GSPC","^IXIC","^DJI","AAPL","MSFT","NVDA","GOOGL","META","AMZN","TSLA","AMD","NFLX","JPM"],
  mutualfunds: ["NIFTYBEES.NS","JUNIORBEES.NS","BANKBEES.NS","MID150BEES.NS"],
  forex:    ["USDINR=X","EURINR=X","GBPINR=X","EURUSD=X","USDJPY=X","BTC-USD"],
};

// Friendly names for symbols not in your stocks DB
const SYMBOL_NAMES = {
  "^NSEI":"Nifty 50","^BSESN":"Sensex","^NSEBANK":"Bank Nifty",
  "^NSEMDCP50":"Nifty Midcap","^CNXIT":"Nifty IT","^CNXPHARMA":"Nifty Pharma",
  "^CNXFMCG":"Nifty FMCG","^CNXINFRA":"Nifty Infra",
  "^GSPC":"S&P 500","^IXIC":"NASDAQ","^DJI":"Dow Jones",
  "GC=F":"Gold Futures","SI=F":"Silver Futures","CL=F":"Crude Oil Futures",
  "GLD":"SPDR Gold Shares","IAU":"iShares Gold Trust","SLV":"iShares Silver Trust",
  "USDINR=X":"USD/INR","EURINR=X":"EUR/INR","GBPINR=X":"GBP/INR",
  "EURUSD=X":"EUR/USD","USDJPY=X":"USD/JPY","BTC-USD":"Bitcoin",
  "JPM":"JPMorgan Chase","BAC":"Bank of America","GS":"Goldman Sachs",
  "AAPL":"Apple","MSFT":"Microsoft","NVDA":"NVIDIA","GOOGL":"Alphabet",
  "META":"Meta","AMZN":"Amazon","TSLA":"Tesla","AMD":"AMD","NFLX":"Netflix",
  "GOLDBEES.NS":"Nippon India ETF Gold BeES","HDFCGOLD.NS":"HDFC Gold ETF",
  "AXISGOLD.NS":"Axis Gold ETF","GOLD1.NS":"Kotak Gold ETF",
  "SBIGOLD.NS":"SBI Gold ETF","GOLDIETF.NS":"ICICI Prudential Gold ETF",
  "BSLGOLDETF.NS":"Aditya Birla Gold ETF","QGOLDHALF.NS":"Quantum Gold Fund ETF",
  "GOLDBETA.NS":"UTI Gold ETF","GOLDETF.NS":"Mirae Asset Gold ETF",
  "LICMFGOLD.NS":"LIC MF Gold ETF","GOLDCASE.NS":"Zerodha Gold ETF",
  "AONEGOLD.NS":"Angel One Gold ETF","EGOLD.NS":"Edelweiss Gold ETF",
  "MOGOLD.NS":"Motilal Oswal Gold ETF","GROWWGOLD.NS":"Groww Gold ETF",
  "SILVERETF.NS":"Nippon India Silver ETF","HDFCSILVER.NS":"HDFC Silver ETF",
  "AXISSILVER.NS":"Axis Silver ETF","KOTAKSILVER.NS":"Kotak Silver ETF",
  "ICICISILVRETF.NS":"ICICI Prudential Silver ETF","BSLSILVETF.NS":"Aditya Birla Silver ETF",
  "MIRAESILVER.NS":"Mirae Asset Silver ETF","SILVERIETF.NS":"Zerodha Silver ETF",
  "AONESILVER.NS":"Angel One Silver ETF","ESILVER.NS":"Edelweiss Silver ETF",
  "MOSILVER.NS":"Motilal Oswal Silver ETF","GROWWSLVR.NS":"Groww Silver ETF",
  "SBISILVRETF.NS":"SBI Silver ETF",
  "TCS.NS":"Tata Consultancy Services","INFY.NS":"Infosys","WIPRO.NS":"Wipro",
  "HCLTECH.NS":"HCL Technologies","TECHM.NS":"Tech Mahindra","LTIM.NS":"LTIMindtree",
  "PERSISTENT.NS":"Persistent Systems","COFORGE.NS":"Coforge","MPHASIS.NS":"Mphasis",
  "HAPPSTMNDS.NS":"Happiest Minds","RELIANCE.NS":"Reliance Industries",
  "ONGC.NS":"Oil & Natural Gas Corp","IOC.NS":"Indian Oil Corporation",
  "BPCL.NS":"Bharat Petroleum","HINDPETRO.NS":"Hindustan Petroleum",
  "HDFCBANK.NS":"HDFC Bank","ICICIBANK.NS":"ICICI Bank","SBIN.NS":"State Bank of India",
  "KOTAKBANK.NS":"Kotak Mahindra Bank","AXISBANK.NS":"Axis Bank","BAJFINANCE.NS":"Bajaj Finance",
  "NIFTYBEES.NS":"Nippon Nifty 50 BeES","JUNIORBEES.NS":"Nippon Nifty Next 50",
  "BANKBEES.NS":"Nippon Bank BeES","MID150BEES.NS":"Nippon Midcap 150",
};

// ── Unique set of ALL symbols across all categories ──────────────────────
const ALL_SYMBOLS = [...new Set(Object.values(CATEGORY_SYMBOLS).flat())];

// ── HTTP helper ──────────────────────────────────────────────────────────
function httpGet(url, timeout = 8000) {
  return new Promise((resolve, reject) => {
    try {
      const parsed = new URL(url);
      const req = https.request({
        hostname: parsed.hostname,
        path:     parsed.pathname + parsed.search,
        method:   "GET", timeout,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept":     "application/json",
          "Referer":    "https://finance.yahoo.com",
        },
      }, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return httpGet(res.headers.location, timeout).then(resolve).catch(reject);
        }
        const chunks = [];
        res.on("data", d => chunks.push(d));
        res.on("end",  () => resolve(Buffer.concat(chunks).toString("utf8")));
        res.on("error", reject);
      });
      req.on("error",   reject);
      req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
      req.end();
    } catch(e) { reject(e); }
  });
}

// ── Fetch one symbol from Yahoo Finance ─────────────────────────────────
async function fetchSymbol(symbol) {
  try {
    const enc  = encodeURIComponent(symbol);
    const text = await httpGet(
      `https://query2.finance.yahoo.com/v8/finance/chart/${enc}?interval=1d&range=5d&includePrePost=false`
    );
    const meta = JSON.parse(text)?.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) return null;
    const price = meta.regularMarketPrice;
    const prev  = meta.previousClose || meta.chartPreviousClose || price;
    const chg   = price - prev;
    return {
      symbol,
      name:       SYMBOL_NAMES[symbol] || meta.shortName || meta.longName || symbol,
      price:      Math.round(price * 100) / 100,
      change_pct: prev ? Math.round((chg / prev) * 10000) / 100 : 0,
      change_amt: Math.round(chg * 100) / 100,
      currency:   meta.currency || "INR",
    };
  } catch {
    return null;
  }
}

// ── Fetch ALL unique symbols in parallel batches of 25 ───────────────────
async function fetchAllSymbols() {
  console.log(`  📊 SidebarAgent: Fetching ${ALL_SYMBOLS.length} symbols...`);
  const t0 = Date.now();

  // First: pull NSE stocks from your DB (fast, already cached)
  const symbolMap = {};
  const nsSymbols = ALL_SYMBOLS.filter(s => s.endsWith(".NS"));
  const otherSymbols = ALL_SYMBOLS.filter(s => !s.endsWith(".NS"));

  // Get NSE stocks from DB
  try {
    const { getDb } = require("../config/database");
    const db = getDb();
    if (nsSymbols.length) {
      const placeholders = nsSymbols.map(() => "?").join(",");
      const rows = db.prepare(
        `SELECT symbol, name, price, change_pct, change_amt, currency
         FROM stocks WHERE symbol IN (${placeholders}) AND price IS NOT NULL`
      ).all(...nsSymbols);
      rows.forEach(r => {
        symbolMap[r.symbol] = {
          symbol:     r.symbol,
          name:       SYMBOL_NAMES[r.symbol] || r.name,
          price:      r.price,
          change_pct: r.change_pct,
          change_amt: r.change_amt,
          currency:   r.currency || "INR",
        };
      });
    }
  } catch { /* DB not ready, will fall back to Yahoo */ }

  // Also pull ETF agent cache for gold/silver ETFs
  try {
    const { fetchAllETFs } = require("./etfAgent");
    const etfs = await fetchAllETFs();
    etfs.forEach(e => {
      if (!symbolMap[e.symbol] && e.price != null) {
        symbolMap[e.symbol] = {
          symbol:     e.symbol,
          name:       SYMBOL_NAMES[e.symbol] || e.name,
          price:      e.price,
          change_pct: e.change_pct,
          change_amt: e.change_amt,
          currency:   "INR",
        };
      }
    });
  } catch {}

  // For remaining symbols not in DB/ETF cache, fetch from Yahoo in parallel
  const missing = ALL_SYMBOLS.filter(s => !symbolMap[s]);
  if (missing.length > 0) {
    const BATCH = 25;
    for (let i = 0; i < missing.length; i += BATCH) {
      const batch   = missing.slice(i, i + BATCH);
      const results = await Promise.all(batch.map(sym => fetchSymbol(sym).catch(() => null)));
      results.forEach(r => { if (r) symbolMap[r.symbol] = r; });
    }
  }

  console.log(`  ✅ SidebarAgent: ${Object.keys(symbolMap).length}/${ALL_SYMBOLS.length} symbols in ${((Date.now()-t0)/1000).toFixed(1)}s`);
  return symbolMap;
}

// ── Build per-category data from symbol map ──────────────────────────────
function buildCategoryData(symbolMap) {
  const result = {};
  for (const [cat, syms] of Object.entries(CATEGORY_SYMBOLS)) {
    result[cat] = syms.map(sym =>
      symbolMap[sym] || {
        symbol:     sym,
        name:       SYMBOL_NAMES[sym] || sym,
        price:      null,
        change_pct: null,
        change_amt: null,
        currency:   "INR",
      }
    ).filter(s => s.price != null); // only show stocks we have prices for
  }
  return result;
}

// ── Warm all categories ──────────────────────────────────────────────────
async function warmAll(force = false) {
  if (isWarming) return;
  isWarming = true;
  try {
    const symbolMap = await fetchAllSymbols();
    const categoryData = buildCategoryData(symbolMap);

    const now = Date.now();
    for (const [cat, data] of Object.entries(categoryData)) {
      CACHE[cat] = { ts: now, data };
    }
  } catch(e) {
    console.error("  ✗ SidebarAgent warm:", e.message);
  } finally {
    isWarming = false;
  }
}

// ── Public API ───────────────────────────────────────────────────────────
function getCategoryData(category) {
  const cached = CACHE[category];
  if (cached) return cached.data;
  return null; // null = not cached yet, caller should fall back
}

function getAllCategoryData() {
  const result = {};
  for (const [cat, cached] of Object.entries(CACHE)) {
    result[cat] = cached.data;
  }
  return result;
}

function isCacheWarm() {
  return Object.keys(CACHE).length > 0;
}

// ── Auto-refresh every 3 min ─────────────────────────────────────────────
setInterval(() => {
  warmAll(true).catch(() => {});
}, CACHE_TTL);

// ── Warm on startup after 3s (give DB time to init) ──────────────────────
setTimeout(() => {
  warmAll().catch(e => console.error("  ✗ SidebarAgent init:", e.message));
}, 3000);

module.exports = { getCategoryData, getAllCategoryData, isCacheWarm, warmAll };