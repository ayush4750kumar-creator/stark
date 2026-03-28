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
    try { await runAgentE(50); } catch(e) { console.error("❌ AgentE error:", e.message); }

    console.log("\n✍  Running AgentF (summarizer)...");
    try { await runAgentF(20); } catch(e) { console.error("❌ AgentF error:", e.message); }

    console.log("✅ News fetch + AI pipeline complete\n");

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
  const newsMin  = parseInt(process.env.AGENT_RUN_INTERVAL) || 2;
  const priceSec = 120;

  console.log("⏰ Scheduler started");
  console.log(`   Price refresh: every 2 min`);
  console.log(`   News fetch:    every ${newsMin} min`);
  console.log("   AI pipeline:   AgentC → AgentE → AgentF after every fetch\n");

  setTimeout(() => {
    runPricePipeline().then(() => runNewsPipeline());
  }, 2000);

  setTimeout(() => {
    console.log("  🧠 Startup sentiment analysis...");
    runSentimentBatch(200).catch(e => console.error("❌ Sentiment startup error:", e.message));
  }, 15000);

  setInterval(() => runPricePipeline(), priceSec * 1000);

  cron.schedule(`*/${newsMin} * * * *`, () => runNewsPipeline());

  cron.schedule("*/10 * * * *", () => {
    runSentimentBatch(30).catch(e => console.error("❌ Sentiment error:", e.message));
  });

  cron.schedule("30 * * * *", async () => {
    console.log("\n✍  AgentD (hourly Gemini rewriter)...");
    try { await runAgentD(10); } catch(e) { console.error("❌ AgentD error:", e.message); }
  });

  cron.schedule("30 22 * * *", async () => {
    console.log("\n📊 NIGHTLY FINANCIALS PRE-FETCH:", new Date().toLocaleString());
    try { await prefetchAll(); }
    catch (e) { console.error("❌ Financials pre-fetch error:", e.message); }
  });

  cron.schedule("0 0 * * *", async () => {
    try {
      const { getDB } = require("../config/database");
      const result = await getDB().query(
        "DELETE FROM articles WHERE published_at < NOW() - INTERVAL '30 days'"
      );
      console.log(`\n🗑  Cleanup: deleted ${result.rowCount} articles older than 30 days`);
    } catch (e) {
      console.error("❌ Cleanup error:", e.message);
    }
  });
}

module.exports = { startScheduler, runNewsPipeline, runPricePipeline };