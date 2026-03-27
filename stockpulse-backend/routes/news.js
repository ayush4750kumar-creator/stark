// routes/news.js
const express = require("express");
const router  = express.Router();
const { getDB } = require("../config/database");
const db = () => getDB();

// ── GET /api/news — paginated feed ───────────────────────────
router.get("/", async (req, res) => {
  try {
    const page      = parseInt(req.query.page)  || 1;
    const limit     = parseInt(req.query.limit) || 20;
    const symbol    = req.query.symbol    || null;
    const sentiment = req.query.sentiment || null;
    const offset    = (page - 1) * limit;

    // Show all articles from last 30 days (processed or not)
    let where    = "WHERE a.published_at::timestamptz >= NOW() - INTERVAL '30 days' AND a.headline IS NOT NULL AND length(a.headline) > 10";
    const params = [];

    if (symbol)    { where += " AND a.symbol = ?";    params.push(symbol.toUpperCase()); }
    if (sentiment) { where += " AND a.sentiment = ?"; params.push(sentiment); }

    const articles = await db().prepare(`
      SELECT
        a.id, a.uuid, a.symbol, a.company, a.headline,
        a.summary_20, a.source, a.source_url, a.image_url,
        a.sentiment, a.sentiment_score, a.published_at, a.full_text,
        s.price, s.change_pct
      FROM articles a
      LEFT JOIN stocks s ON a.symbol = s.symbol
      ${where}
      
      ORDER BY a.published_at DESC
      LIMIT ? OFFSET ?
    `).all([...params, limit, offset]);

    const total = await db().prepare(
      `SELECT COUNT(*) as count FROM articles a ${where}`
    ).get(params)?.count || 0;

    res.json({ success: true, data: articles,
      pagination: { page, limit, total, hasMore: offset + limit < total } });
  } catch (err) {
    console.error("GET /news error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/news/:id/fetch — MUST be before /:id ────────────
router.get("/:id/fetch", async (req, res) => {
  try {
    const row = await db().prepare(
      "SELECT source_url, headline, full_text FROM articles WHERE id = ?"
    ).get(req.params.id);

    if (!row) return res.json({ success: true, content: "" });

    // If we already have decent full_text, return it immediately
    if (row.full_text && row.full_text.length > 200) {
      return res.json({ success: true, content: row.full_text });
    }

    if (!row.source_url) {
      return res.json({ success: true, content: row.full_text || row.headline || "" });
    }

    // Scrape the source URL
    const response = await fetch(row.source_url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();

    // Strip everything non-content
    let text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<(nav|header|footer|aside|form|iframe)[^>]*>[\s\S]*?<\/\1>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
      .replace(/\s{3,}/g, "\n\n").trim();

    // Extract meaningful paragraphs
    const paras = text.split(/\n\n+/)
      .map(p => p.trim().replace(/\s+/g, " "))
      .filter(p => p.length > 60 && p.length < 1500)
      .filter(p => !/cookie|subscribe|sign.?up|advertisement|©|all rights reserved|javascript|enable js/i.test(p));

    const content = paras.slice(0, 10).join("\n\n");
    res.json({ success: true, content: content || row.full_text || "" });
  } catch (err) {
    const row = await db().prepare("SELECT full_text, headline FROM articles WHERE id = ?").get(req.params.id);
    res.json({ success: true, content: row?.full_text || row?.headline || "" });
  }
});

// ── GET /api/news/:id — single article ───────────────────────
router.get("/:id", async (req, res) => {
  try {
    const article = await db().prepare(`
      SELECT
        a.*,
        s.price, s.change_amt, s.change_pct,
        s.day_open, s.day_high, s.day_low, s.volume,
        s.market_cap, s.pe_ratio, s.pb_ratio, s.eps,
        s.roe, s.debt_equity, s.book_value, s.div_yield,
        s.ind_pe, s.face_value, s.week52_low, s.week52_high
      FROM articles a
      LEFT JOIN stocks s ON a.symbol = s.symbol
      WHERE a.id = ?
    `).get(req.params.id);

    if (!article) {
      return res.status(404).json({ success: false, error: "Article not found" });
    }

    // Related: same symbol first, then recent
    let related = [];
    if (article.symbol) {
      related = await db().prepare(`
        SELECT id, headline, summary_20, sentiment, published_at, source, image_url
        FROM articles
        WHERE symbol = ? AND id != ? AND processed = 2
        ORDER BY published_at DESC LIMIT 10
      `).all(article.symbol, article.id);
    }
    if (related.length < 8) {
      const exclude = [article.id, ...related.map(r => r.id)];
      const ph = exclude.map(() => "?").join(",");
      const fillCount = 8 - related.length;
      const more = await db().prepare(`
        SELECT id, headline, summary_20, sentiment, published_at, source, image_url
        FROM articles WHERE id NOT IN (${ph}) AND processed = 2
        ORDER BY published_at DESC LIMIT ?
      `).all([...exclude, fillCount]);
      related = [...related, ...more];
    }

    res.json({ success: true, data: article, related });
  } catch (err) {
    console.error("GET /news/:id error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/news/fetch-stock — instant fetch for tracked stock
router.post("/fetch-stock", async (req, res) => {
  const { symbol, company } = req.body;
  if (!symbol) return res.status(400).json({ success: false, error: "symbol required" });

  try {
    const { fetchStockNewsNow } = require("../agents/fetchStockNews");
    // Don't await — respond immediately, fetch runs in background
    fetchStockNewsNow(symbol.toUpperCase(), company || symbol)
      .catch(e => console.error("Instant fetch error:", e.message));

    res.json({ success: true, message: `Fetching news for ${symbol} in background` });
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});


module.exports = router;