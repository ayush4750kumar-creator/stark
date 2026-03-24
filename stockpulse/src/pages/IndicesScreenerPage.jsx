// src/pages/IndicesScreenerPage.jsx
import { useState, useEffect, useRef } from "react";
import InlineCompanyView from "../components/InlineCompanyView";

const BACKEND = "http://localhost:5000/api";

const CATEGORY_FILTERS = [
  { id:"all",        label:"All"          },
  { id:"broad",      label:"Broad Market" },
  { id:"sector",     label:"Sectoral"     },
  { id:"midcap",     label:"Midcap"       },
  { id:"smallcap",   label:"Smallcap"     },
  { id:"volatility", label:"Volatility"   },
  { id:"special",    label:"Special"      },
];

const CATEGORY_COLORS = {
  all:        { accent:"#111",     bg:"rgba(17,17,17,0.08)",   border:"#111"      },
  broad:      { accent:"#1a56db",  bg:"rgba(26,86,219,0.1)",   border:"#3b82f6"   },
  sector:     { accent:"#7c3aed",  bg:"rgba(124,58,237,0.1)",  border:"#8b5cf6"   },
  midcap:     { accent:"#0891b2",  bg:"rgba(8,145,178,0.1)",   border:"#06b6d4"   },
  smallcap:   { accent:"#059669",  bg:"rgba(5,150,105,0.1)",   border:"#10b981"   },
  volatility: { accent:"#d97706",  bg:"rgba(217,119,6,0.1)",   border:"#f59e0b"   },
  special:    { accent:"#be185d",  bg:"rgba(190,24,93,0.1)",   border:"#ec4899"   },
};

const COL = "1.8fr 1.1fr 1fr 1fr 1fr 1fr 1fr";

function fmt(v, decimals=2) {
  if(v==null||v===0)return "—";
  return v.toLocaleString("en-IN",{minimumFractionDigits:decimals,maximumFractionDigits:decimals});
}

