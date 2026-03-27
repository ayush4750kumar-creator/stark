// routes/bulkPriceRoute.js
// POST /api/stocks/bulk  { symbols: ["TCS.NS","GC=F","GOLDBEES.NS",...] }
// Returns prices from cache first, Yahoo Finance for misses only.

const express = require("express");
const router  = express.Router();
const https   = require("https");

function httpGet(url, timeout = 6000) {
  return new Promise((resolve, reject) => {
    try {
      const parsed = new URL(url);
      const req = https.request({
        hostname: parsed.hostname,
        path:     parsed.pathname + parsed.search,
        method:   "GET", timeout,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
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

async function fetchFromYahoo(symbol) {
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
      name:       meta.shortName || meta.longName || symbol,
      price:      Math.round(price * 100) / 100,
      change_pct: prev ? Math.round((chg / prev) * 10000) / 100 : 0,
      change_amt: Math.round(chg * 100) / 100,
      currency:   meta.currency || "INR",
    };
  } catch { return null; }
}

router.post("/bulk", async (req, res) => {
  try {
    const symbols = (req.body.symbols || [])
      .filter(s => typeof s === "string" && s.length > 0)
      .slice(0, 60);

    if (!symbols.length) return res.json({ success: true, data: [] });

    // result map: requested symbol → data
    const result = {};

    // ── 1. Check stocks DB ───────────────────────────────────────────────
    // Your DB stores NSE stocks as both "TCS" and "TCS.NS" depending on config.
    // We query for all variants and map results back to the requested symbol.
    try {
      const { getDb } = require("../config/database");
      const db = getDb();

      // Build expanded lookup list: for each symbol try both "TCS.NS" and "TCS"
      const lookup = [];
      const lookupMap = {}; // variant → original requested symbol

      for (const sym of symbols) {
        lookup.push(sym);
        lookupMap[sym] = sym;
        // If has .NS, also try without
        if (sym.endsWith(".NS")) {
          const bare = sym.replace(/\.NS$/, "");
          lookup.push(bare);
          lookupMap[bare] = sym;
        }
        // If no .NS and looks like Indian stock (no special chars), also try with .NS
        else if (!/[^A-Z0-9-]/.test(sym) && sym.length >= 2 && sym.length <= 15) {
          const withNS = sym + ".NS";
          lookup.push(withNS);
          lookupMap[withNS] = sym;
        }
      }

      const unique = [...new Set(lookup)];
      const placeholders = unique.map(() => "?").join(",");

      const rows = db.prepare(
        `SELECT symbol, name, price, change_pct, change_amt, currency
         FROM stocks WHERE symbol IN (${placeholders}) AND price IS NOT NULL`
      ).all(...unique);

      rows.forEach(r => {
        const original = lookupMap[r.symbol];
        if (original && !result[original]) {
          result[original] = { ...r, symbol: original };
        }
      });
    } catch { /* DB not available */ }

    // ── 2. Check ETF agent cache (gold/silver ETFs) ──────────────────────
    try {
      const { fetchAllETFs } = require("../services/etfAgent");
      const etfs = await fetchAllETFs(); // instant from 5-min cache
      etfs.forEach(e => {
        if (!result[e.symbol] && e.price != null) {
          result[e.symbol] = {
            symbol:     e.symbol,
            name:       e.name,
            price:      e.price,
            change_pct: e.change_pct,
            change_amt: e.change_amt,
            currency:   "INR",
          };
        }
      });
    } catch { /* ETF agent not available */ }

    // ── 3. For remaining misses, fetch from Yahoo in parallel ─────────────
    const missing = symbols.filter(s => !result[s]);
    if (missing.length > 0) {
      const fetched = await Promise.all(
        missing.map(sym => fetchFromYahoo(sym).catch(() => null))
      );
      fetched.forEach(r => {
        if (r && !result[r.symbol]) result[r.symbol] = r;
      });
    }

    // Return in original order, filter out nulls
    const data = symbols.map(sym => result[sym] || null).filter(Boolean);
    res.json({ success: true, data });
  } catch (e) {
    console.error("Bulk price error:", e.message);
    res.json({ success: true, data: [] }); // never crash
  }
});

module.exports = router;