// src/components/CategoryFeedPage.jsx
// Uses the dedicated sidebarAgent cache — all category data pre-fetched on startup.
// Clicking any category loads instantly from cache. No waiting.

import { useState, useEffect, useRef } from "react";
import CompanyLogo from "./CompanyLogo";  // same dir: src/components/

const BACKEND = "${process.env.REACT_APP_API_URL}";

const CATEGORY_LABELS = {
  trending:"Trending Today", gainers:"Top Gainers", losers:"Top Losers",
  indices:"Indian Index", gold:"Gold", silver:"Silver", tech:"Top Indian Tech",
  oil:"Oil", finance:"Finance / Banks", us:"US Market",
  mutualfunds:"Mutual Funds", forex:"Forex",
};

// Symbol metadata for display (name, short code)
const SYMBOL_META = {
  "^NSEI":{"short":"N50","name":"Nifty 50"},"^BSESN":{"short":"BSE","name":"Sensex"},
  "^NSEBANK":{"short":"BNK","name":"Bank Nifty"},"^NSEMDCP50":{"short":"MID","name":"Nifty Midcap"},
  "^CNXIT":{"short":"IT","name":"Nifty IT"},"^CNXPHARMA":{"short":"PHR","name":"Nifty Pharma"},
  "^CNXFMCG":{"short":"FMC","name":"Nifty FMCG"},"^CNXINFRA":{"short":"INF","name":"Nifty Infra"},
  "^GSPC":{"short":"SPX","name":"S&P 500"},"^IXIC":{"short":"NDQ","name":"NASDAQ"},
  "^DJI":{"short":"DJI","name":"Dow Jones"},
  "GC=F":{"short":"GOLD","name":"Gold Futures"},"SI=F":{"short":"SILV","name":"Silver Futures"},
  "CL=F":{"short":"OIL","name":"Crude Oil Futures"},
  "USDINR=X":{"short":"USD","name":"USD/INR"},"EURINR=X":{"short":"EUR","name":"EUR/INR"},
  "GBPINR=X":{"short":"GBP","name":"GBP/INR"},"EURUSD=X":{"short":"EUR","name":"EUR/USD"},
  "USDJPY=X":{"short":"JPY","name":"USD/JPY"},"BTC-USD":{"short":"BTC","name":"Bitcoin"},
  "GLD":{"short":"GLD","name":"SPDR Gold Shares"},"IAU":{"short":"IAU","name":"iShares Gold Trust"},
  "SLV":{"short":"SLV","name":"iShares Silver Trust"},
  "JPM":{"short":"JPM","name":"JPMorgan Chase"},"BAC":{"short":"BAC","name":"Bank of America"},
  "GS":{"short":"GS","name":"Goldman Sachs"},
  "AAPL":{"short":"AAPL","name":"Apple"},"MSFT":{"short":"MSFT","name":"Microsoft"},
  "NVDA":{"short":"NVDA","name":"NVIDIA"},"GOOGL":{"short":"GOOGL","name":"Alphabet"},
  "META":{"short":"META","name":"Meta"},"AMZN":{"short":"AMZN","name":"Amazon"},
  "TSLA":{"short":"TSLA","name":"Tesla"},"AMD":{"short":"AMD","name":"AMD"},
  "NFLX":{"short":"NFLX","name":"Netflix"},
  "GOLDBEES.NS":{"short":"GBEE","name":"Nippon India ETF Gold BeES"},
  "HDFCGOLD.NS":{"short":"HGLD","name":"HDFC Gold ETF"},
  "AXISGOLD.NS":{"short":"AGLD","name":"Axis Gold ETF"},
  "GOLD1.NS":{"short":"KGLD","name":"Kotak Gold ETF"},
  "SBIGOLD.NS":{"short":"SGLD","name":"SBI Gold ETF"},
  "GOLDIETF.NS":{"short":"IGLD","name":"ICICI Prudential Gold ETF"},
  "BSLGOLDETF.NS":{"short":"BGLD","name":"Aditya Birla Gold ETF"},
  "QGOLDHALF.NS":{"short":"QGLD","name":"Quantum Gold Fund ETF"},
  "GOLDBETA.NS":{"short":"UGLD","name":"UTI Gold ETF"},
  "GOLDETF.NS":{"short":"MGLD","name":"Mirae Asset Gold ETF"},
  "LICMFGOLD.NS":{"short":"LGLD","name":"LIC MF Gold ETF"},
  "GOLDCASE.NS":{"short":"ZGLD","name":"Zerodha Gold ETF"},
  "AONEGOLD.NS":{"short":"A1GL","name":"Angel One Gold ETF"},
  "EGOLD.NS":{"short":"EGLD","name":"Edelweiss Gold ETF"},
  "MOGOLD.NS":{"short":"MOGD","name":"Motilal Oswal Gold ETF"},
  "GROWWGOLD.NS":{"short":"GGLD","name":"Groww Gold ETF"},
  "SILVERETF.NS":{"short":"NSLV","name":"Nippon India Silver ETF"},
  "HDFCSILVER.NS":{"short":"HSLV","name":"HDFC Silver ETF"},
  "AXISSILVER.NS":{"short":"ASLV","name":"Axis Silver ETF"},
  "KOTAKSILVER.NS":{"short":"KSLV","name":"Kotak Silver ETF"},
  "ICICISILVRETF.NS":{"short":"ISLV","name":"ICICI Prudential Silver ETF"},
  "BSLSILVETF.NS":{"short":"BSLV","name":"Aditya Birla Silver ETF"},
  "MIRAESILVER.NS":{"short":"MSLV","name":"Mirae Asset Silver ETF"},
  "SILVERIETF.NS":{"short":"ZSLV","name":"Zerodha Silver ETF"},
  "AONESILVER.NS":{"short":"A1SL","name":"Angel One Silver ETF"},
  "ESILVER.NS":{"short":"ESLV","name":"Edelweiss Silver ETF"},
  "MOSILVER.NS":{"short":"MOSL","name":"Motilal Oswal Silver ETF"},
  "GROWWSLVR.NS":{"short":"GSLV","name":"Groww Silver ETF"},
  "SBISILVRETF.NS":{"short":"SSLV","name":"SBI Silver ETF"},
  "TCS.NS":{"short":"TCS","name":"Tata Consultancy Services"},
  "INFY.NS":{"short":"INFY","name":"Infosys"},
  "WIPRO.NS":{"short":"WIPRO","name":"Wipro"},
  "HCLTECH.NS":{"short":"HCL","name":"HCL Technologies"},
  "TECHM.NS":{"short":"TECHM","name":"Tech Mahindra"},
  "LTIM.NS":{"short":"LTIM","name":"LTIMindtree"},
  "PERSISTENT.NS":{"short":"PERS","name":"Persistent Systems"},
  "COFORGE.NS":{"short":"COFO","name":"Coforge"},
  "MPHASIS.NS":{"short":"MPHS","name":"Mphasis"},
  "HAPPSTMNDS.NS":{"short":"HAPY","name":"Happiest Minds"},
  "RELIANCE.NS":{"short":"RELI","name":"Reliance Industries"},
  "ONGC.NS":{"short":"ONGC","name":"ONGC"},
  "IOC.NS":{"short":"IOC","name":"Indian Oil Corp"},
  "BPCL.NS":{"short":"BPCL","name":"Bharat Petroleum"},
  "HINDPETRO.NS":{"short":"HPCL","name":"Hindustan Petroleum"},
  "HDFCBANK.NS":{"short":"HDFC","name":"HDFC Bank"},
  "ICICIBANK.NS":{"short":"ICICI","name":"ICICI Bank"},
  "SBIN.NS":{"short":"SBI","name":"State Bank of India"},
  "KOTAKBANK.NS":{"short":"KOTAK","name":"Kotak Bank"},
  "AXISBANK.NS":{"short":"AXIS","name":"Axis Bank"},
  "BAJFINANCE.NS":{"short":"BAJFIN","name":"Bajaj Finance"},
  "NIFTYBEES.NS":{"short":"N50","name":"Nippon Nifty 50 BeES"},
  "JUNIORBEES.NS":{"short":"JR50","name":"Nippon Nifty Next 50"},
  "BANKBEES.NS":{"short":"BANK","name":"Nippon Bank BeES"},
  "MID150BEES.NS":{"short":"MID","name":"Nippon Midcap 150"},
};

