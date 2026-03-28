// agents/agentD_rewriter.js
// Rewrites headlines + generates summaries using Gemini
// Picks up processed=1 articles, sets processed=2 when done

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { getDB } = require("../config/database");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

async function rewriteArticle(headline, fullText, source) {
  const content = fullText && fullText.length > 100
    ? `Headline: ${headline}\n\nArticle: ${fullText.slice(0, 1500)}`
    : `Headline: ${headline}`;

  const prompt = `You are a financial news editor for Indian retail investors.

${content}
Source: ${source || "Unknown"}

Reply with ONLY a JSON object, no markdown:
{
  "headline": "rewrite in plain English, max 12 words, no jargon",
  "summary": "2-3 sentence summary explaining what happened and why it matters to investors, max 50 words",
  "sentiment": "bullish or bearish or neutral"
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

async function runAgentD(limit = 10) {
  const db = getDB();

  const articles = db.prepare(`
    SELECT id, headline, full_text, source, symbol
    FROM articles
    WHERE processed = 1 AND headline IS NOT NULL
    ORDER BY id DESC LIMIT ?
  `).all(limit);

  if (!articles.length) {
    console.log("  ✓ AgentD: no articles to rewrite");
    return 0;
  }

  console.log(`  ✍  AgentD: rewriting ${articles.length} articles...`);
  let done = 0;

  for (const article of articles) {
    try {
      const result = await rewriteArticle(
        article.headline,
        article.full_text,
        article.source
      );

      db.prepare(`
        UPDATE articles SET
          headline     = ?,
          summary_20   = ?,
          sentiment    = ?,
          processed    = 2
        WHERE id = ?
      `).run(
        result.headline || article.headline,
        result.summary  || "",
        result.sentiment || "neutral",
        article.id
      );

      done++;
      await new Promise(r => setTimeout(r, 500));
    } catch(err) {
      // On rate limit, stop and try next run
      if (err.message && err.message.includes("429")) {
        console.log(`  ⏸  AgentD: rate limited, stopping at ${done}/${articles.length}`);
        break;
      }
      console.error(`  ⚠ AgentD error #${article.id}:`, err.message?.slice(0, 60));
      // Mark as processed=2 with original headline so it doesn't block
      db.prepare("UPDATE articles SET processed = 2 WHERE id = ?").run(article.id);
    }
  }

  console.log(`  ✅ AgentD: rewrote ${done} articles`);
  return done;
}

module.exports = { runAgentD };
