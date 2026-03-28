// routes/sidebarRoute.js
// GET /api/sidebar/:category  → instant cached data for that category
// GET /api/sidebar/all        → all categories at once
// POST /api/sidebar/refresh   → force refresh cache

const express = require("express");
const router  = express.Router();

function agent() {
  return require("../services/sidebarAgent");
}

// GET /api/sidebar/all — returns all categories in one shot
router.get("/all", (req, res) => {
  try {
    const data = agent().getAllCategoryData();
    res.json({ success: true, data, warm: agent().isCacheWarm() });
  } catch(e) {
    res.json({ success: false, data: {}, warm: false });
  }
});

// GET /api/sidebar/:category — returns one category
router.get("/:category", (req, res) => {
  try {
    const data = agent().getCategoryData(req.params.category);
    if (data) {
      res.json({ success: true, data, cached: true });
    } else {
      // Cache not warm yet — return empty so frontend falls back gracefully
      res.json({ success: true, data: [], cached: false });
    }
  } catch(e) {
    res.json({ success: true, data: [], cached: false });
  }
});

// POST /api/sidebar/refresh — force refresh
router.post("/refresh", async (req, res) => {
  try {
    res.json({ success: true, message: "Refresh triggered" });
    agent().warmAll(true).catch(() => {});
  } catch(e) {
    res.json({ success: false, error: e.message });
  }
});

module.exports = router;