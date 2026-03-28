// scheduler/runAgents.js
// Python AI runs separately as a persistent process — Node never spawns it
// Start Python manually: py -3.11 agents/agentC_agentD.py --loop

require("dotenv").config();
const cron = require("node-cron");
const { runAgentA } = require("../agents/agentA");
const { runAgentB } = require("../agents/agentB");
const { runAgentE } = require("../agents/agentE_importance");
const { runAgentF } = require("../agents/agentF_summarizer");
const { runAgentC } = require("../agents/agentC_dedup");
const { runAgentD } = require("../agents/agentD_rewriter");
const { refreshAllPrices } = require("../services/stockPriceService");
const { prefetchAll } = require("../services/financialsService");
const { runBatch: runSentimentBatch } = require("../services/sentimentService");

async function runNewsPipeline() {
  console.log("\n" + "═".repeat(50));
  console.log("📰 NEWS FETCH:", new Date().toLocaleString());
  console.log("═".repeat(50));
  try {
    await runAgentA();
    await runAgentB();
    console.log("\n🔍 Running AgentC (dedup + tag)...");
    try { await runAgentC(300); } catch(e) { console.error("❌ AgentC error:", e.message); }
    console.log("\n🎯 Running AgentE (importance filter)...");
    // AgentE runs hourly (see cron below)    console.log("✅ News fetch + AI pipeline complete\n");
    // Run sentiment analysis on fresh articles (non-blocking, after news saved)
    setTimeout(() => {
      runSentimentBatch(80).catch(e => console.error("❌ Sentiment error:", e.message));
    }, 3000);
  } catch (err) {
    console.error("❌ News fetch error:", err.message);
  }
}

async function runPricePipeline() {
  console.log("\n" + "─".repeat(40));
  console.log("💹 PRICE REFRESH:", new Date().toLocaleString());
  try { await refreshAllPrices(); }
  catch (err) { console.error("❌ Price error:", err.message); }
}

function startScheduler() {
  const newsMin  = parseInt(process.env.AGENT_RUN_INTERVAL) || 5;
  const priceSec = 120;

  console.log("⏰ Scheduler started");
  console.log(`   Price refresh: every 2 min`);
  console.log(`   News fetch:    every ${newsMin} min`);
  console.log("   AI pipeline:   run separately → py -3.11 agents/agentC_agentD.py --loop\n");

  // On startup: prices + news only (NO financials prefetch — it burns AV keys)
  setTimeout(() => {
    runPricePipeline().then(() => runNewsPipeline());
  }, 2000);

  // Sentiment analysis on startup — catch any articles missed since last run
  setTimeout(() => {
    console.log("  🧠 Startup sentiment analysis...");
    runSentimentBatch(200).catch(e => console.error("❌ Sentiment startup error:", e.message));
  }, 15000);

  // Price every 2 minutes
  setInterval(() => runPricePipeline(), priceSec * 1000);

  // News every N minutes
  cron.schedule(`*/${newsMin} * * * *`, () => runNewsPipeline());

  // Sentiment catch-up every 10 minutes — analyze any remaining neutral articles
  cron.schedule("*/10 * * * *", () => {
    runSentimentBatch(30).catch(e => console.error("❌ Sentiment error:", e.message));
  });

  // Nightly at 10:30pm — pre-fetch financials (AV keys reset daily, safe to run once)
  // This runs ONCE per day overnight so it doesn't block user requests
  cron.schedule("30 22 * * *", async () => {
    console.log("\n📊 NIGHTLY FINANCIALS PRE-FETCH:", new Date().toLocaleString());
    try { await prefetchAll(); }
    catch (e) { console.error("❌ Financials pre-fetch error:", e.message); }
  });

  // Nightly at midnight — delete articles older than 30 days
  cron.schedule("0 0 * * *", () => {
    try {
      const { getDB } = require("../config/database");
      const result = getDB().prepare(
        "DELETE FROM articles WHERE published_at::timestamptz < NOW() - INTERVAL '30 days'"
      ).run();
      console.log(`\n🗑  Cleanup: deleted ${result.changes} articles older than 30 days`);
    } catch (e) {
      console.error("❌ Cleanup error:", e.message);
    }
  });

  // NOTE: Startup financials prefetch REMOVED intentionally.
  // The old code called prefetchAll() on startup which immediately fired
  // 100+ Alpha Vantage API calls, exhausting all daily quotas before any
  // user request could succeed. Financials are now fetched on-demand only
  // (when a user opens the Stats Graphs tab) and cached for 90 days.
}

module.exports = { startScheduler, runNewsPipeline, runPricePipeline };
// AgentE + AgentF hourly — 5+10 articles max to stay within free tier (120+240/day)
cron.schedule("15 * * * *", async () => {
  console.log("\n🎯 AgentE (hourly)...");
  try { await runAgentE(5); } catch(e) { console.error("❌ AgentE error:", e.message); }
  console.log("\n✍  AgentF (hourly)...");
  try { await runAgentF(10); } catch(e) { console.error("❌ AgentF error:", e.message); }
});

// AgentD — Gemini rewriter, hourly, 10 articles max (stays within free tier)
cron.schedule("30 * * * *", async () => {
  console.log("\n✍  AgentD (hourly Gemini rewriter)...");
  try { await runAgentD(10); } catch(e) { console.error("❌ AgentD error:", e.message); }
});