function getMeta(sym) { return SYMBOL_META[sym]; }
function getDisplayName(s) { return getMeta(s.symbol)?.name || s.name || s.symbol?.replace(/\.(NS|BO)$/,"") || ""; }
function getDisplaySymbol(s) { return getMeta(s.symbol)?.short || (s.symbol||"").replace(/\.(NS|BO)$/,""); }
function getIconLabel(sym) { return getMeta(sym)?.short?.slice(0,5) || (sym||"").replace(/\.(NS|BO)$/,"").replace(/[^A-Z0-9]/g,"").slice(0,4); }

function StockRow({ s, i, onStockClick }) {
  const up = (s.change_pct ?? 0) >= 0;
  const [hovered, setHovered] = useState(false);

  // Skip click for non-stock symbols (futures, indices, forex)
  const isClickable = onStockClick && s.symbol && !s.symbol.startsWith("^") && !s.symbol.includes("=") && !s.symbol.endsWith("=F");

  return (
    <div
      onClick={() => isClickable && onStockClick(s)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"12px 14px",borderRadius:10,marginBottom:6,
        border:"1px solid var(--border)",
        background: hovered && isClickable ? "var(--bg2)" : "var(--bg)",
        animation:`fadeIn 0.2s ease forwards`,animationDelay:`${i*0.03}s`,opacity:0,
        cursor: isClickable ? "pointer" : "default",
        transition:"background 0.12s",
      }}
    >
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <CompanyLogo symbol={s.symbol} name={getDisplayName(s)} size={38}/>
        <div>
          <div style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:13,color:"var(--text)"}}>{getDisplaySymbol(s)}</div>
          <div style={{fontSize:11,color:"var(--text3)",maxWidth:155,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{getDisplayName(s)}</div>
        </div>
      </div>
      <div style={{textAlign:"right",minWidth:70}}>
        {s.price != null ? (
          <>
            <div style={{fontFamily:"var(--font-display)",fontWeight:700,fontSize:13}}>
              ₹{Number(s.price).toLocaleString(undefined,{maximumFractionDigits:2})}
            </div>
            <div style={{fontSize:11,fontWeight:700,color:up?"var(--bull)":"var(--bear)"}}>
              {up?"▲":"▼"} {Math.abs(s.change_pct??0).toFixed(2)}%
            </div>
          </>
        ) : <div style={{fontSize:11,color:"var(--text3)"}}>—</div>}
        {isClickable && (
          <div style={{fontSize:9,color:"var(--text3)",marginTop:2,opacity: hovered ? 1 : 0,transition:"opacity 0.15s"}}>
            View dashboard →
          </div>
        )}
      </div>
    </div>
  );
}

