// src/pages/NewsDetailPage.jsx
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import StockChart from "../components/StockChart";

const BACKEND = process.env.REACT_APP_API_URL;

const JUNK_LINES = [
  "follow us on", "follow seeking alpha", "latest stock news",
  "newsletter", "sign up for", "subscribe to",
  "entering text into", "search result below", "update the search",
  "click here to", "packed with expert", "new opportunities",
  "fresh ideas", "sector-specific newsletters", "get daily",
  "every investor", "seeking alpha on google",
];

function cleanText(text) {
  if (!text) return "";
  const lines = text.split("\n").flatMap(l => l.split(/\.\s+(?=[A-Z])/));
  return lines
    .map(l => l.trim())
    .filter(l => l.length > 10)
    .filter(l => {
      const lower = l.toLowerCase();
      return !JUNK_LINES.some(j => lower.includes(j));
    })
    .join(" ")
    .replace(/  +/g, " ")
    .trim();
}

const TAB_PARAM_MAP = {
  "performance": "PERFORMANCE",
  "chart":       "PERFORMANCE",
  "stats":       "STATS GRAPHS",
  "news":        "ALL NEWS",
};

const TABS = ["PERFORMANCE", "STATS GRAPHS", "ALL NEWS"];

function fmt(n, d = 2) {
  if (n == null || isNaN(n)) return "—";
  return Number(n).toLocaleString("en-IN", { maximumFractionDigits: d });
}
function fmtCap(n) {
  if (!n) return "—";
  if (n >= 1e12) return "₹" + (n/1e12).toFixed(2) + "T";
  if (n >= 1e9)  return "₹" + (n/1e9).toFixed(2)  + "B";
  if (n >= 1e7)  return "₹" + (n/1e7).toFixed(2)  + "Cr";
  return "₹" + Number(n).toLocaleString();
}
function timeAgo(ts) {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff/60000);
  if (m < 60)   return m + "m ago";
  if (m < 1440) return Math.floor(m/60) + "h ago";
  return Math.floor(m/1440) + "d ago";
}
function isDbId(id) { return /^\d+$/.test(id); }

const ALL_STOCKS = [
  { symbol:"RELIANCE",   name:"Reliance Industries", sector:"Energy",       flag:"🇮🇳" },
  { symbol:"TCS",        name:"Tata Consultancy",    sector:"IT",           flag:"🇮🇳" },
  { symbol:"INFY",       name:"Infosys",             sector:"IT",           flag:"🇮🇳" },
  { symbol:"HDFCBANK",   name:"HDFC Bank",           sector:"Banking",      flag:"🇮🇳" },
  { symbol:"ICICIBANK",  name:"ICICI Bank",          sector:"Banking",      flag:"🇮🇳" },
  { symbol:"WIPRO",      name:"Wipro",               sector:"IT",           flag:"🇮🇳" },
  { symbol:"BAJFINANCE", name:"Bajaj Finance",       sector:"Finance",      flag:"🇮🇳" },
  { symbol:"SBIN",       name:"State Bank of India", sector:"Banking",      flag:"🇮🇳" },
  { symbol:"TATAMOTORS", name:"Tata Motors",         sector:"Auto",         flag:"🇮🇳" },
  { symbol:"MARUTI",     name:"Maruti Suzuki",       sector:"Auto",         flag:"🇮🇳" },
  { symbol:"ONGC",       name:"ONGC",                sector:"Energy",       flag:"🇮🇳" },
  { symbol:"ADANIENT",   name:"Adani Enterprises",   sector:"Conglomerate", flag:"🇮🇳" },
  { symbol:"SUNPHARMA",  name:"Sun Pharma",          sector:"Pharma",       flag:"🇮🇳" },
  { symbol:"ITC",        name:"ITC Limited",         sector:"FMCG",         flag:"🇮🇳" },
  { symbol:"AAPL",       name:"Apple Inc.",          sector:"Tech",         flag:"🇺🇸" },
  { symbol:"MSFT",       name:"Microsoft",           sector:"Tech",         flag:"🇺🇸" },
  { symbol:"GOOGL",      name:"Alphabet",            sector:"Tech",         flag:"🇺🇸" },
  { symbol:"NVDA",       name:"NVIDIA",              sector:"Tech",         flag:"🇺🇸" },
  { symbol:"TSLA",       name:"Tesla",               sector:"Auto",         flag:"🇺🇸" },
  { symbol:"META",       name:"Meta Platforms",      sector:"Tech",         flag:"🇺🇸" },
  { symbol:"AMZN",       name:"Amazon",              sector:"Tech",         flag:"🇺🇸" },
  { symbol:"JPM",        name:"JPMorgan Chase",      sector:"Banking",      flag:"🇺🇸" },
];

const COMPANY_FACTS = {
  RELIANCE:   ["India's largest company by revenue, operating across energy, retail, and telecom.", "Jio Platforms transformed India's digital landscape with affordable 4G/5G.", "Retail segment (Reliance Retail) is one of Asia's fastest-growing retail chains."],
  TCS:        ["World's second-largest IT services company by market cap.", "Serves over 1,200 clients across 55 countries with 600,000+ employees.", "Consistent dividend payer with over 20 years of uninterrupted growth."],
  INFY:       ["Pioneer of the Global Delivery Model in IT outsourcing.", "Cobalt cloud platform helps enterprises accelerate their digital transformation.", "Strong focus on AI and automation through Infosys Topaz platform."],
  HDFCBANK:   ["India's largest private sector bank with 8,000+ branches.", "Merged with parent HDFC Ltd in 2023, creating a financial services giant.", "Industry-leading asset quality with low NPA ratios consistently."],
  ICICIBANK:  ["Second-largest private bank; strong in retail and SME lending.", "iMobile app is among India's most downloaded banking applications.", "Significant international presence across UK, Canada, and Southeast Asia."],
  WIPRO:      ["Global IT, consulting and business process services company.", "Strong sustainability focus — carbon-neutral since 2020.", "Major player in cloud, cybersecurity, and digital transformation."],
  BAJFINANCE: ["India's most profitable NBFC with AUM exceeding ₹3 lakh crore.", "Pioneered consumer durable financing; EMI cards have massive penetration.", "Expanding into financial services super-app via BFL app."],
  SBIN:       ["India's largest public sector bank with ₹60+ lakh crore in assets.", "Unmatched rural reach with 22,000+ branches across India.", "YONO (You Only Need One) app is a leading digital banking platform."],
  TATAMOTORS: ["India's largest commercial vehicle manufacturer; owns Jaguar Land Rover.", "JLR's electric pivot is a key growth driver.", "Strong EV portfolio in India under Tata.ev brand."],
  MARUTI:     ["Commands ~40% market share of Indian passenger vehicles.", "Alto, Swift, Baleno, Brezza are perennial top-sellers.", "Expanding SUV and CNG portfolio to address shifting consumer preferences."],
  ONGC:       ["India's largest crude oil and natural gas producer.", "Accounts for ~70% of domestic oil and gas production.", "Expanding into renewables via ONGC Green subsidiary."],
  ADANIENT:   ["Flagship of the Adani Group conglomerate across infra, ports, airports.", "Operates India's largest private port network (Mundra Port).", "Expanding into green hydrogen and renewable energy at massive scale."],
  SUNPHARMA:  ["India's largest pharma company; top-5 specialty generics globally.", "Strong in dermatology, oncology, and ophthalmology segments.", "US generics business is the largest revenue contributor."],
  ITC:        ["Diversified conglomerate — cigarettes, FMCG, hotels, agribusiness, paper.", "FMCG brands like Aashirvaad, Sunfeast, Bingo are market leaders.", "Hotels business undergoing demerger to unlock shareholder value."],
  AAPL:       ["World's most valuable company by market cap.", "Services (App Store, iCloud, Apple Music) is the fastest-growing segment.", "Gross margins above 40% — best-in-class among hardware firms."],
  MSFT:       ["Azure cloud is the world's second-largest cloud platform.", "Copilot AI integration across Office 365 drives enterprise value.", "LinkedIn and GitHub acquisitions add significant recurring revenue."],
  GOOGL:      ["Controls ~90% of global search market; dominant in online advertising.", "Google Cloud growing at 25%+ annually, closing gap with AWS.", "DeepMind and Gemini AI investments position Alphabet for AI era."],
  NVDA:       ["Dominant supplier of AI training chips (H100, B200 GPUs).", "CUDA ecosystem creates massive switching costs for AI developers.", "Data center revenue grew 400%+ YoY driven by AI buildout."],
  TSLA:       ["World's most valuable automaker; pioneered mass-market EVs.", "Supercharger network is the largest fast-charging infrastructure globally.", "FSD software is a high-margin recurring revenue opportunity."],
  META:       ["Owns Facebook, Instagram, WhatsApp — 3.2 billion daily active users.", "Advertising revenue rebounded strongly after 2022 efficiency drive.", "Reality Labs (Quest VR headsets) is a long-term metaverse bet."],
  AMZN:       ["AWS cloud is the global leader with ~33% market share.", "Prime membership ecosystem drives loyalty across e-commerce, streaming, grocery.", "Advertising is now a $50B+ business growing faster than the core."],
  JPM:        ["America's largest bank by assets with $3.9 trillion balance sheet.", "Investment banking and trading divisions consistently top league tables.", "Strong consumer franchise via Chase with 80 million customers."],
};

