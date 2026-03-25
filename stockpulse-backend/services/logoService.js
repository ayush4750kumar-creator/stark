// services/logoService.js
// Backend logo fetcher + cache.
// Fetches from multiple sources, caches result in DB as base64 data URL.
// Frontend calls GET /api/logos?symbols=TCS,INFY,... and gets back data URLs
// that load instantly with zero CORS issues.

const https  = require("https");
const http   = require("http");
const { getDB } = require("../config/database");

// ── In-memory cache (symbol → dataUrl | null) ──────────────────────
const memCache = {};

// ── Company domain map for Clearbit ───────────────────────────────
const DOMAIN_MAP = {
  // Indian stocks
  RELIANCE:"ril.com", TCS:"tcs.com", INFY:"infosys.com",
  HDFCBANK:"hdfcbank.com", ICICIBANK:"icicibank.com", WIPRO:"wipro.com",
  BAJFINANCE:"bajajfinserv.in", SBIN:"sbi.co.in", TATAMOTORS:"tatamotors.com",
  MARUTI:"marutisuzuki.com", ONGC:"ongcindia.com", ADANIENT:"adanienterprises.com",
  SUNPHARMA:"sunpharma.com", ITC:"itcportal.com", LTIM:"ltimindtree.com",
  AXISBANK:"axisbank.com", KOTAKBANK:"kotak.com", HINDUNILVR:"hul.co.in",
  NTPC:"ntpc.co.in", POWERGRID:"powergridindia.com", TECHM:"techmahindra.com",
  HCLTECH:"hcltech.com", TATASTEEL:"tatasteel.com", JSWSTEEL:"jsw.in",
  BHARTIARTL:"airtel.in", DRREDDY:"drreddys.com", CIPLA:"cipla.com",
  LUPIN:"lupin.com", DIVISLAB:"divislabs.com", AUROPHARMA:"aurobindo.com",
  BIOCON:"biocon.com", APOLLOHOSP:"apollohospitals.com", NESTLEIND:"nestle.in",
  ULTRACEMCO:"ultratechcement.com", GRASIM:"grasim.com",
  GAIL:"gailonline.com", COALINDIA:"coalindia.in", HINDALCO:"hindalco.com",
  TATACONSUM:"tataconsumer.com", ASIANPAINT:"asianpaints.com",
  PIDILITIND:"pidilite.com", DMART:"dmartindia.com", TITAN:"titancompany.in",
  COLPAL:"colgate.co.in", BRITANNIA:"britanniaindustries.com",
  HAVELLS:"havells.com", VOLTAS:"voltas.com", POLYCAB:"polycab.com",
  BEL:"bel-india.in", HAL:"hal-india.in", BPCL:"bharatpetroleum.com",
  HINDPETRO:"hindustanpetroleum.com", IOC:"iocl.com",
  ADANIPORTS:"adaniports.com", ADANIGREEN:"adanigreen.com",
  TATAPOWER:"tatapower.com", DLF:"dlf.in", GODREJPROP:"godrejproperties.com",
  SBILIFE:"sbilife.co.in", HDFCLIFE:"hdfclife.com",
  CHOLAFIN:"cholamandalam.com", SHRIRAMFIN:"shriramfinance.in",
  MUTHOOTFIN:"muthootfinance.com", INDIGO:"goindigo.in",
  ZOMATO:"zomato.com", PAYTM:"paytm.com", NAUKRI:"naukri.com",
  ANGELONE:"angelone.in", MCX:"mcxindia.com", BSE:"bseindia.com",
  IRFC:"irfc.in", NHPC:"nhpcindia.com", SUZLON:"suzlon.com",
  TATATECH:"tatatechnologies.com", HEROMOTOCO:"heromotocorp.com",
  EICHERMOT:"eichergroup.com", PERSISTENT:"persistent.com",
  COFORGE:"coforge.com", MPHASIS:"mphasis.com", HAPPSTMNDS:"happiestminds.com",
  DIXON:"dixoninfo.com", ASTRAL:"astralpipes.com", PAGEIND:"pageind.com",
  KALYANKJIL:"kalyanjewellers.com", JUBLFOOD:"dominos.co.in",
  DELHIVERY:"delhivery.com", SWIGGY:"swiggy.com", POLYCAB:"polycab.com",
  CANBK:"canarabank.com", BANKBARODA:"bankofbaroda.in",
  UNIONBANK:"unionbankofindia.co.in", BANKINDIA:"bankofindia.co.in",
  PNB:"pnbindia.in", AUBANK:"aubank.in", RBLBANK:"rblbank.com",
  YESBANK:"yesbank.in", VBL:"varunbeverages.com", PETRONET:"petronetlng.com",
  CONCOR:"concorindia.com", SIEMENS:"siemens.co.in", ABB:"abb.com",
  CUMMINSIND:"cumminsindia.com", BOSCHLTD:"bosch.in", BHEL:"bhel.com",
  NMDC:"nmdc.co.in", SOLARINDS:"solarindustries.com", CGPOWER:"cgpower.com",
  WAAREEENER:"waaree.com", APLAPOLLO:"aplapollo.com",
  BDL:"bdl-india.in", PFC:"pfcindia.com", RECLTD:"recindia.nic.in",
  IREDA:"ireda.gov.in", BHARATFORG:"bharatforge.com", SONACOMS:"sonacoms.com",
  UNOMINDA:"unominda.com", TRENT:"trent.in", PRESTIGE:"prestigeconstructions.com",
  LODHA:"lodhagroup.com", OBEROIRLTY:"oberoirealty.com",
  PHOENIXLTD:"thephoenixmills.com", LICI:"licindia.in",
  GODREJCP:"godrejcp.com", MANKIND:"mankindpharma.com",
  ALKEM:"alkemlab.com", TORNTPHARM:"torrentpharma.com",
  GLENMARK:"glenmarkpharma.com", LAURUSLABS:"lauruslabs.com",
  ZYDUSLIFE:"zyduslife.com", MAXHEALTH:"maxhealthcare.in",
  HDFCAMC:"hdfcamc.com", CDSL:"cdslindia.com",
  NUVAMA:"nuvama.com", ABCAPITAL:"adityabirlacapital.com",
  MAZDOCK:"mazagondock.in", NATIONALUM:"nalcoindia.com",
  BAJAJHLDNG:"bajajfinserv.in", TIINDIA:"tubeinvestments.in",
  PIIND:"pi-ind.com", SYNGENE:"syngeneintl.com",
  DALBHARAT:"dalmiabharat.com", SRF:"srf.com",
  KAYNES:"kaynestech.com", PGEL:"pgelectroplast.com",
  AMBER:"ambergroup.co.in", INDUSTOWER:"industowerslimited.com",
  PATANJALI:"patanjaliayurved.net", JIOFIN:"jio.com",
  PPLPHARMA:"piramal.com", SHREECEM:"shreecement.com",
  ICICIPRULI:"iciciprulife.com", ICICIGI:"icicilombard.com",
  ICICIPRULI:"iciciprulife.com", MANAPPURAM:"muthootfinance.com",
  INDIANB:"indianbank.in", SBICARD:"sbicard.com",
  GMRINFRA:"gmrgroup.in", COLPAL:"colgate.co.in",
  PREMIERENE:"waaree.com", MCDOWELL:"unitedspirits.com",
  HINDPETRO:"hindustanpetroleum.com",
  // ETF AMCs
  GOLDBEES:"nipponindiaetf.com", NIFTYBEES:"nipponindiaetf.com",
  BANKBEES:"nipponindiaetf.com", JUNIORBEES:"nipponindiaetf.com",
  MID150BEES:"nipponindiaetf.com", SILVERETF:"nipponindiaetf.com",
  HDFCGOLD:"hdfcfund.com", HDFCSILVER:"hdfcfund.com", HDFCNIFTY:"hdfcfund.com",
  AXISGOLD:"axismf.com", AXISSILVER:"axismf.com", AXISNIFTY:"axismf.com",
  GOLD1:"kotakmf.com", KOTAKSILVER:"kotakmf.com", NIFTY1:"kotakmf.com",
  SBIGOLD:"sbimf.com", SBISILVRETF:"sbimf.com", SETFNIF50:"sbimf.com",
  GOLDIETF:"icicipruamc.com", ICICISILVRETF:"icicipruamc.com", NIFTYIETF:"icicipruamc.com",
  BSLGOLDETF:"adityabirlacapital.com", BSLSILVETF:"adityabirlacapital.com",
  GOLDETF:"miraeassetmf.co.in", MIRAESILVER:"miraeassetmf.co.in",
  GOLDCASE:"zerodha.com", SILVERIETF:"zerodha.com", NIFTYCASE:"zerodha.com",
  AONEGOLD:"angelone.in", AONESILVER:"angelone.in",
  EGOLD:"edelweissmf.com", ESILVER:"edelweissmf.com",
  MOGOLD:"motilaloswalmf.com", MOSILVER:"motilaloswalmf.com",
  GROWWGOLD:"groww.in", GROWWSLVR:"groww.in", GROWWNIFTY:"groww.in",
  QGOLDHALF:"quantumamc.com", GOLDBETA:"utimf.com", BANKBETA:"utimf.com",
  LICMFGOLD:"licmf.com",
  // US stocks
  AAPL:"apple.com", MSFT:"microsoft.com", NVDA:"nvidia.com",
  GOOGL:"google.com", GOOG:"google.com", META:"meta.com",
  AMZN:"amazon.com", TSLA:"tesla.com", AMD:"amd.com",
  NFLX:"netflix.com", INTC:"intel.com", QCOM:"qualcomm.com",
  AVGO:"broadcom.com", ORCL:"oracle.com", IBM:"ibm.com",
  JPM:"jpmorganchase.com", BAC:"bankofamerica.com", GS:"goldmansachs.com",
  MS:"morganstanley.com", WFC:"wellsfargo.com", V:"visa.com",
  MA:"mastercard.com", PYPL:"paypal.com", DIS:"disney.com",
  CRM:"salesforce.com", ADBE:"adobe.com", UBER:"uber.com",
  COIN:"coinbase.com", PLTR:"palantir.com", SNOW:"snowflake.com",
};

