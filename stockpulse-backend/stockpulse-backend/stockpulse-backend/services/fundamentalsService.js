// services/fundamentalsService.js
// Multi-source fundamentals fetcher — works for any stock worldwide.
// Yahoo Finance now requires crumb+cookie auth (since 2024) — handled via yahooCrumb.js

const { getCrumb, getHeaders } = require("./yahooCrumb");
const { getDB } = require("../config/database");
const db = () => getDB();

const sleep = ms => new Promise(r => setTimeout(r, ms));

function r2(n) {
  if (n == null || n === "" || isNaN(Number(n))) return null;
  return Math.round(Number(n) * 100) / 100;
}

// ── Yahoo fetch with crumb injected into URL ───────────────────
async function yfetch(url, crumb, cookie) {
  const sep     = url.includes("?") ? "&" : "?";
  const fullUrl = crumb ? `${url}${sep}crumb=${encodeURIComponent(crumb)}` : url;
  return fetch(fullUrl, {
    headers: getHeaders(crumb, cookie),
    signal: AbortSignal.timeout(9000),
  });
}

// ── Source 1: Yahoo Finance v7 quote ──────────────────────────
async function fetchYahooV7(yahooSymbol, crumb, cookie) {
  const fields = [
    "trailingPE","forwardPE","priceToBook","trailingEps","epsTrailingTwelveMonths",
    "dividendYield","returnOnEquity","debtToEquity","bookValue","marketCap",
    "regularMarketPrice","regularMarketOpen","regularMarketDayHigh","regularMarketDayLow",
    "regularMarketVolume","regularMarketChange","regularMarketChangePercent",
    "fiftyTwoWeekHigh","fiftyTwoWeekLow","shortName","longName","currency",
  ].join(",");

  for (const host of ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]) {
    try {
      const url = `https://${host}/v7/finance/quote?symbols=${encodeURIComponent(yahooSymbol)}&fields=${fields}`;
      const res = await yfetch(url, crumb, cookie);
      if (!res.ok) continue;
      const json = await res.json();
      const q    = json?.quoteResponse?.result?.[0];
      if (!q?.regularMarketPrice) continue;
      const price = r2(q.regularMarketPrice);
      const pe    = r2(q.trailingPE) || r2(q.forwardPE);
      const pb    = r2(q.priceToBook);
      return {
        price, pe_ratio: pe, pb_ratio: pb,
        eps:         r2(q.trailingEps) || r2(q.epsTrailingTwelveMonths),
        div_yield:   q.dividendYield  ? r2(q.dividendYield  * 100) : null,
        roe:         q.returnOnEquity ? r2(q.returnOnEquity * 100) : null,
        debt_equity: r2(q.debtToEquity),
        book_value:  r2(q.bookValue),
        market_cap:  q.marketCap || null,
        change_amt:  r2(q.regularMarketChange),
        change_pct:  r2(q.regularMarketChangePercent),
        day_open:    r2(q.regularMarketOpen),
        day_high:    r2(q.regularMarketDayHigh),
        day_low:     r2(q.regularMarketDayLow),
        volume:      q.regularMarketVolume ?? null,
        week52_high: r2(q.fiftyTwoWeekHigh),
        week52_low:  r2(q.fiftyTwoWeekLow),
        name:        q.shortName || q.longName || null,
        currency:    q.currency  || null,
        _source: "yahoo_v7",
      };
    } catch {}
  }
  return null;
}

// ── Source 2: Yahoo Finance v10 quoteSummary ───────────────────
async function fetchYahooV10(yahooSymbol, crumb, cookie) {
  const modules = "summaryDetail,defaultKeyStatistics,financialData,price";
  for (const host of ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]) {
    try {
      const url = `https://${host}/v10/finance/quoteSummary/${encodeURIComponent(yahooSymbol)}?modules=${modules}`;
      const res = await yfetch(url, crumb, cookie);
      if (!res.ok) continue;
      const json   = await res.json();
      const result = json?.quoteSummary?.result?.[0];
      if (!result) continue;
      const sd = result.summaryDetail        || {};
      const ks = result.defaultKeyStatistics || {};
      const fd = result.financialData        || {};
      const pr = result.price                || {};
      const rv = o => o?.raw != null ? r2(o.raw) : null;
      const price = rv(pr.regularMarketPrice) || rv(sd.previousClose);
      if (!price) continue;
      const pe = rv(sd.trailingPE) || rv(sd.forwardPE);
      const pb = rv(ks.priceToBook);
      return {
        price, pe_ratio: pe, pb_ratio: pb,
        eps:         rv(ks.trailingEps),
        div_yield:   sd.dividendYield?.raw  != null ? r2(sd.dividendYield.raw  * 100) : null,
        roe:         fd.returnOnEquity?.raw != null ? r2(fd.returnOnEquity.raw * 100) : null,
        debt_equity: rv(ks.debtToEquity),
        book_value:  rv(ks.bookValue) || (pb && price ? r2(price/pb) : null),
        market_cap:  pr.marketCap?.raw || sd.marketCap?.raw || null,
        change_amt:  rv(pr.regularMarketChange),
        change_pct:  rv(pr.regularMarketChangePercent),
        day_open:    rv(pr.regularMarketOpen),
        day_high:    rv(pr.regularMarketDayHigh),
        day_low:     rv(pr.regularMarketDayLow),
        week52_high: rv(sd.fiftyTwoWeekHigh),
        week52_low:  rv(sd.fiftyTwoWeekLow),
        volume:      pr.regularMarketVolume?.raw || null,
        name:        pr.shortName || pr.longName || null,
        _source: "yahoo_v10",
      };
    } catch {}
  }
  return null;
}

