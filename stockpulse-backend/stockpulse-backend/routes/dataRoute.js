// routes/dataRoute.js
const express = require("express");
const router  = express.Router();
const {
  getFOStocks, getFOList, getCommodities, getETFs, getIndices, getMutualFunds,
} = require("../services/dataFetchAgent");

const wrap = fn => async (req, res) => {
  try {
    const data = await fn();
    res.json({ success: true, data });
  } catch (e) {
    console.error(e.message);
    res.json({ success: false, error: e.message });
  }
};

// GET /api/data/fo/list  — live NSE F&O eligible list (symbol + name), cached 24h
router.get("/fo/list",        wrap(getFOList));
// GET /api/data/fo/stocks    — live prices for all F&O stocks
router.get("/fo/stocks",      wrap(getFOStocks));
router.get("/fo/commodities", wrap(getCommodities));
router.get("/screener/etf",   wrap(getETFs));
router.get("/screener/indices", wrap(getIndices));
router.get("/mf",             wrap(getMutualFunds));

module.exports = router;