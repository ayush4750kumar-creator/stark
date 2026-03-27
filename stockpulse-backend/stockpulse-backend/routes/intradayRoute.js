// routes/intradayRoute.js
const express = require("express");
const router  = express.Router();
const { fetchIntradayStocks } = require("../agents/intradayAgent");

let cache     = null;
let cacheTime = 0;
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

// GET /api/intraday/screen
router.get("/screen", async (req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cacheTime < CACHE_TTL) {
      return res.json({ success: true, data: cache, cached: true, age: Math.round((now - cacheTime) / 1000) });
    }

    console.log("[IntradayRoute] Fetching fresh intraday data from Yahoo Finance...");
    const stocks = await fetchIntradayStocks();

    if (!stocks.length) {
      return res.status(503).json({ success: false, error: "No intraday data available" });
    }

    cache     = stocks;
    cacheTime = now;
    res.json({ success: true, data: stocks, cached: false });
  } catch (err) {
    console.error("[IntradayRoute] Error:", err.message);
    if (cache) return res.json({ success: true, data: cache, cached: true, stale: true });
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/intraday/refresh — force refresh
router.post("/refresh", async (req, res) => {
  try {
    cache = null;
    const stocks = await fetchIntradayStocks();
    cache     = stocks;
    cacheTime = Date.now();
    res.json({ success: true, data: stocks, count: stocks.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;