// src/pages/ETFScreenerPage.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import InlineCompanyView from "../components/InlineCompanyView";

const BACKEND = process.env.REACT_APP_API_URL;

const FILTERS = [
  { id: "all",     label: "All ETFs",  icon: "◈" },
  { id: "gold",    label: "Gold",      icon: "◆" },
  { id: "silver",  label: "Silver",    icon: "◇" },
  { id: "nifty50", label: "Nifty 50",  icon: "◉" },
  { id: "sector",  label: "Sectoral",  icon: "◫" },
  { id: "index",   label: "Index",     icon: "◎" },
  { id: "global",  label: "Global",    icon: "◐" },
  { id: "debt",    label: "Debt",      icon: "◑" },
];

const FILTER_COLORS = {
  all:     { accent: "#111111", bg: "rgba(17,17,17,0.08)",    border: "#111111" },
  gold:    { accent: "#b8860b", bg: "rgba(184,134,11,0.1)",   border: "#d4a017" },
  silver:  { accent: "#708090", bg: "rgba(112,128,144,0.1)",  border: "#94a3b8" },
  nifty50: { accent: "#1a56db", bg: "rgba(26,86,219,0.1)",    border: "#3b82f6" },
  sector:  { accent: "#7c3aed", bg: "rgba(124,58,237,0.1)",   border: "#8b5cf6" },
  index:   { accent: "#0891b2", bg: "rgba(8,145,178,0.1)",    border: "#06b6d4" },
  global:  { accent: "#059669", bg: "rgba(5,150,105,0.1)",    border: "#10b981" },
  debt:    { accent: "#d97706", bg: "rgba(217,119,6,0.1)",    border: "#f59e0b" },
};

const COL = "2.4fr 1fr 1.1fr 1fr 1fr";

function categoryLabel(cat) {
  return { gold:"Gold", silver:"Silver", nifty50:"Nifty 50", sector:"Sector", index:"Index", global:"Global", debt:"Debt" }[cat] || cat;
}

