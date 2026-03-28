// routes/indicesRoute.js
// GET /api/indices/all   → all indices
// POST /api/indices/refresh → force refresh

const express = require("express");
const router  = express.Router();
const { fetchAllIndices } = require("../services/indicesAgent");

router.get("/all", async (req, res) => {
  try {
    const data = await fetchAllIndices();
    res.json({ success: true, data, total: data.length });
  } catch (e) {
    console.error("Indices route error:", e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post("/refresh", async (req, res) => {
  try {
    const data = await fetchAllIndices(true);
    res.json({ success: true, data, total: data.length, message: "Refreshed" });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;