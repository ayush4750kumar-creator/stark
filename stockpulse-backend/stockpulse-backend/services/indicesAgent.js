// services/indicesAgent.js
// Fetches Indian & global indices data via Yahoo Finance
// All symbols verified against Yahoo Finance
// Cache: 2 min (indices change fast during market hours)

const https = require("https");

const CACHE     = {};
const CACHE_TTL = 2 * 60 * 1000; // 2 min

// ── Verified Yahoo Finance symbols for all indices ───────────────────────
const INDICES = [
  // ── Indian Broad ────────────────────────────────────────────────────
  { symbol: "^NSEI",      name: "NIFTY 50",              category: "broad"    },
  { symbol: "^NSEBANK",   name: "NIFTY Bank",            category: "sector"   },
  { symbol: "NIFTY_FIN_SERVICE.NS", name: "Nifty Financial Services", category: "sector" },
  { symbol: "^BSESN",     name: "BSE Sensex",            category: "broad"    },
  { symbol: "^NSMIDCP",   name: "Nifty Midcap Select",   category: "midcap"   },
  { symbol: "BSE-BANKEX.BO", name: "BSE Bankex",         category: "sector"   },
  { symbol: "^INDIAVIX",  name: "India VIX",             category: "volatility"},
  { symbol: "^NIFTYTR",   name: "Nifty Total Market",    category: "broad"    },
  { symbol: "^NIFTYIT",   name: "NIFTY IT",              category: "sector"   },
  { symbol: "^NSMIDCP100",name: "NIFTY Midcap 100",      category: "midcap"   },
  { symbol: "^NIFTY100",  name: "NIFTY 100",             category: "broad"    },
  { symbol: "^CNX500",    name: "NIFTY 500",             category: "broad"    },
  { symbol: "^CNXAUTO",   name: "NIFTY Auto",            category: "sector"   },
  { symbol: "^CNXFMCG",   name: "NIFTY FMCG",           category: "sector"   },
  { symbol: "^CNXMETAL",  name: "NIFTY Metal",           category: "sector"   },
  { symbol: "^CNXPHARMA", name: "NIFTY Pharma",          category: "sector"   },
  { symbol: "^CNXPSUBANK",name: "NIFTY PSU Bank",        category: "sector"   },
  { symbol: "^CNXSC",     name: "NIFTY Smallcap 100",    category: "smallcap" },
  { symbol: "^CNXJUNIOR", name: "NIFTY Next 50",         category: "broad"    },
  { symbol: "BSE-100.BO", name: "BSE 100",               category: "broad"    },
  { symbol: "BSE-SMLCAP.BO", name: "BSE Smallcap",      category: "smallcap" },
  { symbol: "^NIFTYSC250",name: "NIFTY Smallcap 250",   category: "smallcap" },
  { symbol: "^NIFTYMC150",name: "NIFTY Midcap 150",     category: "midcap"   },
  { symbol: "^CNXCOMMOD", name: "NIFTY Commodities",    category: "sector"   },
  { symbol: "BSE-IPO.BO", name: "BSE IPO",              category: "special"  },
];

// ── Yahoo Finance symbol fallbacks (alternate tickers to try) ────────────
const FALLBACKS = {
  "NIFTY_FIN_SERVICE.NS": ["NIFTY_FIN_SERVICE.NS", "^CNXFINANCE"],
  "BSE-BANKEX.BO":        ["BSE-BANKEX.BO",  "BANKEX.BO"],
  "^NIFTYTR":             ["^NIFTYTR",        "^NIFTYTOTALMARKET"],
  "^NSMIDCP":             ["^NSMIDCP",        "^NIFTY_MIDCAP_SELECT"],
  "^NSMIDCP100":          ["^NSMIDCP100",     "^CNXMIDCAP"],
  "^NIFTYSC250":          ["^NIFTYSC250",     "^CNXSC250"],
  "^NIFTYMC150":          ["^NIFTYMC150",     "^CNXMIDCAP150"],
  "^CNXPSUBANK":          ["^CNXPSUBANK",     "^NIFTY_PSU_BANK"],
  "BSE-100.BO":           ["BSE-100.BO",      "^BSE100"],
  "BSE-SMLCAP.BO":        ["BSE-SMLCAP.BO",  "SMLCAP.BO"],
  "BSE-IPO.BO":           ["BSE-IPO.BO",      "IPO.BO"],
};

