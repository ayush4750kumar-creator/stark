// agents/agentB.js
// ─────────────────────────────────────────────────────────────
//  AGENT B — Indian Stock Market News Fetcher
//  Sources (in order of priority):
//   1. GNews — per-company targeted search (30-day window)
//   2. GNews — broad Indian market queries
//   3. RSS   — Economic Times, NDTV Profit (free, no key)
// ─────────────────────────────────────────────────────────────

const axios     = require("axios");
const RSSParser = require("rss-parser");
const { v4: uuidv4 } = require("uuid");
const { getDB } = require("../config/database"); const db = () => getDB();

// ── Junk filter ───────────────────────────────────────────────
const JUNK_PATTERNS = [
  /follow us on/i, /follow .* on google/i, /newsletter/i,
  /entering text into/i, /search result below/i,
  /sign up for/i, /subscribe to/i, /click here to/i,
  /seeking alpha on google/i, /latest stock news$/i,
  /packed with expert/i, /new opportunities/i, /fresh ideas/i,
];
function isJunk(h) {
  if (!h || h.length < 15) return true;
  return JUNK_PATTERNS.some(p => p.test(h));
}

const { INDIAN_STOCKS } = require("../config/stocks");

const GNEWS_KEY = process.env.GNEWS_API_KEY;
const rssParser = new RSSParser({ timeout: 10000 });

// ── Detect which Indian stock a headline mentions ─────────────
function detectStock(text) {
  if (!text) return null;
  const t = text.toLowerCase();
  return INDIAN_STOCKS.find(s =>
    t.includes(s.symbol.toLowerCase()) ||
    t.includes(s.name.toLowerCase()) ||
    t.includes(s.name.split(" ")[0].toLowerCase())
  ) || null;
}

// ── Save to DB ────────────────────────────────────────────────
function saveArticle(article) {
  try {
    const info = db().prepare(`
      INSERT INTO articles
        (uuid, symbol, company, headline, full_text, source, source_url, image_url, published_at, agent_source)
      VALUES (?,?,?,?,?,?,?,?,?,'agentB')
    `).run([article.uuid, article.symbol, article.company, article.headline, article.full_text, article.source, article.source_url, article.image_url, article.published_at]);
    return info.changes > 0;
  } catch (err) {
    console.error("AgentB DB error:", err.message);
    return false;
  }
}

// ── GNews search helper ───────────────────────────────────────
async function gnewsSearch(query, country = "in", max = 10) {
  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const res  = await axios.get("https://gnews.io/api/v4/search", {
    params: { q: query, lang: "en", country, max, from, sortby: "publishedAt", apikey: GNEWS_KEY },
    timeout: 10000,
  });
  return res.data?.articles || [];
}

// ── Source 1: GNews — one query per Indian company ────────────
async function fetchGNewsPerCompany() {
  if (!GNEWS_KEY || GNEWS_KEY.length < 10) {
    console.log("⚠️  AgentB: GNews key not set");
    return [];
  }

  const articles = [];

  // Search each stock individually so we get targeted news
  for (const stock of INDIAN_STOCKS) {
    try {
      const query = `"${stock.name}" OR "${stock.symbol}"`;
      const items = await gnewsSearch(query, "in", 5);

      for (const item of items) {
        articles.push({
          uuid:         uuidv4(),
          symbol:       stock.symbol,
          company:      stock.name,
          headline:     item.title           || "",
          full_text:    item.description     || item.content || item.title || "",
          source:       item.source?.name    || "GNews",
          source_url:   item.url             || "",
          image_url:    item.image           || "",
          published_at: item.publishedAt     || new Date().toISOString(),
        });
      }

      // GNews free tier: 100 req/day — space them out
      await new Promise(r => setTimeout(r, 400));
    } catch (err) {
      // Don't log 403 spam — just count it silently
      if (!err.message.includes("403")) {
        console.error(`AgentB GNews error for ${stock.symbol}:`, err.message);
      }
    }
  }

  console.log(`  📡 GNews per-company — ${articles.length} articles`);
  return articles;
}

