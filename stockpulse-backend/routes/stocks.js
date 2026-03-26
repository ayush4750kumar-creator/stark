// routes/stocks.js
const express = require("express");
const router  = express.Router();
const { getDB }    = require("../config/database"); const db = () => getDB();
const { fetchLiveQuote, fetchChartData, refreshAllPrices, fetchFundamentals } = require("../services/stockPriceService");
const { getFundamentals } = require("../services/fundamentalsService");
const { getFinancials, avQuotaStatus } = require("../services/financialsService");
const { ALL_STOCKS } = require("../config/stocks");

const YF_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json",
};

let pricesLoaded = false;

async function ensurePrices() {
  if (pricesLoaded) return;
  const count = db().prepare("SELECT COUNT(*) as c FROM stocks WHERE price IS NOT NULL").get()?.c || 0;
  if (count > 0) { pricesLoaded = true; return; }
  await refreshAllPrices();
  pricesLoaded = true;
}

// ── GET /api/stocks ──────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    if (!pricesLoaded) {
      ensurePrices().catch(() => {});
    }

    let stocks = db().prepare("SELECT * FROM stocks ORDER BY symbol").all();

    if (stocks.length === 0) {
      stocks = ALL_STOCKS.map(s => ({
        symbol: s.symbol, name: s.name, sector: s.sector,
        price: null, change_pct: null, change_amt: null,
        day_high: null, day_low: null, volume: null,
      }));
    }

    const filter = req.query.filter || "all";
    if (filter === "profit") stocks = stocks.filter(s => (s.change_pct||0) > 0);
    if (filter === "loss")   stocks = stocks.filter(s => (s.change_pct||0) < 0);
    if (filter === "movers") stocks = [...stocks].sort((a,b) => Math.abs(b.change_pct||0) - Math.abs(a.change_pct||0)).slice(0,10);

    res.json({ success: true, data: stocks });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/stocks/trending ─────────────────────────────────────
