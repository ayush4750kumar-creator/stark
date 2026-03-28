// routes/intradayAgent.js
const express = require("express");
const router  = express.Router();
const axios   = require("axios");

const YF_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://finance.yahoo.com",
};

const SCREENER_URLS = [
  "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&scrIds=most_actives_in&count=100&offset=0",
  "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&scrIds=day_gainers_in&count=50&offset=0",
  "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved?formatted=false&scrIds=day_losers_in&count=50&offset=0",
];

const FALLBACK_SYMBOLS = [
  "RELIANCE.NS","TCS.NS","HDFCBANK.NS","INFY.NS","ICICIBANK.NS","HINDUNILVR.NS",
  "ITC.NS","SBIN.NS","BHARTIARTL.NS","AXISBANK.NS","KOTAKBANK.NS","LT.NS",
  "MARUTI.NS","SUNPHARMA.NS","TATAMOTORS.NS","WIPRO.NS","BAJFINANCE.NS",
  "NTPC.NS","ONGC.NS","POWERGRID.NS","HCLTECH.NS","ULTRACEMCO.NS","TITAN.NS",
  "ADANIENT.NS","ADANIPORTS.NS","JSWSTEEL.NS","TATASTEEL.NS","HINDALCO.NS",
  "COALINDIA.NS","DRREDDY.NS","CIPLA.NS","DIVISLAB.NS","APOLLOHOSP.NS",
  "BAJAJFINSV.NS","BAJAJ-AUTO.NS","EICHERMOT.NS","HEROMOTOCO.NS","M&M.NS",
  "GRASIM.NS","BPCL.NS","IOC.NS","NESTLEIND.NS","BRITANNIA.NS","TATACONSUM.NS",
  "INDUSINDBK.NS","TECHM.NS","HDFCLIFE.NS","SBILIFE.NS","ICICIGI.NS","SHREECEM.NS",
  "ZOMATO.NS","PAYTM.NS","NAUKRI.NS","DMART.NS","PIDILITIND.NS","SIEMENS.NS",
  "ABB.NS","HAVELLS.NS","GODREJCP.NS","COLPAL.NS","MARICO.NS","DABUR.NS",
  "BERGEPAINT.NS","ASTRAL.NS","POLYCAB.NS","DIXON.NS","VOLTAS.NS","MUTHOOTFIN.NS",
  "CHOLAFIN.NS","SBICARD.NS","HDFCAMC.NS","ICICIPRULI.NS","MAXHEALTH.NS",
  "TRENT.NS","JUBLFOOD.NS","ZYDUSLIFE.NS","ALKEM.NS","TORNTPHARM.NS",
  "AUROPHARMA.NS","LUPIN.NS","GLENMARK.NS","LAURUSLABS.NS","BIOCON.NS",
  "HAL.NS","BEL.NS","BHEL.NS","IRFC.NS","RECLTD.NS","PFC.NS","NHPC.NS",
  "ADANIGREEN.NS","TATAPOWER.NS","TORNTPOWER.NS","SUZLON.NS","WAAREEENER.NS",
  "TATACHEM.NS","UPL.NS","SRF.NS","DEEPAKNTR.NS","AARTIIND.NS","VINATIORG.NS",
  "BANKBARODA.NS","CANBK.NS","PNB.NS","UNIONBANK.NS","INDIANB.NS","BANKINDIA.NS",
  "IDFCFIRSTB.NS","FEDERALBNK.NS","RBLBANK.NS","YESBANK.NS","AUBANK.NS",
  "MANAPPURAM.NS","SHRIRAMFIN.NS","M&MFIN.NS","ABCAPITAL.NS",
  "DLF.NS","LODHA.NS","PRESTIGE.NS","OBEROIRLTY.NS","PHOENIXLTD.NS","GODREJPROP.NS",
  "INDUSTOWER.NS","IDEA.NS","IRCTC.NS","CONCOR.NS","GMRINFRA.NS",
  "SAIL.NS","NMDC.NS","JINDALSTEL.NS","VEDL.NS","HINDZINC.NS","NATIONALUM.NS",
  "PAGEIND.NS","KALYANKJIL.NS","TATAELXSI.NS","MPHASIS.NS","PERSISTENT.NS",
  "COFORGE.NS","LTIM.NS","OFSS.NS","KPITTECH.NS","CYIENT.NS","ANGELONE.NS",
  "BSE.NS","MCX.NS","CDSL.NS","DELHIVERY.NS","ASIANPAINT.NS","INDIGO.NS",
  "CHOLAHLDNG.NS","MOTILALOFS.NS","CUMMINSIND.NS","THERMAX.NS","KEC.NS",
  "HAL.NS","MAZDOCK.NS","BDL.NS","COCHINSHIP.NS","GRSE.NS","MTARTECH.NS",
  "JIOFIN.NS","PAYTM.NS","POLICYBZR.NS","NYKAA.NS","SWIGGY.NS","DELHIVERY.NS",
  "KAYNES.NS","SYRMA.NS","AVALON.NS","AMBER.NS","SGHL.NS",
  "PATANJALI.NS","VBL.NS","RADICO.NS","MCDOWELL-N.NS","UNITEDBRW.NS",
  "TATACOMM.NS","HFCL.NS","STLTECH.NS","RAILTEL.NS","BSOFT.NS",
  "PPLPHARMA.NS","MANKIND.NS","JBCHEPHARM.NS","IPCALAB.NS","ERIS.NS",
  "SUNTV.NS","ZEEL.NS","PVRINOX.NS","NAZARA.NS","DELTACORP.NS",
  "PIIND.NS","COROMANDEL.NS","GNFC.NS","CHAMBALFERT.NS","NFL.NS",
  "SJVN.NS","IREDA.NS","NHPC.NS","CESC.NS","JSWENERGY.NS","INOXGREEN.NS",
  "TIINDIA.NS","ENDURANCE.NS","SUPRAJIT.NS","MINDA.NS","UNOMINDA.NS",
  "SONA.NS","SAMVARDHANA.NS","GABRIEL.NS","WABCOINDIA.NS",
  "AFFLE.NS","INDIGRID.NS","POWERMECH.NS","KALPATPOWR.NS","APLAPOLLO.NS",
  "LICI.NS","NIACL.NS","STARHEALTH.NS","GICHSGFIN.NS",
];

