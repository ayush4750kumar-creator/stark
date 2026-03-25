// services/financialsService.js
//
// Financial Statements — Income, Balance Sheet, Cash Flow
//
// ─── Sources (100% FREE, no API keys needed) ──────────────────
//  Indian stocks  →  Screener.in   (HTML scrape, full 5yr history)
//  US/Global      →  Macrotrends   (HTML scrape, full 10yr history)
//                    macrotrends.net/stocks/charts/{TICKER}/{slug}/{metric}
//                    Data embedded as `var originalData = [...]` in page HTML
// ──────────────────────────────────────────────────────────────

const { getDB } = require("../config/database");
const db    = () => getDB();
const sleep = ms => new Promise(r => setTimeout(r, ms));

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

function nv(v) {
  if (v == null || v === "" || v === "null" || v === "N/A") return null;
  const p = parseFloat(String(v).replace(/,/g, ""));
  return isNaN(p) ? null : p;
}
function rv(o) {
  if (o == null) return null;
  if (typeof o === "object" && "raw" in o) return nv(o.raw);
  return nv(o);
}

// ── DB helpers ─────────────────────────────────────────────────
function saveRows(symbol, rows, currency, source) {
  if (!rows.length) return;
  const d = db();
  try {
    d.exec("BEGIN");
    for (const r of rows) {
      d.prepare(`
        INSERT INTO financials
          (symbol,period_type,period,revenue,net_income,gross_profit,ebit,eps,
           total_assets,total_debt,equity,op_cashflow,capex,free_cashflow,currency,source)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        ON CONFLICT(symbol,period_type,period) DO UPDATE SET
          revenue=excluded.revenue,net_income=excluded.net_income,
          gross_profit=excluded.gross_profit,ebit=excluded.ebit,eps=excluded.eps,
          total_assets=excluded.total_assets,total_debt=excluded.total_debt,
          equity=excluded.equity,op_cashflow=excluded.op_cashflow,
          capex=excluded.capex,free_cashflow=excluded.free_cashflow,
          currency=excluded.currency,source=excluded.source,
          fetched_at=NOW()
      `).run(
        symbol,r.period_type,r.period,
        r.revenue??null,r.net_income??null,r.gross_profit??null,
        r.ebit??null,r.eps??null,r.total_assets??null,
        r.total_debt??null,r.equity??null,r.op_cashflow??null,
        r.capex??null,r.free_cashflow??null,currency,source
      );
    }
    d.exec("COMMIT");
  } catch (e) {
    try { d.exec("ROLLBACK"); } catch {}
    throw e;
  }
}

function loadFromDB(symbol) {
  const rows = db().prepare(
    "SELECT * FROM financials WHERE symbol=? ORDER BY period_type,period ASC"
  ).all(symbol);
  if (!rows.length) return null;
  const ageDays = (Date.now() - new Date(rows[0].fetched_at).getTime()) / 86400000;
  if (ageDays > 30) return null;
  const annual = rows.filter(r => r.period_type === "annual");
  const hasIncome = ["revenue","net_income","gross_profit","ebit"].some(f => annual.some(r => r[f] != null));
  if (annual.length > 0 && !hasIncome) {
    try { db().prepare("DELETE FROM financials WHERE symbol=?").run(symbol); } catch {}
    return null;
  }
  return {
    annual,
    quarterly: rows.filter(r => r.period_type === "quarterly"),
    currency:  rows[0].currency || "USD",
    source:    "cache",
  };
}

// ══════════════════════════════════════════════════════════════
//  MACROTRENDS scraper for US stocks
//  URL: macrotrends.net/stocks/charts/{TICKER}/{slug}/{metric}
//  Data is in: var originalData = [{...}, ...]
//  Each object has: {"date":"2024-09-28","val":"391035000000"}
// ══════════════════════════════════════════════════════════════