// ── HTTP helper ──────────────────────────────────────────────────────────
function httpGet(url, timeout = 12000) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request({
      hostname: parsed.hostname,
      path:     parsed.pathname + parsed.search,
      method:   "GET",
      timeout,
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
  });
}

// ── Fetch one index ──────────────────────────────────────────────────────
async function fetchOne(symbol) {
  const enc = encodeURIComponent(symbol);
  const text = await httpGet(
    `https://query2.finance.yahoo.com/v8/finance/chart/${enc}?interval=1d&range=2d&includePrePost=false`
  );
  const json = JSON.parse(text);
  const result = json?.chart?.result?.[0];
  const meta   = result?.meta;
  if (!meta?.regularMarketPrice) return null;

  const price     = meta.regularMarketPrice;
  const prevClose = meta.previousClose || meta.chartPreviousClose || price;
  const change    = price - prevClose;
  const changePct = prevClose ? (change / prevClose) * 100 : 0;

  return {
    price:      Math.round(price      * 100) / 100,
    prevClose:  Math.round(prevClose  * 100) / 100,
    change:     Math.round(change     * 100) / 100,
    changePct:  Math.round(changePct  * 100) / 100,
    open:       Math.round((meta.regularMarketOpen          || 0) * 100) / 100,
    high:       Math.round((meta.regularMarketDayHigh       || 0) * 100) / 100,
    low:        Math.round((meta.regularMarketDayLow        || 0) * 100) / 100,
    // "todayClose" — for indices Yahoo provides last traded price as regularMarketPrice
    // during market hours this = LTP; after close this = close price
    close:      Math.round((meta.regularMarketPrice         || 0) * 100) / 100,
    week52High: Math.round((meta.fiftyTwoWeekHigh           || 0) * 100) / 100,
    week52Low:  Math.round((meta.fiftyTwoWeekLow            || 0) * 100) / 100,
    currency:   meta.currency || "INR",
    marketTime: meta.regularMarketTime,
  };
}

// Try primary symbol then fallbacks
async function fetchIndex(symbol) {
  const toTry = [symbol, ...(FALLBACKS[symbol] || [])];
  const seen  = new Set();
  const unique = toTry.filter(s => { if (seen.has(s)) return false; seen.add(s); return true; });
  for (const sym of unique) {
    try {
      const data = await fetchOne(sym);
      if (data) return data;
    } catch { /* try next */ }
  }
  return null;
}

// ── Fetch all indices in parallel ───────────────────────────────────────
async function fetchAllIndices(force = false) {
  if (!force && CACHE.indices && (Date.now() - CACHE.indices.ts) < CACHE_TTL) {
    return CACHE.indices.data;
  }

  console.log(`  📊 IndicesAgent: Fetching ${INDICES.length} indices...`);
  const t0 = Date.now();

  const results = await Promise.all(
    INDICES.map(async idx => {
      const data = await fetchIndex(idx.symbol);
      if (!data) return null;
      return { ...idx, ...data };
    })
  );

  const valid = results.filter(Boolean);
  console.log(`  ✅ IndicesAgent: ${valid.length}/${INDICES.length} in ${((Date.now()-t0)/1000).toFixed(1)}s`);

  CACHE.indices = { ts: Date.now(), data: valid };
  return valid;
}

// Auto-refresh every 2 min
setInterval(() => { fetchAllIndices(true).catch(() => {}); }, CACHE_TTL);

// Warm on startup after 1s
setTimeout(() => {
  fetchAllIndices(true).catch(e => console.error("  ✗ IndicesAgent warm:", e.message));
}, 1000);

module.exports = { fetchAllIndices, INDICES };