router.get("/trending", (req, res) => {
  try {
    let trending = db().prepare(`
      SELECT s.*, COUNT(a.id) as news_count
      FROM stocks s
      LEFT JOIN articles a ON s.symbol = a.symbol
        AND a.published_at > datetime('now', '-1 day')
      WHERE s.price IS NOT NULL
      GROUP BY s.symbol
      ORDER BY news_count DESC, ABS(COALESCE(s.change_pct,0)) DESC
      LIMIT 8
    `).all();

    if (trending.length === 0) {
      trending = ALL_STOCKS.slice(0, 6).map(s => ({
        symbol: s.symbol, name: s.name, sector: s.sector,
        price: null, change_pct: null, news_count: 0
      }));
    }

    res.json({ success: true, data: trending });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/stocks/search?q= ────────────────────────────────────
router.get("/search", async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.json({ success: true, data: [] });

  const qUp = q.toUpperCase();

  const dbResults = db().prepare(`
    SELECT symbol, name, sector, yahoo_symbol, price, change_pct
    FROM stocks
    WHERE symbol LIKE ? OR symbol = ? OR UPPER(name) LIKE ?
    ORDER BY
      CASE WHEN symbol = ? THEN 0
           WHEN symbol LIKE ? THEN 1
           ELSE 2 END,
      CASE WHEN price IS NOT NULL THEN 0 ELSE 1 END
    LIMIT 15
  `).all(`${qUp}%`, qUp, `%${qUp}%`, qUp, `${qUp}%`);

  if (dbResults.length >= 3) {
    return res.json({ success: true, data: dbResults.map(r => ({
      symbol:     r.yahoo_symbol || r.symbol,
      name:       r.name,
      sector:     r.sector || "Stock",
      exchange:   r.yahoo_symbol?.includes(".NS") ? "NSE" :
                  r.yahoo_symbol?.includes(".BO") ? "BSE" :
                  r.yahoo_symbol?.includes(".L")  ? "LSE" :
                  r.yahoo_symbol?.includes(".T")  ? "TSE" : "NYSE/NASDAQ",
      price:      r.price      ?? null,
      change_pct: r.change_pct ?? null,
      inDB:       true,
    })), source: "db" });
  }

  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=15&newsCount=0`;
    const r   = await fetch(url, { headers: YF_HEADERS });
    const j   = await r.json();
    const quotes = (j.quotes || []).filter(x => x.quoteType === "EQUITY" || x.quoteType === "ETF");

    if (quotes.length) {
      const insertStmt = db().prepare("INSERT INTO stocks (symbol, name, sector, yahoo_symbol) VALUES (?,?,?,?)");
      for (const q of quotes.slice(0, 10)) {
        const sym = (q.symbol || "").replace(/\.(NS|BO)$/, "");
        insertStmt.run(sym, q.longname || q.shortname || sym, q.sector || q.industry || "Stock", q.symbol);
      }
    }

    const symbols = quotes.slice(0, 10).map(x => x.symbol);
    let priceMap = {};
    if (symbols.length) {
      try {
        const sr = await fetch(`https://query1.finance.yahoo.com/v8/finance/spark?symbols=${symbols.join(",")}&range=1d&interval=1d`, { headers: YF_HEADERS });
        const sd = await sr.json();
        for (const item of (sd.spark?.result || [])) {
          const meta = item.response?.[0]?.meta || {};
          const price = meta.regularMarketPrice || 0;
          const prev  = meta.chartPreviousClose || price;
          if (price) priceMap[item.symbol] = {
            price, change_pct: prev ? Math.round(((price-prev)/prev)*10000)/100 : 0,
            currency: meta.currency || "USD",
          };
        }
      } catch {}
    }

    const yahooData = quotes.slice(0,10).map(x => ({
      symbol:     x.symbol,
      name:       x.longname || x.shortname || x.symbol,
      sector:     x.sector   || x.industry  || "Stock",
      exchange:   x.exchDisp || x.exchange  || "",
      price:      priceMap[x.symbol]?.price      ?? null,
      change_pct: priceMap[x.symbol]?.change_pct ?? null,
      currency:   priceMap[x.symbol]?.currency   ?? "USD",
    }));

    const combined = [...dbResults.map(r => ({
      symbol: r.yahoo_symbol || r.symbol, name: r.name, sector: r.sector,
      price: r.price, change_pct: r.change_pct, inDB: true,
    })), ...yahooData.filter(y => !dbResults.find(d => (d.yahoo_symbol||d.symbol) === y.symbol))];

    return res.json({ success: true, data: combined.slice(0,12) });
  } catch {
    try {
      const local = db().prepare(
        "SELECT symbol, name, sector, price, change_pct FROM stocks WHERE symbol LIKE ? OR UPPER(name) LIKE ? LIMIT 10"
      ).all(`${qUp}%`, `%${qUp}%`);
      res.json({ success: true, data: local });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  }
});

