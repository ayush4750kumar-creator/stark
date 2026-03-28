// agents/agentF_summarizer.js
// For each article:
// 1. Tries to scrape full text from source_url
// 2. Rewrites headline in simple language
// 3. Generates 20-40 word summary
// 4. Generates full summary (100-150 words)

const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios   = require("axios");
const cheerio = require("cheerio");
const { getDB } = require("../config/database");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function scrapeArticle(url) {
  if (!url) return null;
  try {
    const res = await axios.get(url, {
      timeout: 8000,
      headers: { "User-Agent": UA },
      maxRedirects: 3,
    });
    const $ = cheerio.load(res.data);
    // Remove noise
    $("script, style, nav, footer, header, .ad, .advertisement, .cookie, .popup, .modal").remove();
    // Try common article selectors
    const selectors = ["article", ".article-body", ".story-body", ".post-content", ".entry-content", "main p", ".content p"];
    for (const sel of selectors) {
      const text = $(sel).text().replace(/\s+/g, " ").trim();
      if (text.length > 200) return text.slice(0, 3000);
    }
    // Fallback: all paragraphs
    const text = $("p").text().replace(/\s+/g, " ").trim();
    return text.length > 100 ? text.slice(0, 3000) : null;
  } catch {
    return null;
  }
}

async function summarizeArticle(headline, fullText, source) {
  const content = fullText
    ? `Headline: ${headline}\n\nArticle text: ${fullText.slice(0, 2000)}`
    : `Headline: ${headline}\n\nNo article text available.`;

  const prompt = `You are a financial news summarizer for retail investors in India.

${content}
Source: ${source || "Unknown"}

Reply with ONLY a JSON object (no markdown, no explanation):
{
  "simple_headline": "rewrite headline in simple plain English, max 12 words",
  "short_summary": "20-40 word summary of what happened and why it matters for investors",
  "full_summary": "100-150 word detailed summary explaining the news, impact on stock/market, and what investors should know"
}`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const json = JSON.parse(text.replace(/```json|```/g, "").trim());
    return json;
  } catch {
    return null;
  }
}

async function runAgentF(limit = 30) {
  const db = getDB();
  // Only process articles that are important enough (not noise) and not yet summarized
  const articles = await db.prepare(`
    SELECT id, headline, source_url, source, full_text FROM articles
    WHERE processed = 0
      AND importance IN ('high', 'medium')
      AND headline IS NOT NULL
    ORDER BY id DESC LIMIT ?
  `).all(limit);

  if (!articles.length) return console.log("  ✓ AgentF: no articles to summarize");

  console.log(`  ✍  AgentF: summarizing ${articles.length} articles...`);
  let done = 0;

  for (const article of articles) {
    try {
      // Try to scrape article
      let fullText = article.full_text;
      if (!fullText || fullText.length < 100) {
        fullText = await scrapeArticle(article.source_url);
      }

      const result = await summarizeArticle(article.headline, fullText, article.source);
      if (!result) continue;

      await db.prepare(`
        UPDATE articles SET
          headline    = ?,
          summary_20  = ?,
          summary_long = ?,
          full_text   = COALESCE(NULLIF(full_text,''), ?),
          processed   = 1
        WHERE id = ?
      `).run([
        result.simple_headline || article.headline,
        result.short_summary,
        result.full_summary,
        fullText || "",
        article.id,
      ]);

      done++;
      await new Promise(r => setTimeout(r, 400));
    } catch (err) {
      console.error(`  ⚠ AgentF error for article ${article.id}:`, err.message);
    }
  }

  console.log(`  ✅ AgentF: summarized ${done} articles`);
}

module.exports = { runAgentF };
