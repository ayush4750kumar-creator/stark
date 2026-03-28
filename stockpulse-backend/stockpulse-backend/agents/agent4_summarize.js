// agents/agent4_summarize.js
const axios  = require("axios");
const { getDB } = require("../config/database");

const GEMINI_KEY   = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.0-flash";

async function summarizeWithGemini(headline, full_text) {
  const prompt = `Headline: ${headline}\n\nArticle: ${(full_text || "").slice(0, 800)}`;

  const res = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
    {
      systemInstruction: {
        parts: [{
          text: `You are a concise financial news summarizer.
Given a headline and article body, respond with EXACTLY two lines:

Line 1: A 35–45 word summary that gives NEW information NOT already stated in the headline — explain the context, cause, numbers, or implications. Do NOT start with the company name. Do NOT restate or rephrase the headline. Do NOT begin with words that appear in the headline.
Line 2: Start with "Sentiment:" — one sentence stating whether this is positive, negative, or neutral for the stock/market and briefly why.

No labels, no bullet points, no intro text. Just two plain lines.`
        }]
      },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 120,
        temperature: 0.3,
      },
    },
    {
      headers: { "Content-Type": "application/json" },
      timeout: 15000,
    }
  );

  const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  const summary   = lines[0] || "";
  const sentiment = lines.find(l => l.toLowerCase().startsWith("sentiment:")) || lines[1] || "";

  return { summary, sentiment };
}

async function runAgent4(limit = 30) {
  if (!GEMINI_KEY || GEMINI_KEY.length < 10) {
    console.log("⚠ Agent4: GEMINI_API_KEY not set, skipping");
    return 0;
  }

  console.log("\n✍  Agent4 — summarizing with Gemini Flash...");
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

  // Process in batches of 5 — Gemini Flash allows 1M TPM so no rate limit issues
  const BATCH_SIZE = 5;
  const BATCH_DELAY_MS = 500;

  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);

    await Promise.all(batch.map(async (article) => {
      try {
        if (!article.headline?.trim()) {
          console.warn(`  ⚠ Agent4: skipping id ${article.id} — empty headline`);
          failed++;
          return;
        }

        const { summary, sentiment } = await summarizeWithGemini(article.headline, article.full_text);

        await db.query(`
          UPDATE articles
          SET summary_20 = $1, sentiment = $2, processed = 2
          WHERE id = $3
        `, [summary, sentiment, article.id]);

        done++;

      } catch (e) {
        const geminiError = e.response?.data?.error;
        console.error(
          `  ⚠ Agent4 error on id ${article.id}: ${e.message}`,
          geminiError ? `| Gemini: ${geminiError.message}` : ""
        );
        failed++;
      }
    }));

    // Small pause between batches
    if (i + BATCH_SIZE < articles.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  console.log(`✅ Agent4 done — ${done} summarized, ${failed} failed in ${((Date.now()-t0)/1000).toFixed(1)}s`);
  return done;
}

module.exports = { runAgent4 };