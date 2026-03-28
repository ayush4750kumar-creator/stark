// agents/agentC_dedup.js
// Deduplicates articles and improves stock tagging
// Runs after A/B, before AgentD
// Sets processed = 1 (ready for Gemini)

const { getDB } = require("../config/database");
const { INDIAN_STOCKS, GLOBAL_STOCKS } = require("../config/stocks");

const ALL_STOCKS = [...(INDIAN_STOCKS || []), ...(GLOBAL_STOCKS || [])];

function detectStock(text) {
  if (!text) return null;
  const t = text.toLowerCase();
  // Exact symbol match first
  const bySymbol = ALL_STOCKS.find(s =>
    new RegExp(`\\b${s.symbol.toLowerCase()}\\b`).test(t)
  );
  if (bySymbol) return bySymbol;
  // Company name match
  return ALL_STOCKS.find(s =>
    s.name && (
      t.includes(s.name.toLowerCase()) ||
      (s.name.split(" ")[0].length > 4 && t.includes(s.name.split(" ")[0].toLowerCase()))
    )
  ) || null;
}

function normalize(headline) {
  return (headline || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

async function runAgentC(limit = 200) {
  const db = getDB();

  // Ensure processed column exists
  try {
    db.prepare("ALTER TABLE articles ADD COLUMN IF NOT EXISTS processed INTEGER DEFAULT 0").run();
  } catch(e) {}

  const articles = db.prepare(`
    SELECT id, headline, symbol, company, full_text, source_url
    FROM articles
    WHERE (processed = 0 OR processed IS NULL) AND headline IS NOT NULL
    ORDER BY id DESC LIMIT ?
  `).all(limit);

  if (!articles.length) {
    console.log("  ✓ AgentC: no new articles");
    return 0;
  }

  console.log(`  🔍 AgentC: processing ${articles.length} articles...`);

  // Deduplicate within this batch
  const seen = new Set();
  let dupes = 0, tagged = 0, ready = 0;

  for (const article of articles) {
    const key = normalize(article.headline);

    // Mark duplicate as noise
    if (seen.has(key)) {
      db.prepare("UPDATE articles SET processed = -1 WHERE id = ?").run(article.id);
      dupes++;
      continue;
    }
    seen.add(key);

    // Improve stock tagging if missing
    let symbol = article.symbol;
    let company = article.company;
    if (!symbol || symbol === "MARKET") {
      const detected = detectStock(article.headline + " " + (article.full_text || ""));
      if (detected) {
        symbol = detected.symbol;
        company = detected.name;
        tagged++;
      }
    }

    // Mark as ready for Gemini (processed = 1)
    db.prepare(`
      UPDATE articles SET processed = 1, symbol = ?, company = ? WHERE id = ?
    `).run(symbol || null, company || null, article.id);
    ready++;
  }

  console.log(`  ✅ AgentC: ${ready} ready, ${dupes} dupes removed, ${tagged} stocks tagged`);
  return ready;
}

module.exports = { runAgentC };
