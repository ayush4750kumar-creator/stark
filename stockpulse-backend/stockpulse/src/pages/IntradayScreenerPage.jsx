// src/pages/IntradayScreenerPage.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import CompanyLogo from "../components/CompanyLogo";
import InlineCompanyView from "../components/InlineCompanyView";

const BACKEND = process.env.REACT_APP_API_URL;

const FILTER_GROUPS = [
  {
    id: "price",
    label: "Price Change > 1%",
    options: [
      { id: "price_10m", label: "Last 10 mins", fn: s => s.changePct10m != null && Math.abs(s.changePct10m) > 1 },
      { id: "price_1h",  label: "Last 1 hour",  fn: s => s.changePct1h  != null && Math.abs(s.changePct1h)  > 1 },
      { id: "price_1d",  label: "Today",         fn: s => s.changePct    != null && Math.abs(s.changePct)    > 1 },
    ],
  },
  {
    id: "rsi",
    label: "RSI",
    options: [
      { id: "rsi_low",  label: "RSI < 30 (Oversold)",  fn: s => s.rsi != null && s.rsi < 30  },
      { id: "rsi_mid",  label: "30 < RSI < 70",         fn: s => s.rsi != null && s.rsi >= 30 && s.rsi <= 70 },
      { id: "rsi_high", label: "RSI > 70 (Overbought)", fn: s => s.rsi != null && s.rsi > 70  },
    ],
  },
  {
    id: "macd",
    label: "MACD",
    options: [
      { id: "macd_bull", label: "Bullish", fn: s => s.macd === true  },
      { id: "macd_bear", label: "Bearish", fn: s => s.macd === false },
    ],
  },
];

function fmtPrice(v)  { return v  != null ? `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"; }
function fmtPct(v)    { return v  != null ? `${v >= 0 ? "▲" : "▼"} ${Math.abs(v).toFixed(2)}%` : "—"; }
function fmtVol(v)    {
  if (v == null) return "—";
  if (v >= 1e7)  return `${(v / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5)  return `${(v / 1e5).toFixed(2)} L`;
  return v.toLocaleString("en-IN");
}
function fmtCap(v)    {
  if (v == null || v === 0) return "—";
  if (v >= 1e12) return `₹${(v / 1e12).toFixed(2)}L Cr`;
  if (v >= 1e9)  return `₹${(v / 1e9).toFixed(2)}K Cr`;
  if (v >= 1e7)  return `₹${(v / 1e7).toFixed(2)} Cr`;
  return `₹${v.toLocaleString("en-IN")}`;
}

const COL = "2fr 1fr 1fr 1fr 1fr 1fr";

function StockRow({ s, onOpen, onTrack, isTracked }) {
  const up      = (s.changePct ?? 0) >= 0;
  const rsiBg    = s.rsi < 30 ? "rgba(0,212,170,0.12)" : s.rsi > 70 ? "rgba(255,77,109,0.12)" : "var(--bg3)";
  const rsiColor = s.rsi < 30 ? "var(--bull)" : s.rsi > 70 ? "var(--bear)" : "var(--text3)";
  const wkUp     = (s.weekVolumePct ?? 0) >= 0;

  return (
    <div
      style={{
        display: "grid", gridTemplateColumns: COL,
        padding: "11px 18px", alignItems: "center",
        borderBottom: "1px solid var(--border)",
        transition: "background 0.1s", flexShrink: 0,
      }}
      onMouseEnter={e => e.currentTarget.style.background = "var(--bg2)"}
      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <CompanyLogo symbol={s.symbol} name={s.name} size={34} />
        <div style={{ minWidth: 0 }}>
          <div onClick={()=>onOpen(s)} style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", cursor:"pointer" }}>
            {s.name}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, flexWrap:"wrap" }}>
            <span style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--font-mono)" }}>
              {s.symbol.replace(/\.(NS|BO)$/, "")}
            </span>
            <button onClick={e=>{e.stopPropagation();onTrack(s);}} style={{ padding:"1px 6px",borderRadius:4,border:`1px solid ${isTracked?"var(--bull)":"var(--border2)"}`,background:isTracked?"rgba(0,212,170,0.08)":"var(--bg3)",color:isTracked?"var(--bull)":"var(--text3)",fontFamily:"var(--font-display)",fontWeight:700,fontSize:9,cursor:"pointer",letterSpacing:"0.04em",whiteSpace:"nowrap" }}>{isTracked?"✓ TRACKED":"+ TRACK"}</button>
            {s.rsi != null && (
              <span style={{ fontSize: 9, fontFamily: "var(--font-display)", fontWeight: 700, color: rsiColor, background: rsiBg, padding: "1px 5px", borderRadius: 4 }}>
                RSI {s.rsi}
              </span>
            )}
            {s.macd != null && (
              <span style={{ fontSize: 9, fontFamily: "var(--font-display)", fontWeight: 700, color: s.macd ? "var(--bull)" : "var(--bear)", background: s.macd ? "rgba(0,212,170,0.1)" : "rgba(255,77,109,0.1)", padding: "1px 5px", borderRadius: 4 }}>
                MACD {s.macd ? "▲" : "▼"}
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 13, color: "var(--text)" }}>
        {fmtPrice(s.price)}
      </div>

      <div style={{ textAlign: "right" }}>
        <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 13, color: up ? "var(--bull)" : "var(--bear)" }}>
          {fmtPct(s.changePct)}
        </div>
        {s.changePct1h != null && (
          <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 1 }}>
            1h: {fmtPct(s.changePct1h)}
          </div>
        )}
      </div>

      <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text2)" }}>
        {fmtVol(s.volume)}
      </div>

      <div style={{ textAlign: "right" }}>
        {s.weekVolumePct != null ? (
          <>
            <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 13, color: wkUp ? "var(--bull)" : "var(--bear)" }}>
              {wkUp ? "▲" : "▼"} {Math.abs(s.weekVolumePct).toFixed(1)}%
            </div>
            <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 1, fontFamily: "var(--font-mono)" }}>
              {fmtVol(s.weekVolume)} avg
            </div>
          </>
        ) : (
          <span style={{ color: "var(--text3)", fontSize: 11 }}>—</span>
        )}
      </div>

      <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text2)" }}>
        {fmtCap(s.marketCap)}
      </div>
    </div>
  );
}

