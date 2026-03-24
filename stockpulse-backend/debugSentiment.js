require('dotenv').config();
const { getDB } = require('./config/database');
const db = getDB();

// Show 20 recent stock headlines with their current sentiment
const arts = db.prepare(
  "SELECT id, symbol, headline, sentiment FROM articles WHERE symbol != 'MARKET' ORDER BY published_at DESC LIMIT 20"
).all();

console.log('\n=== RECENT STOCK HEADLINES ===\n');
arts.forEach(a => {
  console.log(`[${(a.sentiment||'null').padEnd(8)}] ${a.symbol.padEnd(12)} ${(a.headline||'').slice(0,80)}`);
});
process.exit();