function ETFLogo({ etf }) {
  const [failed, setFailed] = useState(false);
  const initials = (etf.name || "ET").split(" ").filter(Boolean).slice(0,2).map(w=>w[0]).join("").toUpperCase();
  const fallbackColors = { gold:"#b8860b", silver:"#708090", nifty50:"#1a56db", sector:"#7c3aed", index:"#0891b2", global:"#059669", debt:"#d97706" };
  const bg = fallbackColors[etf.category] || "#374151";
  if (!failed) {
    return (
      <div style={{ width:36, height:36, borderRadius:9, flexShrink:0, background:"#fff", border:"1px solid #e8e8e8", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
        <img src={`https://www.google.com/s2/favicons?domain=${etf.amc||"nseindia.com"}&sz=64`} alt={etf.name} width={28} height={28} style={{ objectFit:"contain" }} onError={() => setFailed(true)} />
      </div>
    );
  }
  return <div style={{ width:36, height:36, borderRadius:9, flexShrink:0, background:bg, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-display)", fontWeight:800, fontSize:11, color:"#fff" }}>{initials}</div>;
}

function SkeletonRow() {
  return (
    <div style={{ display:"grid", gridTemplateColumns:COL, padding:"13px 20px", borderBottom:"1px solid var(--border)", alignItems:"center", flexShrink:0 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div className="skeleton" style={{ width:36, height:36, borderRadius:9, flexShrink:0 }} />
        <div><div className="skeleton" style={{ height:12, width:130, borderRadius:4, marginBottom:5 }} /><div className="skeleton" style={{ height:10, width:80, borderRadius:4 }} /></div>
      </div>
      <div className="skeleton" style={{ height:13, width:70, borderRadius:4, marginLeft:"auto" }} />
      <div className="skeleton" style={{ height:13, width:60, borderRadius:4, marginLeft:"auto" }} />
      <div className="skeleton" style={{ height:13, width:60, borderRadius:4, marginLeft:"auto" }} />
      <div className="skeleton" style={{ height:22, width:65, borderRadius:20, marginLeft:"auto" }} />
    </div>
  );
}

function ETFRow({ etf, onOpen, onTrack, isTracked }) {
  const [hovered, setHovered] = useState(false);
  const up    = (etf.change_pct ?? 0) >= 0;
  const ret1Y = etf.return1Y;
  const retUp = (ret1Y ?? 0) >= 0;
  const catFc = FILTER_COLORS[etf.category] || FILTER_COLORS.all;

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ display:"grid", gridTemplateColumns:COL, padding:"13px 20px", borderBottom:"1px solid var(--border)", alignItems:"center", background: hovered ? "var(--bg2)" : "transparent", transition:"background 0.12s", flexShrink:0 }}>

      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <ETFLogo etf={etf} />
        <div style={{ minWidth:0 }}>
          <div onClick={()=>onOpen(etf)} style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:13, color:"var(--text)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", maxWidth:200, cursor:"pointer" }}>{etf.name}</div>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:2 }}>
            <span style={{ fontSize:10, color:"var(--text3)", fontFamily:"var(--font-display)", fontWeight:600 }}>{etf.symbol.replace(".NS","")}</span>
            <span style={{ fontSize:9, fontFamily:"var(--font-display)", fontWeight:700, padding:"1px 6px", borderRadius:4, color:catFc.accent, background:catFc.bg, border:`1px solid ${catFc.border}40`, letterSpacing:"0.04em", textTransform:"uppercase" }}>{categoryLabel(etf.category)}</span>
            {hovered && <button onClick={e=>{e.stopPropagation();onTrack(etf);}} style={{ padding:"1px 6px",borderRadius:4,border:`1px solid ${isTracked?"var(--bull)":"var(--border2)"}`,background:isTracked?"rgba(0,212,170,0.08)":"var(--bg3)",color:isTracked?"var(--bull)":"var(--text3)",fontFamily:"var(--font-display)",fontWeight:700,fontSize:9,cursor:"pointer",letterSpacing:"0.04em",whiteSpace:"nowrap" }}>{isTracked?"✓ TRACKED":"+ TRACK"}</button>}
          </div>
        </div>
      </div>

      <div style={{ textAlign:"right" }}>
        <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:13, color:"var(--text)" }}>
          {etf.price != null ? `₹${etf.price.toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}` : "—"}
        </div>
      </div>

      <div style={{ textAlign:"right" }}>
        {etf.change_pct != null ? (
          <>
            <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:13, color: up ? "var(--bull)" : "var(--bear)" }}>{up?"▲":"▼"} {Math.abs(etf.change_pct).toFixed(2)}%</div>
            <div style={{ fontSize:11, color: up ? "var(--bull)" : "var(--bear)", opacity:0.65, marginTop:1 }}>{up?"+":"−"}₹{Math.abs(etf.change_amt??0).toFixed(2)}</div>
          </>
        ) : <span style={{ color:"var(--text3)", fontSize:11 }}>—</span>}
      </div>

      <div style={{ textAlign:"right" }}>
        <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:13, color:"var(--text2)" }}>
          {etf.nav != null ? `₹${etf.nav.toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}` : "—"}
        </div>
        <div style={{ fontSize:10, color:"var(--text3)", marginTop:1 }}>per unit</div>
      </div>

      <div style={{ textAlign:"right" }}>
        {ret1Y != null ? (
          <div style={{ display:"inline-flex", alignItems:"center", gap:3, padding:"4px 10px", borderRadius:20, background: retUp ? "rgba(22,163,74,0.1)" : "rgba(220,38,38,0.1)", border:`1px solid ${retUp ? "rgba(22,163,74,0.2)" : "rgba(220,38,38,0.2)"}` }}>
            <span style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:12, color: retUp ? "var(--bull)" : "var(--bear)" }}>{retUp?"+":""}{ret1Y.toFixed(2)}%</span>
          </div>
        ) : <span style={{ color:"var(--text3)", fontSize:11 }}>—</span>}
      </div>
    </div>
  );
}

