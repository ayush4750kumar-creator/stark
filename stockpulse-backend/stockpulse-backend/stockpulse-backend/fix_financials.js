// fix_financials.js — run once to clear incomplete cached financials
const { getDB } = require('./config/database');
const db = getDB();

// Delete symbols where fewer than 3 of the 6 key fields are populated
const symbols = db.prepare(`SELECT DISTINCT symbol FROM financials`).all().map(r => r.symbol);

let cleared = 0;
for (const sym of symbols) {
  const rows = db.prepare(`SELECT * FROM financials WHERE symbol=? AND period_type='annual'`).all(sym);
  if (!rows.length) continue;

  const keyFields = ["gross_profit","ebit","op_cashflow","capex","free_cashflow","total_debt"];
  const nonNullCount = keyFields.filter(f => rows.some(r => r[f] != null)).length;

  if (nonNullCount < 3) {
    db.prepare(`DELETE FROM financials WHERE symbol=?`).run(sym);
    console.log(`  🗑  Cleared ${sym} (only ${nonNullCount}/6 key fields)`);
    cleared++;
  } else {
    console.log(`  ✅ Kept ${sym} (${nonNullCount}/6 key fields ok)`);
  }
}

console.log(`\n✅ Cleared ${cleared} incomplete symbols`);
console.log(`   Restart backend — charts will re-fetch fresh data on next view`);