function getSimilarStocks(symbol, sector) {
  const same = ALL_STOCKS.filter(s => s.sector === sector && s.symbol !== symbol);
  const seed = symbol.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return [...same].sort((a,b) => ((seed*31 + a.symbol.charCodeAt(0)) % 7) - ((seed*31 + b.symbol.charCodeAt(0)) % 7)).slice(0,3);
}

function StatRow({ label, value, color }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid var(--border)" }}>
      <span style={{ fontSize:13, color:"var(--text3)" }}>{label}</span>
      <span style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:13, color: color||"var(--text)" }}>{value||"—"}</span>
    </div>
  );
}

function ArticleTab({ article, bodyText, onNavigateStock }) {
  const [stockPrices, setStockPrices] = useState({});
  const sym       = article.symbol;
  const isStock   = sym && sym !== "MARKET";
  const facts     = isStock ? (COMPANY_FACTS[sym] || []) : [];
  const stockInfo = isStock ? ALL_STOCKS.find(s => s.symbol === sym) : null;
  const similar   = isStock ? getSimilarStocks(sym, stockInfo?.sector || "") : [];

  useEffect(() => {
    if (!similar.length) return;
    Promise.all(similar.map(s =>
      fetch(`${BACKEND}/stocks/${s.symbol}`).then(r=>r.json()).then(d=>d.success?{[s.symbol]:d.data}:{}).catch(()=>({}))
    )).then(r => setStockPrices(Object.assign({},...r)));
  }, [sym]);

  const src = (article.source||"").toLowerCase();
  const q   = encodeURIComponent(article.headline||"");
  let readUrl = `https://news.google.com/search?q=${q}&hl=en-IN`;
  let readLabel = "Find full story on Google News";
  if (article.source_url)                                        { readUrl = article.source_url; readLabel = `Read at ${article.source||"source"}`; }
  else if (src.includes("economic times")||src.includes("et ")) { readUrl = `https://economictimes.indiatimes.com/searchresult.cms?query=${q}`; readLabel = "Read on Economic Times"; }
  else if (src.includes("ndtv"))                                 { readUrl = `https://www.ndtvprofit.com/search?q=${q}`; readLabel = "Read on NDTV Profit"; }
  else if (src.includes("mint"))                                 { readUrl = `https://www.livemint.com/Search/Link/Keyword/${q}`; readLabel = "Read on LiveMint"; }
  else if (src.includes("reuters"))                              { readUrl = `https://www.reuters.com/search/news?blob=${q}`; readLabel = "Read on Reuters"; }
  else if (src.includes("bloomberg"))                            { readUrl = `https://www.bloomberg.com/search?query=${q}`; readLabel = "Read on Bloomberg"; }
  else if (src.includes("moneycontrol"))                         { readUrl = `https://www.moneycontrol.com/news/search?query=${q}`; readLabel = "Read on MoneyControl"; }

  return (
    <div>
      <div className="card" style={{ padding:"22px 24px", marginBottom:16 }}>
        {bodyText && bodyText.trim().length > 30
          ? bodyText.split(/\n\n+/).filter(p=>p.trim().length>0).map((para,i) => (
              <p key={i} style={{ lineHeight:1.85, color:"var(--text2)", fontSize:15, margin:"0 0 16px" }}>{para.trim()}</p>
            ))
          : <p style={{ lineHeight:1.85, color:"var(--text2)", fontSize:15, margin:0 }}>{article.headline}</p>
        }
        <div style={{ marginTop:16, paddingTop:14, borderTop:"1px solid var(--border)", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
          <span style={{ fontSize:12, color:"var(--text3)" }}>
            Source: <strong style={{ color:"var(--text2)" }}>{article.source||"Unknown"}</strong>
            {article.published_at && <> · {timeAgo(article.published_at)}</>}
          </span>
          <a href={readUrl} target="_blank" rel="noopener noreferrer"
            style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"7px 14px", background:"var(--bg3)", border:"1px solid var(--border2)", borderRadius:8, color:"var(--accent)", fontSize:12, fontFamily:"var(--font-display)", fontWeight:600, textDecoration:"none" }}>
            📖 {readLabel} ↗
          </a>
        </div>
      </div>

      {facts.length > 0 && (
        <div style={{ marginBottom:16 }}>
          <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:11, color:"var(--text3)", letterSpacing:0.8, marginBottom:10, textTransform:"uppercase" }}>
            {stockInfo?.flag} About {stockInfo?.name||sym}
          </div>
          <div className="card" style={{ padding:"16px 20px" }}>
            {facts.map((f,i) => (
              <p key={i} style={{ fontSize:13, color:"var(--text2)", lineHeight:1.7, margin:i<facts.length-1?"0 0 10px":"0" }}>{f}</p>
            ))}
          </div>
        </div>
      )}

      {similar.length > 0 && (
        <div>
          <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:11, color:"var(--text3)", letterSpacing:0.8, marginBottom:10, textTransform:"uppercase" }}>Similar Stocks</div>
          <div style={{ display:"flex", gap:8 }}>
            {similar.map(s => {
              const sp=stockPrices[s.symbol]; const chgPct=sp?.change_pct; const isUp=(chgPct??0)>=0;
              return (
                <div key={s.symbol} onClick={() => onNavigateStock && onNavigateStock(s.symbol)}
                  className="card" style={{ flex:1, padding:"8px", cursor:"pointer", textAlign:"center", transition:"all 0.15s" }}
                  onMouseEnter={e=>e.currentTarget.style.background="var(--bg3)"}
                  onMouseLeave={e=>e.currentTarget.style.background=""}>
                  <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:11, marginBottom:1 }}>{s.symbol}</div>
                  {sp?.price!=null ? (
                    <>
                      <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:11 }}>{sp.price.toLocaleString(undefined,{maximumFractionDigits:0})}</div>
                      <div style={{ fontSize:10, fontWeight:700, color:isUp?"var(--bull)":"var(--bear)" }}>{isUp?"+":""}{chgPct?.toFixed(2)}%</div>
                    </>
                  ) : <div style={{ width:10,height:10,borderRadius:"50%",border:"2px solid var(--border2)",borderTopColor:"var(--accent)",animation:"spin 0.8s linear infinite",margin:"4px auto" }} />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

const _fundCache = {};

function PerformanceTab({ stock, isStock, sym }) {
  const [fund,       setFund]       = useState(_fundCache[sym]?.data || stock || {});
  const [fetching,   setFetching]   = useState(false);
  const [fundSource, setFundSource] = useState(null);

  useEffect(() => {
    if (!isStock || !sym) return;
    if (_fundCache[sym]) { setFund(_fundCache[sym].data); setFundSource(_fundCache[sym].source); return; }
    setFund(stock || {});
    setFetching(true);
    const controller = new AbortController();
    fetch(`${BACKEND}/stocks/${sym}/fundamentals`, { signal: controller.signal })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          const merged = { ...stock, ...d.data };
          _fundCache[sym] = { data: merged, source: d.source };
          setFund(merged);
          setFundSource(d.source);
        }
      })
      .catch(() => {})
      .finally(() => setFetching(false));
    return () => controller.abort();
  }, [sym]);

  const data = { ...stock, ...fund };
  const r2 = n => n != null ? Math.round(n * 100) / 100 : null;
  const price = stock?.price;
  const chgPct = stock?.change_pct ?? 0;
  const rsi  = Math.min(Math.max(Math.round(50 + chgPct * 4), 15), 85);
  const macd = chgPct > 1.5 ? "bullish" : chgPct < -1.5 ? "bearish" : "neutral";
  const _low  = data.day_low  || data.week52_low;
  const _high = data.day_high || data.week52_high;
  const support    = _low  ? (_low  * 0.99).toFixed(2) : null;
  const resistance = _high ? (_high * 1.01).toFixed(2) : null;

  const pe_ratio    = data.pe_ratio   ?? null;
  const market_cap  = data.market_cap ?? stock?.market_cap ?? null;
  const eps         = (data.eps != null) ? data.eps : (pe_ratio && price ? r2(price / pe_ratio) : null);
  const book_value  = data.book_value ?? null;
  const pb_ratio    = data.pb_ratio   ?? (book_value && price ? r2(price / book_value) : null);
  const roe         = (data.roe != null) ? data.roe : (eps && book_value ? r2((eps / book_value) * 100) : null);
  const debt_equity = data.debt_equity ?? null;
  const div_yield   = data.div_yield  ?? null;
  const ind_pe      = data.ind_pe     ?? null;
  const face_value  = data.face_value ?? null;

  if (!isStock || !stock || stock.price==null) return (
    <div className="card" style={{ padding:48, textAlign:"center", color:"var(--text3)" }}>
      <div style={{ fontSize:36, marginBottom:12 }}>📊</div>
      <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:15 }}>
        {isStock ? "Stock data unavailable" : "No stock data for market news"}
      </div>
      <div style={{ fontSize:12, marginTop:8, lineHeight:1.6 }}>
        {isStock ? `${sym} price data will appear once prices refresh.` : "This is general market news."}
      </div>
    </div>
  );

  return (
    <div>
      <div className="card" style={{ padding:"16px 20px", marginBottom:14 }}>
        <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:11, color:"var(--text3)", letterSpacing:0.8, marginBottom:12, textTransform:"uppercase" }}>Key Metrics</div>
        {fetching && (
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10, color:"var(--text3)", fontSize:11, opacity:0.7 }}>
            <div style={{ width:10, height:10, flexShrink:0, borderRadius:"50%", border:"2px solid var(--border2)", borderTopColor:"var(--accent)", animation:"spin 0.8s linear infinite" }} />
            Updating fundamentals...
          </div>
        )}
        {!fetching && !pe_ratio && !eps && !book_value && !roe && (
          <div style={{ marginBottom:12, padding:"8px 12px", background:"rgba(255,200,0,0.06)", border:"1px solid rgba(255,200,0,0.15)", borderRadius:8, fontSize:11, color:"var(--text3)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <span>Fundamental data not available for this stock</span>
            {fundSource !== "price_only" && (
              <span style={{ color:"var(--accent)", cursor:"pointer", textDecoration:"underline", flexShrink:0, marginLeft:8 }}
                onClick={() => {
                  delete _fundCache[sym];
                  setFetching(true);
                  fetch(`${BACKEND}/stocks/${sym}/fundamentals?force=1`)
                    .then(r => r.json())
                    .then(d => {
                      if (d.success && d.data) {
                        const merged = { ...stock, ...d.data };
                        _fundCache[sym] = { data: merged, source: d.source };
                        setFund(merged);
                        setFundSource(d.source);
                      }
                    })
                    .catch(() => {})
                    .finally(() => setFetching(false));
                }}>Retry</span>
            )}
          </div>
        )}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", columnGap:32 }}>
          <StatRow label="Market Cap"    value={fmtCap(market_cap)} />
          <StatRow label="Equity Return" value={roe ? fmt(roe)+"%" : "—"} />
          <StatRow label="P/E Ratio"     value={pe_ratio ? fmt(pe_ratio) : (eps != null && eps < 0 ? "N/A (Loss)" : "—")} />
          <StatRow label="EPS"           value={eps != null ? <span style={{color: eps < 0 ? "var(--bear)" : "inherit"}}>{"₹"+fmt(eps)}</span> : "—"} />
          <StatRow label="P/B Ratio"     value={pb_ratio ? fmt(pb_ratio) : "—"} />
          <StatRow label="Div. Yield"    value={div_yield ? fmt(div_yield)+"%" : "—"} />
          <StatRow label="Industry P/E"  value={ind_pe ? fmt(ind_pe) : "—"} />
          <StatRow label="Book Value"    value={book_value ? "₹"+fmt(book_value) : "—"} />
          <StatRow label="Debt/Equity"   value={debt_equity ? fmt(debt_equity) : "—"} />
          <StatRow label="Face Value"    value={face_value ? "₹"+fmt(face_value) : "—"} />
        </div>
      </div>

      <div className="card" style={{ padding:"16px 20px", marginBottom:14 }}>
        <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:11, color:"var(--text3)", letterSpacing:0.8, marginBottom:14, textTransform:"uppercase" }}>Price Ranges</div>
        {[
          { label:"Today's Open vs Close",  a:data.day_open,   b:price,            aL:"Open",    bL:"Close"   },
          { label:"Today's Low vs High",    a:data.day_low,    b:data.day_high,    aL:"Low",     bL:"High"    },
          { label:"52-Week Low vs High",    a:data.week52_low, b:data.week52_high, aL:"52W Low", bL:"52W High"},
        ].map(({ label,a,b,aL,bL }) => {
          const diff=b-a; const up=diff>=0; const pct=a?((Math.abs(diff)/a)*100).toFixed(2):null;
          return (
            <div key={label} style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, color:"var(--text3)", marginBottom:8, fontWeight:600 }}>{label}</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", alignItems:"center", gap:10 }}>
                <div className="card" style={{ padding:"10px 14px", textAlign:"center", background:"var(--bg3)" }}>
                  <div style={{ fontSize:10, color:"var(--text3)", marginBottom:3 }}>{aL}</div>
                  <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:14 }}>{fmt(a)}</div>
                </div>
                <div style={{ textAlign:"center", fontSize:12, fontWeight:700, color:up?"var(--bull)":"var(--bear)" }}>
                  {up?"▲":"▼"}<br/>{pct?Math.abs(pct)+"%":"—"}
                </div>
                <div className="card" style={{ padding:"10px 14px", textAlign:"center", background:"var(--bg3)" }}>
                  <div style={{ fontSize:10, color:"var(--text3)", marginBottom:3 }}>{bL}</div>
                  <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:14 }}>{fmt(b)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card" style={{ padding:"16px 20px" }}>
        <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:11, color:"var(--text3)", letterSpacing:0.8, marginBottom:14, textTransform:"uppercase" }}>Technical Indicators</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20 }}>
          <div style={{ background:"rgba(0,212,170,0.06)", border:"1px solid rgba(0,212,170,0.2)", borderRadius:10, padding:"12px 14px", textAlign:"center" }}>
            <div style={{ fontSize:11, color:"var(--text3)", marginBottom:4 }}>Support</div>
            <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:16, color:"var(--bull)" }}>₹{support||"—"}</div>
            <div style={{ fontSize:10, color:"var(--text3)", marginTop:3 }}>Key buying zone</div>
          </div>
          <div style={{ background:"rgba(255,77,109,0.06)", border:"1px solid rgba(255,77,109,0.2)", borderRadius:10, padding:"12px 14px", textAlign:"center" }}>
            <div style={{ fontSize:11, color:"var(--text3)", marginBottom:4 }}>Resistance</div>
            <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:16, color:"var(--bear)" }}>₹{resistance||"—"}</div>
            <div style={{ fontSize:10, color:"var(--text3)", marginTop:3 }}>Key selling zone</div>
          </div>
        </div>

        {rsi!=null && (
          <div style={{ marginBottom:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <div>
                <span style={{ fontSize:13, fontWeight:600 }}>RSI (14)</span>
                <span style={{ fontSize:11, color:"var(--text3)", marginLeft:8 }}>Relative Strength Index</span>
              </div>
              <span style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:18, color:rsi>70?"var(--bear)":rsi<30?"var(--bull)":"var(--text)" }}>{rsi}</span>
            </div>
            <div style={{ height:8, background:"var(--bg3)", borderRadius:4, position:"relative", marginBottom:6 }}>
              <div style={{ position:"absolute", inset:0, background:"linear-gradient(to right,var(--bull),#888,var(--bear))", borderRadius:4 }} />
              <div style={{ position:"absolute", top:"50%", left:`${rsi}%`, transform:"translate(-50%,-50%)", width:14, height:14, borderRadius:"50%", background:"white", border:"2px solid var(--bg)", boxShadow:"0 0 0 3px var(--accent)" }} />
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"var(--text3)", marginBottom:8 }}>
              <span>0 — Oversold</span><span>30</span><span>70</span><span>100 — Overbought</span>
            </div>
            <div style={{ fontSize:12, padding:"8px 12px", borderRadius:8, background:rsi>70?"rgba(255,77,109,0.08)":rsi<30?"rgba(0,212,170,0.08)":"var(--bg3)", color:rsi>70?"var(--bear)":rsi<30?"var(--bull)":"var(--text2)" }}>
              {rsi>70?"Overbought — may pull back soon":rsi<30?"Oversold — may rebound soon":"✓ Neutral zone (30–70) — no extreme signal"}
            </div>
          </div>
        )}

        {macd && (
          <div style={{ paddingTop:14, borderTop:"1px solid var(--border)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <div>
                <span style={{ fontSize:13, fontWeight:600 }}>MACD</span>
                <span style={{ fontSize:11, color:"var(--text3)", marginLeft:8 }}>Moving Avg. Convergence Divergence</span>
              </div>
              <span style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:12, textTransform:"uppercase",
                color:macd==="bullish"?"var(--bull)":macd==="bearish"?"var(--bear)":"var(--text3)",
                padding:"5px 12px", borderRadius:8,
                background:macd==="bullish"?"rgba(0,212,170,0.1)":macd==="bearish"?"rgba(255,77,109,0.1)":"var(--bg3)",
                border:`1px solid ${macd==="bullish"?"var(--bull)":macd==="bearish"?"var(--bear)":"var(--border2)"}`
              }}>{macd}</span>
            </div>
            <div style={{ fontSize:12, padding:"8px 12px", borderRadius:8, background:"var(--bg3)", color:"var(--text2)" }}>
              {macd==="bullish"
                ? "MACD line above signal line — bullish momentum / buying opportunity"
                : macd==="bearish"
                ? "MACD line below signal line — bearish momentum / selling opportunity"
                : "MACD near signal line — market indecision / transition phase"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const _finCache = {};

function fmtFinVal(v, currency) {
  if (v == null) return "—";
  const isCr = currency === "INR_CR";
  if (isCr) {
    const abs = Math.abs(v);
    if (abs >= 100000) return (v < 0 ? "-" : "") + "₹" + (abs/100000).toFixed(2) + "L Cr";
    if (abs >= 1000)   return (v < 0 ? "-" : "") + "₹" + (abs/1000).toFixed(1) + "K Cr";
    return "₹" + v.toFixed(0) + " Cr";
  }
  const abs = Math.abs(v);
  if (abs >= 1e12) return (v<0?"-":"") + "$" + (abs/1e12).toFixed(2) + "T";
  if (abs >= 1e9)  return (v<0?"-":"") + "$" + (abs/1e9).toFixed(2)  + "B";
  if (abs >= 1e6)  return (v<0?"-":"") + "$" + (abs/1e6).toFixed(1)  + "M";
  return "$" + v.toFixed(0);
}

function interpolateToQuarters(annualData, dataKey) {
  const result = [];
  for (const row of (annualData || [])) {
    const val = row[dataKey];
    if (val == null) continue;
    const qVal = Math.round((val / 4) * 100) / 100;
    for (const q of ["Q1","Q2","Q3","Q4"]) {
      result.push({ label: `${row.period} ${q}`, value: qVal, interpolated: true });
    }
  }
  return result;
}

const MONTH_ORDER = {Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};

function sortQuarterly(data) {
  return [...(data||[])].sort((a, b) => {
    const [am, ay] = (a.period||"").split(" ");
    const [bm, by] = (b.period||"").split(" ");
    const ay2 = parseInt(ay||0), by2 = parseInt(by||0);
    if (ay2 !== by2) return ay2 - by2;
    return (MONTH_ORDER[am]||0) - (MONTH_ORDER[bm]||0);
  });
}

function fmtPeriod(p) {
  return (p||"").replace(/\s(\d{4})$/, (_, y) => "'" + y.slice(2));
}

function FinChart({ annualData, quarterlyData, dataKey, label, color, currency, granularity }) {
  let raw = [];
  const sortedQ = sortQuarterly(quarterlyData);
  const hasRealQuarterly = sortedQ.some(r => r[dataKey] != null);

  if (granularity === "1y") {
    raw = (annualData || []).map(r => ({ label: r.period, value: r[dataKey] }));
  } else if (granularity === "3m") {
    raw = hasRealQuarterly
      ? sortedQ.map(r => ({ label: fmtPeriod(r.period), value: r[dataKey] }))
      : interpolateToQuarters(annualData, dataKey);
  } else {
    raw = hasRealQuarterly
      ? sortedQ.filter((_, i) => i % 2 === 0).map(r => ({ label: fmtPeriod(r.period), value: r[dataKey] }))
      : (annualData || []).flatMap(r => {
          const val = r[dataKey];
          if (val == null) return [];
          const hVal = Math.round((val / 2) * 100) / 100;
          return [
            { label: `${r.period} H1`, value: hVal, interpolated: true },
            { label: `${r.period} H2`, value: hVal, interpolated: true },
          ];
        });
  }

  const chartData = raw;
  const isInterpolated = chartData.some(d => d.interpolated && d.value != null);
  const hasAnyValue = chartData.some(r => r.value != null);

  if (!hasAnyValue) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:80, color:"var(--text3)", fontSize:11, fontStyle:"italic" }}>
      Data not available from source
    </div>
  );

  const barSize = Math.max(8, Math.min(28, Math.floor(320 / Math.max(chartData.length, 1)) - 6));

  return (
    <div>
      {isInterpolated && (
        <div style={{ fontSize:10, color:"var(--text3)", marginBottom:4, fontStyle:"italic" }}>
          Quarterly data unavailable — showing annual data divided equally
        </div>
      )}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top:8, right:8, left:4, bottom:20 }} barSize={barSize}>
          <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" vertical={false} opacity={0.5} />
          <XAxis dataKey="label"
            tick={{ fill:"var(--text3)", fontSize:9, fontFamily:"var(--font-display)" }}
            axisLine={false} tickLine={false}
            angle={chartData.length > 6 ? -35 : 0}
            textAnchor={chartData.length > 6 ? "end" : "middle"}
            interval={0}
          />
          <YAxis tick={{ fill:"var(--text3)", fontSize:9 }} axisLine={false} tickLine={false}
            tickFormatter={v => fmtFinVal(v, currency)} width={60}
          />
          <Tooltip
            cursor={{ fill:"rgba(255,255,255,0.04)" }}
            contentStyle={{ background:"var(--bg2)", border:"1px solid var(--border2)", borderRadius:10, fontSize:12, padding:"10px 14px" }}
            formatter={(v, _, props) => [
              fmtFinVal(v, currency) + (props?.payload?.interpolated ? " (est.)" : ""),
              label
            ]}
            labelStyle={{ color:"var(--text2)", fontWeight:700, marginBottom:4 }}
          />
          <Bar dataKey="value" radius={[3,3,0,0]} opacity={0.9}>
            {chartData.map((d, i) => (
              <Cell key={i}
                fill={d.value < 0 ? "#ff4d6d" : color}
                opacity={d.interpolated ? 0.5 : (i === chartData.length - 1 ? 1 : 0.8)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function GranularityButtons({ value, onChange }) {
  return (
    <div style={{ display:"flex", gap:4 }}>
      {[{id:"3m",label:"3M"},{id:"6m",label:"6M"},{id:"1y",label:"1Y"}].map(o => (
        <button key={o.id} onClick={() => onChange(o.id)}
          style={{
            padding:"2px 9px", borderRadius:6, border:"1px solid",
            fontSize:10, fontFamily:"var(--font-display)", fontWeight:700, cursor:"pointer",
            background: value === o.id ? "var(--accent)" : "transparent",
            borderColor: value === o.id ? "var(--accent)" : "var(--border2)",
            color: value === o.id ? "#000" : "var(--text3)",
            transition:"all 0.12s",
          }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ChartCard({ annualData, quarterlyData, dataKey, label, color, currency }) {
  const [gran, setGran] = useState("1y");
  const latest = [...(annualData||[])].reverse().find(r => r[dataKey] != null);
  return (
    <div className="card" style={{ padding:"16px 20px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
        <div>
          <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:13 }}>{label}</div>
          {latest?.[dataKey] != null && (
            <div style={{ fontSize:11, color:"var(--text3)", marginTop:2 }}>
              Latest: <span style={{ color:"var(--text2)", fontWeight:600 }}>{fmtFinVal(latest[dataKey], currency)}</span>
            </div>
          )}
        </div>
        <GranularityButtons value={gran} onChange={setGran} />
      </div>
      <FinChart annualData={annualData} quarterlyData={quarterlyData}
        dataKey={dataKey} label={label} color={color} currency={currency} granularity={gran} />
    </div>
  );
}

function StatsGraphsTab({ sym, isStock }) {
  const [fin,       setFin]       = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(false);
  const [retrying,  setRetrying]  = useState(false);
  const [activeTab, setActiveTab] = useState("income");
  const pollRef = useRef(null);

  useEffect(() => {
    if (sym) delete _finCache[sym];
  }, [sym]);

  useEffect(() => {
    if (!isStock || !sym) { setLoading(false); return; }
    setLoading(true); setError(false); setFin(null); setRetrying(false);
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }

    fetch(`${BACKEND}/stocks/${sym}/financials`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          if (d.data.pending) {
            setLoading(false); setRetrying(true);
            pollRef.current = setInterval(() => {
              fetch(`${BACKEND}/stocks/${sym}/financials`)
                .then(r => r.json())
                .then(d2 => {
                  if (d2.success && d2.data && !d2.data.pending) {
                    clearInterval(pollRef.current); pollRef.current = null;
                    _finCache[sym] = d2.data; setFin(d2.data); setRetrying(false);
                  }
                }).catch(() => {});
            }, 8000);
          } else { _finCache[sym] = d.data; setFin(d.data); setLoading(false); }
        } else { setError(true); setLoading(false); }
      })
      .catch(() => { setError(true); setLoading(false); });

    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [sym]);

  function handleRetry() {
    delete _finCache[sym]; setLoading(true); setError(false); setFin(null); setRetrying(false);
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    fetch(`${BACKEND}/stocks/${sym}/financials?force=1`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          if (d.data.pending) {
            setLoading(false); setRetrying(true);
            pollRef.current = setInterval(() => {
              fetch(`${BACKEND}/stocks/${sym}/financials`).then(r=>r.json()).then(d2=>{
                if (d2.success&&d2.data&&!d2.data.pending) { clearInterval(pollRef.current); pollRef.current=null; _finCache[sym]=d2.data; setFin(d2.data); setRetrying(false); }
              }).catch(()=>{});
            }, 8000);
          } else { _finCache[sym]=d.data; setFin(d.data); setLoading(false); }
        } else { setError(true); setLoading(false); }
      }).catch(()=>{ setError(true); setLoading(false); });
  }

  if (!isStock) return (
    <div className="card" style={{ padding:48, textAlign:"center", color:"var(--text3)" }}>
      <div style={{ fontSize:36, marginBottom:12 }}>📉</div>
      <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:15 }}>No financial graphs for market news</div>
    </div>
  );
  if (loading) return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", padding:60, gap:12 }}>
      <div style={{ width:32, height:32, borderRadius:"50%", border:"3px solid var(--border2)", borderTopColor:"var(--accent)", animation:"spin 0.8s linear infinite" }} />
      <div style={{ fontSize:12, color:"var(--text3)" }}>Loading financial data...</div>
    </div>
  );
  if (retrying) return (
    <div className="card" style={{ padding:48, textAlign:"center", color:"var(--text3)" }}>
      <div style={{ fontSize:36, marginBottom:12, animation:"pulse 1.5s infinite" }}>⏳</div>
      <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:15, marginBottom:8, color:"var(--accent)" }}>Fetching financial data...</div>
      <div style={{ fontSize:12, color:"var(--text3)", marginBottom:16, lineHeight:1.7 }}>First load takes 15–30 seconds.<br/>Data is cached for 90 days after the first fetch.</div>
      <div style={{ display:"flex", justifyContent:"center", gap:6 }}>
        {[0,1,2].map(i => <div key={i} style={{ width:8, height:8, borderRadius:"50%", background:"var(--accent)", animation:`pulse 1s ${i*0.2}s infinite` }} />)}
      </div>
    </div>
  );
  if (error || !fin) return (
    <div className="card" style={{ padding:48, textAlign:"center", color:"var(--text3)" }}>
      <div style={{ fontSize:32, marginBottom:10 }}>⚠️</div>
      <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:14, marginBottom:10 }}>Financial data unavailable</div>
      <div style={{ fontSize:12, marginBottom:6, color:"var(--text3)", lineHeight:1.8 }}>
        <strong style={{ color:"var(--text2)" }}>US stocks</strong> use Yahoo Finance.<br/>
        <strong style={{ color:"var(--text2)" }}>Indian stocks</strong> use Screener.in.<br/>
        Data loads on first visit — click Retry to try again.
      </div>
      <button onClick={handleRetry} style={{ padding:"8px 20px", borderRadius:8, background:"var(--accent)", color:"#000", border:"none", fontWeight:700, fontSize:12, cursor:"pointer" }}>Retry Now</button>
    </div>
  );

  const { annual, quarterly, currency, source } = fin;
  const isCr      = currency === "INR_CR";
  const currLabel = isCr ? "₹ Cr" : "USD";
  const tabs = [
    { id:"income",   label:"Income"    },
    { id:"balance",  label:"Balance"   },
    { id:"cashflow", label:"Cash Flow" },
    ...(quarterly?.length ? [{ id:"earnings", label:"Earnings" }] : []),
  ];

  return (
    <div>
      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            style={{ padding:"6px 14px", borderRadius:8, border:"1px solid", fontFamily:"var(--font-display)",
              fontWeight:700, fontSize:11, cursor:"pointer", transition:"all 0.15s",
              background:activeTab===t.id?"var(--accent)":"transparent",
              borderColor:activeTab===t.id?"var(--accent)":"var(--border2)",
              color:activeTab===t.id?"#000":"var(--text3)" }}>
            {t.label}
          </button>
        ))}
        <div style={{ marginLeft:"auto", fontSize:10, color:"var(--text3)", alignSelf:"center" }}>
          {source==="cache"?"Cached":source==="screener"?"Screener.in":source==="macrotrends"?"Macrotrends":source==="alphavantage"?"Alpha Vantage":source==="yahoo"?"Yahoo Finance":"Live"} · {currLabel}
        </div>
      </div>

      {activeTab === "income" && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {[
            { key:"revenue",      label:"Revenue",                color:"#00d4aa" },
            { key:"gross_profit", label:"Gross Profit",           color:"#60a5fa" },
            { key:"net_income",   label:"Net Income",             color:"#4ade80" },
            { key:"ebit",         label:"Operating Profit (EBIT)",color:"#f59e0b" },
            { key:"eps",          label:"EPS per Share",          color:"#a78bfa" },
          ].map(g => (
            <ChartCard key={g.key} annualData={annual} quarterlyData={quarterly}
              dataKey={g.key} label={g.label} color={g.color} currency={currency} />
          ))}
        </div>
      )}
      {activeTab === "balance" && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {[
            { key:"total_assets", label:"Total Assets",        color:"#00d4aa" },
            { key:"equity",       label:"Shareholders Equity", color:"#4ade80" },
            { key:"total_debt",   label:"Total Debt",          color:"#ff4d6d" },
          ].map(g => (
            <ChartCard key={g.key} annualData={annual} quarterlyData={quarterly}
              dataKey={g.key} label={g.label} color={g.color} currency={currency} />
          ))}
        </div>
      )}
      {activeTab === "cashflow" && (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {[
            { key:"op_cashflow",   label:"Operating Cash Flow", color:"#00d4aa" },
            { key:"free_cashflow", label:"Free Cash Flow",      color:"#4ade80" },
            { key:"capex",         label:"Capital Expenditure", color:"#f59e0b" },
          ].map(g => (
            <ChartCard key={g.key} annualData={annual} quarterlyData={quarterly}
              dataKey={g.key} label={g.label} color={g.color} currency={currency} />
          ))}
        </div>
      )}
      {activeTab === "earnings" && quarterly?.length > 0 && (
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div className="card" style={{ padding:"16px 20px" }}>
            <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:12, marginBottom:12 }}>Quarterly EPS</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={quarterly.slice().reverse()} margin={{ top:4, right:4, left:-10, bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="period" tick={{ fill:"var(--text3)", fontSize:9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:"var(--text3)", fontSize:9 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={{ background:"var(--bg2)", border:"1px solid var(--border2)", borderRadius:8, fontSize:11 }} />
                <Bar dataKey="eps" radius={[4,4,0,0]} opacity={0.85}>
                  {quarterly.slice().reverse().map((d, i) => (
                    <Cell key={i} fill={(d.eps ?? 0) >= 0 ? "#4ade80" : "#ff4d6d"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {quarterly.some(q => q.eps_surprise != null) && (
            <div className="card" style={{ padding:"16px 20px" }}>
              <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:12, marginBottom:12 }}>Earnings Surprises</div>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                <thead>
                  <tr style={{ color:"var(--text3)", borderBottom:"1px solid var(--border)" }}>
                    {["Quarter","Reported","Estimate","Surprise"].map(h =>
                      <th key={h} style={{ padding:"6px 8px", textAlign:"right", fontWeight:600 }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {quarterly.slice(0, 6).map((q, i) => (
                    <tr key={i} style={{ borderBottom:"1px solid var(--border)", color:"var(--text2)" }}>
                      <td style={{ padding:"6px 8px" }}>{q.period}</td>
                      <td style={{ padding:"6px 8px", textAlign:"right" }}>{q.eps ?? "—"}</td>
                      <td style={{ padding:"6px 8px", textAlign:"right" }}>{q.eps_estimate ?? "—"}</td>
                      <td style={{ padding:"6px 8px", textAlign:"right",
                        color:(q.eps_surprise??0)>=0?"var(--bull)":"var(--bear)", fontWeight:700 }}>
                        {q.eps_surprise != null ? `${q.eps_surprise>=0?"+":""}${q.eps_surprise}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AllNewsTab({ sym, isStock, navigate }) {
  const [news, setNews]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isStock||!sym) { setLoading(false); return; }
    fetch(`${BACKEND}/stocks/${sym}/news?limit=30`)
      .then(r=>r.json()).then(d=>{ setNews(d.data||[]); setLoading(false); }).catch(()=>setLoading(false));
  }, [sym]);

  if (!isStock) return (
    <div className="card" style={{ padding:48, textAlign:"center", color:"var(--text3)" }}>
      <div style={{ fontSize:36, marginBottom:12 }}>📰</div>
      <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:15 }}>General market news — not tied to a stock</div>
    </div>
  );
  if (loading) return <div style={{ display:"flex", justifyContent:"center", padding:40 }}><div style={{ width:28,height:28,borderRadius:"50%",border:"3px solid var(--border2)",borderTopColor:"var(--accent)",animation:"spin 0.8s linear infinite" }} /></div>;
  if (!news.length) return (
    <div className="card" style={{ padding:48, textAlign:"center", color:"var(--text3)" }}>
      <div style={{ fontSize:36, marginBottom:12 }}>📭</div>
      <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:15 }}>No recent news for {sym}</div>
    </div>
  );

  return (
    <div>
      <div style={{ fontSize:12, color:"var(--text3)", marginBottom:14 }}>{news.length} articles for <strong>{sym}</strong></div>
      {news.map(n => (
        <div key={n.id} onClick={() => navigate(`/news/${n.id}`)}
          className="card" style={{ padding:"14px 16px", marginBottom:10, cursor:"pointer", display:"flex", gap:12, alignItems:"flex-start" }}
          onMouseEnter={e=>e.currentTarget.style.background="var(--bg3)"}
          onMouseLeave={e=>e.currentTarget.style.background=""}>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", gap:6, marginBottom:6, alignItems:"center" }}>
              {(n.sentiment === "bullish" || n.sentiment === "bearish") && (
                <span className={`badge badge-${n.sentiment}`} style={{ fontSize:10 }}>
                  {n.sentiment === "bullish" ? "▲ BULLISH" : "▼ BEARISH"}
                </span>
              )}
              <span style={{ color:"var(--text3)", fontSize:11 }}>{timeAgo(n.published_at)}</span>
              {n.source && <span style={{ color:"var(--text3)", fontSize:11 }}>· {n.source}</span>}
            </div>
            <div style={{ fontFamily:"var(--font-display)", fontWeight:600, fontSize:14, lineHeight:1.4, marginBottom:4 }}>{n.headline}</div>
            {n.summary_20 && <div style={{ color:"var(--text3)", fontSize:12, lineHeight:1.5 }}>{n.summary_20}</div>}
          </div>
          {n.image_url && (
            <img src={n.image_url} alt="" style={{ width:72, height:60, objectFit:"cover", borderRadius:8, flexShrink:0 }}
              onError={e=>e.target.style.display="none"} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function NewsDetailPage() {
  const params         = useParams();
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();

  const id       = params.id;
  const symRoute = params.symbol;

  const initialTab = (() => {
    const param = searchParams.get("tab");
    return TAB_PARAM_MAP[param] || "PERFORMANCE";
  })();

  const [tab,      setTab]     = useState(initialTab);
  const [article,  setArticle] = useState(null);
  const [stock,    setStock]   = useState(null);
  const [bodyText, setBody]    = useState("");
  const [loading,  setLoading] = useState(true);
  const [error,    setError]   = useState(null);

  useEffect(() => {
    setLoading(true); setError(null); setArticle(null); setBody(""); setStock(null);

    // ── /stock/:symbol route ──────────────────────────────────
    if (symRoute) {
      const sym = symRoute.toUpperCase();
      fetch(`${BACKEND}/stocks/${sym}`)
        .then(r => r.json())
        .then(d => {
          const s = d.success && d.data ? d.data : null;
          setArticle({
            symbol: sym, company: s?.name || sym, headline: s?.name || sym,
            sentiment: "neutral", source: null, source_url: null,
            published_at: new Date().toISOString(),
            price: s?.price, change_pct: s?.change_pct,
          });
          if (s?.price != null) {
            setStock({ symbol:sym, price:s.price, change_amt:s.change_amt, change_pct:s.change_pct,
              day_open:s.day_open, day_high:s.day_high, day_low:s.day_low, volume:s.volume,
              market_cap:s.market_cap, pe_ratio:s.pe_ratio, pb_ratio:s.pb_ratio, eps:s.eps,
              roe:s.roe, debt_equity:s.debt_equity, book_value:s.book_value, div_yield:s.div_yield,
              ind_pe:s.ind_pe, face_value:s.face_value, week52_low:s.week52_low, week52_high:s.week52_high });
          }
          setLoading(false);
        })
        .catch(() => {
          setArticle({ symbol:symRoute.toUpperCase(), company:symRoute, headline:symRoute,
            sentiment:"neutral", source:null, source_url:null, published_at:new Date().toISOString() });
          setLoading(false);
        });
      return;
    }

    if (!id) { setError("notfound"); setLoading(false); return; }

    // ── /news/:id route ───────────────────────────────────────
    if (isDbId(id)) {
      fetch(`${BACKEND}/news/${id}`).then(r=>r.json()).then(d => {
        if (!d.success||!d.data) { setError("notfound"); setLoading(false); return; }
        const a = d.data;
        setArticle(a);
        const init = cleanText(a.full_text||a.summary_20||a.headline||"");
        setBody(init);
        if (a.symbol && a.symbol!=="MARKET" && a.price!=null) {
          setStock({ symbol:a.symbol, price:a.price, change_amt:a.change_amt, change_pct:a.change_pct,
            day_open:a.day_open, day_high:a.day_high, day_low:a.day_low, volume:a.volume,
            market_cap:a.market_cap, pe_ratio:a.pe_ratio, pb_ratio:a.pb_ratio, eps:a.eps,
            roe:a.roe, debt_equity:a.debt_equity, book_value:a.book_value, div_yield:a.div_yield,
            ind_pe:a.ind_pe, face_value:a.face_value, week52_low:a.week52_low, week52_high:a.week52_high });
        }
        setLoading(false);
        fetch(`${BACKEND}/news/${id}/fetch`).then(r=>r.json()).then(ft=>{ if(ft.content&&ft.content.length>init.length) setBody(cleanText(ft.content)); }).catch(()=>{});
        if (a.symbol && a.symbol!=="MARKET") {
          fetch(`${BACKEND}/stocks/${a.symbol}`).then(r=>r.json()).then(sd=>{ if(sd.success&&sd.data?.price!=null) setStock(sd.data); }).catch(()=>{});
        }
      }).catch(()=>{ setError("notfound"); setLoading(false); });
      return;
    }

    // Fallback: sessionStorage
    try {
      const stored = sessionStorage.getItem(`article_${id}`);
      if (stored) {
        const a = JSON.parse(stored);
        setArticle(a);
        setBody(cleanText(a.full_text||a.summary_long||a.summary_20||a.headline||""));
        if (a.price!=null) setStock({ symbol:a.symbol, price:a.price, change_pct:a.change_pct });
        setLoading(false); return;
      }
    } catch {}
    setError("notfound"); setLoading(false);
  }, [id, symRoute]);

  if (loading) return (
    <div style={{ display:"flex", justifyContent:"center", alignItems:"center", height:"60vh", flexDirection:"column", gap:12 }}>
      <div style={{ width:36,height:36,borderRadius:"50%",border:"3px solid var(--border2)",borderTopColor:"var(--accent)",animation:"spin 0.8s linear infinite" }} />
      <div style={{ color:"var(--text3)", fontSize:13 }}>Loading...</div>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );

  if (error||!article) return (
    <div style={{ maxWidth:600, margin:"60px auto", padding:"0 20px", textAlign:"center" }}>
      <div style={{ fontSize:52, marginBottom:16 }}>😕</div>
      <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:22, marginBottom:10 }}>Article not found</div>
      <div style={{ color:"var(--text3)", fontSize:14, marginBottom:28, lineHeight:1.6 }}>This article may have expired or the link is invalid.</div>
      <button onClick={()=>navigate(-1)} style={{ padding:"10px 24px", background:"var(--accent)", border:"none", borderRadius:10, color:"#000", fontFamily:"var(--font-display)", fontWeight:700, fontSize:13, cursor:"pointer" }}>← Back</button>
    </div>
  );

  const sym     = article.symbol;
  const isStock = sym && sym !== "MARKET";
  const price   = stock?.price;
  const chgPct  = stock?.change_pct;
  const isUp    = (chgPct??0) >= 0;

  return (
    <div style={{ maxWidth:800, margin:"0 auto", padding:"16px 16px 80px" }}>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}"}</style>

      <button onClick={()=>navigate(-1)}
        style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 14px", background:"var(--bg2)", border:"1px solid var(--border2)", borderRadius:8, color:"var(--text3)", cursor:"pointer", fontFamily:"var(--font-display)", fontSize:12, fontWeight:600, marginBottom:20 }}>
        ← Back
      </button>

      {article.image_url && (
        <div style={{ borderRadius:14, overflow:"hidden", height:200, background:"var(--bg3)", marginBottom:18 }}>
          <img src={article.image_url} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}
            onError={e=>e.target.parentElement.style.display="none"} />
        </div>
      )}

      <div style={{ marginBottom:20 }}>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", marginBottom:10 }}>
          {isStock && (
            <span style={{ background:"var(--bg3)", border:"1px solid var(--border2)", borderRadius:6, padding:"4px 10px", fontFamily:"var(--font-display)", fontWeight:800, fontSize:12 }}>{sym}</span>
          )}
          {(article.sentiment === "bullish" || article.sentiment === "bearish") && (
            <span className={`badge badge-${article.sentiment}`}>
              {article.sentiment === "bullish" ? "▲ BULLISH" : "▼ BEARISH"}
            </span>
          )}
          <span style={{ color:"var(--text3)", fontSize:12 }}>
            {article.source && <>{article.source} · </>}{timeAgo(article.published_at)}
          </span>
        </div>
        <h1 style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:21, lineHeight:1.35, margin:0, color:"var(--text)" }}>
          {article.headline}
        </h1>
      </div>

      {isStock && <div style={{ marginBottom:16 }}><StockChart symbol={sym} /></div>}

      {isStock && price!=null && (
        <div className="card" style={{ padding:"14px 20px", marginBottom:20, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ fontSize:11, color:"var(--text3)", marginBottom:2 }}>{sym} · Current Price</div>
            <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:24 }}>
              {price.toLocaleString(undefined,{minimumFractionDigits:2})}
            </div>
          </div>
          <div style={{ textAlign:"right" }}>
            <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:18, color:isUp?"var(--bull)":"var(--bear)" }}>
              {isUp?"▲":"▼"} {Math.abs(chgPct??0).toFixed(2)}%
            </div>
            <div style={{ fontSize:12, fontWeight:600, color:isUp?"var(--bull)":"var(--bear)" }}>
              {isUp?"Bullish":"Bearish"} today
            </div>
          </div>
        </div>
      )}

      <div style={{ display:"flex", borderBottom:"1px solid var(--border)", marginBottom:20, overflowX:"auto", alignItems:"center" }}>
        {TABS.map(t => (
          <button key={t} onClick={()=>setTab(t)} style={{
            padding:"10px 14px", background:"none", border:"none", whiteSpace:"nowrap",
            borderBottom:tab===t?"2px solid var(--accent)":"2px solid transparent",
            color:tab===t?"var(--accent)":"var(--text3)",
            fontFamily:"var(--font-display)", fontSize:11, fontWeight:700, cursor:"pointer",
          }}>{t}</button>
        ))}
        {(article.source_url || article.sourceUrl) && (
          <a href={article.source_url || article.sourceUrl} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ marginLeft:"auto", flexShrink:0, display:"flex", alignItems:"center", gap:5,
              padding:"6px 12px", borderRadius:8, background:"var(--accent)", color:"#000",
              fontFamily:"var(--font-display)", fontSize:11, fontWeight:700,
              textDecoration:"none", whiteSpace:"nowrap" }}>
            Read Article ↗
          </a>
        )}
      </div>

      {tab==="PERFORMANCE"  && <PerformanceTab stock={stock} isStock={isStock} sym={sym} />}
      {tab==="STATS GRAPHS" && <StatsGraphsTab sym={sym} isStock={isStock} />}
      {tab==="ALL NEWS"     && <AllNewsTab sym={sym} isStock={isStock} navigate={navigate} />}
    </div>
  );
}