// ── Fetch a URL and return buffer ──────────────────────────────────
function fetchBuffer(url, timeout = 8000) {
  return new Promise((resolve, reject) => {
    try {
      const mod    = url.startsWith("https") ? https : http;
      const parsed = new URL(url);
      const req    = mod.request({
        hostname: parsed.hostname,
        path:     parsed.pathname + parsed.search,
        method:   "GET",
        timeout,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Accept":     "image/*,*/*",
          "Referer":    "https://finance.yahoo.com",
        },
      }, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchBuffer(res.headers.location, timeout).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        const ct = res.headers["content-type"] || "";
        if (!ct.startsWith("image/") && !ct.includes("png") && !ct.includes("jpeg") && !ct.includes("svg") && !ct.includes("webp")) {
          return reject(new Error(`Not an image: ${ct}`));
        }
        const chunks = [];
        res.on("data", d => chunks.push(d));
        res.on("end",  () => resolve({ buffer: Buffer.concat(chunks), contentType: ct }));
        res.on("error", reject);
      });
      req.on("error",   reject);
      req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
      req.end();
    } catch(e) { reject(e); }
  });
}

// ── Ensure logo_cache table exists ────────────────────────────────
function ensureTable() {
  try {
    getDB().exec(`
      CREATE TABLE IF NOT EXISTS logo_cache (
        symbol   TEXT PRIMARY KEY,
        data_url TEXT,
        fetched  INTEGER DEFAULT (EXTRACT(EPOCH FROM NOW())::INTEGER)
      )
    `);
  } catch {}
}