async function fetchScreener(url) {
  try {
    const res = await axios.get(url, { headers: YF_HEADERS, timeout: 12000 });
    return res.data?.finance?.result?.[0]?.quotes || [];
  } catch { return []; }
}

const QUOTE_FIELDS = [
  "symbol","shortName","longName",
  "regularMarketPrice","regularMarketChange","regularMarketChangePercent",
  "regularMarketVolume","regularMarketOpen","regularMarketPreviousClose",
  "regularMarketDayHigh","regularMarketDayLow",
  "averageDailyVolume3Month","averageDailyVolume10Day",
  "marketCap","fiftyTwoWeekHigh","fiftyTwoWeekLow",
  "trailingPE","forwardPE","epsTrailingTwelveMonths",
].join(",");

async function fetchBulkQuotes(symbols) {
  const results = [];
  for (let i = 0; i < symbols.length; i += 20) {
    const chunk = symbols.slice(i, i + 20);
    try {
      const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${chunk.join(",")}&fields=${QUOTE_FIELDS}`;
      const res = await axios.get(url, { headers: YF_HEADERS, timeout: 12000 });
      results.push(...(res.data?.quoteResponse?.result || []));
    } catch {}
    await new Promise(r => setTimeout(r, 150));
  }
  return results;
}

async function fetchRSI(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=5m&range=1d`;
    const res = await axios.get(url, { headers: YF_HEADERS, timeout: 8000 });
    const closes = res.data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter(v => v != null);
    if (!closes || closes.length < 15) return null;
    const period = 14;
    let gains = 0, losses = 0;
    for (let i = 1; i <= period; i++) {
      const diff = closes[closes.length - i] - closes[closes.length - i - 1];
      if (diff > 0) gains += diff; else losses -= diff;
    }
    const avgGain = gains / period, avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    return Math.round(100 - 100 / (1 + avgGain / avgLoss));
  } catch { return null; }
}

async function fetchMACD(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=5m&range=1d`;
    const res = await axios.get(url, { headers: YF_HEADERS, timeout: 8000 });
    const closes = res.data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close?.filter(v => v != null);
    if (!closes || closes.length < 26) return null;
    function ema(data, p) { const k = 2/(p+1); let e = data[0]; for (let i=1;i<data.length;i++) e=data[i]*k+e*(1-k); return e; }
    return ema(closes, 12) - ema(closes, 26) > 0;
  } catch { return null; }
}

// Patterns that indicate junk/non-tradeable symbols to exclude
const JUNK_PATTERNS = [
  /INAV$/i,        // ETF iNAV indicators (e.g. NIFITEINAV, NIF100INAV)
  /NAV$/i,         // NAV symbols (e.g. SETFGOLD NAV, QGOLDHALF NAV)
  /-SM$/i,         // SME platform stocks
  /IVZIN/i,        // Invesco iNAV
  /SETF.*INAV/i,   // SBI ETF iNAV variants
  /INAV/i,         // Any remaining iNAV
];

function normalizeQuote(q) {
  const sym = q.symbol || "";
  if (!sym.endsWith(".NS") && !sym.endsWith(".BO")) return null;
  const name = q.shortName || q.longName || sym.replace(/\.(NS|BO)$/, "");
  const symBase = sym.replace(/\.(NS|BO)$/, "");

  // Filter out index symbols
  if (sym.startsWith("^")) return null;
  if (name.toUpperCase().includes("SENSEX")) return null;

  // Filter out iNAV, NAV indicators, SME stocks
  for (const pattern of JUNK_PATTERNS) {
    if (pattern.test(symBase) || pattern.test(name)) return null;
  }

  // Filter out extremely high % changes (>500%) — these are almost always iNAV artifacts
  const changePct = q.regularMarketChangePercent ?? 0;
  if (Math.abs(changePct) > 500) return null;

  // Filter out very low-priced penny stocks (under ₹1) — usually junk
  const price = q.regularMarketPrice ?? 0;
  if (price > 0 && price < 1) return null;
  const todayVol = q.regularMarketVolume ?? null;
  const avg3m    = q.averageDailyVolume3Month ?? q.averageDailyVolume10Day ?? null;
  // weekVolumePct: today vs avg daily (positive = higher than avg = unusual activity)
  const weekVolumePct = (todayVol != null && avg3m != null && avg3m > 0)
    ? ((todayVol - avg3m) / avg3m) * 100
    : null;
  return {
    symbol:       sym,
    name,
    price:        q.regularMarketPrice           ?? null,
    changePct:    q.regularMarketChangePercent    ?? null,
    change:       q.regularMarketChange           ?? null,
    volume:       todayVol,
    marketCap:    q.marketCap                     ?? null,
    weekVolume:   avg3m,        // avg daily vol (used as reference)
    weekVolumePct,
    open:         q.regularMarketOpen             ?? null,
    prevClose:    q.regularMarketPreviousClose    ?? null,
    high:         q.regularMarketDayHigh          ?? null,
    low:          q.regularMarketDayLow           ?? null,
    week52High:   q.fiftyTwoWeekHigh              ?? null,
    week52Low:    q.fiftyTwoWeekLow               ?? null,
    pe:           q.trailingPE                    ?? null,
    changePct10m: null,
    changePct1h:  null,
    rsi:          null,
    macd:         null,
  };
}

async function fetchIntradayStocks() {
  let rawQuotes = [];

  // Step 1: screeners
  const screenerResults = await Promise.all(SCREENER_URLS.map(fetchScreener));
  for (const q of screenerResults) rawQuotes.push(...q);
  const seen = new Set();
  rawQuotes = rawQuotes.filter(q => { if (!q.symbol || seen.has(q.symbol)) return false; seen.add(q.symbol); return true; });
  console.log(`[IntradayAgent] Screeners: ${rawQuotes.length} stocks`);

  // Step 2: always enrich screener stocks + add fallback with full fields
  const allSymbols = [...new Set([...rawQuotes.map(q=>q.symbol), ...FALLBACK_SYMBOLS])];
  console.log(`[IntradayAgent] Bulk fetching ${allSymbols.length} symbols with full fields...`);
  const enriched = await fetchBulkQuotes(allSymbols);
  const enrichedMap = {};
  for (const q of enriched) if (q.symbol) enrichedMap[q.symbol] = q;

  // Merge: use enriched data (has full fields) over screener data
  const finalMap = {};
  for (const q of rawQuotes) finalMap[q.symbol] = enrichedMap[q.symbol] || q;
  for (const sym of FALLBACK_SYMBOLS) if (enrichedMap[sym]) finalMap[sym] = enrichedMap[sym];

  let stocks = Object.values(finalMap).map(normalizeQuote).filter(Boolean);
  stocks.sort((a, b) => Math.abs(b.changePct ?? 0) - Math.abs(a.changePct ?? 0));
  stocks = stocks.slice(0, 150);
  console.log(`[IntradayAgent] ${stocks.length} stocks after normalize+sort`);

  // Step 3: RSI + MACD for ALL stocks — batch in groups of 10 to avoid rate limits
  console.log(`[IntradayAgent] Computing RSI+MACD for all ${stocks.length} stocks...`);
  const indicators = {};
  const BATCH = 10;
  for (let i = 0; i < stocks.length; i += BATCH) {
    const batch = stocks.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map(async s => {
        const [rsi, macd] = await Promise.all([fetchRSI(s.symbol), fetchMACD(s.symbol)]);
        return { symbol: s.symbol, rsi, macd };
      })
    );
    for (const r of results) if (r.status === "fulfilled" && r.value) indicators[r.value.symbol] = r.value;
    if (i + BATCH < stocks.length) await new Promise(r => setTimeout(r, 300));
  }
  stocks = stocks.map(s => ({ ...s, rsi: indicators[s.symbol]?.rsi ?? null, macd: indicators[s.symbol]?.macd ?? null }));

  console.log(`[IntradayAgent] Done — returning ${stocks.length} stocks`);
  return stocks;
}

let cache = null, cacheTime = 0;
const CACHE_TTL = 2 * 60 * 1000;

router.get("/screen", async (req, res) => {
  try {
    const now = Date.now();
    if (cache && now - cacheTime < CACHE_TTL)
      return res.json({ success: true, data: cache, cached: true, age: Math.round((now-cacheTime)/1000) });
    console.log("[IntradayAgent] Cache miss — fetching fresh data...");
    const stocks = await fetchIntradayStocks();
    if (!stocks.length) {
      if (cache) return res.json({ success: true, data: cache, cached: true, stale: true });
      return res.status(503).json({ success: false, error: "No data available" });
    }
    cache = stocks; cacheTime = now;
    res.json({ success: true, data: stocks });
  } catch (err) {
    console.error("[IntradayAgent]", err.message);
    if (cache) return res.json({ success: true, data: cache, cached: true, stale: true });
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/refresh", async (req, res) => {
  try {
    cache = null;
    const stocks = await fetchIntradayStocks();
    cache = stocks; cacheTime = Date.now();
    res.json({ success: true, data: stocks, count: stocks.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;