// Company slug lookup for the URL
// Macrotrends uses lowercase company name slugs in the URL
const MT_SLUGS = {
  AAPL:"apple", MSFT:"microsoft", GOOGL:"alphabet", GOOG:"alphabet",
  AMZN:"amazon", TSLA:"tesla", NVDA:"nvidia", META:"meta-platforms",
  NFLX:"netflix", AMD:"advanced-micro-devices", INTC:"intel",
  JPM:"jpmorgan-chase", BAC:"bank-of-america", GS:"goldman-sachs",
  MS:"morgan-stanley", WFC:"wells-fargo", V:"visa", MA:"mastercard",
  DIS:"disney", KO:"coca-cola", PEP:"pepsico", WMT:"walmart",
  COST:"costco", JNJ:"johnson-johnson", PFE:"pfizer", MRK:"merck",
  ABBV:"abbvie", LLY:"eli-lilly", UNH:"unitedhealth",
  CVX:"chevron", XOM:"exxon-mobil", BA:"boeing",
  SBUX:"starbucks", MCD:"mcdonalds", TGT:"target",
  CRM:"salesforce", ORCL:"oracle", ADBE:"adobe",
  QCOM:"qualcomm", AVGO:"broadcom", TXN:"texas-instruments",
  IBM:"ibm", CSCO:"cisco", AMAT:"applied-materials", MU:"micron",
  NDAQ:"nasdaq", ADI:"analog-devices", PYPL:"paypal",
  UBER:"uber", AMGN:"amgen", AXP:"american-express",
};

// Metrics to fetch from Macrotrends and their URL slugs
const MT_METRICS = [
  { key: "revenue",      slug: "revenue" },
  { key: "gross_profit", slug: "gross-profit" },
  { key: "ebit",         slug: "operating-income" },
  { key: "net_income",   slug: "net-income" },
  { key: "eps",          slug: "eps-earnings-per-share-diluted" },
  { key: "total_assets", slug: "total-assets" },
  { key: "total_debt",   slug: "long-term-debt" },
  { key: "equity",       slug: "shareholders-equity" },
  { key: "op_cashflow",  slug: "cash-flow-from-operating-activities" },
  { key: "free_cashflow",slug: "free-cash-flow" },
  { key: "capex",        slug: "capital-expenditures" },
];

