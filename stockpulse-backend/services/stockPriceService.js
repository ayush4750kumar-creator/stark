// services/stockPriceService.js
// Uses Yahoo Spark API (v8) — confirmed working, no API key needed
// Falls back to Yahoo v8/finance/chart per symbol

const { getDB } = require("../config/database");
const db = () => getDB();
const { ALL_STOCKS } = require("../config/stocks");

const YF_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json",
  "Referer": "https://finance.yahoo.com",
};

// ── Spark API: fetch symbols in chunks of 10 to avoid 400 ────
async function fetchSpark(symbols) {
  if (!symbols.length) return {};
  // Split into chunks of 10 to avoid request-too-large errors
  const chunks = [];
  for (let i = 0; i < symbols.length; i += 10) chunks.push(symbols.slice(i, i+10));
  const allResults = {};
  for (const chunk of chunks) {
    const partial = await fetchSparkChunk(chunk);
    Object.assign(allResults, partial);
  }
  return allResults;
}

async function fetchSparkChunk(symbols) {
  if (!symbols.length) return {};
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/spark?symbols=${symbols.join(",")}&range=1d&interval=5m`;
    const res = await fetch(url, { headers: YF_HEADERS });
    if (!res.ok) throw new Error(`spark ${res.status}`);
    const data = await res.json();
    const results = data.spark?.result || [];
    const map = {};
    for (const item of results) {
      if (!item?.symbol) continue;
      const resp   = item.response?.[0];
      if (!resp) continue;
      const meta   = resp.meta || {};
      const q      = resp.indicators?.quote?.[0] || {};
      const closes = (q.close  || []).filter(x => x != null);
      const opens  = (q.open   || []).filter(x => x != null);
      const highs  = (q.high   || []).filter(x => x != null);
      const lows   = (q.low    || []).filter(x => x != null);
      const vols   = (q.volume || []).filter(x => x != null);
      const price  = closes.at(-1) || meta.regularMarketPrice || 0;
      const prev   = meta.chartPreviousClose || opens[0] || price;
      if (!price) continue;
      map[item.symbol] = {
        price:       r2(price),
        change_amt:  r2(price - prev),
        change_pct:  prev ? r2(((price - prev) / prev) * 100) : 0,
        day_open:    r2(opens[0]  || price),
        day_high:    r2(Math.max(...highs, price)),
        day_low:     r2(Math.min(...lows,  price)),
        volume:      vols.reduce((a, b) => a + b, 0),
        week52_high: r2(meta.fiftyTwoWeekHigh || 0),
        week52_low:  r2(meta.fiftyTwoWeekLow  || 0),
        market_cap:  meta.marketCap || null,
        currency:    meta.currency  || "USD",
      };
    }
    return map;
  } catch (err) {
    console.error("  Spark error:", err.message);
    return {};
  }
}

// ── v8/chart fallback for a single symbol ─────────────────────
async function fetchChart1d(yahooSymbol) {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=5m&range=1d`;
    const res = await fetch(url, { headers: YF_HEADERS });
    if (!res.ok) throw new Error(`chart ${res.status}`);
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;
    const meta   = result.meta || {};
    const q      = result.indicators?.quote?.[0] || {};
    const closes = (q.close  || []).filter(x => x != null);
    const opens  = (q.open   || []).filter(x => x != null);
    const highs  = (q.high   || []).filter(x => x != null);
    const lows   = (q.low    || []).filter(x => x != null);
    const vols   = (q.volume || []).filter(x => x != null);
    const price  = meta.regularMarketPrice || closes.at(-1) || 0;
    const prev   = meta.chartPreviousClose || opens[0]      || price;
    if (!price) return null;
    return {
      price:       r2(price),
      change_amt:  r2(price - prev),
      change_pct:  prev ? r2(((price - prev) / prev) * 100) : 0,
      day_open:    r2(meta.regularMarketOpen || opens[0]  || price),
      day_high:    r2(meta.regularMarketDayHigh || Math.max(...highs, price)),
      day_low:     r2(meta.regularMarketDayLow  || Math.min(...lows,  price)),
      volume:      meta.regularMarketVolume || vols.reduce((a, b) => a + b, 0),
      week52_high: r2(meta.fiftyTwoWeekHigh || 0),
      week52_low:  r2(meta.fiftyTwoWeekLow  || 0),
      market_cap:  meta.marketCap || null,
      currency:    meta.currency  || "USD",
    };
  } catch (err) {
    console.error(`  Chart1d error for ${yahooSymbol}:`, err.message);
    return null;
  }
}

