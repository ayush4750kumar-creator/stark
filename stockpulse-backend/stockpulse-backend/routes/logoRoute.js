// routes/logoRoute.js
// GET /api/logos?symbols=TCS,INFY,RELIANCE
// Returns { data: { TCS: "data:image/png;base64,...", INFY: null, ... } }
// Logos are fetched server-side (no CORS issues) and cached in DB

const express = require("express");
const router  = express.Router();

function svc() { return require("../services/logoService"); }

// Batch endpoint — called by frontend with comma-separated symbols
router.get("/", async (req, res) => {
  try {
    const symbols = (req.query.symbols || "")
      .split(",")
      .map(s => s.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 100);

    if (!symbols.length) return res.json({ success: true, data: {} });

    const data = await svc().getLogosMap(symbols);
    res.json({ success: true, data });
  } catch(e) {
    console.error("Logo route error:", e.message);
    res.json({ success: true, data: {} });
  }
});

// Single symbol
router.get("/:symbol", async (req, res) => {
  try {
    const url = await svc().getLogoUrl(req.params.symbol.toUpperCase());
    res.json({ success: true, symbol: req.params.symbol.toUpperCase(), logoUrl: url || null });
  } catch(e) {
    res.json({ success: true, symbol: req.params.symbol.toUpperCase(), logoUrl: null });
  }
});

module.exports = router;