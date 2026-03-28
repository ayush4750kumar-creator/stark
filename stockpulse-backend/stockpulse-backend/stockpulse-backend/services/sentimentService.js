// services/sentimentService.js
//
// Deep sentiment analysis for stock news articles.
//
// Pipeline:
//  1. Find articles in DB with sentiment = "neutral" or null (unanalyzed)
//  2. Fetch full article text from source_url
//  3. Run weighted keyword + context analysis on full text
//  4. Update sentiment in DB
//
// Run manually:  node -e "require('./services/sentimentService').runBatch()"
// Auto-runs:     called by scheduler every 10 minutes
// ─────────────────────────────────────────────────────────────────────────────

const { getDB } = require("../config/database");
const db    = () => getDB();
const sleep = ms => new Promise(r => setTimeout(r, ms));

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

// ─────────────────────────────────────────────────────────────────────────────
// SENTIMENT ENGINE
// Weighted keyword scoring on full article text with context awareness.
// Each signal has a weight — strong signals (e.g. "record profit") outweigh
// weak ones (e.g. "rise"). Negation handling ("not profitable" → bearish).
// ─────────────────────────────────────────────────────────────────────────────

const BULLISH_SIGNALS = [
  // Strong positive — weight 3
  { w:3, terms:["record profit","record revenue","record high","all-time high",
    "beat estimates","beat expectations","beats estimates","beats expectations",
    "beats wall street","exceeded estimates","exceeded expectations","tops estimates",
    "earnings beat","raised guidance","upgraded target","strong buy",
    "outperform","better than expected","profit jumps","revenue surges","market share gain",
    "landmark deal","major win","buyback","dividend hike","debt-free","turnaround",
    "profit doubles","revenue doubles","highest ever","historic profit","blowout quarter"] },
  // Medium positive — weight 2
  { w:2, terms:["profit up","revenue up","growth accelerates","strong demand","capacity expansion",
    "new order","strategic partnership","contract win","upgrade","overweight",
    "ipo success","listing gains","margin expansion","cash surplus","credit upgrade",
    "market cap crosses","doubles profit","triples revenue","organic growth","synergy",
    "profit rises","net profit","operating profit","ebitda up","beats","exceeds","surpasses",
    "raises forecast","raises outlook","positive surprise","ahead of estimate"] },
  // Mild positive — weight 1
  { w:1, terms:["surge","jump","rally","gain","rise","soar","climb","positive",
    "confident","optimistic","recovery","rebound","improve","grows","expands","launches",
    "invests","diversifies","partnership","award","certification","approval","green",
    "ahead of","strong","robust","healthy","solid","momentum","bullish","beneficiary",
    "wins","secures","inks","signs","adds","acquires","completes","increases"] },
];

const BEARISH_SIGNALS = [
  // Strong negative — weight 3
  { w:3, terms:["record loss","profit warning","missed estimates","missed expectations","earnings miss",
    "cuts guidance","downgraded","strong sell","underperform","worse than expected",
    "massive layoffs","bankruptcy","insolvency","default","fraud","scam","investigation",
    "regulatory action","sebi notice","ed raid","it raid","penalty imposed","ban","delisted",
    "revenue collapses","profit wipeout","major setback","debt trap"] },
  // Medium negative — weight 2
  { w:2, terms:["profit down","revenue down","slowdown","weak demand","margin squeeze","cost pressure",
    "downgrade","sell rating","underweight","plant shutdown","recall","product failure",
    "credit downgrade","cash crunch","stake sale","exits","shutting down","restructuring",
    "impairment","write-off","provisions","npa rises","bad debt","loan default",
    "import duty","tariff hit","currency headwind","below estimates"] },
  // Mild negative — weight 1
  { w:1, terms:["fall","drop","decline","loss","low","cut","concern","risk","warning","crash",
    "slump","weak","disappoints","miss","pressure","volatile","correction","bearish",
    "headwind","challenges","uncertainty","delay","setback","negative","adverse",
    "muted","subdued","cautious","sluggish","below","underperforms","loss-making"] },
];