// Fetch one Macrotrends metric page and extract annual + quarterly data
async function fetchMTMetric(ticker, slug, metricSlug) {
  const url = `https://www.macrotrends.net/stocks/charts/${ticker}/${slug}/${metricSlug}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.macrotrends.net/",
        "Cache-Control": "no-cache",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.log(`  ⚠ MT ${metricSlug}: HTTP ${res.status}`);
      return null;
    }

    const html = await res.text();

    // Method 1: Try var originalData = [...] (older pages)
    const m1 = html.match(/var\s+originalData\s*=\s*(\[[\s\S]*?\])\s*;/);
    if (m1) {
      try {
        const dataArr = JSON.parse(m1[1]);
        if (Array.isArray(dataArr) && dataArr.length) {
          return parseDataArray(dataArr);
        }
      } catch {}
    }

    // Method 2: Try other JS variable names Macrotrends uses
    for (const varName of ["rawData","chartData","histData","tableData"]) {
      const m = html.match(new RegExp(`var\\s+${varName}\\s*=\\s*(\\[[\\s\\S]*?\\])\\s*;`));
      if (m) {
        try {
          const dataArr = JSON.parse(m[1]);
          if (Array.isArray(dataArr) && dataArr.length) return parseDataArray(dataArr);
        } catch {}
      }
    }

    // Method 3: Parse HTML table directly (most reliable)
    // Macrotrends always has a table with class "historical_data_table" or similar
    // Table rows: <td>2024-09-28</td><td>$391.04B</td>
    const tableData = parseHTMLTable(html, metricSlug);
    if (tableData && (Object.keys(tableData.annual).length > 0)) {
      return tableData;
    }

    console.log(`  ⚠ MT ${metricSlug}: no data found`);
    return null;
  } catch (e) {
    console.log(`  ⚠ MT ${metricSlug}: ${e.message}`);
    return null;
  }
}

function parseDataArray(dataArr) {
  const annual = {}, quarterly = {};
  const QM = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  for (const entry of dataArr) {
    if (!entry.date) continue;
    const raw = entry.val ?? entry.v1 ?? entry.value ?? Object.values(entry).find(v => v !== entry.date && v !== null && v !== undefined);
    const val = nv(raw);
    if (val == null) continue;
    const year = entry.date.slice(0, 4);
    if (!annual[year] || new Date(entry.date) > new Date(annual[year].date)) {
      annual[year] = { date: entry.date, val };
    }
    const d = new Date(entry.date), mo = d.getMonth() + 1;
    const q = mo <= 3 ? "Q1" : mo <= 6 ? "Q2" : mo <= 9 ? "Q3" : "Q4";
    quarterly[`${year}-${q}`] = { date: entry.date, val, year, q };
  }
  return { annual, quarterly };
}

function parseHTMLTable(html, metricSlug) {
  const annual = {}, quarterly = {};

  // Find all table rows with date + value pattern
  // Macrotrends table rows look like: <td>2024-09-28</td><td>$391.04B</td>
  // or annual: <td>2024</td><td>$391.04B</td>
  const rowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
  const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;

  const rows = html.match(rowRegex) || [];
  for (const row of rows) {
    const cells = [];
    let m;
    const cellMatcher = new RegExp(cellRegex.source, "gi");
    while ((m = cellMatcher.exec(row)) !== null) {
      cells.push(m[1].replace(/<[^>]+>/g, "").trim());
    }
    if (cells.length < 2) continue;

    const dateCell  = cells[0];
    const valueCell = cells[1];

    // Parse value — Macrotrends uses formats like "$391.04B", "$2.50T", "$123.4M"
    const val = parseMTValue(valueCell);
    if (val == null) continue;

    // Annual row: "2024" or quarterly: "2024-09-28"
    if (/^\d{4}$/.test(dateCell)) {
      const yr = dateCell;
      if (!annual[yr] || Math.abs(val) > Math.abs(annual[yr].val || 0)) {
        annual[yr] = { date: yr, val };
      }
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(dateCell)) {
      const year = dateCell.slice(0, 4);
      const mo   = parseInt(dateCell.slice(5, 7));
      const q    = mo <= 3 ? "Q1" : mo <= 6 ? "Q2" : mo <= 9 ? "Q3" : "Q4";
      const qk   = `${year}-${q}`;
      quarterly[qk] = { date: dateCell, val, year, q };
      // Also update annual with the last entry for that year
      if (!annual[year] || new Date(dateCell) > new Date(annual[year].date || "2000-01-01")) {
        annual[year] = { date: dateCell, val };
      }
    }
  }

  return { annual, quarterly };
}

// Parse Macrotrends value strings: "$391.04B" → 391040000000
function parseMTValue(str) {
  if (!str || str === "-" || str === "—" || str === "") return null;
  const s = str.replace(/\s/g, "").replace(/,/g, "");
  const m = s.match(/^-?\$?([\d.]+)([KMBT]?)$/i);
  if (!m) return null;
  const num = parseFloat(m[1]);
  if (isNaN(num)) return null;
  const mult = { K: 1e3, M: 1e6, B: 1e9, T: 1e12 }[m[2].toUpperCase()] || 1;
  return (str.startsWith("-") ? -1 : 1) * num * mult;
}

// Find the company slug from Macrotrends search if not in our lookup
async function findMTSlug(ticker) {
  if (MT_SLUGS[ticker]) return MT_SLUGS[ticker];
  // Try to discover by fetching the stock's main page
  try {
    // Macrotrends search endpoint
    const res = await fetch(
      `https://www.macrotrends.net/assets/php/fundamental_iframe.php?t=${ticker}&type=revenue&statement=income-statement&frequency=A`,
      { headers: { "User-Agent": UA, "Referer": "https://www.macrotrends.net/" }, signal: AbortSignal.timeout(8000) }
    );
    if (res.ok) {
      const text = await res.text();
      // Extract slug from URL in the response
      const m = text.match(/stocks\/charts\/[A-Z]+\/([a-z0-9-]+)\//);
      if (m) return m[1];
    }
  } catch {}
  // Last resort: derive from company name in DB
  try {
    const row = db().prepare("SELECT name FROM stocks WHERE symbol=?").get(ticker);
    if (row?.name) return row.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  } catch {}
  return ticker.toLowerCase();
}

