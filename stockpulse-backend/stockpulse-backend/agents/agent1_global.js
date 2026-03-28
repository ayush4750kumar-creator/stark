// agents/agent1_global.js
// Fetches global market news from RSS feeds + Finnhub

const RSSParser = require("rss-parser");
const axios     = require("axios");
const { v4: uuidv4 } = require("uuid");
const { getDB } = require("../config/database");

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
const rss = new RSSParser({
  timeout: 12000,
  headers: { "User-Agent": "Mozilla/5.0 (compatible; Gramble/1.0)" },
});

const JUNK_PATTERNS = [
  /follow us on/i, /newsletter/i, /sign up for/i,
  /subscribe to/i, /click here to/i, /no description/i,
];
function isJunk(h) {
  if (!h || h.length < 15) return true;
  return JUNK_PATTERNS.some(p => p.test(h));
}

const RSS_FEEDS = [
  { url: "https://feeds.reuters.com/reuters/businessNews",              name: "Reuters Business"  },
  { url: "https://feeds.reuters.com/reuters/companyNews",               name: "Reuters Companies" },
  { url: "https://finance.yahoo.com/rss/topfinstories",                 name: "Yahoo Finance"     },
  { url: "https://finance.yahoo.com/news/rssindex",                     name: "Yahoo Finance News"},
  { url: "https://feeds.marketwatch.com/marketwatch/topstories",        name: "MarketWatch"       },
  { url: "https://feeds.marketwatch.com/marketwatch/marketpulse",       name: "MarketWatch Pulse" },
  { url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114", name: "CNBC Markets"  },
  { url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664",  name: "CNBC Money"    },
  { url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000108",  name: "CNBC Economy"  },
  { url: "https://feeds.a.dj.com/rss/RSSMarketsMain.xml",               name: "WSJ Markets"       },
  { url: "https://feeds.a.dj.com/rss/WSJcomUSBusiness.xml",             name: "WSJ Business"      },
  { url: "https://www.nasdaq.com/feed/rssoutbound?category=Markets",    name: "Nasdaq Markets"    },
  { url: "https://www.nasdaq.com/feed/rssoutbound?category=Earnings",   name: "Nasdaq Earnings"   },
  { url: "https://www.thestreet.com/.rss/full/",                        name: "TheStreet"         },
  { url: "https://markets.businessinsider.com/rss/news",                name: "Business Insider"  },
  { url: "https://seekingalpha.com/market_currents.xml",                name: "Seeking Alpha"     },
];

function extractImage(item) {
  return item["media:content"]?.["$"]?.url
    || item["media:thumbnail"]?.["$"]?.url
    || item.enclosure?.url
    || null;
}

async function fetchRSS(url, sourceName, limit = 20) {
  try {
    const feed = await rss.parseURL(url);
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return (feed.items || []).slice(0, limit)
      .filter(item => new Date(item.pubDate || item.isoDate || 0).getTime() > cutoff)
      .filter(item => !isJunk(item.title || ""))
      .map(item => ({
        uuid:         uuidv4(),
        headline:     (item.title || "").trim(),
        full_text:    (item.contentSnippet || item.description || item.title || "").trim(),
        source:       sourceName,
        source_url:   item.link || item.guid || "",
        image_url:    extractImage(item) || null,
        published_at: new Date(item.pubDate || item.isoDate || Date.now()).toISOString(),
        region:       "global",
      }))
      .filter(a => a.headline.length > 10);
  } catch (e) {
    console.log(`  ⚠ ${sourceName}: ${e.message.slice(0, 50)}`);
    return [];
  }
}

async function fetchFinnhub() {
  if (!FINNHUB_KEY || FINNHUB_KEY.length < 10) return [];
  const cats = ["general", "merger"];
  const all  = [];
  for (const cat of cats) {
    try {
      const res = await axios.get("https://finnhub.io/api/v1/news", {
        params: { category: cat, token: FINNHUB_KEY }, timeout: 8000,
      });
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      (res.data || []).filter(i => i.datetime * 1000 > cutoff).slice(0, 15).forEach(item => {
        if (!isJunk(item.headline)) {
          all.push({
            uuid:         uuidv4(),
            headline:     item.headline || "",
            full_text:    item.summary || item.headline || "",
            source:       "Finnhub",
            source_url:   item.url || "",
            image_url:    item.image || null,
            published_at: new Date(item.datetime * 1000).toISOString(),
            region:       "global",
          });
        }
      });
    } catch (e) {
      console.log(`  ⚠ Finnhub ${cat}: ${e.message.slice(0, 40)}`);
    }
  }
  console.log(`  📡 Finnhub: ${all.length} articles`);
  return all;
}

function deduplicate(articles) {
  const seen = new Set();
  return articles.filter(a => {
    const key = a.headline.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim().slice(0, 80);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function saveArticles(articles) {
  const db = getDB();
  let saved = 0;
  for (const a of articles) {
    try {
      const res = await db.query(`
        INSERT INTO articles
          (uuid, headline, full_text, source, source_url, image_url, published_at, region, processed, agent_source)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0,'agent1')
        ON CONFLICT (uuid) DO NOTHING
      `, [a.uuid, a.headline, a.full_text, a.source, a.source_url, a.image_url, a.published_at, a.region]);
      if (res.rowCount > 0) saved++;
    } catch (e) {
      console.error("Agent1 DB error:", e.message);
    }
  }
  return saved;
}

async function runAgent1() {
  console.log("\n🌍 Agent1 — fetching global market news...");
  const t0 = Date.now();

  const BATCH = 8;
  const all = [];
  let ok = 0;
  for (let i = 0; i < RSS_FEEDS.length; i += BATCH) {
    const results = await Promise.all(RSS_FEEDS.slice(i, i + BATCH).map(f => fetchRSS(f.url, f.name)));
    for (const items of results) { if (items.length) { ok++; all.push(...items); } }
  }
  console.log(`  📡 RSS: ${ok}/${RSS_FEEDS.length} feeds live, ${all.length} articles`);

  const finnhub = await fetchFinnhub();
  const deduped = deduplicate([...all, ...finnhub])
    .sort((a, b) => new Date(b.published_at) - new Date(a.published_at));

  const saved = await saveArticles(deduped);
  console.log(`✅ Agent1 done — ${deduped.length} total, ${saved} new in ${((Date.now()-t0)/1000).toFixed(1)}s`);
  return { fetched: deduped.length, saved };
}

module.exports = { runAgent1 };