// ── Yahoo Finance page scrape: fetch fundamentals ─────────────
async function fetchFundamentals(yahooSymbol) {
  try {
    // Try v8/chart which returns some fundamental data in meta
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1d&includePrePost=false`;
    const res = await fetch(url, { headers: YF_HEADERS, signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta || {};

    const r2 = n => n != null && !isNaN(n) ? Math.round(n * 100) / 100 : null;

    // Extract what's available from chart meta
    const price     = meta.regularMarketPrice || 0;
    const pe_ratio  = r2(meta.trailingPE)  || null;
    const eps       = pe_ratio && price ? r2(price / pe_ratio) : null;
    const pb_ratio  = r2(meta.priceToBook) || null;
    const book_value= pb_ratio && price ? r2(price / pb_ratio) : null;
    const div_yield = meta.dividendYield != null ? r2(meta.dividendYield * 100) : null;
    const market_cap = meta.marketCap || null;
    const week52_high = r2(meta.fiftyTwoWeekHigh) || null;
    const week52_low  = r2(meta.fiftyTwoWeekLow)  || null;

    // Try quoteSummary as secondary source (may or may not work depending on Yahoo's mood)
    try {
      const url2 = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahooSymbol)}?modules=summaryDetail%2CdefaultKeyStatistics%2CfinancialData`;
      const res2 = await fetch(url2, { headers: { ...YF_HEADERS, "Accept": "application/json" }, signal: AbortSignal.timeout(6000) });
      if (res2.ok) {
        const j2 = await res2.json();
        const sd = j2?.quoteSummary?.result?.[0]?.summaryDetail        || {};
        const ks = j2?.quoteSummary?.result?.[0]?.defaultKeyStatistics || {};
        const fd = j2?.quoteSummary?.result?.[0]?.financialData        || {};
        const r3 = n => n?.raw != null ? Math.round(n.raw * 100) / 100 : null;
        return {
          pe_ratio:    r3(sd.trailingPE)  || r3(sd.forwardPE) || pe_ratio,
          pb_ratio:    r3(ks.priceToBook) || pb_ratio,
          eps:         r3(ks.trailingEps) || eps,
          div_yield:   sd.dividendYield?.raw != null ? Math.round(sd.dividendYield.raw * 10000)/100 : div_yield,
          roe:         fd.returnOnEquity?.raw != null ? Math.round(fd.returnOnEquity.raw * 10000)/100 : null,
          debt_equity: r3(ks.debtToEquity) || null,
          book_value:  r3(ks.bookValue)    || book_value,
          market_cap:  meta.marketCap      || null,
          week52_high, week52_low,
        };
      }
    } catch {}

    // Return what we got from chart meta alone
    return { pe_ratio, pb_ratio, eps, div_yield, book_value, market_cap, week52_high, week52_low, roe:null, debt_equity:null };
  } catch (e) {
    console.error("fetchFundamentals error:", e.message);
    return {};
  }
}

// ── DB helpers ────────────────────────────────────────────────
function saveStockData(data) {
  db().prepare(`
    INSERT INTO stocks (
      symbol, name, sector,
      price, change_amt, change_pct,
      day_open, day_high, day_low, volume,
      market_cap, week52_low, week52_high,
      pe_ratio, pb_ratio, eps, div_yield,
      roe, debt_equity, book_value, face_value,
      updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
    ON CONFLICT(symbol) DO UPDATE SET
      price=excluded.price, change_amt=excluded.change_amt,
      change_pct=excluded.change_pct, day_open=excluded.day_open,
      day_high=excluded.day_high, day_low=excluded.day_low,
      volume=excluded.volume, market_cap=excluded.market_cap,
      week52_low=excluded.week52_low, week52_high=excluded.week52_high,
      updated_at=datetime('now')
  `).run([
    data.symbol, data.name, data.sector,
    data.price, data.change_amt, data.change_pct,
    data.day_open, data.day_high, data.day_low, data.volume,
    data.market_cap, data.week52_low, data.week52_high,
    data.pe_ratio||null, data.pb_ratio||null, data.eps||null, data.div_yield||null,
    data.roe||null, data.debt_equity||null, data.book_value||null, data.face_value||null,
  ]);
}

function savePriceHistory(symbol, price, volume) {
  try {
    db().prepare("INSERT INTO price_history (symbol, price, volume) VALUES (?, ?, ?)")
      .run([symbol, price, volume]);
  } catch {}
}

