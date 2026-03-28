// agents/fetchStockNews.js — Instant single-stock news fetcher
const RSSParser = require("rss-parser");
const axios     = require("axios");
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


const FINNHUB_KEY   = process.env.FINNHUB_API_KEY;
const AV_KEYS       = [
  process.env.ALPHA_VANTAGE_KEY,  process.env.ALPHA_VANTAGE_KEY2,
  process.env.ALPHA_VANTAGE_KEY3, process.env.ALPHA_VANTAGE_KEY4,
  process.env.ALPHA_VANTAGE_KEY5,
].filter(Boolean);
let avKeyIdx = 0;
function nextAVKey() { const k = AV_KEYS[avKeyIdx % AV_KEYS.length]; avKeyIdx++; return k; }
const rss = new RSSParser({
  timeout: 8000,
  headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
  customFields: { item: ["media:content", "media:thumbnail", "enclosure"] },
});

async function saveArticle(a) {
  try {
    const existing = await db().prepare(`SELECT id FROM articles WHERE symbol = ? AND LOWER(headline) = LOWER(?) LIMIT 1`).get([a.symbol, a.headline]);
    if (existing) return false;
    await db().prepare(`
      INSERT INTO articles
        (uuid,symbol,company,headline,full_text,source,source_url,image_url,published_at,agent_source)
      VALUES(?,?,?,?,?,?,?,?,?,?)
    `).run([a.uuid, a.symbol, a.company, a.headline, a.full_text, a.source, a.source_url, a.image_url, a.published_at, a.agent_source]);
    return true;
  } catch(e) { console.error("saveArticle error:", e.message); return false; }
}

function img(item) {
  return item["media:content"]?.["$"]?.url || item["media:thumbnail"]?.["$"]?.url || item.enclosure?.url || null;
}

function toISO(str) {
  if (!str) return new Date().toISOString();
  const d = new Date(str);
  return isNaN(d) ? new Date().toISOString() : d.toISOString();
}

const CUTOFF_MS = 15 * 24 * 60 * 60 * 1000; // 15 days

async function rssSearch(url, symbol, company, source) {
  try {
    const feed = await rss.parseURL(url);
    const now  = Date.now();
    return (feed.items || []).slice(0, 50)  // grab more items
      .filter(i => (now - new Date(i.pubDate || i.isoDate || 0).getTime()) < CUTOFF_MS)
      .map(i => ({
        uuid: uuidv4(), symbol, company, agent_source: "instant",
        headline:     (i.title || "").trim(),
        full_text:    (i.contentSnippet || i.description || i.title || "").trim(),
        source, source_url: i.link || i.guid || "",
        image_url:    img(i),
        published_at: toISO(i.pubDate || i.isoDate),
      })).filter(a => !isJunk(a.headline));
  } catch { return []; }
}

// ── Yahoo Finance RSS (works for US stocks) ───────────────────
async function fromYahoo(symbol, company) {
  const url = `https://finance.yahoo.com/rss/2.0/headline?s=${symbol}&region=US&lang=en-US`;
  return rssSearch(url, symbol, company, "Yahoo Finance");
}

// ── Google News RSS (most reliable, works for any stock) ──────
async function fromGoogleNews(symbol, company) {
  // Search by company name — more results than symbol for Indian stocks
  const shortName = company.split(" ").slice(0, 3).join(" ");
  const q1 = encodeURIComponent(`"${shortName}" stock`);
  const q2 = encodeURIComponent(`${symbol.replace(".NS","").replace(".BO","")} NSE`);

  const [r1, r2] = await Promise.all([
    rssSearch(`https://news.google.com/rss/search?q=${q1}&hl=en-IN&gl=IN&ceid=IN:en`, symbol, company, "Google News"),
    rssSearch(`https://news.google.com/rss/search?q=${q2}&hl=en-IN&gl=IN&ceid=IN:en`, symbol, company, "Google News"),
  ]);
  // Deduplicate
  const seen = new Set();
  return [...r1, ...r2].filter(a => {
    if (seen.has(a.headline)) return false;
    seen.add(a.headline); return true;
  });
}

// ── ET search RSS (Indian stocks) ────────────────────────────
async function fromETSearch(symbol, company) {
  const shortName = encodeURIComponent(company.split(" ")[0]);
  const urls = [
    `https://economictimes.indiatimes.com/markets/stocks/news/rssfeeds/${shortName}.cms`,
    `https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms`,
  ];
  const nameWords = company.toLowerCase().split(" ").filter(w => w.length > 3);
  const symClean  = symbol.replace(".NS","").replace(".BO","").toLowerCase();

  const all = [];
  for (const url of urls) {
    try {
      const items = await rssSearch(url, symbol, company, "Economic Times");
      for (const item of items) {
        const text = item.headline.toLowerCase();
        if (text.includes(symClean) || nameWords.some(w => text.includes(w))) {
          all.push(item);
        }
      }
    } catch {}
  }
  return all;
}

