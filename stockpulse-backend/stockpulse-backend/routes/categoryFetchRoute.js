// routes/categoryFetchRoute.js
// POST /api/fetch/category  { symbols: ["TCS","INFY",...] }
// Triggers agentA (news fetch) for any symbol not recently fetched.
// Called by the frontend when a user clicks a right-sidebar category.

const express = require("express");
const router  = express.Router();
const { getDB } = require("../config/database");

// Debounce: don't re-fetch a symbol if it was fetched in the last 5 minutes
const FETCH_COOLDOWN_MS = 1 * 60 * 1000;
const lastFetched = {};  // symbol → timestamp (in-memory, resets on server restart)

router.post("/category", async (req, res) => {
  const { symbols } = req.body;
  if (!Array.isArray(symbols) || !symbols.length) {
    return res.json({ success: false, message: "No symbols provided" });
  }

  const now     = Date.now();
  const toFetch = symbols.filter(sym => {
    const last = lastFetched[sym] || 0;
    return (now - last) > FETCH_COOLDOWN_MS;
  });

  if (!toFetch.length) {
    return res.json({ success: true, message: "All symbols recently fetched", fetched: [] });
  }

  // Mark as fetching immediately to prevent duplicate triggers
  toFetch.forEach(sym => { lastFetched[sym] = now; });

  // Run in background — don't await so the response returns immediately
  (async () => {
    try {
      // Try to import agentA — it's the main news fetcher
      let runAgentA;
      try { ({ runAgentA } = require("../agents/agentA")); } catch {}

      if (runAgentA) {
        // If agentA accepts a symbols list, pass it; otherwise run full fetch
        for (const sym of toFetch) {
          try {
            await runAgentA(sym);
          } catch (e) {
            console.log(`  ⚠ Category fetch error for ${sym}:`, e.message);
          }
        }
      } else {
        // Fallback: directly insert a fetch task into the queue if agentA not available
        // Try the newsService fetch approach
        try {
          const { fetchNewsForSymbol } = require("../services/newsAgentService");
          if (fetchNewsForSymbol) {
            for (const sym of toFetch) {
              await fetchNewsForSymbol(sym).catch(() => {});
            }
          }
        } catch {}
      }

      console.log(`  ✓ Category fetch complete for: ${toFetch.join(", ")}`);
    } catch (e) {
      console.error("  ✗ Category fetch error:", e.message);
      // Reset timestamps so retry is possible
      toFetch.forEach(sym => { lastFetched[sym] = 0; });
    }
  })();

  // Respond immediately — fetch runs in background
  res.json({
    success: true,
    message: `Fetching news for ${toFetch.length} symbols`,
    fetched: toFetch,
    skipped: symbols.filter(s => !toFetch.includes(s)),
  });
});

module.exports = router;