// Negation words — if these appear within 4 words before a signal, flip its sign
const NEGATIONS = ["not","no","never","without","fails to","unable to","couldn't","didn't","won't",
  "doesn't","haven't","hasn't","nor","neither","lack","lacks","lacking"];

function scoreText(text) {
  if (!text || text.length < 20) return 0;

  const lower = text.toLowerCase();
  // Split into ~word windows for negation detection
  const words  = lower.split(/\s+/);
  let bullScore = 0, bearScore = 0;

  function checkNegated(phrase, position) {
    // Check if any negation word appears in the 5 words before this phrase
    const phraseWords = phrase.split(" ");
    const startPos = Math.max(0, position - 5);
    const context  = words.slice(startPos, position).join(" ");
    return NEGATIONS.some(n => context.includes(n));
  }

  // Score bullish signals
  for (const { w, terms } of BULLISH_SIGNALS) {
    for (const term of terms) {
      const idx = lower.indexOf(term);
      if (idx === -1) continue;
      // Find approximate word position
      const wordPos = lower.slice(0, idx).split(/\s+/).length;
      const negated  = checkNegated(term, wordPos);
      if (negated) bearScore += w;
      else         bullScore += w;
    }
  }

  // Score bearish signals
  for (const { w, terms } of BEARISH_SIGNALS) {
    for (const term of terms) {
      const idx = lower.indexOf(term);
      if (idx === -1) continue;
      const wordPos = lower.slice(0, idx).split(/\s+/).length;
      const negated  = checkNegated(term, wordPos);
      if (negated) bullScore += w;
      else         bearScore += w;
    }
  }

  return bullScore - bearScore; // positive = bullish, negative = bearish
}

function scoresToSentiment(score, textLength) {
  // For very short text (headline only) use lower threshold
  const threshold = textLength > 300 ? 2 : 1;
  if (score >= threshold)  return "bullish";
  if (score <= -threshold) return "bearish";
  return "neutral";
}

// Analyze sentiment from all available text sources
function analyzeSentiment(headline, summary, fullText) {
  // Weight: full article text counts most, headline/summary as tiebreaker
  const fullScore     = scoreText(fullText)  * 2;
  const summaryScore  = scoreText(summary)   * 1;
  const headlineScore = scoreText(headline)  * 1;

  const total     = fullScore + summaryScore + headlineScore;
  const textLen   = (fullText || "").length + (summary || "").length;

  return scoresToSentiment(total, textLen);
}

// ─────────────────────────────────────────────────────────────────────────────
// ARTICLE FETCHER
// Fetches full article text from source_url, strips HTML, returns plain text
// ─────────────────────────────────────────────────────────────────────────────