// ── Source 3: Yahoo Finance v8 chart ──────────────────────────
async function fetchYahooV8(yahooSymbol, crumb, cookie) {
  for (const host of ["query2.finance.yahoo.com", "query1.finance.yahoo.com"]) {
    try {
      const url = `https://${host}/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=1d&range=1d`;
      const res = await yfetch(url, crumb, cookie);
      if (!res.ok) continue;
      const json   = await res.json();
      const result = json?.chart?.result?.[0];
      const meta   = result?.meta || {};
      if (!meta.regularMarketPrice) continue;
      const price = r2(meta.regularMarketPrice);
      const prev  = meta.chartPreviousClose || price;
      const pe    = meta.trailingPE  ? r2(meta.trailingPE)  : null;
      const pb    = meta.priceToBook ? r2(meta.priceToBook) : null;
      return {
        price, pe_ratio: pe, pb_ratio: pb,
        eps:         pe && price ? r2(price / pe) : null,
        div_yield:   meta.dividendYield ? r2(meta.dividendYield * 100) : null,
        book_value:  pb && price ? r2(price / pb) : null,
        market_cap:  meta.marketCap || null,
        change_amt:  r2(price - prev),
        change_pct:  prev ? r2(((price - prev) / prev) * 100) : null,
        day_open:    r2(meta.regularMarketOpen),
        day_high:    r2(meta.regularMarketDayHigh),
        day_low:     r2(meta.regularMarketDayLow),
        week52_high: r2(meta.fiftyTwoWeekHigh),
        week52_low:  r2(meta.fiftyTwoWeekLow),
        name:        meta.shortName || null,
        currency:    meta.currency  || null,
        roe: null, debt_equity: null,
        _source: "yahoo_v8",
      };
    } catch {}
  }
  return null;
}

