require('dotenv').config();
const { getDB } = require('./config/database');
const { quickSentiment } = require('./services/sentimentService');
const db = getDB();

const arts = db.prepare(
  "SELECT id, symbol, headline, summary_20 FROM articles WHERE symbol != 'MARKET' AND (sentiment IS NULL OR sentiment = 'neutral') AND published_at > NOW() - INTERVAL '30 days'"
).all();

console.log('Re-scoring', arts.length, 'neutral articles...');
let fixed = 0;
for (const a of arts) {
  const s = quickSentiment(a.headline, a.summary_20 || '');
  if (s !== 'neutral') {
    db.prepare('UPDATE articles SET sentiment = ? WHERE id = ?').run(s, a.id);
    fixed++;
    console.log(s.padEnd(8), a.symbol, (a.headline||'').slice(0,50));
  }
}
console.log('Done — fixed', fixed, 'of', arts.length, 'articles');
process.exit();