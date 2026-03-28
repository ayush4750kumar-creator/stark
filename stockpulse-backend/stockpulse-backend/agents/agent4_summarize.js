// agents/agent4_summarize.js
const axios  = require("axios");
const { getDB } = require("../config/database");

const GROQ_MODEL = "llama-3.1-8b-instant";

// All 3 keys — each has its own 6k TPM limit
const GROQ_KEYS = [
  process.env.GROQ_API_KEY,
  process.env.GROQ_API_KEY_1,
  process.env.GROQ_API_KEY_2,
].filter(k => k && k.length > 10);

async function summarizeWithKey(apiKey, headline, full_text) {
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
        Authorization: `Bearer ${apiKey}`,
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

// Per-key cooldown tracker
const keyCooldowns = {};

async function summarizeWithRotation(headline, full_text) {
  const now = Date.now();

  // Find a key that's not on cooldown
  const availableKey = GROQ_KEYS.find(k => !keyCooldowns[k] || keyCooldowns[k] <= now);

  if (!availableKey) {
    // All keys on cooldown — wait for the soonest one
    const soonest = Math.min(...GROQ_KEYS.map(k => keyCooldowns[k] || 0));
    const wait = soonest - now + 200;
    console.log(`  ⏳ Agent4: all keys cooling down, waiting ${(wait/1000).toFixed(1)}s...`);
    await new Promise(r => setTimeout(r, wait));
    return summarizeWithRotation(headline, full_text);
  }

  try {
    const result = await summarizeWithKey(availableKey, headline, full_text);
    return result;
  } catch (e) {
    if (e.response?.status === 429) {
      // Put this key on cooldown
      const msg = e.response?.data?.error?.message || "";
      const match = msg.match(/try again in ([0-9.]+)s/i);
      const cooldownMs = match ? Math.ceil(parseFloat(match[1]) * 1000) + 500 : 15000;
      keyCooldowns[availableKey] = Date.now() + cooldownMs;
      console.log(`  ⏳ Agent4: key ...${availableKey.slice(-6)} rate limited, cooling ${(cooldownMs/1000).toFixed(1)}s, trying next key...`);
      // Retry with a different key
      return summarizeWithRotation(headline, full_text);
    }
    throw e;
  }
}

async function runAgent4(limit = 30) {
  if (!GROQ_KEYS.length) {
    console.log("⚠ Agent4: no GROQ_API_KEY set, skipping");
    return 0;
  }

  console.log(`\n✍  Agent4 — summarizing with Groq (${GROQ_KEYS.length} keys)...`);
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

  // Process in batches of 3 (one per key), with a 4s gap between batches
  const BATCH_SIZE = GROQ_KEYS.length;
  const BATCH_DELAY_MS = 4000;

  for (let i = 0; i < articles.length; i += BATCH_SIZE) {
    const batch = articles.slice(i, i + BATCH_SIZE);

    await Promise.all(batch.map(async (article) => {
      try {
        if (!article.headline?.trim()) {
          console.warn(`  ⚠ Agent4: skipping id ${article.id} — empty headline`);
          failed++;
          return;
        }

        const { summary, sentiment } = await summarizeWithRotation(article.headline, article.full_text);

        await db.query(`
          UPDATE articles
          SET summary_20 = $1, sentiment = $2, processed = 2
          WHERE id = $3
        `, [summary, sentiment, article.id]);

        done++;

      } catch (e) {
        const groqError = e.response?.data?.error;
        console.error(
          `  ⚠ Agent4 error on id ${article.id}: ${e.message}`,
          groqError ? `| Groq: [${groqError.type}] ${groqError.message}` : ""
        );
        failed++;
      }
    }));

    if (i + BATCH_SIZE < articles.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  console.log(`✅ Agent4 done — ${done} summarized, ${failed} failed in ${((Date.now()-t0)/1000).toFixed(1)}s`);
  return done;
}

module.exports = { runAgent4 };