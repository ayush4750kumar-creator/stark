// agents/agentF_summarizer.js
// Uses Groq (free, fast) instead of Gemini

const axios   = require("axios");
const cheerio = require("cheerio");
const { getDB } = require("../config/database");

const GROQ_KEY = process.env.GROQ_API_KEY;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";

// ── Scrape article text + og:image ────────────────────────────
async function scrapeArticle(url) {
  if (!url) return { text: null, image: null };
  try {
    const res = await axios.get(url, {
      timeout: 7000,
      headers: { "User-Agent": UA, "Accept": "text/html" },
      maxRedirects: 3,
    });
    const $ = cheerio.load(res.data);
    const image = $('meta[property="og:image"]').attr("content") || null;
    $("script, style, nav, footer, header, .ad, .cookie, .popup").remove();
    let text = null;
    for (const sel of ["article", ".article-body", ".story-body", ".post-content", "main p", ".content p"]) {
      const t = $(sel).text().replace(/\s+/g, " ").trim();
      if (t.length > 200) { text = t.slice(0, 2000); break; }
    }
    if (!text) {
      const t = $("p").text().replace(/\s+/g, " ").trim();
      if (t.length > 100) text = t.slice(0, 2000);
    }
    return { text, image };
  } catch {
    return { text: null, image: null };
  }
}

// ── Keyword sentiment fallback ────────────────────────────────
function keywordSentiment(headline) {
  const lower = (headline || "").toLowerCase();
  const bearish = ["falls","drops","plunges","declines","cuts","misses","downgrade","loss","warning","crash","sink","risk","down","slump","tumble","layoff","fraud","bankruptcy","lawsuit"];
  const bullish = ["surges","jumps","soars","raises","upgrades","beats","profit","wins","rally","growth","rises","buy","bullish","record","expansion","dividend","buyback","acquisition","partnership"];
  for (const w of bearish) if (new RegExp(`\\b${w}\\b`, "i").test(lower)) return "bearish";
  for (const w of bullish) if (new RegExp(`\\b${w}\\b`, "i").test(lower)) return "bullish";
  return "neutral";
}

// ── Groq call ─────────────────────────────────────────────────
async function callGroq(prompt, retrying = false) {
  if (!GROQ_KEY) return null;
  try {
    const res = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        max_tokens: 250,
        temperature: 0.3,
        messages: [
          { role: "system", content: "You are a financial news writer for beginner Indian retail investors. Always respond with valid JSON only. No markdown." },
          { role: "user", content: prompt },
        ],
      },
      { headers: { Authorization: `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" } }
    );
    const raw = res.data.choices[0].message.content.trim();
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch (err) {
    if (err.response?.status === 429 && !retrying) {
      await new Promise(r => setTimeout(r, 8000));
      return callGroq(prompt, true);
    }
    return null;
  }
}

// ── Summarize one article ─────────────────────────────────────
async function summarizeArticle(article) {
  const headline = (article.headline || "").trim();
  const symbol   = article.symbol || "MARKET";

  const { text: scraped, image } = await scrapeArticle(article.source_url);
  const fullText = scraped || article.full_text || "";

  const context = fullText.length > 100
    ? `Headline: "${headline}"\n\nArticle:\n${fullText.slice(0, 1500)}`
    : `Headline: "${headline}"`;

  const prompt = `Stock: ${symbol}
${context}

Return JSON with these exact fields:
{
  "simple_headline": "rewrite in plain English, max 10 words, no source names",
  "short_summary": "2-3 sentences. What happened. Why it matters for the stock. What investors should watch. Simple words, no jargon.",
  "sentiment": "bullish" or "bearish" or "neutral"
}
Return only valid JSON.`;

  const result = await callGroq(prompt);

  return {
    headline:     result?.simple_headline || headline,
    summary_20:   result?.short_summary   || headline,
    sentiment:    result?.sentiment       || keywordSentiment(headline),
    image_url:    image || article.image_url || null,
    full_text:    fullText || article.full_text || "",
  };
}

// ── Main ──────────────────────────────────────────────────────
async function runAgentF(limit = 20) {
  const db = getDB();

  const articles = db.prepare(`
    SELECT id, headline, source_url, source, full_text, symbol, image_url
    FROM articles
    WHERE processed = 0
      AND (importance IS NULL OR importance != 'noise')
      AND headline IS NOT NULL
    ORDER BY id DESC LIMIT ?
  `).all(limit);

  if (!articles.length) return console.log("  ✓ AgentF: no articles to summarize");

  console.log(`  ✍  AgentF: summarizing ${articles.length} articles...`);
  let done = 0;

  // Process in batches of 3 to respect Groq rate limits
  for (let i = 0; i < articles.length; i += 3) {
    const batch = articles.slice(i, i + 3);
    await Promise.all(batch.map(async (article) => {
      try {
        const result = await summarizeArticle(article);
        db.prepare(`
          UPDATE articles SET
            headline     = ?,
            summary_20   = ?,
            sentiment    = ?,
            full_text    = COALESCE(NULLIF(full_text,''), ?),
            image_url    = COALESCE(NULLIF(image_url,''), ?),
            processed    = 2
          WHERE id = ?
        `).run(
          result.headline,
          result.summary_20,
          result.sentiment,
          result.full_text,
          result.image_url,
          article.id
        );
        done++;
      } catch (err) {
        console.error(`  ⚠ AgentF error #${article.id}:`, err.message?.slice(0, 60));
        db.prepare("UPDATE articles SET processed = 2 WHERE id = ?").run(article.id);
      }
    }));
    // 800ms between batches
    if (i + 3 < articles.length) await new Promise(r => setTimeout(r, 800));
  }

  console.log(`  ✅ AgentF: summarized ${done} articles`);
}

module.exports = { runAgentF };