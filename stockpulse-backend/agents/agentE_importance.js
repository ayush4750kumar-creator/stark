const axios = require("axios");
const { getDB } = require("../config/database");

const GROQ_KEY = process.env.GROQ_API_KEY;
const NOISE_SOURCES = ["reddit.com", "twitter.com", "x.com", "quora.com", "blogspot.com", "wordpress.com"];

function isNoisySource(url = "", source = "") {
  const combined = (url + source).toLowerCase();
  return NOISE_SOURCES.some(n => combined.includes(n));
}

async function rateImportance(headline, source, retrying = false) {
  if (!GROQ_KEY) return "medium";
  try {
    const res = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        max_tokens: 60,
        temperature: 0.1,
        messages: [
          { role: "system", content: "You are a financial news editor. Always respond with valid JSON only." },
          { role: "user", content: `Rate this headline's market importance.
Headline: "${headline}"
Source: "${source}"

Return JSON: {"importance":"high"}
importance must be one of: "high", "medium", "low", "noise"
- high: earnings, merger, RBI/Fed policy, FDA approval, major contract
- medium: analyst upgrade, industry trend, new product
- low: minor commentary, general market talk
- noise: opinion, clickbait, lifestyle, irrelevant` },
        ],
      },
      { headers: { Authorization: `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" } }
    );
    const raw = res.data.choices[0].message.content.trim();
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    return parsed.importance || "medium";
  } catch (err) {
    if (err.response?.status === 429 && !retrying) {
      await new Promise(r => setTimeout(r, 6000));
      return rateImportance(headline, source, true);
    }
    return "medium";
  }
}

async function runAgentE(limit = 50) {
  const db = getDB();

  try {
    await db.query("ALTER TABLE articles ADD COLUMN IF NOT EXISTS importance TEXT");
  } catch {}

  const { rows: articles } = await db.query(`
    SELECT id, headline, source, source_url FROM articles
    WHERE importance IS NULL AND headline IS NOT NULL
    ORDER BY id DESC LIMIT $1
  `, [limit]);

  if (!articles.length) return console.log("  ✓ AgentE: no articles to rate");

  console.log(`  🎯 AgentE: rating ${articles.length} articles...`);
  let rated = 0, filtered = 0;

  for (let i = 0; i < articles.length; i += 3) {
    const batch = articles.slice(i, i + 3);
    await Promise.all(batch.map(async (article) => {
      try {
        if (isNoisySource(article.source_url, article.source)) {
          await db.query("UPDATE articles SET importance = 'noise' WHERE id = $1", [article.id]);
          filtered++;
          return;
        }
        const importance = await rateImportance(article.headline, article.source || "");
        await db.query("UPDATE articles SET importance = $1 WHERE id = $2", [importance, article.id]);
        rated++;
      } catch (err) {
        console.error(`  ⚠ AgentE error #${article.id}:`, err.message?.slice(0, 50));
      }
    }));
    if (i + 3 < articles.length) await new Promise(r => setTimeout(r, 600));
  }

  console.log(`  ✅ AgentE: rated ${rated}, filtered ${filtered} noise articles`);
}

module.exports = { runAgentE };