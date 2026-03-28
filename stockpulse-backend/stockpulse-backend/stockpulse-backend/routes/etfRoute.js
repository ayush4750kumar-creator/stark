// routes/etfRoute.js
// GET /api/etf/all        → all ETFs
// GET /api/etf/gold       → gold only
// GET /api/etf/silver     → silver only
// GET /api/etf/nifty50    → nifty50 only

const express = require("express");
const router  = express.Router();
const { fetchAllETFs } = require("../services/etfAgent");

// Helper: send filtered data
async function sendFiltered(res, category) {
  try {
    const all = await fetchAllETFs();
    const data = category === "all"
      ? all
      : all.filter(e => e.category === category);
    res.json({ success: true, data, total: data.length });
  } catch (e) {
    console.error("ETF route error:", e.message);
    res.status(500).json({ success: false, error: e.message });
  }
}

router.get("/all",     (req, res) => sendFiltered(res, "all"));
router.get("/gold",    (req, res) => sendFiltered(res, "gold"));
router.get("/silver",  (req, res) => sendFiltered(res, "silver"));
router.get("/nifty50", (req, res) => sendFiltered(res, "nifty50"));

// Force refresh
router.post("/refresh", async (req, res) => {
  try {
    const data = await fetchAllETFs(true);
    res.json({ success: true, data, total: data.length, message: "Cache refreshed" });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;