// agents/agent2_india.js
// Fetches Indian market news from RSS + GNews

const axios     = require("axios");
const RSSParser = require("rss-parser");
const { v4: uuidv4 } = require("uuid");
const { getDB } = require("../config/database");
const { INDIAN_STOCKS } = require("../config/stocks");

const GNEWS_KEY = process.env.GNEWS_API_KEY;
const rssParser = new RSSParser({ timeout: 10000 });

const JUNK_PATTERNS = [
  /follow us on/i, /newsletter/i, /sign up for/i, /subscribe to/i, /click here to/i,
];
function isJunk(h) {
  if (!h || h.length < 15) return true;
  return JUNK_PATTERNS.some(p => p.test(h));
}

function extractImage(item) {
  return item["media:content"]?.["$"]?.url
    || item["media:thumbnail"]?.["$"]?.url
    || item.enclosure?.url
    || null;
}

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
        if (!isJunk(item.title)) {
          articles.push({
            uuid:         uuidv4(),
            headline:     item.title || "",
            full_text:    item.contentSnippet || item.content || item.title || "",
            source:       feed.source,
            source_url:   item.link || "",
            image_url:    extractImage(item) || null,
            published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
            region:       "india",
          });
        }
      }
      console.log(`  📡 RSS: ${feed.source} — ${items.length} items`);
    } catch (err) {
      console.error(`  ⚠ RSS error (${feed.source}): ${err.message}`);
    }
  }
  return articles;
}

async function gnewsSearch(query, max = 5) {
  const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const res  = await axios.get("https://gnews.io/api/v4/search", {
    params: { q: query, lang: "en", country: "in", max, from, sortby: "publishedAt", apikey: GNEWS_KEY },
    timeout: 10000,
  });
  return res.data?.articles || [];
}

async function fetchGNewsIndia() {
  if (!GNEWS_KEY || GNEWS_KEY.length < 10) return [];
  const articles = [];
  const queries  = [
    "NSE BSE Nifty Sensex stock market",
    "RBI monetary policy interest rate India",
    "Indian stock market earnings results",
    "SEBI regulation India market",
  ];
  for (const q of queries) {
    try {
      const items = await gnewsSearch(q, 5);
      for (const item of items) {
        if (!isJunk(item.title)) {
          articles.push({
            uuid:         uuidv4(),
            headline:     item.title || "",
            full_text:    item.description || item.content || item.title || "",
            source:       item.source?.name || "GNews",
            source_url:   item.url || "",
            image_url:    item.image || null,
            published_at: item.publishedAt || new Date().toISOString(),
            region:       "india",
          });
        }
      }
      await new Promise(r => setTimeout(r, 400));
    } catch (err) {
      console.error("Agent2 GNews error:", err.message);
    }
  }
  console.log(`  📡 GNews India — ${articles.length} articles`);
  return articles;
}

async function saveArticles(articles) {
  const db = getDB();
  let saved = 0;
  for (const a of articles) {
    try {
      const res = await db.query(`
        INSERT INTO articles
          (uuid, headline, full_text, source, source_url, image_url, published_at, region, processed, agent_source)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0,'agent2')
        ON CONFLICT (uuid) DO NOTHING
      `, [a.uuid, a.headline, a.full_text, a.source, a.source_url, a.image_url, a.published_at, a.region]);
      if (res.rowCount > 0) saved++;
    } catch (e) {
      console.error("Agent2 DB error:", e.message);
    }
  }
  return saved;
}

async function runAgent2() {
  console.log("\n🇮🇳 Agent2 — fetching Indian market news...");
  const t0 = Date.now();

  const [rss, gnews] = await Promise.all([fetchRSSFeeds(), fetchGNewsIndia()]);
  const all = [...rss, ...gnews];
  const saved = await saveArticles(all);

  console.log(`✅ Agent2 done — ${all.length} fetched, ${saved} new in ${((Date.now()-t0)/1000).toFixed(1)}s`);
  return { fetched: all.length, saved };
}

module.exports = { runAgent2 };