// ── LiveMint + NDTV filtered by stock name ────────────────────
async function fromIndianRSS(symbol, company) {
  const feeds = [
    { url: "https://www.livemint.com/rss/markets",                   source: "LiveMint"    },
    { url: "https://feeds.feedburner.com/ndtvprofit-latest",         source: "NDTV Profit" },
    { url: "https://www.business-standard.com/rss/markets-106.rss",  source: "Business Standard" },
    { url: "https://www.moneycontrol.com/rss/MCtopnews.xml",         source: "MoneyControl" },
  ];
  const nameWords = company.toLowerCase().split(" ").filter(w => w.length > 3);
  const symClean  = symbol.replace(".NS","").replace(".BO","").toLowerCase();
  const all = [];

  await Promise.all(feeds.map(async f => {
    try {
      const items = await rssSearch(f.url, symbol, company, f.source);
      for (const item of items) {
        const text = item.headline.toLowerCase();
        if (text.includes(symClean) || nameWords.some(w => text.includes(w))) {
          all.push({ ...item, source: f.source });
        }
      }
    } catch {}
  }));
  return all;
}

// ── Alpha Vantage News (50 articles, last 15 days) ───────────
async function fromAlphaVantage(symbol, company) {
  if (!AV_KEYS.length) return [];
  try {
    const key    = nextAVKey();
    const sym    = symbol.replace(".NS","").replace(".BO","").replace(".L","");
    const res    = await axios.get("https://www.alphavantage.co/query", {
      params: {
        function: "NEWS_SENTIMENT",
        tickers:  sym,
        limit:    50,
        sort:     "LATEST",
        apikey:   key,
      },
      timeout: 8000,
    });
    const items = res.data?.feed || [];
    return items
      .filter(i => (Date.now() - new Date(i.time_published?.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/,"$1-$2-$3T$4:$5:$6")).getTime()) < CUTOFF_MS)
      .map(i => ({
        uuid: uuidv4(), symbol, company, agent_source: "instant",
        headline:     (i.title || "").trim(),
        full_text:    (i.summary || i.title || "").trim(),
        source:       i.source || "Alpha Vantage",
        source_url:   i.url || "",
        image_url:    i.banner_image || null,
        published_at: new Date(i.time_published?.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/,"$1-$2-$3T$4:$5:$6")).toISOString(),
      })).filter(a => !isJunk(a.headline));
  } catch { return []; }
}

// ── Bing News RSS (no API key, 15-day range via query) ────────
async function fromBingNews(symbol, company) {
  const shortName = company.split(" ").slice(0,3).join(" ");
  const q = encodeURIComponent(`${shortName} stock news`);
  const urls = [
    `https://www.bing.com/news/search?q=${q}&format=rss`,
    `https://news.google.com/rss/search?q=${encodeURIComponent(shortName+" stock")}&hl=en-US&gl=US&ceid=US:en`,
  ];
  const all = [];
  for (const url of urls) {
    const items = await rssSearch(url, symbol, company, "Bing News");
    all.push(...items);
  }
  return all;
}

// ── Finnhub company news ──────────────────────────────────────
async function fromFinnhub(symbol, company) {
  if (!FINNHUB_KEY || FINNHUB_KEY.length < 10) return [];
  try {
    const to   = new Date().toISOString().split("T")[0];
    const from = new Date(Date.now() - CUTOFF_MS).toISOString().split("T")[0];
    const sym  = symbol.replace(".NS","").replace(".BO","").replace(".L","");
    const res  = await axios.get("https://finnhub.io/api/v1/company-news", {
      params: { symbol: sym, from, to, token: FINNHUB_KEY }, timeout: 6000,
    });
    return (res.data || []).slice(0, 20)
      .filter(i => (Date.now() - i.datetime * 1000) < CUTOFF_MS)
      .map(i => ({
        uuid: uuidv4(), symbol, company, agent_source: "instant",
        headline: i.headline || "", full_text: i.summary || i.headline || "",
        source: i.source || "Finnhub", source_url: i.url || "",
        image_url: i.image || null,
        published_at: new Date(i.datetime * 1000).toISOString(),
      })).filter(a => !isJunk(a.headline));
  } catch { return []; }
}

// ── Main ──────────────────────────────────────────────────────
async function fetchStockNewsNow(symbol, company) {
  console.log(`\n⚡ Instant fetch: ${symbol} (${company})`);
  const t0 = Date.now();
  const isIndian = symbol.endsWith(".NS") || symbol.endsWith(".BO");

  const [yahoo, google, indian, etSearch, finnhub, alphaVantage, bing] = await Promise.all([
    fromYahoo(symbol, company),
    fromGoogleNews(symbol, company),
    isIndian ? fromIndianRSS(symbol, company) : Promise.resolve([]),
    isIndian ? fromETSearch(symbol, company)  : Promise.resolve([]),
    fromFinnhub(symbol, company),
    fromAlphaVantage(symbol, company),
    fromBingNews(symbol, company),
  ]);

  const all = [...yahoo, ...google, ...indian, ...etSearch, ...finnhub, ...alphaVantage, ...bing];

  // Deduplicate by headline
  const seen = new Set();
  const unique = all.filter(a => {
    const key = a.headline.toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,60);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).sort((a,b) => new Date(b.published_at) - new Date(a.published_at));

  let saved = 0;
  for (const a of unique) if (saveArticle(a)) saved++;

  console.log(`⚡ Done: ${symbol} — ${unique.length} articles (${saved} new) in ${((Date.now()-t0)/1000).toFixed(1)}s`);
  return { fetched: unique.length, saved, articles: unique };
}

module.exports = { fetchStockNewsNow };