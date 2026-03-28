// reset_for_reprocessing.js
// Resets all articles to processed=0 so AgentC/D re-analyses with full scraping
const { getDB } = require('./config/database');
const db = getDB();

// Reset only articles that haven't been properly processed yet
// (neutral sentiment likely means they were never properly analysed)
const r1 = db.prepare(`
  UPDATE articles SET processed = 0
  WHERE agent_source = 'instant'
  AND (sentiment = 'neutral' OR sentiment IS NULL OR processed != 2)
`).run();

const r2 = db.prepare(`
  UPDATE articles SET processed = 0
  WHERE processed = 0 OR processed IS NULL
`).run();

console.log(`✅ Reset ${r1.changes} instant articles for reprocessing`);
console.log(`✅ Total unprocessed queue: ${db.prepare("SELECT COUNT(*) as c FROM articles WHERE processed = 0").get().c} articles`);
console.log(`\nNow restart: py -3.11 agents/agentC_agentD.py --loop`);