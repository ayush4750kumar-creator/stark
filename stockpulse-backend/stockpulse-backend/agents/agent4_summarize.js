// agents/agent4_summarize.js
const axios  = require("axios");
const { getDB } = require("../config/database");

const GROQ_KEY   = process.env.GROQ_API_KEY;
const GROQ_MODEL = "llama-3.1-8b-instant";

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
          content: `You are a concise financial news summarizer.
Given a headline and article body, respond with EXACTLY two lines:

Line 1: A 35–45 word summary that gives NEW information NOT already stated in the headline — explain the context, cause, numbers, or implications. Do NOT start with the company name. Do NOT restate or rephrase the headline. Do NOT begin with words that appear in the headline.
Line 2: Start with "Sentiment:" — one sentence stating whether this is positive, negative, or neutral for the stock/market and briefly why.

No labels, no bullet points, no intro text. Just two plain lines.`,
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

// Retry once after waiting if rate limited
async function summarizeWithRetry(headline, full_text) {
  try {
    return await summarizeWithGroq(headline, full_text);
  } catch (e) {
    const status = e.response?.status;
    if (status === 429) {
      const msg = e.response?.data?.error?.message || "";
      const match = msg.match(/try again in ([0-9.]+)s/i);
      const waitMs = match ? Math.ceil(parseFloat(match[1]) * 1000) + 500 : 15000;
      console.log(`  ⏳ Agent4: rate limited, waiting ${(waitMs/1000).toFixed(1)}s before retry...`);
      await new Promise(r => setTimeout(r, waitMs));
      return await summarizeWithGroq(headline, full_text);
    }
    throw e;
  }
}

async function runAgent4(limit = 15) {
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
      if (!article.headline?.trim()) {
        console.warn(`  ⚠ Agent4: skipping id ${article.id} — empty headline`);
        failed++;
        continue;
      }

      const { summary, sentiment } = await summarizeWithRetry(article.headline, article.full_text);

      await db.query(`
        UPDATE articles
        SET summary_20 = $1, sentiment = $2, processed = 2
        WHERE id = $3
      `, [summary, sentiment, article.id]);

      done++;

      // 12s between each article — keeps us under 6k TPM (~300 tokens/article)
      await new Promise(r => setTimeout(r, 12000));

    } catch (e) {
      const groqError = e.response?.data?.error;
      console.error(
        `  ⚠ Agent4 error on id ${article.id}: ${e.message}`,
        groqError ? `| Groq: [${groqError.type}] ${groqError.message}` : ""
      );
      failed++;
      // Still wait after failure to avoid cascading 429s
      await new Promise(r => setTimeout(r, 12000));
    }
  }

  console.log(`✅ Agent4 done — ${done} summarized, ${failed} failed in ${((Date.now()-t0)/1000).toFixed(1)}s`);
  return done;
}

module.exports = { runAgent4 };