// ── Check DB cache ─────────────────────────────────────────────────
function getFromDB(symbol) {
  try {
    const row = getDB().prepare("SELECT data_url FROM logo_cache WHERE symbol = ?").get(symbol);
    return row !== undefined ? (row.data_url || null) : undefined; // undefined = not in DB
  } catch { return undefined; }
}

// ── Save to DB cache ───────────────────────────────────────────────
function saveToDB(symbol, dataUrl) {
  try {
    getDB().prepare(`
      INSERT INTO logo_cache(symbol, data_url) VALUES(?,?)
      ON CONFLICT(symbol) DO UPDATE SET data_url=excluded.data_url, fetched=EXTRACT(EPOCH FROM NOW())::INTEGER
    `).run(symbol, dataUrl || null);
  } catch {}
}

// ── Build candidate URLs for a symbol ─────────────────────────────
function getCandidates(symbol) {
  const clean = symbol.replace(/\.(NS|BO|L|T|HK|AX)$/i, "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
  const domain = DOMAIN_MAP[clean];
  const urls = [];

  // 1. Clearbit — best quality logos
  if (domain) {
    urls.push(`https://logo.clearbit.com/${domain}`);
  }

  // 2. Screener.in static CDN — very reliable for Indian stocks
  urls.push(`https://www.screener.in/static/company-logos/${clean}.png`);

  // 3. Yahoo Finance company logo endpoint
  urls.push(`https://yfapi.net/v6/finance/recommendationsbysymbol/${encodeURIComponent(symbol)}`);

  // 4. Google favicons (reliable, always returns something)
  if (domain) {
    urls.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
  }
  urls.push(`https://www.google.com/s2/favicons?domain=${clean.toLowerCase()}.com&sz=128`);

  // 5. Try .in domain for Indian stocks
  if (!domain && symbol.endsWith(".NS")) {
    urls.push(`https://www.google.com/s2/favicons?domain=${clean.toLowerCase()}.in&sz=128`);
  }

  return urls;
}

// ── Fetch logo for one symbol — try each source until one works ────
async function fetchLogoForSymbol(symbol) {
  const clean = symbol.replace(/\.(NS|BO|L|T|HK|AX)$/i, "").replace(/[^A-Z0-9]/gi, "").toUpperCase();

  // Check memory cache
  if (memCache[clean] !== undefined) return memCache[clean];

  // Check DB cache
  ensureTable();
  const cached = getFromDB(clean);
  if (cached !== undefined) {
    memCache[clean] = cached;
    return cached;
  }

  // Fetch from sources
  const candidates = getCandidates(symbol);
  for (const url of candidates) {
    try {
      const { buffer, contentType } = await fetchBuffer(url, 6000);
      if (!buffer || buffer.length < 100) continue; // too small, probably error page

      // Check it's not a tiny 1x1 tracking pixel (Google favicons sometimes return these)
      if (buffer.length < 500 && !url.includes("clearbit") && !url.includes("screener")) continue;

      const mimeType = contentType.split(";")[0].trim();
      const dataUrl  = `data:${mimeType};base64,${buffer.toString("base64")}`;

      memCache[clean] = dataUrl;
      saveToDB(clean, dataUrl);
      return dataUrl;
    } catch {
      // Try next source
    }
  }

  // All sources failed
  memCache[clean] = null;
  saveToDB(clean, null);
  return null;
}

// ── Batch fetch — get logos for multiple symbols ───────────────────
async function getLogosMap(symbols) {
  const result = {};
  await Promise.all(
    symbols.map(async sym => {
      const clean = sym.replace(/\.(NS|BO|L|T|HK|AX)$/i,"").replace(/[^A-Z0-9]/gi,"").toUpperCase();
      const url = await fetchLogoForSymbol(sym).catch(() => null);
      result[clean] = url;
      result[sym]   = url; // also map original symbol
    })
  );
  return result;
}

// ── Single symbol ──────────────────────────────────────────────────
async function getLogoUrl(symbol) {
  return fetchLogoForSymbol(symbol).catch(() => null);
}

// ── Warm logos for all tracked stocks on startup ───────────────────
function warmLogos() {
  setTimeout(async () => {
    ensureTable();
    try {
      const { ALL_STOCKS } = require("../config/stocks");
      console.log(`  🖼  LogoService: warming ${ALL_STOCKS.length} logos...`);
      const CONCURRENCY = 10;
      let found = 0;
      for (let i = 0; i < ALL_STOCKS.length; i += CONCURRENCY) {
        const batch = ALL_STOCKS.slice(i, i + CONCURRENCY);
        await Promise.all(batch.map(async s => {
          const url = await fetchLogoForSymbol(s.yahooSymbol || s.symbol).catch(() => null);
          if (url) found++;
        }));
      }
      console.log(`  ✅ LogoService: ${found}/${ALL_STOCKS.length} logos cached`);
    } catch(e) {
      console.error("  ✗ LogoService warm:", e.message);
    }
  }, 5000);
}

module.exports = { getLogoUrl, getLogosMap, warmLogos };