function StockDropdown({ stocks, onStockClick }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{marginBottom:6}}>
      <button onClick={()=>setOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",borderRadius:6,marginBottom:open?6:0,border:"1px solid var(--border2)",background:"transparent",cursor:"pointer",fontFamily:"var(--font-display)",fontWeight:600,fontSize:11,color:"var(--text3)"}}>
        {open?"Show less ▴":`+${stocks.length} more ▾`}
      </button>
      {open && stocks.map((s,i) => <StockRow key={s.symbol+i} s={s} i={i} onStockClick={onStockClick}/>)}
    </div>
  );
}

function relTime(iso) {
  if (!iso) return "";
  const d=Math.floor((Date.now()-new Date(iso))/60000);
  if(d<60) return d+"m ago";
  if(d<1440) return Math.floor(d/60)+"h ago";
  return Math.floor(d/1440)+"d ago";
}

function NewsSection({ news, loadingN, stocks }) {
  return (
    <div>
      <div style={{fontSize:11,fontWeight:700,fontFamily:"var(--font-display)",color:"var(--text3)",letterSpacing:"0.08em",paddingBottom:10,borderBottom:"1px solid var(--border)",marginBottom:0}}>LATEST NEWS</div>
      {loadingN ? (
        [...Array(4)].map((_,i) => (
          <div key={i} style={{display:"flex",gap:12,padding:"14px 0",borderBottom:"1px solid var(--border)"}}>
            <div style={{flex:1}}>
              <div className="skeleton" style={{height:9,width:"35%",borderRadius:4,marginBottom:8}}/>
              <div className="skeleton" style={{height:13,width:"95%",borderRadius:4,marginBottom:5}}/>
              <div className="skeleton" style={{height:13,width:"65%",borderRadius:4}}/>
            </div>
            <div className="skeleton" style={{width:68,height:56,borderRadius:8,flexShrink:0}}/>
          </div>
        ))
      ) : news.length===0 ? (
        <div style={{textAlign:"center",padding:"40px 0",color:"var(--text3)",fontSize:13}}>No news available yet.</div>
      ) : news.map((a,i) => {
        const companyName=(a.company&&a.company!=="Market")?a.company
          :stocks.find(s=>s.symbol===a.symbol)?.name
          ||stocks.find(s=>s.symbol===a._fetchedForSymbol)?.name||a.symbol||"";
        return (
          <div key={a.id||i} onClick={()=>a.source_url&&window.open(a.source_url,"_blank","noopener,noreferrer")}
            style={{display:"flex",gap:12,padding:"14px 0",borderBottom:"1px solid var(--border)",cursor:a.source_url?"pointer":"default",animation:`fadeIn 0.3s ease forwards`,animationDelay:`${i*0.03}s`,opacity:0}}
            onMouseEnter={e=>{if(a.source_url)e.currentTarget.style.background="var(--bg3)";}}
            onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:5,flexWrap:"wrap"}}>
                {companyName&&<span style={{fontFamily:"var(--font-display)",fontWeight:800,fontSize:11,color:"var(--text)"}}>{companyName}</span>}
                {companyName&&<span style={{fontSize:10,color:"var(--text3)"}}>·</span>}
                {a.source&&<span style={{fontSize:10,color:"var(--text3)"}}>{a.source}</span>}
                <span style={{fontSize:10,color:"var(--text3)"}}>· {relTime(a.published_at)}</span>
                {a.sentiment&&a.sentiment!=="neutral"&&(
                  <span style={{fontSize:9,fontWeight:700,fontFamily:"var(--font-display)",color:a.sentiment==="bullish"?"var(--bull)":"var(--bear)"}}>
                    {a.sentiment==="bullish"?"▲ BULLISH":"▼ BEARISH"}
                  </span>
                )}
              </div>
              <p style={{fontFamily:"var(--font-display)",fontWeight:600,fontSize:13.5,lineHeight:1.4,color:"var(--text)",margin:0,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{a.headline}</p>
            </div>
            {a.image_url&&<img src={a.image_url} alt="" style={{width:70,height:56,objectFit:"cover",borderRadius:8,flexShrink:0}} onError={e=>e.target.style.display="none"}/>}
          </div>
        );
      })}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function CategoryFeedPage({ categoryId, onBack }) {
  const [stocks,   setStocks]   = useState([]);
  const [news,     setNews]     = useState([]);
  const [loadingS, setLoadingS] = useState(true);
  const [loadingN, setLoadingN] = useState(true);
  const label = CATEGORY_LABELS[categoryId] || categoryId;

  // ── Open stock dashboard, back arrow returns to this category ──────────
  function handleStockClick(s) {
    const sym  = s.symbol;
    const name = getDisplayName(s);

    // Register a one-time back callback so ← from the dashboard returns
    // to this category feed instead of the global feed
    window.__dashboardBackOverride = () => {
      // This will be called by HomePage's dashboard ← button.
      // We set activeFilter back to the category via the global hook.
      if (window.__setActiveFilter) {
        window.__setActiveFilter("cat:" + categoryId);
      }
      delete window.__dashboardBackOverride;
    };

    if (window.__openDashboard) {
      window.__openDashboard(sym, name);
    }
  }

  useEffect(() => {
    if (!categoryId) return;
    setStocks([]); setNews([]);
    setLoadingS(true); setLoadingN(true);
    loadCategory();
  }, [categoryId]);

  useEffect(() => {
    if (!stocks.length) return;
    const t = setTimeout(() => fetchNews(stocks), 8000);
    return () => clearTimeout(t);
  }, [stocks]);

  async function loadCategory() {
    try {
      // ── Dynamic categories: trending / gainers / losers ──────────────
      if (["trending","gainers","losers"].includes(categoryId)) {
        const res = await fetch(`${BACKEND}/stocks`);
        const d   = await res.json();
        if (d.success && d.data?.length) {
          let list = d.data.filter(s=>s.price!=null);
          if      (categoryId==="trending") list=list.sort((a,b)=>Math.abs(b.change_pct||0)-Math.abs(a.change_pct||0));
          else if (categoryId==="gainers")  list=list.filter(s=>(s.change_pct||0)>0).sort((a,b)=>(b.change_pct||0)-(a.change_pct||0));
          else                              list=list.filter(s=>(s.change_pct||0)<0).sort((a,b)=>(a.change_pct||0)-(b.change_pct||0));
          const sl=list.slice(0,10);
          setStocks(sl); setLoadingS(false);
          fetch(`${BACKEND}/fetch/category`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({symbols:sl.map(s=>s.symbol)})}).catch(()=>{});
          fetchNews(sl);
          return;
        }
      }

      // ── All other categories: read from sidebar agent cache ──────────
      // This is a single fast request that returns pre-cached data
      const res = await fetch(`${BACKEND}/sidebar/${categoryId}`);
      const d   = await res.json();

      if (d.success && d.data?.length) {
        setStocks(d.data);
        setLoadingS(false);
        fetchNews(d.data);
        return;
      }

      // Cache not warm yet — fallback to /api/stocks for NSE stocks
      if (!d.cached) {
        console.log("Sidebar cache not warm yet, falling back...");
        const fallback = await fetch(`${BACKEND}/stocks`);
        const fd = await fallback.json();
        if (fd.success && fd.data?.length) {
          // Filter to known symbols for this category
          const KNOWN_NSE = {
            tech:    ["TCS.NS","INFY.NS","WIPRO.NS","HCLTECH.NS","TECHM.NS","LTIM.NS","PERSISTENT.NS","COFORGE.NS","MPHASIS.NS","HAPPSTMNDS.NS"],
            oil:     ["RELIANCE.NS","ONGC.NS","IOC.NS","BPCL.NS","HINDPETRO.NS"],
            finance: ["HDFCBANK.NS","ICICIBANK.NS","SBIN.NS","KOTAKBANK.NS","AXISBANK.NS","BAJFINANCE.NS"],
            mutualfunds: ["NIFTYBEES.NS","JUNIORBEES.NS","BANKBEES.NS","MID150BEES.NS"],
          };
          const symsForCat = KNOWN_NSE[categoryId];
          if (symsForCat) {
            const map = {};
            fd.data.forEach(s=>{ map[s.symbol]=s; });
            const rows = symsForCat.map(sym=>map[sym]).filter(Boolean);
            if (rows.length) { setStocks(rows); setLoadingS(false); fetchNews(rows); return; }
          }
        }
      }
    } catch(e) {
      console.error("loadCategory error:", e);
    }
    setLoadingS(false);
  }

  async function fetchNews(stockList) {
    if (!stockList?.length) { setLoadingN(false); return; }
    try {
      const syms = stockList.map(s=>s.symbol).filter(Boolean);

      if (categoryId==="indices") {
        const QUERIES=[
          {sym:"^NSEI",name:"Nifty 50",q:"nifty 50"},
          {sym:"^BSESN",name:"Sensex",q:"sensex BSE"},
          {sym:"^NSEBANK",name:"Bank Nifty",q:"bank nifty"},
          {sym:"^NSEMDCP50",name:"Nifty Midcap",q:"nifty midcap"},
          {sym:"^CNXIT",name:"Nifty IT",q:"nifty IT index"},
          {sym:"^CNXPHARMA",name:"Nifty Pharma",q:"nifty pharma"},
          {sym:"^CNXFMCG",name:"Nifty FMCG",q:"nifty fmcg"},
          {sym:"^CNXINFRA",name:"Nifty Infra",q:"nifty infra"},
        ];
        const results=await Promise.all(QUERIES.map(async({sym,name,q})=>{
          try{
            const r=await fetch(`${BACKEND}/news/search?q=${encodeURIComponent(q)}&limit=1`);
            const d=await r.json();
            return d.success&&d.data?.length?d.data.slice(0,1).map(a=>({...a,company:name,_fetchedForSymbol:sym})):[];
          }catch{return[];}
        }));
        const seen=new Set();
        setNews(results.flat().filter(a=>{const k=String(a.id||a.headline);if(seen.has(k))return false;seen.add(k);return true;}).sort((a,b)=>new Date(b.published_at)-new Date(a.published_at)));
        setLoadingN(false);
        return;
      }

      const results=await Promise.all(
        syms.slice(0,10).map(async sym=>{
          try{
            const r=await fetch(`${BACKEND}/stocks/${encodeURIComponent(sym)}/news?limit=5`);
            const d=await r.json();
            return d.success?(d.data||[]).map(a=>({...a,_fetchedForSymbol:sym})):[];
          }catch{return[];}
        })
      );
      const seen=new Set();
      let all=results.flat().filter(a=>{const k=String(a.id||a.headline);if(seen.has(k))return false;seen.add(k);return true;}).sort((a,b)=>new Date(b.published_at)-new Date(a.published_at));

      if (!all.length) {
        const FB={tech:"TCS Infosys Wipro HCL Indian IT",finance:"HDFC ICICI SBI bank India",
          oil:"ONGC Reliance crude oil India",us:"Wall Street NASDAQ NYSE",
          gold:"gold price India ETF MCX",silver:"silver price India ETF MCX",
          mutualfunds:"mutual fund India SIP NAV",forex:"forex rupee dollar India",
          gainers:"India stocks gain rally",losers:"India stocks fall",trending:"India market trending"};
        try{
          const r=await fetch(`${BACKEND}/news/search?q=${encodeURIComponent(FB[categoryId]||categoryId)}&limit=20`);
          const d=await r.json();
          if(d.success&&d.data?.length) all=d.data;
        }catch{}
      }
      setNews(all);
    }catch{}
    setLoadingN(false);
  }

  return (
    <div>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}"}</style>

      {/* Sticky header */}
      <div style={{position:"sticky",top:0,zIndex:10,background:"var(--bg)",paddingTop:4,paddingBottom:12,borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:8,marginBottom:0}}>
        <button onClick={onBack} style={{background:"transparent",border:"none",cursor:"pointer",color:"var(--text3)",fontSize:18,padding:"0 4px 0 0",fontWeight:300,lineHeight:1}}>←</button>
        <div style={{fontFamily:"var(--font-display)",fontWeight:800,fontSize:17,color:"var(--text)"}}>{label}</div>
        {(loadingS||loadingN)&&<div style={{width:13,height:13,borderRadius:"50%",border:"2px solid var(--border2)",borderTopColor:"var(--text)",animation:"spin 0.8s linear infinite"}}/>}
      </div>

      {/* Stocks section */}
      <div style={{marginTop:16,marginBottom:24}}>
        <div style={{fontSize:11,fontWeight:700,fontFamily:"var(--font-display)",color:"var(--text3)",letterSpacing:"0.08em",marginBottom:8}}>
          {["trending","gainers","losers"].includes(categoryId)?"TOP 10 TODAY":"STOCKS"}
        </div>
        {loadingS ? (
          [...Array(5)].map((_,i)=><div key={i} className="skeleton" style={{height:52,borderRadius:10,marginBottom:8}}/>)
        ) : stocks.length===0 ? (
          <div style={{color:"var(--text3)",fontSize:12,padding:"8px 0"}}>No data available</div>
        ) : (
          <>
            {stocks.slice(0,5).map((s,i)=><StockRow key={s.symbol+i} s={s} i={i} onStockClick={handleStockClick}/>)}
            {stocks.length>5&&<StockDropdown stocks={stocks.slice(5)} onStockClick={handleStockClick}/>}
          </>
        )}
      </div>

      {/* News section */}
      <NewsSection news={news} loadingN={loadingN} stocks={stocks}/>
    </div>
  );
}