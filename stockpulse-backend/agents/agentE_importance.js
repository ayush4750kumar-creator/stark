// agents/agentE_importance.js
// Rates each unprocessed article for market importance using Gemini
// Filters out social media noise (Reddit, X, blogs)
// Marks articles as: impactful / neutral / noise

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { getDB } = require("../config/database");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const NOISE_SOURCES = ["reddit", "twitter", "x.com", "t.co", "quora", "medium.com", "substack", "blogspot", "wordpress"];

function isNoisySource(url = "", source = "") {
  const combined = (url + source).toLowerCase();
  return NOISE_SOURCES.some(n => combined.includes(n));
}

async function rateArticle(headline, source) {
  const prompt = `You are a financial news editor. Rate this news headline for market importance.

Headline: "${headline}"
Source: "${source}"

Reply with ONLY a JSON object like this (no markdown, no explanation):
{"importance": "high", "reason": "earnings beat affects stock price directly"}

importance must be one of: "high", "medium", "low", "noise"
- high: direct market impact (earnings, merger, RBI policy, FDA approval, major contract)
- medium: relevant but indirect (industry trend, analyst upgrade, new product)  
- low: minor news, general market commentary
- noise: opinion, social media, clickbait, irrelevant`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const json = JSON.parse(text.replace(/```json|```/g, "").trim());
    return json;
  } catch {
    return { importance: "medium", reason: "parse error" };
  }
}

async function runAgentE(limit = 50) {
  const db = getDB();
  // Get articles that haven't been importance-rated yet
  const articles = await db.prepare(`
    SELECT id, headline, source, source_url FROM articles
    WHERE importance IS NULL AND headline IS NOT NULL
    ORDER BY id DESC LIMIT ?
  `).all(limit);

  if (!articles.length) return console.log("  ✓ AgentE: no articles to rate");

  console.log(`  🎯 AgentE: rating ${articles.length} articles...`);
  let rated = 0, filtered = 0;

  for (const article of articles) {
    try {
      // Auto-filter noisy sources
      if (isNoisySource(article.source_url, article.source)) {
        await db.prepare("UPDATE articles SET importance = 'noise' WHERE id = ?").run([article.id]);
        filtered++;
        continue;
      }

      const { importance, reason } = await rateArticle(article.headline, article.source || "");
      await db.prepare("UPDATE articles SET importance = ? WHERE id = ?").run([importance, article.id]);
      rated++;

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.error(`  ⚠ AgentE error for article ${article.id}:`, err.message);
    }
  }

  console.log(`  ✅ AgentE: rated ${rated}, filtered ${filtered} noise articles`);
}

module.exports = { runAgentE };
