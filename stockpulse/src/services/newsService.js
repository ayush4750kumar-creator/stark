// src/services/newsService.js
// ─────────────────────────────────────────────────────────────
//  Fetches real news from GNews API for any stock/company.
//  Falls back to generated mock news if API key not set.
//
//  To enable real news:
//  In your .env file (inside stockpulse/ folder) add:
//  REACT_APP_GNEWS_API_KEY=your_gnews_key_here
// ─────────────────────────────────────────────────────────────

const GNEWS_KEY = process.env.REACT_APP_GNEWS_API_KEY || "";

// Cache: symbol -> { articles, fetchedAt }
const cache = {};
const CACHE_MS = 15 * 60 * 1000; // 15 minutes

const STOCK_QUERIES = {
  RELIANCE:   "Reliance Industries OR Reliance Jio",
  TCS:        "TCS Tata Consultancy Services",
  INFY:       "Infosys stock",
  HDFCBANK:   "HDFC Bank",
  ICICIBANK:  "ICICI Bank",
  WIPRO:      "Wipro stock",
  BAJFINANCE: "Bajaj Finance",
  ADANIENT:   "Adani Enterprises",
  SBIN:       "State Bank of India SBI",
  TATAMOTORS: "Tata Motors JLR",
  MARUTI:     "Maruti Suzuki",
  SUNPHARMA:  "Sun Pharma",
  AAPL:       "Apple stock AAPL",
  MSFT:       "Microsoft stock",
  GOOGL:      "Google Alphabet stock",
  NVDA:       "NVIDIA stock",
  TSLA:       "Tesla stock",
  META:       "Meta Platforms Facebook",
  AMZN:       "Amazon stock",
  JPM:        "JPMorgan Chase stock",
};

const IMAGES = [
  "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&q=80",
  "https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=400&q=80",
  "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&q=80",
  "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=400&q=80",
  "https://images.unsplash.com/photo-1501167786227-4cba60f6d58f?w=400&q=80",
  "https://images.unsplash.com/photo-1677442136019-21780ecad979?w=400&q=80",
  "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=400&q=80",
  "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80",
  "https://images.unsplash.com/photo-1509391366360-2e959784a276?w=400&q=80",
  "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=400&q=80",
  "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400&q=80",
  "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400&q=80",
  "https://images.unsplash.com/photo-1565514020179-026b92b84bb6?w=400&q=80",
  "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=400&q=80",
  "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=400&q=80",
  "https://images.unsplash.com/photo-1502877338535-766e1452684a?w=400&q=80",
  "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=400&q=80",
  "https://images.unsplash.com/photo-1532619675605-1ede6c2ed2b0?w=400&q=80",
  "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=400&q=80",
  "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400&q=80",
];

function img(i) { return IMAGES[i % IMAGES.length]; }

function sentiment(text) {
  const t = (text || "").toLowerCase();
  const bull = ["surge","jump","rally","gain","rise","high","record","profit","growth","beat","upgrade","win","wins","award","expands","launches","soar","boom"];
  const bear = ["fall","drop","decline","loss","low","miss","cut","downgrade","concern","risk","warning","crash","slump","layoff","penalty","fine","probe","delay","pressure"];
  let b = 0, d = 0;
  bull.forEach(w => t.includes(w) && b++);
  bear.forEach(w => t.includes(w) && d++);
  if (b > d) return "bullish";
  if (d > b) return "bearish";
  return "neutral";
}

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso);
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 60)  return `${m} min ago`;
  if (h < 24)  return `${h} hr ago`;
  if (d < 30)  return `${d} days ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function trim20(text) {
  if (!text) return "";
  const w = text.split(" ");
  return w.length <= 22 ? text : w.slice(0, 20).join(" ") + "...";
}

// ── Fetch from GNews API ──────────────────────────────────────
async function fetchGNews(symbol, name) {
  const q    = STOCK_QUERIES[symbol] || name;
  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const url  = `https://gnews.io/api/v4/search?q=${encodeURIComponent(q)}&lang=en&max=10&from=${from}&sortby=publishedAt&apikey=${GNEWS_KEY}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`GNews ${res.status}`);
  const data = await res.json();
  if (data.errors) throw new Error(data.errors[0]);

  return (data.articles || []).map((a, i) => ({
    id:          `${symbol}-gnews-${i}-${Date.now()}`,
    symbol,
    company:     name,
    headline:    a.title || "",
    summary:     trim20(a.description || a.title || ""),
    sentiment:   sentiment((a.title || "") + " " + (a.description || "")),
    image:       a.image || img(i),
    time:        relativeTime(a.publishedAt),
    source:      a.source?.name || "GNews",
    sourceUrl:   a.url || "",
    publishedAt: a.publishedAt,
    price:       null,
    change:      null,
  }));
}

const BACKEND = "${process.env.REACT_APP_API_URL}";

// ── Try fetching processed news from our backend DB ───────────
async function fetchFromBackend(symbol) {
  try {
    const res  = await fetch(`${BACKEND}/stocks/${symbol}/news?limit=30`);
    const data = await res.json();
    if (!data.success || !data.data?.length) return [];
    return data.data.map((a, i) => ({
      id:          a.id,
      symbol,
      company:     a.company || symbol,
      headline:    a.headline,
      summary:     a.summary_20 || trim20(a.headline),
      summary_long: a.summary_long || null,
      fullText:    a.full_text   || null,
      sentiment:   a.sentiment  || "neutral",
      image:       a.image_url  || img(i),
      time:        relativeTime(a.published_at),
      source:      a.source     || "StockPulse",
      sourceUrl:   a.source_url || "",
      publishedAt: a.published_at,
      price:       null,
      change:      null,
    }));
  } catch {
    return [];
  }
}

// ── Main function ─────────────────────────────────────────────
export async function getNewsForStock(symbol, companyName, stockData) {
  // Serve from cache if fresh
  const hit = cache[symbol];
  if (hit && Date.now() - hit.fetchedAt < CACHE_MS) return hit.articles;

  // 1. Try backend DB (real AI-processed articles)
  const backendArticles = await fetchFromBackend(symbol);
  if (backendArticles.length > 0) {
    cache[symbol] = { articles: backendArticles, fetchedAt: Date.now() };
    return backendArticles;
  }

  // 2. Try GNews API
  if (GNEWS_KEY && GNEWS_KEY.length > 10) {
    try {
      const articles = await fetchGNews(symbol, companyName);
      if (articles.length > 0) {
        cache[symbol] = { articles, fetchedAt: Date.now() };
        return articles;
      }
    } catch (err) {
      console.warn(`GNews failed for ${symbol}:`, err.message);
    }
  }

  // 3. No real news found — return empty (no fake news)
  cache[symbol] = { articles: [], fetchedAt: Date.now() };
  return [];
}