async function fetchArticleText(url) {
  if (!url || !url.startsWith("http")) return null;

  // Skip paywalled domains that never return content
  const blocked = ["wsj.com","ft.com","bloomberg.com","economist.com","barrons.com","hbr.org"];
  if (blocked.some(d => url.includes(d))) return null;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) return null;

    const html = await res.text();
    if (!html || html.length < 200) return null;

    // Extract meaningful text — remove scripts, styles, nav, footer
    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi,  " ")
      .replace(/<nav[\s\S]*?<\/nav>/gi,       " ")
      .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
      .replace(/<header[\s\S]*?<\/header>/gi, " ")
      .replace(/<aside[\s\S]*?<\/aside>/gi,   " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim();

    // Return up to 4000 chars (enough for sentiment, not too much)
    return cleaned.length > 4000 ? cleaned.slice(0, 4000) : cleaned;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BATCH PROCESSOR
// Finds unanalyzed/neutral stock articles and re-scores them
// ─────────────────────────────────────────────────────────────────────────────

async function runBatch(limit = 50) {
  const d = db();

  // Get articles that need sentiment analysis:
  // - symbol != MARKET (we only want stock-specific sentiment)
  // - sentiment is null, empty, or 'neutral' (never been analyzed with full text)
  // - have a source_url to fetch from
  // - published within last 30 days
  const articles = d.prepare(`
    SELECT id, symbol, headline, summary_20, full_text, source_url, sentiment
    FROM articles
    WHERE symbol IS NOT NULL
      AND symbol != 'MARKET'
      AND source_url IS NOT NULL
      AND source_url != ''
      AND (sentiment IS NULL OR sentiment = '' OR sentiment = 'neutral')
      AND published_at > NOW() - INTERVAL '30 days'
    ORDER BY published_at DESC
    LIMIT ?
  `).all(limit);

  if (!articles.length) {
    console.log("  ✓ Sentiment: no articles need analysis");
    return;
  }

  console.log(`  📊 Sentiment: analyzing ${articles.length} articles...`);
  let updated = 0, fetched = 0, fromText = 0;

  for (const art of articles) {
    try {
      let fullText = art.full_text || null;

      // If we don't have full text yet, fetch from source
      if (!fullText || fullText.length < 100) {
        const fetched_text = await fetchArticleText(art.source_url);
        if (fetched_text && fetched_text.length > 100) {
          fullText = fetched_text;
          fetched++;
          // Also save the fetched text to DB for future use
          d.prepare("UPDATE articles SET full_text = ? WHERE id = ?").run(fullText, art.id);
        }
      } else {
        fromText++;
      }

      const sentiment = analyzeSentiment(art.headline, art.summary_20, fullText);

      // CRITICAL: never downgrade a bullish/bearish to neutral.
      // If full-text fetch failed or returned garbage (paywall/nav text),
      // the score may be 0 even for a clearly directional article.
      // Only write if we're upgrading (neutral → bullish/bearish) or
      // changing direction (bullish → bearish or vice versa).
      const currentSentiment = art.sentiment || "neutral";
      const isUpgrade   = currentSentiment === "neutral" && sentiment !== "neutral";
      const isFlip      = currentSentiment !== "neutral" && sentiment !== "neutral" && sentiment !== currentSentiment;
      const shouldWrite = isUpgrade || isFlip;

      if (shouldWrite) {
        d.prepare("UPDATE articles SET sentiment = ? WHERE id = ?").run(sentiment, art.id);
        updated++;
        console.log(`  ${sentiment === "bullish" ? "▲" : "▼"} ${art.symbol}: ${(art.headline||"").slice(0,55)}`);
      }

      // Polite delay so we don't hammer source sites
      await sleep(200);
    } catch (e) {
      console.log(`  ⚠ Sentiment err ${art.id}: ${e.message}`);
    }
  }

  console.log(`  ✓ Sentiment batch done: ${updated} updated (${fetched} fetched, ${fromText} from DB)`);
}

// Re-analyze ALL articles for a specific symbol (useful after a stock is newly tracked)
async function analyzeSymbol(symbol) {
  const d = db();
  const articles = d.prepare(`
    SELECT id, symbol, headline, summary_20, full_text, source_url, sentiment
    FROM articles
    WHERE symbol = ?
      AND published_at > NOW() - INTERVAL '30 days'
    ORDER BY published_at DESC
    LIMIT 100
  `).all(symbol);

  if (!articles.length) return;
  console.log(`  📊 Sentiment: re-analyzing ${articles.length} articles for ${symbol}`);

  for (const art of articles) {
    try {
      let fullText = art.full_text || null;
      if (!fullText || fullText.length < 100) {
        fullText = await fetchArticleText(art.source_url);
        if (fullText) d.prepare("UPDATE articles SET full_text = ? WHERE id = ?").run(fullText, art.id);
      }
      const sentiment = analyzeSentiment(art.headline, art.summary_20, fullText);
      const cur = art.sentiment || "neutral";
      if ((cur === "neutral" && sentiment !== "neutral") ||
          (cur !== "neutral" && sentiment !== "neutral" && sentiment !== cur)) {
        d.prepare("UPDATE articles SET sentiment = ? WHERE id = ?").run(sentiment, art.id);
      }
      await sleep(150);
    } catch {}
  }
}

// Quick headline-only sentiment (used when article is first saved, before full fetch)
function quickSentiment(headline, summary) {
  const score = scoreText(headline) * 2 + scoreText(summary || "");
  return scoresToSentiment(score, (headline||"").length + (summary||"").length);
}

module.exports = { runBatch, analyzeSymbol, quickSentiment, analyzeSentiment };