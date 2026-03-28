// agents/agentA.js
// ─────────────────────────────────────────────────────────────
//  AGENT A — Global Market News Fetcher
//  Sources (all free RSS, no API key, update every 2-5 min):
//   Reuters, Yahoo Finance, MarketWatch, CNBC, Investing.com,
//   WSJ, FT, Barrons, Nasdaq, Forbes, Seeking Alpha + Finnhub
// ─────────────────────────────────────────────────────────────

const RSSParser = require("rss-parser");
const axios     = require("axios");
const { v4: uuidv4 } = require("uuid");
const { getDB } = require("../config/database"); const db = () => getDB();
const { GLOBAL_STOCKS, INDIAN_STOCKS } = require("../config/stocks");

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
const rss = new RSSParser({
  timeout: 12000,
  headers: { "User-Agent": "Mozilla/5.0 (compatible; StockPulse/1.0)" },
  customFields: { item: ["media:content", "media:thumbnail", "enclosure"] },
});

const ALL_STOCKS = [...GLOBAL_STOCKS, ...INDIAN_STOCKS];

// ── Junk headline filter ──────────────────────────────────────
const JUNK_PATTERNS = [
  /follow us on/i, /follow .* on google/i, /newsletter/i,
  /entering text into/i, /search result below/i, /update the search/i,
  /sign up for/i, /subscribe to/i, /click here to/i,
  /get daily.*newsletter/i, /packed with expert/i,
  /press release.*\(/i,
  /^\s*q\d (revenue|earnings|eps|results)/i,
  /seeking alpha on google/i, /latest stock news$/i,
  /new opportunities\./i, /fresh ideas/i,
  /rssfeed/i, /no description/i,
  /^[\s\W]{0,5}$/,
];

function isJunk(headline) {
  if (!headline || headline.length < 15) return true;
  return JUNK_PATTERNS.some(p => p.test(headline));
}

async function saveArticle(article) {
  try {
    const info = await db().prepare(`
      INSERT INTO articles
        (uuid, symbol, company, headline, full_text, source, source_url, image_url, published_at, agent_source)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'agentA')
      ON CONFLICT (uuid) DO NOTHING
    `).run(
      article.uuid,
      article.symbol,
      article.company,
      article.headline,
      article.full_text,
      article.source,
      article.source_url,
      article.image_url,
      article.published_at
    );
    return info.changes > 0;
  } catch(err) { console.error("AgentA DB error:", err.message); return false; }
}

function detectStock(text) {
  if (!text) return null;
  const t = text.toLowerCase();
  const bySymbol = ALL_STOCKS.find(s => new RegExp(`\\b${s.symbol.toLowerCase()}\\b`).test(t));
  if (bySymbol) return bySymbol;
  return ALL_STOCKS.find(s =>
    t.includes(s.name.toLowerCase()) ||
    (s.name.split(" ")[0].length > 3 && t.includes(s.name.split(" ")[0].toLowerCase()))
  ) || null;
}

function extractImage(item) {
  return item["media:content"]?.["$"]?.url
    || item["media:thumbnail"]?.["$"]?.url
    || item.enclosure?.url || null;
}

async function fetchRSS(url, sourceName, limit = 20) {
  try {
    const feed = await rss.parseURL(url);
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return (feed.items || []).slice(0, limit)
      .filter(item => new Date(item.pubDate || item.isoDate || 0).getTime() > cutoff)
      .filter(item => !isJunk(item.title || ""))
      .map(item => {
        const text  = `${item.title || ""} ${item.contentSnippet || item.description || ""}`;
        const stock = detectStock(text);
        return {
          uuid: uuidv4(), symbol: stock?.symbol || null, company: stock?.name || null,
          headline:     (item.title || "").trim(),
          full_text:    (item.contentSnippet || item.description || item.title || "").trim(),
          source:       sourceName,
          source_url:   item.link || item.guid || "",
          image_url:    extractImage(item),
          published_at: new Date(item.pubDate || item.isoDate || Date.now()).toISOString(),
        };
      }).filter(a => a.headline.length > 10);
  } catch (e) { console.log(`  ⚠ ${sourceName}: ${e.message.slice(0, 50)}`); return []; }
}

const RSS_FEEDS = [
  // Reuters
  { url: "https://feeds.reuters.com/reuters/businessNews",           name: "Reuters Business"     },
  { url: "https://feeds.reuters.com/reuters/companyNews",            name: "Reuters Companies"    },
  // Yahoo Finance
  { url: "https://finance.yahoo.com/rss/topfinstories",              name: "Yahoo Finance"        },
  { url: "https://finance.yahoo.com/news/rssindex",                  name: "Yahoo Finance News"   },
  { url: "https://finance.yahoo.com/rss/2.0/headline?s=^GSPC",       name: "Yahoo S&P500"         },
  { url: "https://finance.yahoo.com/rss/2.0/headline?s=^DJI",        name: "Yahoo Dow"            },
  { url: "https://finance.yahoo.com/rss/2.0/headline?s=^IXIC",       name: "Yahoo NASDAQ"         },
  // MarketWatch
  { url: "https://feeds.marketwatch.com/marketwatch/topstories",     name: "MarketWatch"          },
  { url: "https://feeds.marketwatch.com/marketwatch/marketpulse",    name: "MarketWatch Pulse"    },
  { url: "https://feeds.marketwatch.com/marketwatch/realtimeheadlines", name: "MarketWatch RT"    },
  // CNBC
  { url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114", name: "CNBC Markets"   },
  { url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664",  name: "CNBC Money"     },
  { url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=15839135",  name: "CNBC Earnings"  },
  { url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000108",  name: "CNBC Economy"   },
  // Investing.com
  { url: "https://www.investing.com/rss/news.rss",                   name: "Investing.com"        },
  { url: "https://www.investing.com/rss/stock_market_news.rss",      name: "Investing.com Stocks" },
  // WSJ
  { url: "https://feeds.a.dj.com/rss/RSSMarketsMain.xml",            name: "WSJ Markets"          },
  { url: "https://feeds.a.dj.com/rss/WSJcomUSBusiness.xml",          name: "WSJ Business"         },
  // Nasdaq
  { url: "https://www.nasdaq.com/feed/rssoutbound?category=Markets",  name: "Nasdaq Markets"       },
  { url: "https://www.nasdaq.com/feed/rssoutbound?category=Earnings", name: "Nasdaq Earnings"      },
  { url: "https://www.nasdaq.com/feed/rssoutbound?category=IPOs",     name: "Nasdaq IPOs"          },
  // Others
  { url: "https://www.barrons.com/xml/rss/3_7531.xml",               name: "Barrons"              },
  { url: "https://www.thestreet.com/.rss/full/",                     name: "TheStreet"            },
  { url: "https://markets.businessinsider.com/rss/news",             name: "Business Insider"     },
  { url: "https://www.forbes.com/investing/feed2/",                  name: "Forbes Investing"     },
  { url: "https://www.zacks.com/rss/headline_newsrss.php",           name: "Zacks"                },
  { url: "https://seekingalpha.com/market_currents.xml",             name: "Seeking Alpha"        },
];

async function fetchAllRSS() {
  const BATCH = 8;
  const all = [];
  let ok = 0;
  for (let i = 0; i < RSS_FEEDS.length; i += BATCH) {
    const results = await Promise.all(RSS_FEEDS.slice(i, i + BATCH).map(f => fetchRSS(f.url, f.name)));
    for (const items of results) { if (items.length) { ok++; all.push(...items); } }
  }
  console.log(`  📡 RSS: ${ok}/${RSS_FEEDS.length} feeds live, ${all.length} articles`);
  return all;
}

async function fetchFinnhub() {
  if (!FINNHUB_KEY || FINNHUB_KEY.length < 10) return [];
  const cats = ["general", "forex", "merger"];
  const all  = [];
  for (const cat of cats) {
    try {
      const res = await axios.get("https://finnhub.io/api/v1/news", {
        params: { category: cat, token: FINNHUB_KEY }, timeout: 8000,
      });
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      (res.data || []).filter(i => i.datetime * 1000 > cutoff).slice(0, 15).forEach(item => {
        all.push({
          uuid: uuidv4(), symbol: detectStock(item.headline)?.symbol || null,
          company: detectStock(item.headline)?.name || null,
          headline: item.headline || "", full_text: item.summary || item.headline || "",
          source: `Finnhub`, source_url: item.url || "",
          image_url: item.image || null,
          published_at: new Date(item.datetime * 1000).toISOString(),
        });
      });
    } catch (e) { if (!e.message.includes("403")) console.log(`  ⚠ Finnhub ${cat}: ${e.message.slice(0,40)}`); }
  }
  console.log(`  📡 Finnhub: ${all.length} articles`);
  return all;
}

async function fetchStockRSS() {
  const results = await Promise.all(GLOBAL_STOCKS.slice(0, 8).map(async s => {
    const url = `https://finance.yahoo.com/rss/2.0/headline?s=${s.symbol}&region=US&lang=en-US`;
    const items = await fetchRSS(url, `Yahoo ${s.symbol}`, 10);
    const symClean  = s.symbol.replace(".NS","").replace(".BO","").toLowerCase();
    const nameWords = s.name.toLowerCase().split(" ").filter(w => w.length > 3);
    return items.filter(a => {
      const hl = (a.headline + " " + (a.full_text || "")).toLowerCase();
      return hl.includes(symClean) || nameWords.some(w => hl.includes(w));
    }).map(a => ({ ...a, symbol: s.symbol, company: s.name }));
  }));
  const all = results.flat();
  console.log(`  📡 Yahoo per-stock: ${all.length} articles`);
  return all;
}

function deduplicate(articles) {
  const seen = new Set();
  return articles.filter(a => {
    const key = a.headline.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim().slice(0, 80);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });
}

async function runAgentA() {
  console.log("\n🌍 AgentA starting — fetching global market news...");
  const t0 = Date.now();
  const [rssArts, finnhubArts, stockArts] = await Promise.all([
    fetchAllRSS(), fetchFinnhub(), fetchStockRSS(),
  ]);
  const all = deduplicate([...rssArts, ...finnhubArts, ...stockArts])
    .sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
  let saved = 0;
  for (const a of all) if (await saveArticle(a)) saved++;
  console.log(`✅ AgentA done — ${all.length} total, ${saved} new in ${((Date.now()-t0)/1000).toFixed(1)}s`);
  return { fetched: all.length, saved };
}

module.exports = { runAgentA };