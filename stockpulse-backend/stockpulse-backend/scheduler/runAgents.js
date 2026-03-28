require("dotenv").config();
const cron = require("node-cron");
const { runAgent1 } = require("../agents/agent1_global");
const { runAgent2 } = require("../agents/agent2_india");
const { runAgent3 } = require("../agents/agent3_classify");
const { runAgent4 } = require("../agents/agent4_summarize");
const { runAgent5 } = require("../agents/agent5_images");
const { refreshAllPrices } = require("../services/stockPriceService");

async function runNewsPipeline() {
  console.log("\n" + "═".repeat(50));
  console.log("📰 NEWS PIPELINE:", new Date().toLocaleString());
  console.log("═".repeat(50));
  try {
    await runAgent1();
    await runAgent2();

    console.log("\n🔍 Running Agent3 (classify)...");
    try { await runAgent3(500); } catch(e) { console.error("❌ Agent3 error:", e.message); }

    console.log("\n✍  Running Agent4 (summarize)...");
    try { await runAgent4(30); } catch(e) { console.error("❌ Agent4 error:", e.message); }

    console.log("\n🖼  Running Agent5 (images)...");
    try { await runAgent5(50); } catch(e) { console.error("❌ Agent5 error:", e.message); }

    console.log("\n✅ News pipeline complete\n");
  } catch (err) {
    console.error("❌ Pipeline error:", err.message);
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
  console.log(`   News pipeline: every ${newsMin} min`);
  console.log("   Flow: Agent1 → Agent2 → Agent3 → Agent4 → Agent5\n");

  setTimeout(() => {
    runPricePipeline().then(() => runNewsPipeline());
  }, 2000);

  setInterval(() => runPricePipeline(), priceSec * 1000);
  cron.schedule(`*/${newsMin} * * * *`, () => runNewsPipeline());

  cron.schedule("0 0 * * *", async () => {
    try {
      const { getDB } = require("../config/database");
      const result = await getDB().query(
        "DELETE FROM articles WHERE published_at < NOW() - INTERVAL '30 days'"
      );
      console.log(`\n🗑  Cleanup: deleted ${result.rowCount} old articles`);
    } catch (e) {
      console.error("❌ Cleanup error:", e.message);
    }
  });
}

module.exports = { startScheduler, runNewsPipeline, runPricePipeline };