export default function ETFScreenerPage() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [allData,      setAllData]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(false);
  const [lastRefresh,  setLastRefresh]  = useState(null);
  const [sortCol,      setSortCol]      = useState("name");
  const [sortDir,      setSortDir]      = useState("asc");
  const [counts,       setCounts]       = useState({});
  const [search,       setSearch]       = useState("");
  const [searchQuery,  setSearchQuery]  = useState("");
  const [searchRes,    setSearchRes]    = useState([]);
  const [searchOpen,   setSearchOpen]   = useState(false);
  const [watchlist,    setWatchlist]    = useState(() => {
    try { return JSON.parse(localStorage.getItem("etf_watchlist") || "[]"); } catch { return []; }
  });
  const [activeDash,   setActiveDash]   = useState(null);
  const didFetch   = useRef(false);
  const searchRef  = useRef();
  const searchTimer = useRef();

  useEffect(() => { if (didFetch.current) return; didFetch.current = true; loadData(); }, []);

  useEffect(() => { localStorage.setItem("etf_watchlist", JSON.stringify(watchlist)); }, [watchlist]);

  useEffect(() => {
    const h = e => { if (!searchRef.current?.contains(e.target)) setSearchOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleSearch = useCallback((q) => {
    setSearchQuery(q);
    clearTimeout(searchTimer.current);
    if (!q.trim()) { setSearchRes([]); setSearchOpen(false); return; }
    const qUp = q.toUpperCase();
    const local = allData.filter(e => e.symbol.replace(/\.NS$/,"").includes(qUp) || (e.name||"").toUpperCase().includes(qUp)).slice(0,8);
    if (local.length) { setSearchRes(local); setSearchOpen(true); }
  }, [allData]);

  const addToWatchlist = (etf) => setWatchlist(prev => { if (prev.find(e=>e.symbol===etf.symbol)) return prev; return [...prev, {symbol:etf.symbol,name:etf.name,category:etf.category,amc:etf.amc}]; });
  const removeFromWatchlist = (sym) => { setWatchlist(prev=>prev.filter(e=>e.symbol!==sym)); if(activeDash?.symbol===sym) setActiveDash(null); };
  const isTracked = (sym) => watchlist.some(e=>e.symbol===sym);
  const openDashboard = (etf) => setActiveDash(etf);
  const handleTrack = (etf) => isTracked(etf.symbol) ? removeFromWatchlist(etf.symbol) : addToWatchlist(etf);

  async function loadData() {
    setLoading(true); setError(false);
    try {
      const res  = await fetch(`${BACKEND}/etf/all`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed");
      setAllData(json.data || []);
      setLastRefresh(new Date());
      const c = { all: (json.data||[]).length };
      ["gold","silver","nifty50","sector","index","global","debt"].forEach(cat => { c[cat] = (json.data||[]).filter(e => e.category === cat).length; });
      setCounts(c);
    } catch { setError(true); }
    finally   { setLoading(false); }
  }

  const filtered = allData.filter(e => {
    const matchCat    = activeFilter === "all" || e.category === activeFilter;
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.symbol.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const sorted = [...filtered].sort((a, b) => {
    let va, vb;
    if (sortCol === "name")       { va = a.name;             vb = b.name;              }
    if (sortCol === "price")      { va = a.price      ?? -1;  vb = b.price      ?? -1;  }
    if (sortCol === "change_pct") { va = a.change_pct ?? -999; vb = b.change_pct ?? -999; }
    if (sortCol === "nav")        { va = a.nav        ?? -1;  vb = b.nav        ?? -1;  }
    if (sortCol === "return1Y")   { va = a.return1Y   ?? -999; vb = b.return1Y   ?? -999; }
    if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    return sortDir === "asc" ? va - vb : vb - va;
  });

  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => d==="asc"?"desc":"asc");
    else { setSortCol(col); setSortDir(col==="name"?"asc":"desc"); }
  }

  const fc = FILTER_COLORS[activeFilter] || FILTER_COLORS.all;
  const withReturn = filtered.filter(e => e.return1Y != null);
  const avgReturn  = withReturn.length ? withReturn.reduce((s,e) => s+e.return1Y, 0) / withReturn.length : null;
  const gainers = filtered.filter(e => (e.change_pct??0) > 0).length;
  const losers  = filtered.filter(e => (e.change_pct??0) < 0).length;

  return (
    <div style={{ display:"flex", height:"100%", overflow:"hidden", background:"var(--bg)" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* SIDEBAR */}
      <div style={{ width:224, flexShrink:0, borderRight:"1px solid var(--border)", display:"flex", flexDirection:"column", background:"var(--bg)" }}>
        <div style={{ padding:"14px 14px 8px", borderBottom:"1px solid var(--border)", flexShrink:0 }}>
          <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:11, color:"var(--text3)", letterSpacing:"0.1em" }}>ETF WATCHLIST</div>
          <div style={{ fontSize:10, color:"var(--text3)", marginTop:1 }}>{watchlist.length} tracked</div>
        </div>

        <div ref={searchRef} style={{ padding:"8px 10px 4px", position:"relative", flexShrink:0 }}>
          <div style={{ position:"relative" }}>
            <svg style={{ position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:"var(--text3)",pointerEvents:"none" }} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input placeholder="Search ETFs…" value={searchQuery} onChange={e=>handleSearch(e.target.value)} onFocus={()=>{if(searchRes.length)setSearchOpen(true);}}
              style={{ width:"100%",padding:"7px 28px 7px 26px",borderRadius:8,border:"1px solid var(--border)",fontFamily:"var(--font-display)",fontSize:11,background:"var(--bg2)",color:"var(--text)",outline:"none",boxSizing:"border-box" }}/>
            {searchQuery && <button onClick={()=>{setSearchQuery("");setSearchRes([]);setSearchOpen(false);}} style={{ position:"absolute",right:7,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"var(--text3)",cursor:"pointer",fontSize:13,padding:0 }}>×</button>}
          </div>
          {searchOpen && searchRes.length > 0 && (
            <div style={{ position:"absolute",top:"calc(100% - 2px)",left:10,right:10,background:"var(--bg)",border:"1px solid var(--border2)",borderRadius:10,zIndex:400,boxShadow:"0 8px 28px rgba(0,0,0,0.14)",overflow:"hidden",maxHeight:300,overflowY:"auto" }}>
              {searchRes.map((e,i) => {
                const up=(e.change_pct??0)>=0; const tracked=isTracked(e.symbol);
                return (
                  <div key={e.symbol+i} style={{ display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderBottom:"1px solid var(--border)",transition:"background 0.1s" }}
                    onMouseEnter={el=>el.currentTarget.style.background="var(--bg2)"} onMouseLeave={el=>el.currentTarget.style.background="transparent"}>
                    <ETFLogo etf={e}/>
                    <div style={{ flex:1,minWidth:0,cursor:"pointer" }} onClick={()=>{openDashboard(e);setSearchOpen(false);setSearchQuery("");setSearchRes([]);}}>
                      <div style={{ fontFamily:"var(--font-display)",fontWeight:700,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{e.name}</div>
                      <div style={{ fontSize:10,color:"var(--text3)",display:"flex",gap:5 }}>
                        <span>{e.symbol.replace(/\.NS$/,"")}</span>
                        {e.change_pct!=null && <span style={{ color:up?"var(--bull)":"var(--bear)",fontWeight:700 }}>{up?"▲":"▼"}{Math.abs(e.change_pct).toFixed(1)}%</span>}
                      </div>
                    </div>
                    <button onClick={el=>{el.stopPropagation();tracked?removeFromWatchlist(e.symbol):addToWatchlist(e);}}
                      style={{ width:24,height:24,borderRadius:6,flexShrink:0,background:tracked?"rgba(0,212,170,0.12)":"var(--accent)",border:tracked?"1px solid var(--bull)":"none",color:tracked?"var(--bull)":"#fff",fontWeight:800,fontSize:15,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>
                      {tracked?"✓":"+"}
                    </button>
                  </div>
                );
              })}
              <div style={{ padding:"6px 12px",fontSize:10,color:"var(--text3)",fontFamily:"var(--font-display)",textAlign:"center",borderTop:"1px solid var(--border)" }}>Click name to open dashboard · + to track</div>
            </div>
          )}
        </div>

        <div style={{ flex:1, overflowY:"auto", padding:"2px 0" }}>
          {watchlist.length === 0 ? (
            <div style={{ padding:"14px",color:"var(--text3)",fontSize:11,lineHeight:1.7,fontFamily:"var(--font-display)" }}>Search ETFs above and press + to track them here.</div>
          ) : watchlist.map(we => {
            const live=allData.find(e=>e.symbol===we.symbol)||we;
            const up=(live?.change_pct??0)>=0;
            const isActive=activeDash?.symbol===we.symbol;
            return (
              <div key={we.symbol} onClick={()=>openDashboard(live||we)}
                style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 12px",cursor:"pointer",background:isActive?"rgba(0,212,170,0.06)":"transparent",borderLeft:`2px solid ${isActive?"var(--bull)":"transparent"}`,transition:"all 0.12s" }}
                onMouseEnter={e=>{if(!isActive)e.currentTarget.style.background="var(--bg2)";}}
                onMouseLeave={e=>{if(!isActive)e.currentTarget.style.background="transparent";}}>
                <ETFLogo etf={we}/>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontFamily:"var(--font-display)",fontWeight:700,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{we.symbol.replace(/\.NS$/,"")}</div>
                  <div style={{ fontSize:10,color:"var(--text3)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{we.name}</div>
                </div>
                <div style={{ textAlign:"right",flexShrink:0 }}>
                  {live?.price!=null && <div style={{ fontSize:11,fontFamily:"var(--font-display)",fontWeight:700 }}>₹{live.price.toLocaleString("en-IN",{maximumFractionDigits:0})}</div>}
                  {live?.change_pct!=null && <div style={{ fontSize:10,fontWeight:700,color:up?"var(--bull)":"var(--bear)" }}>{up?"▲":"▼"}{Math.abs(live.change_pct).toFixed(2)}%</div>}
                </div>
                <button onClick={e=>{e.stopPropagation();removeFromWatchlist(we.symbol);}}
                  style={{ width:16,height:16,flexShrink:0,border:"none",background:"transparent",color:"var(--text3)",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",opacity:0.4 }}
                  onMouseEnter={e=>{e.currentTarget.style.opacity="1";e.currentTarget.style.color="var(--bear)";}}
                  onMouseLeave={e=>{e.currentTarget.style.opacity="0.4";e.currentTarget.style.color="var(--text3)";}}>×</button>
              </div>
            );
          })}
        </div>

        <div style={{ padding:"8px 14px",borderTop:"1px solid var(--border)",flexShrink:0 }}>
          <div style={{ fontSize:10,color:"var(--text3)",fontFamily:"var(--font-display)",display:"flex",gap:8 }}>
            <span style={{ color:"var(--bull)" }}>▲ {allData.filter(e=>(e.change_pct??0)>0).length}</span>
            <span style={{ color:"var(--bear)" }}>▼ {allData.filter(e=>(e.change_pct??0)<0).length}</span>
            <span style={{ marginLeft:"auto" }}>{allData.length} ETFs</span>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>
        {activeDash ? (
          <div style={{ height:"100%",overflowY:"auto",maxWidth:860 }}>
              <InlineCompanyView symbol={activeDash.symbol} company={activeDash.name} onBack={()=>setActiveDash(null)} stock={{ price: activeDash.price, change_pct: activeDash.change_pct, change_amt: activeDash.change_amt, volume: activeDash.volume, market_cap: activeDash.marketCap, nav: activeDash.nav, week52_high: activeDash.week52High, week52_low: activeDash.week52Low }}
                trackButton={<button onClick={()=>handleTrack(activeDash)} style={{ padding:"7px 16px",borderRadius:8,border:`1px solid ${isTracked(activeDash.symbol)?"var(--bull)":"var(--border2)"}`,background:isTracked(activeDash.symbol)?"rgba(0,212,170,0.08)":"transparent",color:isTracked(activeDash.symbol)?"var(--bull)":"var(--text2)",fontFamily:"var(--font-display)",fontWeight:700,fontSize:12,cursor:"pointer" }}>{isTracked(activeDash.symbol)?"✓ Tracked":"+ Track"}</button>}
              />
          </div>
        ) : (
          <div style={{ height:"100%", display:"flex", flexDirection:"column", overflow:"hidden" }}>
            <div style={{ flexShrink:0, padding:"18px 24px 0" }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:12, marginBottom:12 }}>
                <div>
                  <h1 style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:20, margin:0, color:"var(--text)", letterSpacing:"-0.02em" }}>ETF Screener</h1>
                  <div style={{ fontSize:11, color:"var(--text3)", marginTop:3 }}>
                    {loading ? "Fetching live data…" : `${allData.length} ETFs · Live prices`}
                    {lastRefresh && !loading && <span style={{ marginLeft:8, opacity:0.6 }}>· {lastRefresh.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}</span>}
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                  {!loading && filtered.length > 0 && (
                    <div style={{ display:"flex", gap:6 }}>
                      <span style={{ fontSize:11, fontFamily:"var(--font-display)", fontWeight:700, color:"var(--bull)", background:"rgba(22,163,74,0.1)", padding:"3px 10px", borderRadius:20, border:"1px solid rgba(22,163,74,0.2)" }}>▲ {gainers}</span>
                      <span style={{ fontSize:11, fontFamily:"var(--font-display)", fontWeight:700, color:"var(--bear)", background:"rgba(220,38,38,0.1)", padding:"3px 10px", borderRadius:20, border:"1px solid rgba(220,38,38,0.2)" }}>▼ {losers}</span>
                      {avgReturn != null && (
                        <span style={{ fontSize:11, fontFamily:"var(--font-display)", fontWeight:700, color:avgReturn>=0?"var(--bull)":"var(--bear)", background:avgReturn>=0?"rgba(22,163,74,0.08)":"rgba(220,38,38,0.08)", padding:"3px 10px", borderRadius:20, border:`1px solid ${avgReturn>=0?"rgba(22,163,74,0.15)":"rgba(220,38,38,0.15)"}` }}>
                          Avg 1Y: {avgReturn>=0?"+":""}{avgReturn.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  )}
                  <div style={{ position:"relative" }}>
                    <svg style={{ position:"absolute", left:8, top:"50%", transform:"translateY(-50%)", color:"var(--text3)", pointerEvents:"none" }} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    <input placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}
                      style={{ paddingLeft:26, paddingRight:10, paddingTop:6, paddingBottom:6, borderRadius:8, border:"1px solid var(--border2)", fontFamily:"var(--font-display)", fontSize:12, background:"var(--bg2)", color:"var(--text)", outline:"none", width:150 }} />
                  </div>
                  <button onClick={() => { didFetch.current=false; loadData(); }} disabled={loading}
                    style={{ display:"flex", alignItems:"center", gap:4, padding:"6px 12px", borderRadius:8, border:"1px solid var(--border2)", background:"transparent", cursor:loading?"not-allowed":"pointer", fontFamily:"var(--font-display)", fontWeight:700, fontSize:11, color:"var(--text3)" }}>
                    {loading ? <div style={{ width:10, height:10, borderRadius:"50%", border:"2px solid var(--border2)", borderTopColor:"var(--accent)", animation:"spin 0.7s linear infinite" }}/> : "↻"} Refresh
                  </button>
                </div>
              </div>

              <div style={{ display:"flex", gap:6, flexWrap:"wrap", paddingBottom:14 }}>
                {FILTERS.map(f => {
                  const isActive=activeFilter===f.id; const fcolor=FILTER_COLORS[f.id];
                  return (
                    <button key={f.id} onClick={()=>setActiveFilter(f.id)}
                      style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 14px", borderRadius:40, border:`1.5px solid ${isActive?fcolor.border:"var(--border)"}`, background:isActive?fcolor.bg:"transparent", cursor:"pointer", fontFamily:"var(--font-display)", fontWeight:700, fontSize:11.5, color:isActive?fcolor.accent:"var(--text2)", transition:"all 0.15s" }}>
                      <span style={{ fontSize:12 }}>{f.icon}</span>
                      {f.label}
                      {counts[f.id]!=null && <span style={{ fontSize:10, padding:"1px 6px", borderRadius:10, background:isActive?`${fcolor.accent}20`:"var(--bg3)", color:isActive?fcolor.accent:"var(--text3)", fontWeight:700 }}>{counts[f.id]}</span>}
                    </button>
                  );
                })}
              </div>

              <div style={{ display:"grid", gridTemplateColumns:COL, padding:"9px 20px", background:"var(--bg2)", borderRadius:"12px 12px 0 0", border:"1px solid var(--border)", borderBottom:"none" }}>
                {[
                  { col:"name",       label:"Company",    align:"left"  },
                  { col:"price",      label:"Price",      align:"right" },
                  { col:"change_pct", label:"1D Change",  align:"right" },
                  { col:"nav",        label:"NAV",        align:"right" },
                  { col:"return1Y",   label:"1Y Returns", align:"right" },
                ].map(({ col, label, align }) => (
                  <div key={col} onClick={()=>toggleSort(col)}
                    style={{ display:"flex", alignItems:"center", justifyContent:align==="right"?"flex-end":"flex-start", gap:4, fontFamily:"var(--font-display)", fontWeight:700, fontSize:11, letterSpacing:"0.05em", color:sortCol===col?"var(--text)":"var(--text3)", cursor:"pointer", userSelect:"none" }}>
                    {label}
                    <span style={{ fontSize:9, opacity:sortCol===col?1:0.35 }}>{sortCol===col?(sortDir==="asc"?"↑":"↓"):"↕"}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ flex:1, overflowY:"auto", overflowX:"hidden", margin:"0 24px", border:"1px solid var(--border)", borderTop:"none", borderRadius:"0 0 12px 12px", background:"var(--bg)" }}>
              {error && (
                <div style={{ textAlign:"center", padding:"48px 24px", fontFamily:"var(--font-display)" }}>
                  <div style={{ fontSize:28, marginBottom:10 }}>⚠️</div>
                  <div style={{ fontWeight:700, fontSize:13, marginBottom:6 }}>Could not load ETF data</div>
                  <button onClick={()=>{didFetch.current=false;loadData();}} style={{ padding:"7px 18px", borderRadius:8, background:"var(--accent)", color:"#fff", border:"none", fontFamily:"var(--font-display)", fontWeight:700, fontSize:12, cursor:"pointer" }}>Retry</button>
                </div>
              )}
              {loading && [...Array(12)].map((_,i) => <SkeletonRow key={i} />)}
              {!loading && !error && sorted.length === 0 && (
                <div style={{ textAlign:"center", padding:"60px 24px", fontFamily:"var(--font-display)", color:"var(--text3)" }}>
                  <div style={{ fontSize:28, marginBottom:10 }}>📭</div>
                  <div style={{ fontWeight:700, fontSize:13 }}>{search?`No results for "${search}"`:"No ETFs found"}</div>
                </div>
              )}
              {!loading && !error && sorted.map(etf => <ETFRow key={etf.symbol} etf={etf} onOpen={openDashboard} onTrack={handleTrack} isTracked={isTracked(etf.symbol)} />)}
            </div>

            {!loading && !error && sorted.length > 0 && (
              <div style={{ flexShrink:0, padding:"8px 24px 10px", fontSize:11, color:"var(--text3)", fontFamily:"var(--font-display)" }}>
                Showing {sorted.length} of {allData.length} ETFs · NAV ≈ market price · 1Y returns from Yahoo Finance
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}