function IndexIcon({ idx }) {
  const catC = CATEGORY_COLORS[idx.category] || CATEGORY_COLORS.broad;
  const iconLetters = idx.name.split(" ").filter(Boolean).slice(0,2).map(w=>w[0]).join("").toUpperCase();
  return (
    <div style={{ width:34,height:34,borderRadius:8,flexShrink:0,background:catC.bg,border:`1px solid ${catC.border}60`,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font-display)",fontWeight:800,fontSize:10,color:catC.accent }}>
      {iconLetters}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div style={{ display:"grid",gridTemplateColumns:COL,padding:"13px 20px",borderBottom:"1px solid var(--border)",alignItems:"center",flexShrink:0 }}>
      <div style={{ display:"flex",alignItems:"center",gap:10 }}>
        <div className="skeleton" style={{ width:34,height:34,borderRadius:8 }}/>
        <div><div className="skeleton" style={{ height:12,width:140,borderRadius:4,marginBottom:5 }}/><div className="skeleton" style={{ height:10,width:70,borderRadius:4 }}/></div>
      </div>
      {[90,75,80,80,80,80].map((w,i)=><div key={i} className="skeleton" style={{ height:13,width:w,borderRadius:4,marginLeft:"auto" }}/>)}
    </div>
  );
}

// ── Dashboard for an index ────────────────────────────────────────────────
function IndexDashboard({ idx, onClose, onTrack, isTracked }) {
  const [tab, setTab] = useState("news");
  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsFetched, setNewsFetched] = useState(false);

  const name = idx.name;
  const up   = (idx.changePct ?? 0) >= 0;

  // Reset when stock changes
  useEffect(()=>{
    setTab("news");
    setNews([]);
    setNewsFetched(false);
    setNewsLoading(false);
  },[idx.symbol]);

  // Auto-fetch news when dashboard opens
  useEffect(()=>{
    doFetchNews();
  },[idx.symbol]);

  async function doFetchNews() {
    setTab("news");
    if(newsFetched&&news.length)return;
    setNewsLoading(true);
    try {
      // Search for index news by name
      const q = encodeURIComponent(name.toLowerCase().replace("nifty","nifty").replace("sensex","sensex BSE"));
      const r = await fetch(`${BACKEND}/news/search?q=${q}&limit=20`);
      const d = await r.json();
      if(d.success&&d.data?.length){setNews(d.data);}
      setNewsLoading(false);
      setNewsFetched(true);
    } catch {setNewsLoading(false);setNewsFetched(true);}
  }

  function relTime(iso) {
    if(!iso)return"";
    const d=Math.floor((Date.now()-new Date(iso))/60000);
    if(d<60)return d+"m ago";
    if(d<1440)return Math.floor(d/60)+"h ago";
    return Math.floor(d/1440)+"d ago";
  }

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100%" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>

      {/* Header */}
      <div style={{ padding:"14px 20px",borderBottom:"1px solid var(--border)",display:"flex",alignItems:"center",gap:12,flexShrink:0,background:"var(--bg)" }}>
        <IndexIcon idx={idx}/>
        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ fontFamily:"var(--font-display)",fontWeight:800,fontSize:15,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{name}</div>
          <div style={{ display:"flex",alignItems:"center",gap:8,marginTop:2,flexWrap:"wrap" }}>
            {idx.price!=null&&<span style={{ fontFamily:"var(--font-display)",fontWeight:800,fontSize:14 }}>{fmt(idx.price)}</span>}
            {idx.changePct!=null&&<span style={{ fontSize:12,fontWeight:700,color:up?"var(--bull)":"var(--bear)" }}>{up?"▲":"▼"} {Math.abs(idx.changePct).toFixed(2)}%</span>}
            {idx.high&&idx.low&&<span style={{ fontSize:11,color:"var(--text3)" }}>H: {fmt(idx.high)} L: {fmt(idx.low)}</span>}
          </div>
        </div>
        <div style={{ display:"flex",gap:7,flexShrink:0 }}>
          <button onClick={doFetchNews}
            style={{ padding:"7px 14px",borderRadius:8,border:`1px solid ${tab==="news"?"var(--text)":"var(--border2)"}`,background:tab==="news"?"var(--text)":"transparent",color:tab==="news"?"var(--bg)":"var(--text2)",fontFamily:"var(--font-display)",fontWeight:700,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:5,transition:"all 0.15s" }}>
            {newsLoading?<span style={{ display:"inline-block",width:10,height:10,borderRadius:"50%",border:"2px solid var(--border2)",borderTopColor:"currentColor",animation:"spin 0.7s linear infinite" }}/>:"📰"} News
          </button>
          <button onClick={()=>onTrack(idx)}
            style={{ padding:"7px 14px",borderRadius:8,border:`1px solid ${isTracked?"var(--bull)":"var(--border2)"}`,background:isTracked?"rgba(0,212,170,0.08)":"transparent",color:isTracked?"var(--bull)":"var(--text2)",fontFamily:"var(--font-display)",fontWeight:700,fontSize:11,cursor:"pointer",transition:"all 0.15s" }}>
            {isTracked?"✓ Tracked":"+ Track"}
          </button>
          <button onClick={onClose}
            style={{ width:30,height:30,borderRadius:8,border:"1px solid var(--border2)",background:"transparent",color:"var(--text3)",cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center" }}
            onMouseEnter={e=>e.currentTarget.style.background="var(--bg3)"}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>×</button>
        </div>
      </div>

      {/* Stats summary */}
      <div style={{ padding:"12px 20px",borderBottom:"1px solid var(--border)",display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,flexShrink:0,background:"var(--bg)" }}>
        {[["Open",fmt(idx.open)],["High",fmt(idx.high)],["Low",fmt(idx.low)],["Prev Close",fmt(idx.prevClose)]].map(([label,val])=>(
          <div key={label} style={{ textAlign:"center",padding:"8px",background:"var(--bg3)",borderRadius:8 }}>
            <div style={{ fontSize:10,color:"var(--text3)",fontFamily:"var(--font-display)",fontWeight:600,marginBottom:3 }}>{label}</div>
            <div style={{ fontFamily:"var(--font-display)",fontWeight:700,fontSize:13 }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div style={{ display:"flex",borderBottom:"1px solid var(--border)",flexShrink:0 }}>
        <button onClick={doFetchNews}
          style={{ padding:"9px 18px",background:"none",border:"none",borderBottom:tab==="news"?"2px solid var(--text)":"2px solid transparent",color:tab==="news"?"var(--text)":"var(--text3)",fontFamily:"var(--font-display)",fontSize:11,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5 }}>
          📰 News
          {newsLoading&&<span style={{ width:8,height:8,borderRadius:"50%",border:"2px solid var(--border2)",borderTopColor:"var(--accent)",animation:"spin 0.7s linear infinite",display:"inline-block" }}/>}
          {news.length>0&&!newsLoading&&<span style={{ fontSize:9,background:"var(--bg3)",padding:"1px 5px",borderRadius:8 }}>{news.length}</span>}
        </button>
      </div>

      {/* Content */}
      <div style={{ flex:1,overflowY:"auto",padding:"16px 20px",background:"var(--bg2)" }}>
        {newsLoading&&<div style={{ display:"flex",flexDirection:"column",alignItems:"center",padding:"56px 0",gap:12 }}><div style={{ width:28,height:28,borderRadius:"50%",border:"3px solid var(--border2)",borderTopColor:"var(--accent)",animation:"spin 0.8s linear infinite" }}/><div style={{ fontSize:13,color:"var(--text3)",fontFamily:"var(--font-display)" }}>Fetching news for {name}...</div></div>}
        {!newsLoading&&news.length===0&&<div style={{ textAlign:"center",padding:"48px 0",color:"var(--text3)" }}><div style={{ fontSize:32,marginBottom:10 }}>📭</div><div style={{ fontFamily:"var(--font-display)",fontWeight:700,fontSize:14,marginBottom:6 }}>{newsFetched?"No news found":"Press the News button to fetch articles"}</div></div>}
        {news.length>0&&(
          <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
            <div style={{ fontSize:11,color:"var(--text3)",fontFamily:"var(--font-display)",marginBottom:4 }}>{news.length} articles for {name}</div>
            {news.map((a,i)=>(
              <div key={a.id||i} onClick={()=>a.source_url&&window.open(a.source_url,"_blank","noopener,noreferrer")}
                style={{ background:"var(--bg)",border:"1px solid var(--border)",borderRadius:12,padding:"14px 16px",cursor:a.source_url?"pointer":"default",animation:"fadeUp 0.3s ease forwards",animationDelay:`${i*0.04}s`,opacity:0,transition:"border-color 0.15s" }}
                onMouseEnter={e=>{if(a.source_url)e.currentTarget.style.borderColor="var(--border2)";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--border)";}}>
                <div style={{ display:"flex",gap:12,alignItems:"flex-start" }}>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:5,flexWrap:"wrap" }}>
                      {a.sentiment&&a.sentiment!=="neutral"&&<span style={{ fontSize:10,fontWeight:700,color:a.sentiment==="bullish"?"var(--bull)":"var(--bear)",fontFamily:"var(--font-display)" }}>{a.sentiment==="bullish"?"▲ BULLISH":"▼ BEARISH"}</span>}
                      {a.source&&<span style={{ fontSize:11,color:"var(--text3)" }}>{a.source}</span>}
                      <span style={{ fontSize:11,color:"var(--text3)" }}>· {relTime(a.published_at)}</span>
                    </div>
                    <p style={{ fontFamily:"var(--font-display)",fontWeight:700,fontSize:13.5,lineHeight:1.4,color:"var(--text)",margin:0 }}>{a.headline}</p>
                    {a.summary_20&&<p style={{ fontSize:12,color:"var(--text3)",margin:"5px 0 0",lineHeight:1.5 }}>{a.summary_20}</p>}
                  </div>
                  {a.image_url&&<img src={a.image_url} alt="" style={{ width:72,height:58,objectFit:"cover",borderRadius:8,flexShrink:0 }} onError={e=>e.target.style.display="none"}/>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Index Row ─────────────────────────────────────────────────────────────
function IndexRow({ idx, onOpen, onTrack, isTracked }) {
  const [hovered, setHovered] = useState(false);
  const up   = (idx.changePct ?? 0) >= 0;
  const catC = CATEGORY_COLORS[idx.category] || CATEGORY_COLORS.broad;
  const catLabel = {broad:"Broad",sector:"Sector",midcap:"Midcap",smallcap:"Smallcap",volatility:"Volatility",special:"Special"}[idx.category]||idx.category;

  return (
    <div onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
      style={{ display:"grid",gridTemplateColumns:COL,padding:"13px 20px",borderBottom:"1px solid var(--border)",alignItems:"center",background:hovered?"var(--bg2)":"transparent",transition:"background 0.12s",flexShrink:0 }}>

      <div style={{ display:"flex",alignItems:"center",gap:10 }}>
        <IndexIcon idx={idx}/>
        <div style={{ minWidth:0 }}>
          <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:2 }}>
            <span onClick={()=>onOpen(idx)} style={{ fontFamily:"var(--font-display)",fontWeight:700,fontSize:13,color:"var(--text)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:200,cursor:"pointer" }}>
              {idx.name}
            </span>
          </div>
          <div style={{ display:"flex",alignItems:"center",gap:6,marginTop:2 }}>
            <span style={{ fontSize:9,fontFamily:"var(--font-display)",fontWeight:700,padding:"1px 6px",borderRadius:4,color:catC.accent,background:catC.bg,border:`1px solid ${catC.border}40`,letterSpacing:"0.04em",textTransform:"uppercase" }}>{catLabel}</span>
            {hovered&&(
              <button onClick={e=>{e.stopPropagation();onTrack(idx);}}
                style={{ padding:"1px 6px",borderRadius:4,border:`1px solid ${isTracked?"var(--bull)":"var(--border2)"}`,background:isTracked?"rgba(0,212,170,0.08)":"var(--bg3)",color:isTracked?"var(--bull)":"var(--text3)",fontFamily:"var(--font-display)",fontWeight:700,fontSize:9,cursor:"pointer",letterSpacing:"0.04em",whiteSpace:"nowrap" }}>
                {isTracked?"✓ TRACKED":"+ TRACK"}
              </button>
            )}
          </div>
        </div>
      </div>
      <div style={{ textAlign:"right" }}><div style={{ fontFamily:"var(--font-display)",fontWeight:800,fontSize:14,color:"var(--text)" }}>{fmt(idx.price)}</div></div>
      <div style={{ textAlign:"right" }}>
        {idx.changePct!=null?(
          <>
            <div style={{ fontFamily:"var(--font-display)",fontWeight:700,fontSize:13,color:up?"var(--bull)":"var(--bear)" }}>{up?"▲":"▼"} {Math.abs(idx.changePct).toFixed(2)}%</div>
            <div style={{ fontSize:11,color:up?"var(--bull)":"var(--bear)",opacity:0.65,marginTop:1 }}>{up?"+":"−"}{Math.abs(idx.change??0).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
          </>
        ):<span style={{ color:"var(--text3)",fontSize:11 }}>—</span>}
      </div>
      <div style={{ textAlign:"right" }}><div style={{ fontFamily:"var(--font-display)",fontWeight:600,fontSize:13,color:"var(--bull)" }}>{idx.high?fmt(idx.high):"—"}</div></div>
      <div style={{ textAlign:"right" }}><div style={{ fontFamily:"var(--font-display)",fontWeight:600,fontSize:13,color:"var(--bear)" }}>{idx.low?fmt(idx.low):"—"}</div></div>
      <div style={{ textAlign:"right" }}><div style={{ fontFamily:"var(--font-display)",fontWeight:600,fontSize:13,color:"var(--text2)" }}>{idx.open?fmt(idx.open):"—"}</div></div>
      <div style={{ textAlign:"right" }}><div style={{ fontFamily:"var(--font-display)",fontWeight:600,fontSize:13,color:"var(--text2)" }}>{idx.prevClose?fmt(idx.prevClose):"—"}</div><div style={{ fontSize:10,color:"var(--text3)",marginTop:1 }}>prev close</div></div>
    </div>
  );
}

export default function IndicesScreenerPage() {
  const [allData,      setAllData]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(false);
  const [lastRefresh,  setLastRefresh]  = useState(null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [sortCol,      setSortCol]      = useState("name");
  const [sortDir,      setSortDir]      = useState("asc");
  const [search,       setSearch]       = useState("");
  const [searchQuery,  setSearchQuery]  = useState("");
  const [searchRes,    setSearchRes]    = useState([]);
  const [searchOpen,   setSearchOpen]   = useState(false);
  const [watchlist,    setWatchlist]    = useState(()=>{
    try{return JSON.parse(localStorage.getItem("indices_watchlist")||"[]");}catch{return[];}
  });
  const [activeDash,   setActiveDash]   = useState(null);
  const didFetch  = useRef(false);
  const searchRef = useRef();

  useEffect(()=>{
    if(didFetch.current)return;
    didFetch.current=true;
    loadData();
    const t=setInterval(loadData,2*60*1000);
    return()=>clearInterval(t);
  },[]);

  useEffect(()=>{localStorage.setItem("indices_watchlist",JSON.stringify(watchlist));},[watchlist]);

  useEffect(()=>{
    const h=e=>{if(!searchRef.current?.contains(e.target))setSearchOpen(false);};
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[]);

  async function loadData() {
    setLoading(true);setError(false);
    try {
      const res  = await fetch(`${BACKEND}/indices/all`);
      const json = await res.json();
      if(!json.success)throw new Error(json.error||"Failed");
      setAllData(json.data||[]);
      setLastRefresh(new Date());
    }catch{setError(true);}
    finally{setLoading(false);}
  }

  function handleSearch(q) {
    setSearchQuery(q);
    if(!q.trim()){setSearchRes([]);setSearchOpen(false);return;}
    const qUp=q.toUpperCase();
    const local=allData.filter(i=>(i.name||"").toUpperCase().includes(qUp)).slice(0,8);
    if(local.length){setSearchRes(local);setSearchOpen(true);}
  }

  const addToWatchlist = (idx) => setWatchlist(prev=>{if(prev.find(i=>i.symbol===idx.symbol))return prev;return[...prev,{symbol:idx.symbol,name:idx.name,category:idx.category}];});
  const removeFromWatchlist = (sym) => {setWatchlist(prev=>prev.filter(i=>i.symbol!==sym));if(activeDash?.symbol===sym)setActiveDash(null);};
  const isTracked = (sym) => watchlist.some(i=>i.symbol===sym);
  const openDashboard = (idx) => setActiveDash(idx);
  const handleTrack = (idx) => isTracked(idx.symbol)?removeFromWatchlist(idx.symbol):addToWatchlist(idx);

  const filtered=allData.filter(idx=>{
    const matchCat=activeFilter==="all"||idx.category===activeFilter;
    const matchSearch=!search||(idx.name||"").toLowerCase().includes(search.toLowerCase());
    return matchCat&&matchSearch;
  });

  const sorted=[...filtered].sort((a,b)=>{
    let va,vb;
    if(sortCol==="name"){va=a.name;vb=b.name;}
    if(sortCol==="price"){va=a.price??-1;vb=b.price??-1;}
    if(sortCol==="changePct"){va=a.changePct??-999;vb=b.changePct??-999;}
    if(sortCol==="high"){va=a.high??-1;vb=b.high??-1;}
    if(sortCol==="low"){va=a.low??-1;vb=b.low??-1;}
    if(sortCol==="open"){va=a.open??-1;vb=b.open??-1;}
    if(sortCol==="prevClose"){va=a.prevClose??-1;vb=b.prevClose??-1;}
    if(typeof va==="string")return sortDir==="asc"?va.localeCompare(vb):vb.localeCompare(va);
    return sortDir==="asc"?va-vb:vb-va;
  });

  function toggleSort(col){if(sortCol===col)setSortDir(d=>d==="asc"?"desc":"asc");else{setSortCol(col);setSortDir(col==="name"?"asc":"desc");}}
  const gainers=filtered.filter(i=>(i.changePct??0)>0).length;
  const losers =filtered.filter(i=>(i.changePct??0)<0).length;

  return (
    <div style={{ display:"flex",height:"100%",overflow:"hidden",background:"var(--bg)" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* ── LEFT SIDEBAR ──────────────────────────────────────────────── */}
      <div style={{ width:224,flexShrink:0,borderRight:"1px solid var(--border)",display:"flex",flexDirection:"column",background:"var(--bg)" }}>
        <div style={{ padding:"14px 14px 8px",borderBottom:"1px solid var(--border)",flexShrink:0 }}>
          <div style={{ fontFamily:"var(--font-display)",fontWeight:800,fontSize:11,color:"var(--text3)",letterSpacing:"0.1em" }}>INDICES WATCHLIST</div>
          <div style={{ fontSize:10,color:"var(--text3)",marginTop:1 }}>{watchlist.length} tracked</div>
        </div>

        {/* Search */}
        <div ref={searchRef} style={{ padding:"8px 10px 4px",position:"relative",flexShrink:0 }}>
          <div style={{ position:"relative" }}>
            <svg style={{ position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:"var(--text3)",pointerEvents:"none" }} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input placeholder="Search indices…" value={searchQuery} onChange={e=>handleSearch(e.target.value)} onFocus={()=>{if(searchRes.length)setSearchOpen(true);}}
              style={{ width:"100%",padding:"7px 28px 7px 26px",borderRadius:8,border:"1px solid var(--border)",fontFamily:"var(--font-display)",fontSize:11,background:"var(--bg2)",color:"var(--text)",outline:"none",boxSizing:"border-box" }}/>
            {searchQuery&&<button onClick={()=>{setSearchQuery("");setSearchRes([]);setSearchOpen(false);}} style={{ position:"absolute",right:7,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"var(--text3)",cursor:"pointer",fontSize:13,padding:0 }}>×</button>}
          </div>

          {searchOpen&&searchRes.length>0&&(
            <div style={{ position:"absolute",top:"calc(100% - 2px)",left:10,right:10,background:"var(--bg)",border:"1px solid var(--border2)",borderRadius:10,zIndex:400,boxShadow:"0 8px 28px rgba(0,0,0,0.14)",overflow:"hidden",maxHeight:300,overflowY:"auto" }}>
              {searchRes.map((idx,i)=>{
                const up=(idx.changePct??0)>=0;
                const tracked=isTracked(idx.symbol);
                return(
                  <div key={idx.symbol+i} style={{ display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderBottom:"1px solid var(--border)",transition:"background 0.1s" }}
                    onMouseEnter={el=>el.currentTarget.style.background="var(--bg2)"} onMouseLeave={el=>el.currentTarget.style.background="transparent"}>
                    <IndexIcon idx={idx}/>
                    <div style={{ flex:1,minWidth:0,cursor:"pointer" }} onClick={()=>{openDashboard(idx);setSearchOpen(false);setSearchQuery("");setSearchRes([]);}}>
                      <div style={{ fontFamily:"var(--font-display)",fontWeight:700,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{idx.name}</div>
                      <div style={{ fontSize:10,color:"var(--text3)",display:"flex",gap:5 }}>
                        {idx.price!=null&&<span>{fmt(idx.price)}</span>}
                        {idx.changePct!=null&&<span style={{ color:up?"var(--bull)":"var(--bear)",fontWeight:700 }}>{up?"▲":"▼"}{Math.abs(idx.changePct??0).toFixed(1)}%</span>}
                      </div>
                    </div>
                    <button onClick={el=>{el.stopPropagation();tracked?removeFromWatchlist(idx.symbol):addToWatchlist(idx);}}
                      style={{ width:24,height:24,borderRadius:6,flexShrink:0,background:tracked?"rgba(0,212,170,0.12)":"var(--accent)",border:tracked?"1px solid var(--bull)":"none",color:tracked?"var(--bull)":"#fff",fontWeight:800,fontSize:15,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.12s" }}>
                      {tracked?"✓":"+"}
                    </button>
                  </div>
                );
              })}
              <div style={{ padding:"6px 12px",fontSize:10,color:"var(--text3)",fontFamily:"var(--font-display)",textAlign:"center",borderTop:"1px solid var(--border)" }}>Click name to open · + to track</div>
            </div>
          )}
        </div>

        {/* Watchlist items */}
        <div style={{ flex:1,overflowY:"auto",padding:"2px 0" }}>
          {watchlist.length===0?(
            <div style={{ padding:"14px",color:"var(--text3)",fontSize:11,lineHeight:1.7,fontFamily:"var(--font-display)" }}>Search for indices above and press + to track them here.</div>
          ):watchlist.map(wi=>{
            const live=allData.find(i=>i.symbol===wi.symbol)||wi;
            const up=(live?.changePct??0)>=0;
            const isActive=activeDash?.symbol===wi.symbol;
            return(
              <div key={wi.symbol} onClick={()=>openDashboard(live||wi)}
                style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 12px",cursor:"pointer",background:isActive?"rgba(0,212,170,0.06)":"transparent",borderLeft:`2px solid ${isActive?"var(--bull)":"transparent"}`,transition:"all 0.12s" }}
                onMouseEnter={e=>{if(!isActive)e.currentTarget.style.background="var(--bg2)";}}
                onMouseLeave={e=>{if(!isActive)e.currentTarget.style.background="transparent";}}>
                <IndexIcon idx={wi}/>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontFamily:"var(--font-display)",fontWeight:700,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{wi.name}</div>
                  {live?.price!=null&&<div style={{ fontSize:10,color:"var(--text3)",marginTop:1 }}>{fmt(live.price)}</div>}
                </div>
                <div style={{ textAlign:"right",flexShrink:0 }}>
                  {live?.changePct!=null&&<div style={{ fontSize:10,fontWeight:700,color:up?"var(--bull)":"var(--bear)" }}>{up?"▲":"▼"}{Math.abs(live.changePct).toFixed(2)}%</div>}
                </div>
                <button onClick={e=>{e.stopPropagation();removeFromWatchlist(wi.symbol);}}
                  style={{ width:16,height:16,flexShrink:0,border:"none",background:"transparent",color:"var(--text3)",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",opacity:0.4,transition:"opacity 0.12s" }}
                  onMouseEnter={e=>{e.currentTarget.style.opacity="1";e.currentTarget.style.color="var(--bear)";}}
                  onMouseLeave={e=>{e.currentTarget.style.opacity="0.4";e.currentTarget.style.color="var(--text3)";}}>×</button>
              </div>
            );
          })}
        </div>

        <div style={{ padding:"8px 14px",borderTop:"1px solid var(--border)",flexShrink:0 }}>
          <div style={{ fontSize:10,color:"var(--text3)",fontFamily:"var(--font-display)",display:"flex",gap:8 }}>
            <span style={{ color:"var(--bull)" }}>▲ {gainers} up</span>
            <span style={{ color:"var(--bear)" }}>▼ {losers} down</span>
            <span style={{ marginLeft:"auto" }}>{allData.length} indices</span>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ──────────────────────────────────────────────── */}
      <div style={{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0 }}>
        {activeDash ? (
          <div style={{ height:"100%",overflowY:"auto",maxWidth:860 }}>
            <InlineCompanyView symbol={activeDash.symbol} company={activeDash.name} onBack={()=>setActiveDash(null)} stock={{ price: activeDash.price, change_pct: activeDash.changePct, change_amt: activeDash.change, day_high: activeDash.high, day_low: activeDash.low, day_open: activeDash.open, prevClose: activeDash.prevClose }}
              trackButton={<button onClick={()=>handleTrack(activeDash)} style={{ padding:"7px 16px",borderRadius:8,border:`1px solid ${isTracked(activeDash.symbol)?"var(--bull)":"var(--border2)"}`,background:isTracked(activeDash.symbol)?"rgba(0,212,170,0.08)":"transparent",color:isTracked(activeDash.symbol)?"var(--bull)":"var(--text2)",fontFamily:"var(--font-display)",fontWeight:700,fontSize:12,cursor:"pointer" }}>{isTracked(activeDash.symbol)?"✓ Tracked":"+ Track"}</button>}
            />
          </div>
        ):(
          <>
            <div style={{ flexShrink:0,padding:"18px 24px 0" }}>
              <div style={{ display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:12,marginBottom:12 }}>
                <div>
                  <h1 style={{ fontFamily:"var(--font-display)",fontWeight:800,fontSize:20,margin:0,color:"var(--text)",letterSpacing:"-0.02em" }}>Indices Screener</h1>
                  <div style={{ fontSize:11,color:"var(--text3)",marginTop:3 }}>
                    {loading?"Fetching live data…":`${allData.length} indices · Live`}
                    {lastRefresh&&!loading&&<span style={{ marginLeft:8,opacity:0.6 }}>· {lastRefresh.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}</span>}
                  </div>
                </div>
                <div style={{ display:"flex",alignItems:"center",gap:8,flexWrap:"wrap" }}>
                  {!loading&&filtered.length>0&&(
                    <div style={{ display:"flex",gap:6 }}>
                      <span style={{ fontSize:11,fontFamily:"var(--font-display)",fontWeight:700,color:"var(--bull)",background:"rgba(22,163,74,0.1)",padding:"3px 10px",borderRadius:20,border:"1px solid rgba(22,163,74,0.2)" }}>▲ {gainers} up</span>
                      <span style={{ fontSize:11,fontFamily:"var(--font-display)",fontWeight:700,color:"var(--bear)",background:"rgba(220,38,38,0.1)",padding:"3px 10px",borderRadius:20,border:"1px solid rgba(220,38,38,0.2)" }}>▼ {losers} down</span>
                    </div>
                  )}
                  <div style={{ position:"relative" }}>
                    <svg style={{ position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:"var(--text3)",pointerEvents:"none" }} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    <input placeholder="Search index…" value={search} onChange={e=>setSearch(e.target.value)}
                      style={{ paddingLeft:26,paddingRight:10,paddingTop:6,paddingBottom:6,borderRadius:8,border:"1px solid var(--border2)",fontFamily:"var(--font-display)",fontSize:12,background:"var(--bg2)",color:"var(--text)",outline:"none",width:150 }}/>
                  </div>
                  <button onClick={()=>{didFetch.current=false;loadData();}} disabled={loading}
                    style={{ display:"flex",alignItems:"center",gap:4,padding:"6px 12px",borderRadius:8,border:"1px solid var(--border2)",background:"transparent",cursor:loading?"not-allowed":"pointer",fontFamily:"var(--font-display)",fontWeight:700,fontSize:11,color:"var(--text3)" }}>
                    {loading?<div style={{ width:10,height:10,borderRadius:"50%",border:"2px solid var(--border2)",borderTopColor:"var(--accent)",animation:"spin 0.7s linear infinite" }}/>:"↻"} Refresh
                  </button>
                </div>
              </div>

              {/* Category pills */}
              <div style={{ display:"flex",gap:6,flexWrap:"wrap",paddingBottom:14 }}>
                {CATEGORY_FILTERS.map(f=>{
                  const isActive=activeFilter===f.id;
                  const fc=CATEGORY_COLORS[f.id]||CATEGORY_COLORS.all;
                  const count=f.id==="all"?allData.length:allData.filter(i=>i.category===f.id).length;
                  return(
                    <button key={f.id} onClick={()=>setActiveFilter(f.id)}
                      style={{ display:"flex",alignItems:"center",gap:5,padding:"7px 14px",borderRadius:40,border:`1.5px solid ${isActive?fc.border:"var(--border)"}`,background:isActive?fc.bg:"transparent",cursor:"pointer",fontFamily:"var(--font-display)",fontWeight:700,fontSize:11.5,color:isActive?fc.accent:"var(--text2)",transition:"all 0.15s" }}>
                      {f.label}<span style={{ fontSize:10,padding:"1px 6px",borderRadius:10,background:isActive?`${fc.accent}20`:"var(--bg3)",color:isActive?fc.accent:"var(--text3)",fontWeight:700 }}>{count}</span>
                    </button>
                  );
                })}
              </div>

              {/* Column headers */}
              <div style={{ display:"grid",gridTemplateColumns:COL,padding:"9px 20px",background:"var(--bg2)",borderRadius:"12px 12px 0 0",border:"1px solid var(--border)",borderBottom:"none" }}>
                {[{col:"name",label:"Index Name",align:"left"},{col:"price",label:"Last Trade Price",align:"right"},{col:"changePct",label:"1D Change",align:"right"},{col:"high",label:"Today's High",align:"right"},{col:"low",label:"Today's Low",align:"right"},{col:"open",label:"Today's Open",align:"right"},{col:"prevClose",label:"Today's Close",align:"right"}].map(({col,label,align})=>(
                  <div key={col} onClick={()=>toggleSort(col)}
                    style={{ display:"flex",alignItems:"center",justifyContent:align==="right"?"flex-end":"flex-start",gap:4,fontFamily:"var(--font-display)",fontWeight:700,fontSize:11,letterSpacing:"0.05em",color:sortCol===col?"var(--text)":"var(--text3)",cursor:"pointer",userSelect:"none" }}>
                    {label}<span style={{ fontSize:9,opacity:sortCol===col?1:0.35 }}>{sortCol===col?(sortDir==="asc"?"↑":"↓"):"↕"}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ flex:1,overflowY:"auto",overflowX:"hidden",margin:"0 24px",border:"1px solid var(--border)",borderTop:"none",borderRadius:"0 0 12px 12px",background:"var(--bg)" }}>
              {error&&<div style={{ textAlign:"center",padding:"48px 24px" }}><div style={{ fontSize:28,marginBottom:10 }}>⚠️</div><div style={{ fontWeight:700,fontSize:13,marginBottom:6 }}>Could not load indices data</div><button onClick={()=>{didFetch.current=false;loadData();}} style={{ padding:"7px 18px",borderRadius:8,background:"var(--accent)",color:"#fff",border:"none",fontFamily:"var(--font-display)",fontWeight:700,fontSize:12,cursor:"pointer" }}>Retry</button></div>}
              {loading&&[...Array(10)].map((_,i)=><SkeletonRow key={i}/>)}
              {!loading&&!error&&sorted.length===0&&<div style={{ textAlign:"center",padding:"60px 24px",fontFamily:"var(--font-display)",color:"var(--text3)" }}><div style={{ fontSize:28,marginBottom:10 }}>🔭</div><div style={{ fontWeight:700,fontSize:13 }}>{search?`No results for "${search}"`:"No indices found"}</div></div>}
              {!loading&&!error&&sorted.map(idx=><IndexRow key={idx.symbol} idx={idx} onOpen={openDashboard} onTrack={handleTrack} isTracked={isTracked(idx.symbol)}/>)}
            </div>

            {!loading&&!error&&sorted.length>0&&(
              <div style={{ flexShrink:0,padding:"8px 24px 10px",fontSize:11,color:"var(--text3)",fontFamily:"var(--font-display)" }}>
                Showing {sorted.length} of {allData.length} indices · "Today's Close" shows previous close · Auto-refreshes every 2 min
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}