async function fetchMacrotrends(symbol) {
  const sym  = symbol.replace(/\.(NS|BO|L|T|HK|AX)$/i, "").toUpperCase();
  const slug = await findMTSlug(sym);
  console.log(`  📊 Macrotrends: ${sym} (slug: ${slug})`);

  // Fetch all metrics with small delays to avoid blocking
  const results = {};
  for (const { key, slug: metricSlug } of MT_METRICS) {
    const data = await fetchMTMetric(sym, slug, metricSlug);
    if (data) results[key] = data;
    await sleep(300); // polite delay between requests
  }

  if (!results.revenue && !results.net_income) {
    console.log(`  ✗ MT: no data for ${sym}`);
    return null;
  }

  // ── Build annual rows ────────────────────────────────────────
  // Get all years that have revenue or net_income data
  const allYears = new Set([
    ...Object.keys(results.revenue?.annual   || {}),
    ...Object.keys(results.net_income?.annual || {}),
  ]);

  // Take last 5 years
  const years = [...allYears].sort().slice(-5);

  if (!years.length) { console.log(`  ✗ MT: 0 years for ${sym}`); return null; }

  const annualRows = years.map(yr => {
    const get = key => results[key]?.annual[yr]?.val ?? null;
    const opc  = get("op_cashflow");
    const fcf  = get("free_cashflow");
    const capx = get("capex");
    return {
      period_type:  "annual",
      period:       yr,
      revenue:      get("revenue"),
      net_income:   get("net_income"),
      gross_profit: get("gross_profit"),
      ebit:         get("ebit"),
      eps:          get("eps"),
      total_assets: get("total_assets"),
      total_debt:   get("total_debt"),
      equity:       get("equity"),
      op_cashflow:  opc,
      free_cashflow: fcf,
      capex:        capx != null ? Math.abs(capx) : (opc != null && fcf != null ? Math.abs(opc - fcf) : null),
    };
  }).filter(r => r.revenue != null || r.net_income != null);

  if (!annualRows.length) { console.log(`  ✗ MT: 0 annual rows for ${sym}`); return null; }

  // ── Build quarterly rows ─────────────────────────────────────
  const allQKeys = new Set([
    ...Object.keys(results.revenue?.quarterly   || {}),
    ...Object.keys(results.net_income?.quarterly || {}),
  ]);
  const qKeys = [...allQKeys].sort().slice(-8);

  const quarterlyRows = qKeys.map(qk => {
    const get = key => results[key]?.quarterly[qk]?.val ?? null;
    const opc  = get("op_cashflow");
    const fcf  = get("free_cashflow");
    const capx = get("capex");
    const [yr, q] = qk.split("-");
    return {
      period_type:  "quarterly",
      period:       `${q} ${yr}`,
      revenue:      get("revenue"),
      net_income:   get("net_income"),
      gross_profit: get("gross_profit"),
      ebit:         get("ebit"),
      eps:          get("eps"),
      eps_estimate: null, eps_surprise: null,
      total_assets: get("total_assets"),
      total_debt:   get("total_debt"),
      equity:       get("equity"),
      op_cashflow:  opc,
      free_cashflow: fcf,
      capex:        capx != null ? Math.abs(capx) : (opc != null && fcf != null ? Math.abs(opc - fcf) : null),
    };
  }).filter(r => r.revenue != null || r.net_income != null);

  const fields = Object.entries(annualRows[0]).filter(([k,v]) => v != null && !["period_type","period"].includes(k)).map(([k]) => k);
  console.log(`  ✓ MT: ${annualRows.length} annual, ${quarterlyRows.length} quarterly — ${fields.join(", ")}`);

  saveRows(symbol, [...annualRows, ...quarterlyRows], "USD", "macrotrends");
  return {
    annual:    annualRows.sort((a,b) => a.period.localeCompare(b.period)),
    quarterly: quarterlyRows,
    currency:  "USD",
    source:    "macrotrends",
  };
}

// ══════════════════════════════════════════════════════════════
//  Yahoo Finance fallback (if Macrotrends blocked/fails)
//  Income: 4-5yr ✓   Balance/Cashflow: current year only
// ══════════════════════════════════════════════════════════════
let _crumb=null,_cookie=null,_crumbAt=0;
const CRUMB_TTL=50*60*1000;

async function getYahooCrumb() {
  if (_crumb && Date.now()-_crumbAt < CRUMB_TTL) return {crumb:_crumb,cookie:_cookie};
  try { const r=await fetch("https://fc.yahoo.com",{headers:{"User-Agent":UA},signal:AbortSignal.timeout(6000)}); _cookie=(r.headers.get("set-cookie")||"").split(";")[0]||""; } catch { _cookie=""; }
  for (const host of ["query1.finance.yahoo.com","query2.finance.yahoo.com"]) {
    try {
      const r=await fetch(`https://${host}/v1/test/getcrumb`,{headers:{"User-Agent":UA,"Cookie":_cookie,"Accept":"*/*"},signal:AbortSignal.timeout(6000)});
      if (r.ok) { const t=(await r.text()).trim(); if (t&&t.length>2&&!t.startsWith("{")) { _crumb=t.replace(/\\u002F/g,"/"); _crumbAt=Date.now(); console.log(`  🔑 Yahoo crumb: ${_crumb.slice(0,8)}...`); return {crumb:_crumb,cookie:_cookie}; } }
    } catch {}
  }
  return {crumb:null,cookie:null};
}

