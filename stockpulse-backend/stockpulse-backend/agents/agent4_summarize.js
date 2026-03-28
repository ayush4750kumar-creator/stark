// agents/agent4_summarize.js
const axios  = require("axios");
const { getDB } = require("../config/database");

const GROQ_KEY   = process.env.GROQ_API_KEY;
const GROQ_MODEL = "llama-3.1-8b-instant"; // ✅ Updated — llama3-8b-8192 is deprecated

async function summarizeWithGroq(headline, full_text) {
  const content = `Headline: ${headline}\n\nArticle: ${(full_text || "").slice(0, 800)}`;

  const res = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: GROQ_MODEL,
      max_tokens: 120,
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: `You are a concise financial news summarizer. Given a news headline and article, respond with exactly two lines:
Line 1: A neutral 40-word summary of the article.
Line 2: A single sentence about market sentiment starting with "Sentiment:" — state whether this could impact the stock/market positively, negatively, or neutrally and briefly why.
No extra text, no bullet points, just two lines.`,
        },
        { role: "user", content },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${GROQ_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    }
  );

  const text = res.data?.choices?.[0]?.message?.content?.trim() || "";
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  const summary   = lines[0] || "";
  const sentiment = lines.find(l => l.toLowerCase().startsWith("sentiment:")) || lines[1] || "";

  return { summary, sentiment };
}

async function runAgent4(limit = 30) {
  if (!GROQ_KEY || GROQ_KEY.length < 10) {
    console.log("⚠ Agent4: GROQ_API_KEY not set, skipping");
    return 0;
  }

  console.log("\n✍  Agent4 — summarizing with Groq...");
  const db = getDB();
  const t0 = Date.now();

  const { rows: articles } = await db.query(`
    SELECT id, headline, full_text
    FROM articles
    WHERE processed = 1 AND summary_20 IS NULL AND headline IS NOT NULL
    ORDER BY id DESC
    LIMIT $1
  `, [limit]);

  if (!articles.length) {
    console.log("  ✓ Agent4: nothing to summarize");
    return 0;
  }

  console.log(`  ✍  Agent4: summarizing ${articles.length} articles...`);
  let done = 0, failed = 0;

  for (const article of articles) {
    try {
      // ✅ Guard: skip if headline is blank/whitespace
      if (!article.headline?.trim()) {
        console.warn(`  ⚠ Agent4: skipping id ${article.id} — empty headline`);
        failed++;
        continue;
      }

      const { summary, sentiment } = await summarizeWithGroq(article.headline, article.full_text);

      await db.query(`
        UPDATE articles
        SET summary_20 = $1, sentiment = $2, processed = 2
        WHERE id = $3
      `, [summary, sentiment, article.id]);

      done++;
      await new Promise(r => setTimeout(r, 1500));

    } catch (e) {
      // ✅ Log full Groq error body so you can actually debug it
      const groqError = e.response?.data?.error;
      console.error(
        `  ⚠ Agent4 error on id ${article.id}: ${e.message}`,
        groqError ? `| Groq: [${groqError.type}] ${groqError.message}` : ""
      );
      failed++;
    }
  }

  console.log(`✅ Agent4 done — ${done} summarized, ${failed} failed in ${((Date.now()-t0)/1000).toFixed(1)}s`);
  return done;
}

module.exports = { runAgent4 };