// ── Source 2: GNews — broad Indian market queries ─────────────
async function fetchGNewsIndia() {
  if (!GNEWS_KEY || GNEWS_KEY.length < 10) return [];

  const articles = [];
  const queries  = [
    "NSE BSE Nifty Sensex",
    "RBI monetary policy India",
    "Indian stock market earnings",
    "SEBI India regulation",
  ];

  for (const q of queries) {
    try {
      const items = await gnewsSearch(q, "in", 5);
      for (const item of items) {
        const matched = detectStock((item.title || "") + " " + (item.description || ""));
        articles.push({
          uuid:         uuidv4(),
          symbol:       matched?.symbol || null,
          company:      matched?.name   || null,
          headline:     item.title           || "",
          full_text:    item.description     || item.content || item.title || "",
          source:       item.source?.name    || "GNews",
          source_url:   item.url             || "",
          image_url:    item.image           || "",
          published_at: item.publishedAt     || new Date().toISOString(),
        });
      }
      await new Promise(r => setTimeout(r, 400));
    } catch (err) {
      if (!err.message.includes("403")) {
        console.error("AgentB GNews broad error:", err.message);
      }
    }
  }

  console.log(`  📡 GNews broad India — ${articles.length} articles`);
  return articles;
}

// ── Source 3: RSS Feeds (free, no key, very reliable) ─────────
const RSS_FEEDS = [
  { url: "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms", source: "Economic Times Markets" },
  { url: "https://feeds.feedburner.com/ndtvprofit-latest",                       source: "NDTV Profit"           },
  { url: "https://www.livemint.com/rss/markets",                                 source: "LiveMint Markets"      },
  { url: "https://economictimes.indiatimes.com/prime/money-and-markets/rssfeeds/58766011.cms", source: "ET Prime Markets" },
];

async function fetchRSSFeeds() {
  const articles = [];

  for (const feed of RSS_FEEDS) {
    try {
      const parsed = await rssParser.parseURL(feed.url);
      const items  = (parsed.items || []).slice(0, 15);

      for (const item of items) {
        const matched = detectStock((item.title || "") + " " + (item.contentSnippet || ""));
        articles.push({
          uuid:         uuidv4(),
          symbol:       matched?.symbol || null,
          company:      matched?.name   || null,
          headline:     item.title                     || "",
          full_text:    item.contentSnippet            || item.content || item.title || "",
          source:       feed.source,
          source_url:   item.link                      || "",
          image_url:    item.enclosure?.url            || "",
          published_at: item.pubDate
            ? new Date(item.pubDate).toISOString()
            : new Date().toISOString(),
        });
      }

      console.log(`  📡 RSS: ${feed.source} — ${items.length} items`);
    } catch (err) {
      console.error(`  ⚠️  RSS error (${feed.source}): ${err.message}`);
    }
  }

  return articles;
}

// ── Main ──────────────────────────────────────────────────────
async function runAgentB() {
  console.log("\n🇮🇳 AgentB starting — fetching Indian market news...");
  const startTime = Date.now();

  // Run RSS immediately (fast, no rate limits)
  // Run GNews in parallel (rate-limited internally)
  const [rss, gnewsCompany, gnewsBroad] = await Promise.all([
    fetchRSSFeeds(),
    fetchGNewsPerCompany(),
    fetchGNewsIndia(),
  ]);

  const allArticles = [...rss, ...gnewsCompany, ...gnewsBroad];
  let saved = 0;
  for (const article of allArticles) {
    if (saveArticle(article)) saved++;
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`✅ AgentB done — fetched ${allArticles.length}, saved ${saved} new articles in ${elapsed}s`);
  return { fetched: allArticles.length, saved };
}

module.exports = { runAgentB };