async function fetchYahooFinancials(symbol) {
  const {crumb,cookie} = await getYahooCrumb();
  if (!crumb) return null;
  const sym=symbol.replace(/\.(NS|BO|L|T|HK|AX)$/i,"").toUpperCase();
  const hdrs={"User-Agent":UA,"Accept":"application/json","Referer":"https://finance.yahoo.com",...(cookie?{"Cookie":cookie}:{})};
  console.log(`  📊 Yahoo (fallback): ${sym}`);
  let incR=null,balR=null;
  for (const host of ["query1.finance.yahoo.com","query2.finance.yahoo.com"]) {
    try {
      const [r1,r2]=await Promise.all([
        fetch(`https://${host}/v10/finance/quoteSummary/${encodeURIComponent(sym)}?modules=${encodeURIComponent("incomeStatementHistory,incomeStatementHistoryQuarterly,earnings")}&crumb=${encodeURIComponent(crumb)}`,{headers:hdrs,signal:AbortSignal.timeout(15000)}),
        fetch(`https://${host}/v10/finance/quoteSummary/${encodeURIComponent(sym)}?modules=${encodeURIComponent("financialData,defaultKeyStatistics")}&crumb=${encodeURIComponent(crumb)}`,{headers:hdrs,signal:AbortSignal.timeout(15000)}),
      ]);
      if (r1.status===401){_crumb=null;return null;}
      if (r1.ok){const j=await r1.json();if(!j?.quoteSummary?.error)incR=j?.quoteSummary?.result?.[0];}
      if (r2.ok){const j=await r2.json();if(!j?.quoteSummary?.error)balR=j?.quoteSummary?.result?.[0];}
      if (incR) break;
    } catch {}
  }
  if (!incR) return null;
  const fd=balR?.financialData||{},ks=balR?.defaultKeyStatistics||{};
  const curOpc=rv(fd.operatingCashflow),curFcf=rv(fd.freeCashFlow);
  const curCapx=curOpc!=null&&curFcf!=null?Math.abs(curOpc-curFcf):null;
  const curDebt=rv(fd.totalDebt),curAssets=rv(ks.totalAssets);
  const bvps=rv(ks.bookValue),shares=rv(ks.sharesOutstanding)??rv(ks.impliedSharesOutstanding);
  const curEquity=bvps!=null&&shares!=null?Math.round(bvps*shares):null;
  const MONTHS=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const yearOf=ts=>new Date(parseInt(ts)*1000).getFullYear().toString();
  const pLabel=ts=>{const d=new Date(parseInt(ts)*1000);return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;};
  const incAnn=incR.incomeStatementHistory?.incomeStatementHistory||[];
  const incQ=incR.incomeStatementHistoryQuarterly?.incomeStatementHistory||[];
  const earnQ=incR.earnings?.earningsChart?.quarterly||[];
  if (!incAnn.length) return null;
  const annualRows=incAnn.slice(0,5).map((i,idx)=>({
    period_type:"annual",period:yearOf(rv(i.endDate)?.toString()),
    revenue:rv(i.totalRevenue),net_income:rv(i.netIncome)??rv(i.netIncomeApplicableToCommonShares),
    gross_profit:rv(i.grossProfit),ebit:rv(i.ebit)??rv(i.operatingIncome),
    eps:rv(i.basicEPS)??rv(i.dilutedEPS),
    total_assets:idx===0?curAssets:null,total_debt:idx===0?curDebt:null,equity:idx===0?curEquity:null,
    op_cashflow:idx===0?curOpc:null,capex:idx===0?curCapx:null,free_cashflow:idx===0?curFcf:null,
  })).filter(r=>r.revenue!=null||r.net_income!=null);
  if (!annualRows.length) return null;
  const quarterlyRows=incQ.slice(0,8).map((i,idx)=>{
    const earn=earnQ.find(e=>e.date&&rv(i.endDate)?.toString()&&e.date.includes(new Date(parseInt(rv(i.endDate))*1000).getFullYear().toString()));
    const eps=rv(i.basicEPS)??rv(i.dilutedEPS)??(earn?rv(earn.actual):null);
    const est=earn?rv(earn.estimate):null;
    return {period_type:"quarterly",period:pLabel(rv(i.endDate)?.toString()),
      revenue:rv(i.totalRevenue),net_income:rv(i.netIncome)??rv(i.netIncomeApplicableToCommonShares),
      gross_profit:rv(i.grossProfit),ebit:rv(i.ebit)??rv(i.operatingIncome),
      eps,eps_estimate:est,eps_surprise:eps!=null&&est!=null?Math.round((eps-est)*100)/100:null,
      total_assets:idx===0?curAssets:null,total_debt:idx===0?curDebt:null,equity:idx===0?curEquity:null,
      op_cashflow:idx===0?curOpc:null,capex:idx===0?curCapx:null,free_cashflow:idx===0?curFcf:null};
  }).filter(r=>r.revenue!=null||r.net_income!=null||r.eps!=null);
  console.log(`  ✓ Yahoo: ${annualRows.length} annual, ${quarterlyRows.length} quarterly`);
  saveRows(symbol,[...annualRows,...quarterlyRows],"USD","yahoo");
  return {annual:annualRows.sort((a,b)=>a.period.localeCompare(b.period)),quarterly:quarterlyRows,currency:"USD",source:"yahoo"};
}

