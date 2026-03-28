// fetch_fundamentals.js — scrapes Yahoo Finance HTML for fundamentals
// node agents/fetch_fundamentals.js

const { getDB } = require("../config/database");
const { ALL_STOCKS } = require("../config/stocks");
const db = getDB();

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  "Referer": "https://finance.yahoo.com/",
};

// Extract a number from text like "24.5" or "2,345.67" or "1.23B"
function parseNum(str) {
  if (!str || str === "N/A" || str === "--") return null;
  str = str.trim().replace(/,/g, "");
  const multipliers = { B: 1e9, M: 1e6, K: 1e3, T: 1e12 };
  const last = str.slice(-1).toUpperCase();
  if (multipliers[last]) return parseFloat(str) * multipliers[last];
  const n = parseFloat(str);
  return isNaN(n) ? null : n;
}

// Scrape Yahoo Finance summary page for a symbol
async function scrapeYahoo(yahooSymbol) {
  try {
    const url = `https://finance.yahoo.com/quote/${encodeURIComponent(yahooSymbol)}/`;
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();

    // Extract JSON data embedded in the page (Yahoo embeds all data as JSON)
    const match = html.match(/window\.App\.main\s*=\s*(\{.+?\});\n/s) ||
                  html.match(/"QuoteSummaryStore":\s*(\{.+?\}),\s*"QuotePageStore"/s) ||
                  html.match(/root\.App\.main\s*=\s*(\{.+?\});/s);

    if (match) {
      try {
        const json = JSON.parse(match[1]);
        // Navigate through Yahoo's nested structure
        const stores = json?.context?.dispatcher?.stores || json;
        const qs = stores?.QuoteSummaryStore || stores;

        const sd = qs?.summaryDetail        || {};
        const ks = qs?.defaultKeyStatistics || {};
        const fd = qs?.financialData        || {};
        const p  = qs?.price               || {};

        const r = obj => obj?.raw ?? obj?.fmt ?? null;
        const toNum = obj => {
          const v = r(obj);
          return v != null && !isNaN(Number(v)) ? Math.round(Number(v) * 100) / 100 : null;
        };

        return {
          pe_ratio:    toNum(sd.trailingPE)   || toNum(sd.forwardPE)   || null,
          pb_ratio:    toNum(ks.priceToBook)  || null,
          eps:         toNum(ks.trailingEps)  || null,
          div_yield:   sd.dividendYield?.raw != null ? Math.round(sd.dividendYield.raw * 10000) / 100 : null,
          roe:         fd.returnOnEquity?.raw != null ? Math.round(fd.returnOnEquity.raw * 10000) / 100 : null,
          debt_equity: toNum(ks.debtToEquity) || null,
          book_value:  toNum(ks.bookValue)    || null,
          market_cap:  toNum(p.marketCap)     || toNum(sd.marketCap)   || null,
        };
      } catch {}
    }

    // Fallback: parse HTML table directly
    const result = {};

    // Look for key stats in the HTML
    const patterns = [
      { key: "pe_ratio",    patterns: [/PE Ratio[^>]*>[^>]*>([0-9,.]+)/i, /trailingPE[^>]*>([0-9,.]+)/i] },
      { key: "eps",         patterns: [/EPS[^>]*>[^>]*>([0-9,.()-]+)/i] },
      { key: "market_cap",  patterns: [/Market Cap[^>]*>[^>]*>([0-9,.KMBT]+)/i] },
      { key: "pb_ratio",    patterns: [/Price.*Book[^>]*>[^>]*>([0-9,.]+)/i] },
      { key: "div_yield",   patterns: [/Dividend.*Yield[^>]*>[^>]*>([0-9,.%]+)/i] },
      { key: "book_value",  patterns: [/Book Value[^>]*>[^>]*>([0-9,.]+)/i] },
    ];

    for (const { key, patterns: pats } of patterns) {
      for (const pat of pats) {
        const m = html.match(pat);
        if (m?.[1]) {
          const val = parseNum(m[1].replace(/%/g, ""));
          if (val != null) { result[key] = val; break; }
        }
      }
    }

    return Object.keys(result).length > 0 ? result : null;
  } catch (e) {
    return null;
  }
}

// Try multiple Yahoo URL formats
async function fetchFund(stock) {
  const variants = [stock.yahooSymbol];
  // Also try without .NS suffix for some stocks
  if (stock.yahooSymbol.endsWith(".NS")) variants.push(stock.yahooSymbol.replace(".NS", ""));
  if (stock.yahooSymbol.endsWith(".BO")) variants.push(stock.yahooSymbol.replace(".BO", ""));

  for (const sym of variants) {
    const result = await scrapeYahoo(sym);
    if (result && (result.pe_ratio || result.eps || result.pb_ratio || result.market_cap)) {
      return result;
    }
    await new Promise(r => setTimeout(r, 300));
  }

  // Last resort: use v8 chart which sometimes has pe_ratio in meta
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(stock.yahooSymbol)}?interval=1d&range=1d`;
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const json = await res.json();
      const meta = json?.chart?.result?.[0]?.meta || {};
      const price = meta.regularMarketPrice;
      const pe    = meta.trailingPE  ? Math.round(meta.trailingPE  * 100) / 100 : null;
      const pb    = meta.priceToBook ? Math.round(meta.priceToBook * 100) / 100 : null;
      if (pe || pb || meta.marketCap) {
        return {
          pe_ratio:   pe,
          pb_ratio:   pb,
          eps:        pe && price ? Math.round((price / pe) * 100) / 100 : null,
          market_cap: meta.marketCap || null,
          div_yield:  meta.dividendYield ? Math.round(meta.dividendYield * 10000) / 100 : null,
          book_value: pb && price ? Math.round((price / pb) * 100) / 100 : null,
          roe: null, debt_equity: null,
        };
      }
    }
  } catch {}

  return null;
}

async function main() {
  console.log("📊 Fetching fundamentals for all stocks...\n");
  let success = 0;

  for (const stock of ALL_STOCKS) {
    process.stdout.write(`  ${stock.symbol.padEnd(12)}`);
    const fund = await fetchFund(stock);

    if (fund && (fund.pe_ratio || fund.eps || fund.pb_ratio || fund.market_cap)) {
      db.prepare(`UPDATE stocks SET
        pe_ratio    = COALESCE(?, pe_ratio),
        pb_ratio    = COALESCE(?, pb_ratio),
        eps         = COALESCE(?, eps),
        div_yield   = COALESCE(?, div_yield),
        roe         = COALESCE(?, roe),
        debt_equity = COALESCE(?, debt_equity),
        book_value  = COALESCE(?, book_value),
        market_cap  = COALESCE(?, market_cap)
        WHERE symbol = ?`)
        .run(fund.pe_ratio, fund.pb_ratio, fund.eps, fund.div_yield,
             fund.roe, fund.debt_equity, fund.book_value, fund.market_cap, stock.symbol);
      console.log(`✓  P/E=${fund.pe_ratio||"—"}  EPS=${fund.eps||"—"}  P/B=${fund.pb_ratio||"—"}  MCap=${fund.market_cap ? (fund.market_cap/1e9).toFixed(1)+"B" : "—"}`);
      success++;
    } else {
      console.log(`✗  No data (Yahoo may be blocking — try again later)`);
    }

    // Polite delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 800));
  }

  console.log(`\n✅ Done! ${success}/${ALL_STOCKS.length} stocks updated.`);
  if (success < ALL_STOCKS.length) {
    console.log("💡 Tip: Run again in a few minutes for any that failed — Yahoo rate limits reset.");
  }
  process.exit(0);
}

main();