// ── Source 4: Alpha Vantage OVERVIEW ──────────────────────────
async function fetchAlphaVantage(symbol) {
  try {
    const key = process.env.ALPHA_VANTAGE_KEY || "demo";
    const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(symbol)}&apikey=${key}`;
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const q = await res.json();
    if (!q?.Symbol || q.Note || q.Information) return null;
    const pe  = r2(q.TrailingPE) || r2(q.ForwardPE);
    const eps = r2(q.EPS);
    const bv  = r2(q.BookValue);
    if (!pe && !eps && !bv) return null;
    return {
      pe_ratio:    pe,
      pb_ratio:    r2(q.PriceToBookRatio),
      eps, book_value: bv,
      div_yield:   q.DividendYield     ? r2(parseFloat(q.DividendYield)     * 100) : null,
      roe:         q.ReturnOnEquityTTM ? r2(parseFloat(q.ReturnOnEquityTTM) * 100) : null,
      debt_equity: r2(q.DebtToEquityRatio),
      market_cap:  q.MarketCapitalization ? parseFloat(q.MarketCapitalization) : null,
      week52_high: r2(q["52WeekHigh"]),
      week52_low:  r2(q["52WeekLow"]),
      name:        q.Name || null,
      price:       null,
      _source:     "alphavantage",
    };
  } catch { return null; }
}

// ── Source 5: Screener.in (Indian stocks only) ─────────────────
async function fetchScreener(baseSymbol) {
  try {
    const searchRes = await fetch(
      `https://www.screener.in/api/company/search/?q=${encodeURIComponent(baseSymbol)}&fields=name,url`,
      { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json", "Referer": "https://www.screener.in" }, signal: AbortSignal.timeout(6000) }
    );
    if (!searchRes.ok) return null;
    const results = await searchRes.json();
    const company = results?.[0];
    if (!company?.url) return null;

    const pageRes = await fetch(`https://www.screener.in${company.url}`, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "text/html", "Referer": "https://www.screener.in" },
      signal: AbortSignal.timeout(8000),
    });
    if (!pageRes.ok) return null;
    const html = await pageRes.text();

    const ratioMap = {};
    for (const m of html.matchAll(/<li[^>]*>[\s\S]*?<span[^>]*class="[^"]*name[^"]*"[^>]*>([\s\S]*?)<\/span>[\s\S]*?<span[^>]*class="[^"]*number[^"]*"[^>]*>\s*([\d,.%₹]+)\s*<\/span>/gi)) {
      const label = m[1].replace(/<[^>]+>/g, '').trim().toLowerCase();
      const val   = parseFloat(m[2].replace(/[,%₹]/g, '').replace(/,/g, ''));
      if (label && !isNaN(val)) ratioMap[label] = val;
    }

    function get(label) {
      const v = ratioMap[label.toLowerCase()];
      if (v != null) return v;
      const idx = html.indexOf(label);
      if (idx === -1) return null;
      const chunk = html.slice(idx, idx + 500);
      const m = chunk.match(/>\s*₹?\s*([\d,.]+)\s*(?:%|<)/);
      if (!m) return null;
      const n = parseFloat(m[1].replace(/,/g, ''));
      return isNaN(n) ? null : n;
    }

    const currentPrice = ratioMap["current price"] || null;
    const book_value   = get("Book Value") || get("Book value");
    const pe_ratio     = get("Stock P/E")  || get("P/E");
    const roe          = get("Return on equity") || get("ROE") || ratioMap["roce"];
    const div_yield    = get("Dividend yield") || get("Dividend Yield");
    const eps          = get("EPS in Rs") || get("EPS (TTM)") || get("EPS");
    const face_value   = get("Face Value") || get("Face value");
    const pb_ratio     = ratioMap["price to book value"] || (currentPrice && book_value ? r2(currentPrice / book_value) : null);
    const debt_equity  = ratioMap["debt to equity"] || ratioMap["d/e"] || null;
    const ind_pe       = get("Industry P/E") || get("Median PE") || null;
    const market_cap   = ratioMap["market cap"] ? ratioMap["market cap"] * 1e7 : null;

    if (!pe_ratio && !eps && !book_value) return null;
    console.log(`  ✓ Screener: P/E=${pe_ratio} EPS=${eps} ROE=${roe}`);
    return { pe_ratio, pb_ratio, eps, div_yield, roe, debt_equity, book_value, face_value, ind_pe, market_cap, _source: "screener" };
  } catch { return null; }
}

async function searchYahooSymbol(query) {
  for (const host of ["query1", "query2"]) {
    try {
      const url = `https://${host}.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=6&newsCount=0`;
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://finance.yahoo.com" }, signal: AbortSignal.timeout(5000) });
      if (!res.ok) continue;
      const json   = await res.json();
      const quotes = (json?.quotes || []).filter(q => q.quoteType === "EQUITY");
      if (!quotes.length) continue;
      return (
        quotes.find(q => q.symbol?.endsWith(".NS")) ||
        quotes.find(q => q.symbol?.endsWith(".BO")) ||
        quotes.find(q => !q.symbol?.includes("."))  ||
        quotes[0]
      )?.symbol || null;
    } catch {}
  }
  return null;
}

function merge(base, extra) {
  if (!extra) return base;
  if (!base)  return extra;
  const result = { ...base };
  for (const [k, v] of Object.entries(extra)) {
    if (result[k] == null && v != null) result[k] = v;
  }
  return result;
}

function hasFundamentals(d) {
  return d && (d.pe_ratio || d.eps || d.pb_ratio || d.book_value || d.roe || d.debt_equity);
}

function saveYahooSymbol(symbol, yahooSym) {
  try { db().prepare("UPDATE stocks SET yahoo_symbol=? WHERE symbol=?").run(yahooSym, symbol); } catch {}
}