// ── Main refresh: all stocks fetched IN PARALLEL ─────────────
async function refreshAllPrices() {
  console.log("\n💹 Refreshing prices (parallel)...");
  const yahooSymbols = ALL_STOCKS.map(s => s.yahooSymbol);

  // Try spark batch first
  const sparkMap = await fetchSpark(yahooSymbols);
  const sparkHits = Object.keys(sparkMap).length;

  // Any missing → fetch in PARALLEL (not one-by-one)
  const missing = ALL_STOCKS.filter(s => !sparkMap[s.yahooSymbol]?.price);
  if (missing.length > 0) {
    const parallel = await Promise.allSettled(
      missing.map(s => fetchChart1d(s.yahooSymbol).then(q => ({ s, q })))
    );
    for (const r of parallel) {
      if (r.status === "fulfilled" && r.value.q?.price) {
        sparkMap[r.value.s.yahooSymbol] = r.value.q;
      }
    }
  }

  let updated = 0;
  for (const stock of ALL_STOCKS) {
    const quote = sparkMap[stock.yahooSymbol];
    if (!quote?.price) { console.log(`  ✗ No data: ${stock.symbol}`); continue; }
    try {
      saveStockData({ symbol: stock.symbol, name: stock.name, sector: stock.sector, ...quote });
      savePriceHistory(stock.symbol, quote.price, quote.volume);
      updated++;
    } catch (err) {
      console.error(`  DB error ${stock.symbol}:`, err.message);
    }
  }

  console.log(`✅ Prices updated: ${updated}/${ALL_STOCKS.length} stocks`);

  // Fetch fundamentals for stocks that are missing pe_ratio (run in background)
  const missingFundamentals = ALL_STOCKS.filter(s => {
    const row = db().prepare("SELECT pe_ratio FROM stocks WHERE symbol = ?").get(s.symbol);
    return !row?.pe_ratio;
  });
  if (missingFundamentals.length > 0) {
    console.log(`📊 Fetching fundamentals for ${missingFundamentals.length} stocks...`);
    for (const stock of missingFundamentals) {
      try {
        const fund = await fetchFundamentals(stock.yahooSymbol);
        if (fund.pe_ratio || fund.eps || fund.pb_ratio) {
          db().prepare(`UPDATE stocks SET pe_ratio=?, pb_ratio=?, eps=?, div_yield=?, roe=?, debt_equity=?, book_value=? WHERE symbol=?`)
            .run(fund.pe_ratio, fund.pb_ratio, fund.eps, fund.div_yield, fund.roe, fund.debt_equity, fund.book_value, stock.symbol);
          console.log(`  ✓ Fundamentals: ${stock.symbol} P/E=${fund.pe_ratio}`);
        }
      } catch(e) { /* ignore */ }
    }
  }

  return { updated };
}

// ── Live quote for ANY world symbol ──────────────────────────
async function fetchLiveQuote(yahooSymbol) {
  // Try spark first (fastest)
  const map = await fetchSpark([yahooSymbol]);
  if (map[yahooSymbol]?.price) return map[yahooSymbol];
  // Fallback to chart1d
  return await fetchChart1d(yahooSymbol);
}

// ── Chart history for StockChart component ────────────────────
async function fetchChartData(yahooSymbol, period = "1m") {
  const PERIODS = {
    "1d":  { range: "1d",  interval: "5m"  },
    "1w":  { range: "5d",  interval: "60m" },
    "1m":  { range: "1mo", interval: "1d"  },
    "1y":  { range: "1y",  interval: "1wk" },
    "3y":  { range: "3y",  interval: "1mo" },
  };
  // If 1d has no data (market closed), fallback to 5d
  const FALLBACKS = { "1d": "5d" };
  const cfg = PERIODS[period] || PERIODS["1m"];

  async function tryFetch(range, interval) {
    const hosts = ["query2.finance.yahoo.com", "query1.finance.yahoo.com"];
    for (const host of hosts) {
      try {
        const url = `https://${host}/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${interval}&range=${range}`;
        const res = await fetch(url, { headers: YF_HEADERS });
        if (!res.ok) continue;
        const data   = await res.json();
        const result = data?.chart?.result?.[0];
        if (!result) continue;
        const timestamps = result.timestamp || [];
        const q = result.indicators?.quote?.[0] || {};
        const rows = timestamps.map((ts, i) => ({
          date:   new Date(ts * 1000).toISOString(),
          open:   r2(q.open?.[i]),
          high:   r2(q.high?.[i]),
          low:    r2(q.low?.[i]),
          close:  r2(q.close?.[i]),
          volume: q.volume?.[i] || 0,
        })).filter(x => x.close != null);
        if (rows.length > 0) return rows;
      } catch {}
    }
    return [];
  }

  try {
    let rows = await tryFetch(cfg.range, cfg.interval);
    // If 1d is empty (market closed), try 5d
    if (rows.length === 0 && FALLBACKS[period]) {
      const fb = PERIODS[FALLBACKS[period]];
      rows = await tryFetch(fb.range, fb.interval);
    }
    return rows;
  } catch (err) {
    console.error(`Chart error ${yahooSymbol}:`, err.message);
    return [];
  }
}

function getStockFromDB(symbol) {
  return db().prepare("SELECT * FROM stocks WHERE symbol = ?").get(symbol);
}
function getAllStocksFromDB() {
  return db().prepare("SELECT * FROM stocks ORDER BY symbol").all();
}
function r2(n) { return n != null && !isNaN(n) ? Math.round(n * 100) / 100 : null; }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

module.exports = { refreshAllPrices, fetchLiveQuote, fetchChartData, getStockFromDB, getAllStocksFromDB, fetchFundamentals };