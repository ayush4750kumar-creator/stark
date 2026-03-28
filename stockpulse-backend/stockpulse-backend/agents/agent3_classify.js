// agents/agent3_classify.js
// Classifies articles: tags symbol/company, marks as global or stock-specific

const { getDB } = require("../config/database");
const { INDIAN_STOCKS, GLOBAL_STOCKS } = require("../config/stocks");

const ALL_STOCKS = [...INDIAN_STOCKS, ...GLOBAL_STOCKS];

function detectStock(text) {
  if (!text) return null;
  const t = text.toLowerCase();

  // Try symbol match first (exact word boundary)
  const bySymbol = ALL_STOCKS.find(s =>
    new RegExp(`\\b${s.symbol.toLowerCase()}\\b`).test(t)
  );
  if (bySymbol) return bySymbol;

  // Try full name match
  const byName = ALL_STOCKS.find(s =>
    s.name && t.includes(s.name.toLowerCase())
  );
  if (byName) return byName;

  // Try first word of company name (if >4 chars to avoid false positives)
  return ALL_STOCKS.find(s => {
    if (!s.name) return false;
    const first = s.name.split(" ")[0].toLowerCase();
    return first.length > 4 && t.includes(first);
  }) || null;
}

function normalize(headline) {
  return (headline || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

async function runAgent3(limit = 500) {
  console.log("\n🔍 Agent3 — classifying articles...");
  const db = getDB();
  const t0 = Date.now();

  const { rows: articles } = await db.query(`
    SELECT id, headline, full_text, symbol, region
    FROM articles
    WHERE processed = 0 AND headline IS NOT NULL
    ORDER BY id DESC
    LIMIT $1
  `, [limit]);

  if (!articles.length) {
    console.log("  ✓ Agent3: nothing to classify");
    return 0;
  }

  console.log(`  🔍 Agent3: classifying ${articles.length} articles...`);

  // Deduplicate by headline
  const seen = new Set();
  let dupes = 0, stockTagged = 0, globalCount = 0, stockCount = 0;

  for (const article of articles) {
    const key = normalize(article.headline);

    // Mark duplicate
    if (seen.has(key)) {
      await db.query("UPDATE articles SET processed = -1 WHERE id = $1", [article.id]);
      dupes++;
      continue;
    }
    seen.add(key);

    // Detect stock
    const text    = `${article.headline} ${article.full_text || ""}`;
    const matched = detectStock(text);

    const symbol   = matched?.symbol || article.symbol || null;
    const company  = matched?.name   || null;
    const newsType = symbol ? "stock" : "global";

    if (matched && !article.symbol) stockTagged++;
    if (newsType === "stock") stockCount++;
    else globalCount++;

    await db.query(`
      UPDATE articles
      SET symbol = $1, company = $2, news_type = $3, processed = 1
      WHERE id = $4
    `, [symbol, company, newsType, article.id]);
  }

  console.log(`✅ Agent3 done — ${stockCount} stock-specific, ${globalCount} global, ${dupes} dupes removed, ${stockTagged} newly tagged in ${((Date.now()-t0)/1000).toFixed(1)}s`);
  return articles.length - dupes;
}

module.exports = { runAgent3 };