// ── Main export ────────────────────────────────────────────────
async function getFundamentals(symbol) {
  const sym = symbol.toUpperCase();
  const { ALL_STOCKS } = require("../config/stocks");

  const hasSuffix = sym.includes(".");
  const baseSym   = hasSuffix ? sym.split(".")[0] : sym;
  const isShort   = baseSym.length <= 4;
  const isIndian  = hasSuffix
    ? (sym.endsWith(".NS") || sym.endsWith(".BO"))
    : !isShort;

  const config     = ALL_STOCKS.find(s => s.symbol === sym);
  const savedRow   = db().prepare("SELECT yahoo_symbol FROM stocks WHERE symbol=?").get(sym);
  const savedYahoo = savedRow?.yahoo_symbol;

  const candidates = savedYahoo
    ? [savedYahoo, sym, ...(isShort ? [`${baseSym}.NS`, `${baseSym}.BO`] : [`${baseSym}.NS`, `${baseSym}.BO`, baseSym])]
    : config?.yahooSymbol
      ? [config.yahooSymbol, ...(isShort ? [`${baseSym}.NS`, `${baseSym}.BO`] : [`${baseSym}.NS`, `${baseSym}.BO`, baseSym])]
      : isShort
        ? [sym, `${sym}.NS`, `${sym}.BO`]
        : [`${baseSym}.NS`, `${baseSym}.BO`, baseSym, sym];

  // Fetch crumb once for all Yahoo requests
  const { crumb, cookie } = await getCrumb();

  let best  = null;
  const tried = new Set();

  // Round 1: v7 for each candidate
  for (const candidate of [...new Set(candidates)]) {
    if (tried.has(candidate)) continue;
    tried.add(candidate);
    console.log(`  trying v7: ${candidate}`);
    const v7 = await fetchYahooV7(candidate, crumb, cookie);
    if (hasFundamentals(v7)) {
      saveYahooSymbol(sym, candidate);
      console.log(`  ✓ Yahoo v7: ${candidate} P/E=${v7.pe_ratio} EPS=${v7.eps}`);
      return { ...v7, yahooSym: candidate };
    }
    if (v7?.price && !best?.price) best = { ...v7, yahooSym: candidate };
    await sleep(80);
  }

  // Round 2: v10 quoteSummary
  const yahooSym = best?.yahooSym || (isIndian ? `${baseSym}.NS` : baseSym);
  console.log(`  trying v10: ${yahooSym}`);
  const v10 = await fetchYahooV10(yahooSym, crumb, cookie);
  if (hasFundamentals(v10)) {
    saveYahooSymbol(sym, yahooSym);
    console.log(`  ✓ Yahoo v10: P/E=${v10.pe_ratio} EPS=${v10.eps}`);
    return merge(best, { ...v10, yahooSym });
  }
  if (v10?.price && !best?.price) best = { ...v10, yahooSym };

  // Round 3: v8 chart
  console.log(`  trying v8: ${yahooSym}`);
  const v8 = await fetchYahooV8(yahooSym, crumb, cookie);
  if (hasFundamentals(v8)) return merge(best, { ...v8, yahooSym });
  if (v8?.price && !best?.price) best = { ...v8, yahooSym };

  // Round 4: Yahoo search for correct symbol
  const searched = await searchYahooSymbol(baseSym);
  if (searched && !tried.has(searched)) {
    console.log(`  🔍 Yahoo search found: ${searched}`);
    tried.add(searched);
    const v7s = await fetchYahooV7(searched, crumb, cookie);
    if (hasFundamentals(v7s)) {
      saveYahooSymbol(sym, searched);
      return { ...v7s, yahooSym: searched };
    }
    if (v7s?.price && !best?.price) best = { ...v7s, yahooSym: searched };
    const v10s = await fetchYahooV10(searched, crumb, cookie);
    if (hasFundamentals(v10s)) {
      saveYahooSymbol(sym, searched);
      return merge(best, { ...v10s, yahooSym: searched });
    }
  }

  // Round 5: Alpha Vantage
  const avSym = hasSuffix ? baseSym : sym;
  console.log(`  trying AlphaVantage: ${avSym}`);
  const av = await fetchAlphaVantage(avSym);
  if (hasFundamentals(av)) {
    console.log(`  ✓ AlphaVantage: P/E=${av.pe_ratio} EPS=${av.eps}`);
    const merged = merge(best, av);
    merged.yahooSym = best?.yahooSym || avSym;
    return merged;
  }

  // Round 6: Screener.in for Indian
  if (isIndian) {
    console.log(`  🇮🇳 Screener.in: ${baseSym}`);
    const screener = await fetchScreener(baseSym);
    if (screener) {
      const merged = merge(best, screener);
      merged.yahooSym = best?.yahooSym || `${baseSym}.NS`;
      saveYahooSymbol(sym, merged.yahooSym);
      return merged;
    }
  }

  if (best?.price) {
    console.log(`  ⚠ Price only for ${sym}`);
    saveYahooSymbol(sym, best.yahooSym);
    return best;
  }

  console.log(`  ✗ No data for ${sym}`);
  return null;
}

module.exports = { getFundamentals, searchYahooSymbol };