// ══════════════════════════════════════════════════════════════
//  INDIAN STOCKS: Screener.in
// ══════════════════════════════════════════════════════════════
async function fetchScreener(baseSymbol) {
  console.log(`  🇮🇳 Screener.in: ${baseSymbol}`);
  const headers={"User-Agent":UA,"Accept":"text/html","Referer":"https://www.screener.in/"};
  let html=null;
  for (const url of [`https://www.screener.in/company/${baseSymbol}/consolidated/`,`https://www.screener.in/company/${baseSymbol}/`]) {
    try { const r=await fetch(url,{headers,signal:AbortSignal.timeout(15000)}); if (!r.ok) continue; const t=await r.text(); if (t.includes(`id="profit-loss"`)){html=t;break;} } catch(e){console.log(`  ⚠ Screener: ${e.message}`);}
  }
  if (!html) {
    try {
      const sr=await fetch(`https://www.screener.in/api/company/search/?q=${encodeURIComponent(baseSymbol)}&fields=name,url`,{headers:{...headers,"Accept":"application/json"},signal:AbortSignal.timeout(8000)});
      if (sr.ok){const list=await sr.json();for(const co of list||[]){if(!co?.url)continue;const pr=await fetch(`https://www.screener.in${co.url}`,{headers,signal:AbortSignal.timeout(15000)});if(!pr.ok)continue;const t=await pr.text();if(t.includes(`id="profit-loss"`)){html=t;break;}}}
    } catch(e){console.log(`  ⚠ Screener search: ${e.message}`);}
  }
  if (!html){console.log(`  ✗ Screener: no page for ${baseSymbol}`);return null;}
  function section(id){const i=html.indexOf(`id="${id}"`);return i===-1?null:html.slice(i,i+100000);}
  function parseTable(sec){
    if(!sec)return{headers:[],rows:[]};
    const headers=[];
    for(const m of sec.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi))headers.push(m[1].replace(/<[^>]+>/g,"").replace(/&nbsp;/g," ").replace(/\s+/g," ").trim());
    const rows=[];
    for(const tr of sec.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)){const cells=[];for(const td of tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi))cells.push(td[1].replace(/<[^>]+>/g,"").replace(/,/g,"").replace(/&nbsp;/g,"").trim());if(cells.length>=2&&cells[0])rows.push({label:cells[0],values:cells.slice(1)});}
    return{headers,rows};
  }
  function getVals(rows,pats){for(const p of pats){const row=rows.find(r=>r.label.toLowerCase().includes(p.toLowerCase()));if(row)return row.values.map(v=>nv(v));}return null;}
  const pl=parseTable(section("profit-loss")),bs=parseTable(section("balance-sheet")),cf=parseTable(section("cash-flow"));
  if(!pl.rows.length){console.log(`  ✗ Screener: empty for ${baseSymbol}`);return null;}
  const rev=getVals(pl.rows,["Sales","Revenue from operations","Revenue"]);
  const ni=getVals(pl.rows,["Net Profit","Profit after tax","PAT"]);
  const ebit=getVals(pl.rows,["Operating Profit","EBITDA","EBIT"]);
  const gp=getVals(pl.rows,["Gross Profit"]);
  const eps=getVals(pl.rows,["EPS in Rs","Basic EPS","EPS"]);
  const exp=getVals(pl.rows,["Total Expenses","Expenses","Expenditure"]);
  const ta=getVals(bs.rows,["Total Assets","Balance Sheet Total"]);
  const eq=getVals(bs.rows,["Net Worth","Shareholders' Funds","Total Equity","Equity"]);
  const debt=getVals(bs.rows,["Borrowings","Total Debt","Long Term Borrowings"]);
  const opc=getVals(cf.rows,["Cash from Oper","Operating Activities"])??getVals(pl.rows,["Cash from Oper","Operating Activities"]);
  const capx=getVals(cf.rows,["Capital Expenditure","Capex","Purchase of Fixed"])??getVals(pl.rows,["Capital Expenditure","Capex"]);
  const annHeaders=pl.headers.filter(h=>/\d{4}/.test(h)&&!h.toLowerCase().includes("ttm")).slice(-5);
  if(!annHeaders.length){console.log(`  ✗ Screener: no year headers`);return null;}
  const startIdx=pl.headers.indexOf(annHeaders[0]);
  const annualRows=annHeaders.map((period,i)=>{
    const idx=startIdx+i,opV=opc?.[idx]??null,cpV=capx?.[idx]??null,revV=rev?.[idx]??null,expV=exp?.[idx]??null;
    const gpV=gp?.[idx]??(revV!=null&&expV!=null?revV-expV:ebit?.[idx]??null);
    return{period_type:"annual",period:period.replace(/[A-Za-z\s]/g,"").trim()||period,
      revenue:revV,net_income:ni?.[idx]??null,gross_profit:gpV,ebit:ebit?.[idx]??null,eps:eps?.[idx]??null,
      total_assets:ta?.[idx]??null,total_debt:debt?.[idx]??null,equity:eq?.[idx]??null,
      op_cashflow:opV,capex:cpV!=null?Math.abs(cpV):null,free_cashflow:opV!=null&&cpV!=null?opV-Math.abs(cpV):null};
  }).filter(r=>r.revenue!=null||r.net_income!=null);
  if(!annualRows.length){console.log(`  ✗ Screener: 0 rows`);return null;}
  let quarterlyRows=[];
  const QM=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const isQH=h=>QM.some(m=>h.startsWith(m+" ")||h.startsWith(m+"\u00a0"))&&/\d{4}/.test(h);
  let qSec=null;
  for(const tm of html.matchAll(/<(?:table|section)[^>]*>([\s\S]*?)<\/(?:table|section)>/gi)){
    const ths=[...tm[1].matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map(m=>m[1].replace(/<[^>]+>/g,"").trim());
    const qThs=ths.filter(isQH);
    if(qThs.length>=4&&new Set(qThs.map(h=>QM.findIndex(m=>h.startsWith(m)))).size>1){qSec=tm[1];break;}
  }
  if(qSec){
    const qThs=[...qSec.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map(m=>m[1].replace(/<[^>]+>/g,"").trim());
    const qDH=qThs.filter(isQH).slice(-8),off=Math.max(0,qThs.filter(isQH).length-qDH.length);
    const qRows=[];
    for(const tr of [...qSec.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)]){const cells=[...tr[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(td=>td[1].replace(/<[^>]+>/g,"").replace(/,/g,"").trim());if(cells.length>=2&&cells[0])qRows.push({label:cells[0],values:cells.slice(1)});}
    const getQ=pats=>{for(const p of pats){const row=qRows.find(r=>r.label.toLowerCase().includes(p.toLowerCase()));if(row)return row.values.map(v=>{const x=parseFloat(v);return isNaN(x)?null:x;});}return null;};
    const sl=arr=>arr?.slice(off,off+qDH.length),fmtP=p=>(p||"").replace(/\s(\d{4})$/,(_,y)=>" '"+y.slice(2));
    const qRev=sl(getQ(["Sales","Revenue from operations"])),qNi=sl(getQ(["Net Profit","Profit after tax","PAT"]));
    const qGp=sl(getQ(["Operating Profit","EBITDA"])),qEps=sl(getQ(["EPS in Rs","EPS"]));
    const qOpc=sl(getQ(["Cash from Oper","Operating Activities"])),qCpx=sl(getQ(["Capital Expenditure","Capex"]));
    quarterlyRows=qDH.map((period,i)=>{const opV=qOpc?.[i]??null,cpV=qCpx?.[i]??null;
      return{period_type:"quarterly",period:fmtP(period),revenue:qRev?.[i]??null,net_income:qNi?.[i]??null,
        gross_profit:qGp?.[i]??null,ebit:qGp?.[i]??null,eps:qEps?.[i]??null,
        total_assets:null,total_debt:null,equity:null,
        op_cashflow:opV,capex:cpV!=null?Math.abs(cpV):null,free_cashflow:opV!=null&&cpV!=null?opV-Math.abs(cpV):null};
    }).filter(r=>r.revenue!=null||r.net_income!=null||r.eps!=null);
  }
  console.log(`  ✓ Screener: ${annualRows.length} annual, ${quarterlyRows.length} quarterly for ${baseSymbol}`);
  saveRows(baseSymbol,[...annualRows,...quarterlyRows],"INR_CR","screener");
  return{annual:annualRows,quarterly:quarterlyRows,currency:"INR_CR",source:"screener"};
}

// ── Indian detection ───────────────────────────────────────────
const US_SYMS=new Set(["AAPL","MSFT","GOOGL","GOOG","AMZN","TSLA","NVDA","META","NFLX","AMD","INTC","CRM","ORCL","ADBE","PYPL","UBER","JPM","BAC","GS","MS","WFC","V","MA","AXP","DIS","SBUX","MCD","KO","PEP","WMT","TGT","COST","AMGN","JNJ","PFE","MRK","ABBV","LLY","UNH","CVX","XOM","BA","NDAQ","ADI","IBM","QCOM","TXN","AVGO","CSCO","AMAT","MU","AEON"]);
function isIndian(symbol){
  if(symbol.endsWith(".NS")||symbol.endsWith(".BO"))return true;
  if(US_SYMS.has(symbol.toUpperCase()))return false;
  try{const row=db().prepare("SELECT yahoo_symbol FROM stocks WHERE symbol=?").get(symbol);if(row?.yahoo_symbol?.includes(".NS")||row?.yahoo_symbol?.includes(".BO"))return true;if(row?.yahoo_symbol&&!row.yahoo_symbol.includes("."))return false;}catch{}
  return symbol.length>=4&&/^[A-Z]+$/.test(symbol)&&!US_SYMS.has(symbol);
}

// ── In-flight dedup ────────────────────────────────────────────
const _inFlight=new Set(),_pending=new Set();
function queueForPrefetch(sym){try{if(db().prepare("SELECT fetched_at FROM financials WHERE symbol=? LIMIT 1").get(sym))return;}catch{}_pending.add(sym.toUpperCase());}
function getPendingQueue(){return[..._pending];}
function clearFromQueue(sym){_pending.delete(sym.toUpperCase());}
function avQuotaStatus(){return{source:"macrotrends+screener",note:"No API keys needed"};}

// ── Main ───────────────────────────────────────────────────────
async function getFinancials(symbol,forceRefresh=false){
  const sym=symbol.toUpperCase(),baseSym=sym.includes(".")?sym.split(".")[0]:sym,indian=isIndian(sym);
  if(!forceRefresh){const cached=loadFromDB(sym)||loadFromDB(baseSym);if(cached){console.log(`  📋 Cache hit: ${sym}`);return cached;}}
  if(_inFlight.has(sym)){console.log(`  ⏳ ${sym} already fetching...`);await sleep(8000);const c2=loadFromDB(sym)||loadFromDB(baseSym);if(c2)return c2;return{pending:true,message:"Fetching. Please refresh in 30 seconds."};}
  _inFlight.add(sym);
  try{
    if(indian){
      const d=await fetchScreener(baseSym);if(d){clearFromQueue(sym);return d;}return null;
    } else {
      // Try Macrotrends first (full history), Yahoo as fallback
      const mt=await fetchMacrotrends(baseSym);if(mt){clearFromQueue(sym);return mt;}
      console.log(`  ↩ Macrotrends failed — trying Yahoo fallback`);
      const yf=await fetchYahooFinancials(baseSym);if(yf){clearFromQueue(sym);return yf;}
      return null;
    }
  }finally{_inFlight.delete(sym);}
}

async function prefetchAll(){
  const all=[...new Set([...getPendingQueue(),...db().prepare("SELECT symbol FROM stocks WHERE price IS NOT NULL ORDER BY symbol").all().map(s=>s.symbol)])];
  console.log(`📄 Nightly financials: ${all.length} stocks`);
  let fetched=0,skipped=0,failed=0;
  for(const sym of all){
    if(loadFromDB(sym)){skipped++;continue;}
    const base=sym.includes(".")?sym.split(".")[0]:sym,indian=isIndian(sym);
    try{
      let r=null;
      if(indian)r=await fetchScreener(base);
      else{r=await fetchMacrotrends(base);if(!r)r=await fetchYahooFinancials(base);}
      if(r){fetched++;clearFromQueue(sym);}else failed++;
    }catch(e){console.log(`  ✗ ${sym}: ${e.message}`);failed++;}
    await sleep(indian?1000:500);
  }
  console.log(`✅ Nightly: ${fetched} fetched, ${skipped} cached, ${failed} failed`);
}

module.exports={getFinancials,prefetchAll,queueForPrefetch,getPendingQueue,avQuotaStatus};