export default function IntradayScreenerPage() {
  const [stocks,       setStocks]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(false);
  const [lastFetch,    setLastFetch]    = useState(null);
  const [activeFilters,setActiveFilters]= useState({});
  const [sortCol,      setSortCol]      = useState("changePct");
  const [sortDir,      setSortDir]      = useState("desc");
  const [openGroup,    setOpenGroup]    = useState(null);
  const [searchQuery,  setSearchQuery]  = useState("");
  const [searchRes,    setSearchRes]    = useState([]);
  const [searchOpen,   setSearchOpen]   = useState(false);
  const [watchlist,    setWatchlist]    = useState(() => {
    try { return JSON.parse(localStorage.getItem("intraday_watchlist") || "[]"); } catch { return []; }
  });
  const [activeDash,   setActiveDash]   = useState(null);
  const didFetch   = useRef(false);
  const searchRef  = useRef();
  const searchTimer = useRef();

  function load() {
    setLoading(true);
    fetch(`${BACKEND}/intraday/screen`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data?.length) {
          setStocks(d.data);
          setLastFetch(new Date());
          setError(false);
        } else { setError(true); }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;
    load();
    const t = setInterval(load, 2 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const h = e => { if (!searchRef.current?.contains(e.target)) setOpenGroup(null); setSearchOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => { localStorage.setItem("intraday_watchlist", JSON.stringify(watchlist)); }, [watchlist]);

  const handleSearch = useCallback((q) => {
    setSearchQuery(q);
    clearTimeout(searchTimer.current);
    if (!q.trim()) { setSearchRes([]); setSearchOpen(false); return; }
    const qUp = q.toUpperCase();
    const local = stocks.filter(s => s.symbol.replace(/\.(NS|BO)$/,"").includes(qUp) || (s.name||"").toUpperCase().includes(qUp)).slice(0,8);
    if (local.length) { setSearchRes(local); setSearchOpen(true); }
    searchTimer.current = setTimeout(async () => {
      try {
        const r = await fetch(`${process.env.REACT_APP_API_URL}/stocks/search?q=${encodeURIComponent(q)}`);
        const d = await r.json();
        if (d.success && d.data?.length) {
          const results = d.data.filter(s=>s.symbol?.endsWith(".NS")||s.symbol?.endsWith(".BO")).slice(0,8)
            .map(s=>({symbol:s.symbol,name:s.name||s.symbol,price:s.price,changePct:s.change_pct}));
          if (results.length) { setSearchRes(results); setSearchOpen(true); }
        }
      } catch {}
    }, 350);
  }, [stocks]);

  const addToWatchlist = (s) => setWatchlist(prev => { if(prev.find(w=>w.symbol===s.symbol))return prev; return [...prev,{symbol:s.symbol,name:s.name||s.symbol.replace(/\.(NS|BO)$/,"")}]; });
  const removeFromWatchlist = (sym) => { setWatchlist(prev=>prev.filter(w=>w.symbol!==sym)); if(activeDash?.symbol===sym)setActiveDash(null); };
  const isTracked = (sym) => watchlist.some(w=>w.symbol===sym);
  const openDashboard = (s) => setActiveDash(s);
  const handleTrack = (s) => isTracked(s.symbol) ? removeFromWatchlist(s.symbol) : addToWatchlist(s);

  function toggleFilter(groupId, optionId) {
    setActiveFilters(prev => {
      if (prev[groupId] === optionId) { const n = { ...prev }; delete n[groupId]; return n; }
      return { ...prev, [groupId]: optionId };
    });
    setOpenGroup(null);
  }

  function clearFilter(groupId, e) {
    e.stopPropagation();
    setActiveFilters(prev => { const n = { ...prev }; delete n[groupId]; return n; });
  }

  const filtered = stocks.filter(s => {
    for (const [groupId, optionId] of Object.entries(activeFilters)) {
      const group  = FILTER_GROUPS.find(g => g.id === groupId);
      const option = group?.options.find(o => o.id === optionId);
      if (option && !option.fn(s)) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    const va = a[sortCol] ?? -999;
    const vb = b[sortCol] ?? -999;
    if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    return sortDir === "asc" ? va - vb : vb - va;
  });

  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
  }

  const hasFilters  = Object.keys(activeFilters).length > 0;
  const activeCount = hasFilters ? ` · ${filtered.length} stocks` : "";

  const gainers = stocks.filter(s=>(s.changePct??0)>=0).length;
  const losers  = stocks.filter(s=>(s.changePct??0)<0).length;

  return (
    <div style={{ display:"flex", height:"100%", overflow:"hidden", background:"var(--bg)" }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* SIDEBAR */}
      <div style={{ width:224, flexShrink:0, borderRight:"1px solid var(--border)", display:"flex", flexDirection:"column", background:"var(--bg)" }}>
        <div style={{ padding:"14px 14px 8px", borderBottom:"1px solid var(--border)", flexShrink:0 }}>
          <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:11, color:"var(--text3)", letterSpacing:"0.1em" }}>INTRADAY WATCHLIST</div>
          <div style={{ fontSize:10, color:"var(--text3)", marginTop:1 }}>{watchlist.length} tracked</div>
        </div>

        <div ref={searchRef} style={{ padding:"8px 10px 4px", position:"relative", flexShrink:0 }}>
          <div style={{ position:"relative" }}>
            <svg style={{ position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:"var(--text3)",pointerEvents:"none" }} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input placeholder="Search stocks…" value={searchQuery} onChange={e=>handleSearch(e.target.value)} onFocus={()=>{if(searchRes.length)setSearchOpen(true);}}
              style={{ width:"100%",padding:"7px 28px 7px 26px",borderRadius:8,border:"1px solid var(--border)",fontFamily:"var(--font-display)",fontSize:11,background:"var(--bg2)",color:"var(--text)",outline:"none",boxSizing:"border-box" }}/>
            {searchQuery && <button onClick={()=>{setSearchQuery("");setSearchRes([]);setSearchOpen(false);}} style={{ position:"absolute",right:7,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"var(--text3)",cursor:"pointer",fontSize:13,padding:0 }}>×</button>}
          </div>
          {searchOpen && searchRes.length > 0 && (
            <div style={{ position:"absolute",top:"calc(100% - 2px)",left:10,right:10,background:"var(--bg)",border:"1px solid var(--border2)",borderRadius:10,zIndex:400,boxShadow:"0 8px 28px rgba(0,0,0,0.14)",overflow:"hidden",maxHeight:300,overflowY:"auto" }}>
              {searchRes.map((s,i) => {
                const up=(s.changePct??0)>=0; const tracked=isTracked(s.symbol);
                return (
                  <div key={s.symbol+i} style={{ display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderBottom:"1px solid var(--border)",transition:"background 0.1s" }}
                    onMouseEnter={e=>e.currentTarget.style.background="var(--bg2)"} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <CompanyLogo symbol={s.symbol} name={s.name} size={26}/>
                    <div style={{ flex:1,minWidth:0,cursor:"pointer" }} onClick={()=>{openDashboard(s);setSearchOpen(false);setSearchQuery("");setSearchRes([]);}}>
                      <div style={{ fontFamily:"var(--font-display)",fontWeight:700,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{s.name||s.symbol.replace(/\.(NS|BO)$/,"")}</div>
                      <div style={{ fontSize:10,color:"var(--text3)",display:"flex",gap:5 }}>
                        <span>{s.symbol.replace(/\.(NS|BO)$/,"")}</span>
                        {(s.changePct??s.change_pct)!=null && <span style={{ color:up?"var(--bull)":"var(--bear)",fontWeight:700 }}>{up?"▲":"▼"}{Math.abs(s.changePct??s.change_pct??0).toFixed(1)}%</span>}
                      </div>
                    </div>
                    <button onClick={e=>{e.stopPropagation();tracked?removeFromWatchlist(s.symbol):addToWatchlist(s);}}
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
            <div style={{ padding:"14px",color:"var(--text3)",fontSize:11,lineHeight:1.7,fontFamily:"var(--font-display)" }}>Search stocks above and press + to track here.</div>
          ) : watchlist.map(ws => {
            const live = stocks.find(s=>s.symbol===ws.symbol)||ws;
            const up   = (live?.changePct??0)>=0;
            const isActive = activeDash?.symbol===ws.symbol;
            return (
              <div key={ws.symbol} onClick={()=>openDashboard(live||ws)}
                style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 12px",cursor:"pointer",background:isActive?"rgba(0,212,170,0.06)":"transparent",borderLeft:`2px solid ${isActive?"var(--bull)":"transparent"}`,transition:"all 0.12s" }}
                onMouseEnter={e=>{if(!isActive)e.currentTarget.style.background="var(--bg2)";}}
                onMouseLeave={e=>{if(!isActive)e.currentTarget.style.background="transparent";}}>
                <CompanyLogo symbol={ws.symbol} name={ws.name} size={30}/>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontFamily:"var(--font-display)",fontWeight:700,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{ws.symbol.replace(/\.(NS|BO)$/,"")}</div>
                  <div style={{ fontSize:10,color:"var(--text3)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{ws.name}</div>
                </div>
                <div style={{ textAlign:"right",flexShrink:0 }}>
                  {live?.price!=null && <div style={{ fontSize:11,fontFamily:"var(--font-display)",fontWeight:700 }}>₹{live.price.toLocaleString("en-IN",{maximumFractionDigits:0})}</div>}
                  {live?.changePct!=null && <div style={{ fontSize:10,fontWeight:700,color:up?"var(--bull)":"var(--bear)" }}>{up?"▲":"▼"}{Math.abs(live.changePct).toFixed(2)}%</div>}
                </div>
                <button onClick={e=>{e.stopPropagation();removeFromWatchlist(ws.symbol);}}
                  style={{ width:16,height:16,flexShrink:0,border:"none",background:"transparent",color:"var(--text3)",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",opacity:0.4,transition:"opacity 0.12s" }}
                  onMouseEnter={e=>{e.currentTarget.style.opacity="1";e.currentTarget.style.color="var(--bear)";}}
                  onMouseLeave={e=>{e.currentTarget.style.opacity="0.4";e.currentTarget.style.color="var(--text3)";}}>×</button>
              </div>
            );
          })}
        </div>

        <div style={{ padding:"8px 14px",borderTop:"1px solid var(--border)",flexShrink:0 }}>
          <div style={{ fontSize:10,color:"var(--text3)",fontFamily:"var(--font-display)",display:"flex",gap:8 }}>
            <span style={{ color:"var(--bull)" }}>▲ {gainers}</span>
            <span style={{ color:"var(--bear)" }}>▼ {losers}</span>
            <span style={{ marginLeft:"auto" }}>{stocks.length} stocks</span>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>
        {activeDash ? (
          <div style={{ height:"100%",overflowY:"auto",maxWidth:860 }}>
            <InlineCompanyView symbol={activeDash.symbol} company={activeDash.name} onBack={()=>setActiveDash(null)} stock={{ price: activeDash.price, change_pct: activeDash.changePct, change_amt: activeDash.change, volume: activeDash.volume, market_cap: activeDash.marketCap, pe_ratio: activeDash.pe, day_high: activeDash.high, day_low: activeDash.low, week52_high: activeDash.week52High, week52_low: activeDash.week52Low }}
              trackButton={<button onClick={()=>handleTrack(activeDash)} style={{ padding:"7px 16px",borderRadius:8,border:`1px solid ${isTracked(activeDash.symbol)?"var(--bull)":"var(--border2)"}`,background:isTracked(activeDash.symbol)?"rgba(0,212,170,0.08)":"transparent",color:isTracked(activeDash.symbol)?"var(--bull)":"var(--text2)",fontFamily:"var(--font-display)",fontWeight:700,fontSize:12,cursor:"pointer" }}>{isTracked(activeDash.symbol)?"✓ Tracked":"+ Track"}</button>}
            />
          </div>
        ) : (
          <div style={{ height:"100%", display:"flex", flexDirection:"column", overflow:"hidden" }}>

      <div style={{ flexShrink: 0, padding: "18px 24px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>

          {FILTER_GROUPS.map(group => {
            const activeOpt = group.options.find(o => o.id === activeFilters[group.id]);
            const isOpen    = openGroup === group.id;
            const isActive  = !!activeOpt;

            return (
              <div key={group.id} style={{ position: "relative" }} onMouseDown={e => e.stopPropagation()}>
                <button
                  onClick={() => setOpenGroup(isOpen ? null : group.id)}
                  style={{
                    padding: "8px 16px", borderRadius: 40,
                    border: isActive ? "1.5px solid var(--text)" : "1.5px solid var(--border)",
                    background: isActive ? "var(--text)" : "transparent",
                    color: isActive ? "var(--bg)" : "var(--text2)",
                    fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12,
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                    transition: "all 0.15s",
                  }}
                >
                  {isActive ? activeOpt.label : group.label}
                  {isActive && (
                    <span onClick={e => clearFilter(group.id, e)} style={{ fontSize: 14, lineHeight: 1, opacity: 0.7, marginLeft: 2 }}>×</span>
                  )}
                  {!isActive && <span style={{ fontSize: 10, opacity: 0.5 }}>▾</span>}
                </button>

                {isOpen && (
                  <div style={{
                    position: "absolute", top: "calc(100% + 6px)", left: 0,
                    background: "var(--bg2)", border: "1px solid var(--border2)",
                    borderRadius: 12, overflow: "hidden", zIndex: 200,
                    boxShadow: "0 8px 30px rgba(0,0,0,0.25)", minWidth: 200,
                  }}>
                    {group.options.map(opt => (
                      <div key={opt.id} onClick={() => toggleFilter(group.id, opt.id)}
                        style={{
                          padding: "10px 16px",
                          fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 600,
                          color: activeFilters[group.id] === opt.id ? "var(--accent)" : "var(--text2)",
                          cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                          borderBottom: "1px solid var(--border)",
                          background: activeFilters[group.id] === opt.id ? "var(--bg3)" : "transparent",
                          transition: "background 0.1s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "var(--bg3)"}
                        onMouseLeave={e => e.currentTarget.style.background = activeFilters[group.id] === opt.id ? "var(--bg3)" : "transparent"}
                      >
                        <span style={{ width: 14, textAlign: "center" }}>
                          {activeFilters[group.id] === opt.id ? "✓" : ""}
                        </span>
                        {opt.label}
                        <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--text3)", background: "var(--bg3)", padding: "1px 7px", borderRadius: 10 }}>
                          {stocks.filter(opt.fn).length}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {hasFilters && (
            <button onClick={() => setActiveFilters({})}
              style={{ padding: "8px 14px", borderRadius: 40, border: "1px solid var(--border)", background: "transparent", color: "var(--text3)", fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 11, cursor: "pointer" }}>
              Clear all
            </button>
          )}

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            {loading && <div style={{ width: 10, height: 10, borderRadius: "50%", border: "2px solid var(--border2)", borderTopColor: "var(--accent)", animation: "spin 0.8s linear infinite" }} />}
            <span style={{ fontSize: 10, fontFamily: "var(--font-display)", color: "var(--text3)", background: "var(--bg3)", padding: "4px 12px", borderRadius: 20, border: "1px solid var(--border2)" }}>
              ⚡ {stocks.length} stocks{activeCount}
              {lastFetch && ` · ${lastFetch.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`}
            </span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: COL, padding: "11px 18px", background: "var(--bg2)", borderRadius: "12px 12px 0 0", border: "1px solid var(--border)", borderBottom: "none" }}>
          {[
            { col: "name",          label: "Company"         },
            { col: "price",         label: "Price"           },
            { col: "changePct",     label: "1D Price Change" },
            { col: "volume",        label: "Volume"          },
            { col: "weekVolumePct", label: "1W Volume"       },
            { col: "marketCap",     label: "Market Cap"      },
          ].map(({ col, label }) => (
            <div key={col} onClick={() => toggleSort(col)}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                justifyContent: col === "name" ? "flex-start" : "flex-end",
                fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 11,
                color: sortCol === col ? "var(--text)" : "var(--text3)",
                letterSpacing: "0.05em", cursor: "pointer", userSelect: "none",
              }}>
              {label}
              <span style={{ fontSize: 9, color: sortCol === col ? "var(--accent)" : "inherit", opacity: sortCol === col ? 1 : 0.3 }}>
                {sortCol === col ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", margin: "0 24px", border: "1px solid var(--border)", borderTop: "none", borderRadius: "0 0 12px 12px", background: "var(--bg)" }}>
        {loading && stocks.length === 0 && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: 14 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid var(--border2)", borderTopColor: "var(--accent)", animation: "spin 0.8s linear infinite" }} />
            <div style={{ fontFamily: "var(--font-display)", fontSize: 13, color: "var(--text3)" }}>
              Fetching intraday data & computing RSI/MACD...
            </div>
          </div>
        )}
        {error && stocks.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 24px", fontFamily: "var(--font-display)" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>Could not load intraday data</div>
            <button onClick={load} style={{ padding: "8px 20px", borderRadius: 8, background: "var(--accent)", border: "none", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Retry</button>
          </div>
        )}
        {!loading && sorted.length === 0 && stocks.length > 0 && (
          <div style={{ textAlign: "center", padding: "48px", color: "var(--text3)", fontFamily: "var(--font-display)", fontSize: 13 }}>No stocks match the selected filters</div>
        )}
        {sorted.map(s => <StockRow key={s.symbol} s={s} onOpen={openDashboard} onTrack={handleTrack} isTracked={isTracked(s.symbol)} />)}
      </div>
          </div>
        )}
      </div>
    </div>
  );
}