// ── GET /api/stocks/:symbol ──────────────────────────────────────
router.get("/:symbol", async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const config = ALL_STOCKS.find(s => s.symbol === symbol);
    const yahooSym = config?.yahooSymbol || symbol;

    const live = await fetchLiveQuote(yahooSym);
    if (live?.price) {
      try {
        db().prepare(`
          INSERT INTO stocks (symbol, name, sector, price, change_amt, change_pct,
            day_open, day_high, day_low, volume, market_cap, week52_low, week52_high, updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
          ON CONFLICT(symbol) DO UPDATE SET
            price=excluded.price, change_amt=excluded.change_amt, change_pct=excluded.change_pct,
            day_open=excluded.day_open, day_high=excluded.day_high, day_low=excluded.day_low,
            volume=excluded.volume, updated_at=datetime('now')
        `).run([symbol, config?.name||symbol, config?.sector||"Stock",
          live.price, live.change_amt, live.change_pct,
          live.day_open, live.day_high, live.day_low, live.volume,
          live.market_cap, live.week52_low, live.week52_high]);
      } catch {}
      return res.json({ success: true, data: { symbol, name: config?.name||symbol, sector: config?.sector||"Stock", ...live }});
    }

    const cached = db().prepare("SELECT * FROM stocks WHERE symbol = ?").get(symbol);
    if (cached?.price) return res.json({ success: true, data: cached, source: "cache" });

    const fund = await getFundamentals(symbol);
    if (fund?.price) {
      db().prepare(`INSERT INTO stocks (symbol, name, sector) VALUES (?,?,?)`)
        .run(symbol, fund.name || symbol, "Stock");
      db().prepare(`UPDATE stocks SET price=?, change_amt=?, change_pct=?,
        day_open=?, day_high=?, day_low=?, volume=?, week52_high=?, week52_low=?,
        market_cap=COALESCE(?,market_cap), pe_ratio=COALESCE(?,pe_ratio),
        pb_ratio=COALESCE(?,pb_ratio), eps=COALESCE(?,eps),
        div_yield=COALESCE(?,div_yield), roe=COALESCE(?,roe),
        debt_equity=COALESCE(?,debt_equity), book_value=COALESCE(?,book_value),
        yahoo_symbol=?, name=COALESCE(?,name), updated_at=datetime('now')
        WHERE symbol=?`)
        .run(fund.price, fund.change_amt, fund.change_pct,
          fund.day_open, fund.day_high, fund.day_low, fund.volume,
          fund.week52_high, fund.week52_low, fund.market_cap,
          fund.pe_ratio, fund.pb_ratio, fund.eps, fund.div_yield,
          fund.roe, fund.debt_equity, fund.book_value,
          fund.yahooSym, fund.name, symbol);
      const saved = db().prepare("SELECT * FROM stocks WHERE symbol = ?").get(symbol);
      return res.json({ success: true, data: saved || { symbol, ...fund }, source: "live" });
    }

    res.status(404).json({ success: false, error: "Stock not found" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/stocks/:symbol/chart ────────────────────────────────
router.get("/:symbol/chart", async (req, res) => {
  try {
    const symbol   = req.params.symbol.toUpperCase();
    const period   = req.query.period || "1m";
    const config   = ALL_STOCKS.find(s => s.symbol === symbol);
    const yahooSym = config?.yahooSymbol || symbol;
    const data     = await fetchChartData(yahooSym, period);
    res.json({ success: true, data, symbol, period });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/stocks/:symbol/news ─────────────────────────────────
router.get("/:symbol/news", (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const limit  = parseInt(req.query.limit) || 20;
    const news   = db().prepare(`
      SELECT id, headline, summary_20, summary_long, sentiment, source, source_url, image_url, published_at, full_text
      FROM articles
      WHERE symbol = ?
        AND published_at >= datetime('now', '-15 days')
        AND headline IS NOT NULL AND length(headline) > 10
      GROUP BY headline
      ORDER BY published_at DESC LIMIT ?
    `).all(symbol, limit);
    res.json({ success: true, data: news, symbol });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/stocks/:symbol/fundamentals ─────────────────────────
router.get("/:symbol/fundamentals", async (req, res) => {
  try {
    const symbol       = req.params.symbol.toUpperCase();
    const forceRefresh = req.query.force === "1";
    const cached       = db().prepare("SELECT * FROM stocks WHERE symbol = ?").get(symbol);

    // Serve cached fundamentals instantly if fresh
    if (!forceRefresh && (cached?.pe_ratio || cached?.eps || cached?.pb_ratio || cached?.book_value)) {
      // Refresh price in background without blocking response
      getFundamentals(symbol).then(fund => {
        if (fund?.price) {
          const nv = v => (v === undefined ? null : v ?? null);
          db().prepare(`UPDATE stocks SET price=?, change_amt=?, change_pct=?,
            day_open=?, day_high=?, day_low=?, volume=?, week52_high=?, week52_low=?,
            market_cap=COALESCE(?,market_cap), updated_at=datetime('now') WHERE symbol=?`)
            .run(nv(fund.price), nv(fund.change_amt), nv(fund.change_pct),
              nv(fund.day_open), nv(fund.day_high), nv(fund.day_low), nv(fund.volume),
              nv(fund.week52_high), nv(fund.week52_low), nv(fund.market_cap), symbol);
        }
      }).catch(() => {});
      return res.json({ success: true, data: cached, source: "cache" });
    }

    // FIX: Always clear fund_unavailable so previously-blocked US stocks
    // are retried with the improved multi-endpoint fundamentals service.
    // The old code returned early here if fund_unavailable=1 — that block is removed.
    try {
      db().prepare("UPDATE stocks SET fund_unavailable=0 WHERE symbol=?").run(symbol);
    } catch {}

    console.log(`📊 Fetching fundamentals for ${symbol}...`);
    const fund = await getFundamentals(symbol);

    if (!fund) {
      console.log(`  ✗ No data at all for ${symbol}`);
      try { db().prepare("UPDATE stocks SET fund_unavailable=1 WHERE symbol=?").run(symbol); } catch {}
      return res.json({ success: true, data: cached || {}, source: "no_fundamentals" });
    }

    const hasFund = fund.pe_ratio || fund.eps || fund.pb_ratio || fund.book_value || fund.roe;
    if (!hasFund) {
      console.log(`  ⚠ Price-only for ${symbol}`);
      try {
        db().prepare(`INSERT INTO stocks (symbol,name,sector) VALUES (?,?,?)`).run(symbol, fund.name||symbol, "Stock");
        db().prepare(`UPDATE stocks SET price=?, change_amt=?, change_pct=?, day_open=?, day_high=?, day_low=?,
          volume=?, week52_high=?, week52_low=?, market_cap=COALESCE(?,market_cap),
          fund_unavailable=1, updated_at=datetime('now') WHERE symbol=?`)
          .run(fund.price??null, fund.change_amt??null, fund.change_pct??null,
               fund.day_open??null, fund.day_high??null, fund.day_low??null,
               fund.volume??null, fund.week52_high??null, fund.week52_low??null,
               fund.market_cap??null, symbol);
      } catch {}
      const fresh2 = db().prepare("SELECT * FROM stocks WHERE symbol=?").get(symbol);
      return res.json({ success: true, data: fresh2 || fund, source: "price_only" });
    }

    console.log(`  ✓ Got fundamentals for ${symbol} [${fund._source}] P/E=${fund.pe_ratio} EPS=${fund.eps}`);

    db().prepare(`INSERT INTO stocks (symbol, name, sector) VALUES (?,?,?)`)
      .run(symbol, fund.name || symbol, "Stock");

    const nv = v => (v === undefined ? null : v ?? null);
    try {
      db().prepare(`UPDATE stocks SET
        name        = COALESCE(?, name),
        price       = ?,
        change_amt  = ?,
        change_pct  = ?,
        day_open    = ?,
        day_high    = ?,
        day_low     = ?,
        volume      = ?,
        week52_high = ?,
        week52_low  = ?,
        market_cap  = COALESCE(?, market_cap),
        pe_ratio    = COALESCE(?, pe_ratio),
        pb_ratio    = COALESCE(?, pb_ratio),
        eps         = COALESCE(?, eps),
        div_yield   = COALESCE(?, div_yield),
        roe         = COALESCE(?, roe),
        debt_equity = COALESCE(?, debt_equity),
        book_value  = COALESCE(?, book_value),
        fund_unavailable = 0,
        updated_at  = datetime('now')
        WHERE symbol = ?`)
        .run(
          nv(fund.name),
          nv(fund.price), nv(fund.change_amt), nv(fund.change_pct),
          nv(fund.day_open), nv(fund.day_high), nv(fund.day_low), nv(fund.volume),
          nv(fund.week52_high), nv(fund.week52_low),
          nv(fund.market_cap),
          nv(fund.pe_ratio), nv(fund.pb_ratio), nv(fund.eps),
          nv(fund.div_yield), nv(fund.roe), nv(fund.debt_equity), nv(fund.book_value),
          symbol
        );
      try { db().prepare("UPDATE stocks SET yahoo_symbol=? WHERE symbol=?").run(nv(fund.yahooSym), symbol); } catch {}
    } catch (saveErr) {
      console.error("  DB save error:", saveErr.message);
    }

    const fresh = db().prepare("SELECT * FROM stocks WHERE symbol = ?").get(symbol);
    res.json({ success: true, data: { ...fresh, ...fund }, source: "live", yahooSym: fund.yahooSym });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/stocks/:symbol/financials ───────────────────────────
router.get("/:symbol/financials", async (req, res) => {
  try {
    const symbol       = req.params.symbol.toUpperCase();
    const forceRefresh = req.query.force === "1";
    const data = await getFinancials(symbol, forceRefresh);
    if (!data) return res.json({ success: false, message: "No financial data available" });
    if (data.pending) return res.json({ success: true, data });
    res.json({ success: true, data });
  } catch (e) {
    console.error("Financials route error:", e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── GET /api/stocks/av-quota ─────────────────────────────────────
router.get("/av-quota", (req, res) => {
  res.json({ success: true, data: avQuotaStatus() });
});

module.exports = router;