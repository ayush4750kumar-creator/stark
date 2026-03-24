// src/components/InlineCompanyView.jsx
import { useState, useEffect, useRef } from "react";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import StockChart from "./StockChart";

const BACKEND = process.env.REACT_APP_API_URL;
const TABS    = ["PERFORMANCE", "STATS GRAPHS", "ALL NEWS"];

const DOMAIN_MAP = {
  TCS:"tcs.com", INFY:"infosys.com", WIPRO:"wipro.com",
  HCLTECH:"hcltech.com", TECHM:"techmahindra.com", LTIM:"ltimindtree.com",
  PERSISTENT:"persistent.com", COFORGE:"coforge.com", MPHASIS:"mphasis.com",
  HAPPSTMNDS:"happiestminds.com", RELIANCE:"ril.com", HDFCBANK:"hdfcbank.com",
  ICICIBANK:"icicibank.com", SBIN:"sbi.co.in", KOTAKBANK:"kotak.com",
  AXISBANK:"axisbank.com", BAJFINANCE:"bajajfinserv.in", BAJAJFINSV:"bajajfinserv.in",
  ONGC:"ongcindia.com", IOC:"iocl.com", BPCL:"bharatpetroleum.com",
  HINDPETRO:"hindustanpetroleum.com", TATASTEEL:"tatasteel.com",
  TATAMOTORS:"tatamotors.com", TATACONSUM:"tataconsumer.com",
  ADANIENT:"adani.com", ADANIPORTS:"adaniports.com",
  SUNPHARMA:"sunpharma.com", DRREDDY:"drreddys.com", CIPLA:"cipla.com",
  MARUTI:"marutisuzuki.com", TITAN:"titancompany.in",
  HINDUNILVR:"hul.co.in", ITC:"itcportal.com", NESTLEIND:"nestle.in",
  ASIANPAINT:"asianpaints.com", LT:"larsentoubro.com",
  INDUSINDBK:"indusind.com",
  AAPL:"apple.com", MSFT:"microsoft.com", NVDA:"nvidia.com",
  GOOGL:"google.com", META:"meta.com", AMZN:"amazon.com",
  TSLA:"tesla.com", AMD:"amd.com", NFLX:"netflix.com",
  INTC:"intel.com", QCOM:"qualcomm.com", AVGO:"broadcom.com",
  JPM:"jpmorganchase.com", BAC:"bankofamerica.com", GS:"goldmansachs.com",
  IBM:"ibm.com", ORCL:"oracle.com", CRM:"salesforce.com",
};

function CompanyLogo({ symbol, size = 44 }) {
  const [failed, setFailed] = useState(false);
  const clean  = (symbol||"").replace(/\.NS$/i,"").replace(/\.BO$/i,"").toUpperCase();
  const domain = DOMAIN_MAP[clean] || `${clean.toLowerCase()}.com`;
  const url    = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
  const radius = Math.round(size * 0.27);
  const inner  = Math.round(size * 0.73);
  if (!failed) return (
    <div style={{ width:size, height:size, borderRadius:radius, flexShrink:0, border:"1px solid var(--border2)", background:"#fff", display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden" }}>
      <img src={url} alt={symbol} width={inner} height={inner} style={{ objectFit:"contain" }} onError={()=>setFailed(true)} />
    </div>
  );
  return (
    <div style={{ width:size, height:size, borderRadius:radius, flexShrink:0, background:"var(--bg3)", border:"1px solid var(--border2)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-display)", fontWeight:800, fontSize:Math.round(size*0.27), color:"var(--text2)" }}>
      {clean.slice(0,3)}
    </div>
  );
}

function fmt(n, d = 2) {
  if (n == null || isNaN(n)) return "—";
  return Number(n).toLocaleString("en-IN", { maximumFractionDigits: d });
}
function fmtCap(n) {
  if (!n) return "—";
  if (n >= 1e12) return "₹" + (n/1e12).toFixed(2) + "T";
  if (n >= 1e9)  return "₹" + (n/1e9).toFixed(2)  + "B";
  if (n >= 1e7)  return "₹" + (n/1e7).toFixed(2)  + "Cr";
  return "₹" + n.toLocaleString();
}
function timeAgo(ts) {
  if (!ts) return "";
  const d = Math.floor((Date.now() - new Date(ts)) / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  return d + "d ago";
}
function fmtFinVal(v, currency) {
  if (v == null) return "—";
  const isCr = currency === "INR_CR";
  if (isCr) {
    const abs = Math.abs(v);
    if (abs >= 100000) return (v<0?"-":"") + "₹" + (abs/100000).toFixed(2) + "L Cr";
    if (abs >= 1000)   return (v<0?"-":"") + "₹" + (abs/1000).toFixed(1)   + "K Cr";
    return "₹" + v.toFixed(0) + " Cr";
  }
  const abs = Math.abs(v);
  if (abs >= 1e12) return (v<0?"-":"") + "₹" + (abs/1e12).toFixed(2) + "T";
  if (abs >= 1e9)  return (v<0?"-":"") + "₹" + (abs/1e9).toFixed(2)  + "B";
  if (abs >= 1e6)  return (v<0?"-":"") + "₹" + (abs/1e6).toFixed(1)  + "M";
  return "₹" + v.toFixed(0);
}
const MONTH_ORDER = {Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};
function sortQuarterly(data) {
  return [...(data||[])].sort((a,b) => {
    const [am,ay] = (a.period||"").split(" ");
    const [bm,by] = (b.period||"").split(" ");
    const ay2=parseInt(ay||0), by2=parseInt(by||0);
    if (ay2!==by2) return ay2-by2;
    return (MONTH_ORDER[am]||0)-(MONTH_ORDER[bm]||0);
  });
}
function fmtPeriod(p) { return (p||"").replace(/\s(\d{4})$/,(_,y)=>"'"+y.slice(2)); }

function StatRow({ label, value, color }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid var(--border)" }}>
      <span style={{ color:"var(--text3)", fontSize:13 }}>{label}</span>
      <span style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:13, color:color||"var(--text)" }}>{value}</span>
    </div>
  );
}

function interpolateToQuarters(annualData, dataKey) {
  const result = [];
  for (const row of (annualData||[])) {
    const val = row[dataKey];
    if (val==null) continue;
    const qVal = Math.round((val/4)*100)/100;
    for (const q of ["Q1","Q2","Q3","Q4"])
      result.push({ label:`${row.period} ${q}`, value:qVal, interpolated:true });
  }
  return result;
}

function FinChart({ annualData, quarterlyData, dataKey, label, color, currency, granularity }) {
  const sortedQ = sortQuarterly(quarterlyData);
  const hasRealQ = sortedQ.some(r => r[dataKey]!=null);
  let raw = [];
  if (granularity==="1y") {
    raw = (annualData||[]).map(r=>({ label:r.period, value:r[dataKey] }));
  } else if (granularity==="3m") {
    raw = hasRealQ ? sortedQ.map(r=>({ label:fmtPeriod(r.period), value:r[dataKey] }))
                   : interpolateToQuarters(annualData, dataKey);
  } else {
    raw = hasRealQ
      ? sortedQ.filter((_,i)=>i%2===0).map(r=>({ label:fmtPeriod(r.period), value:r[dataKey] }))
      : (annualData||[]).flatMap(r=>{ const v=r[dataKey]; if(v==null)return []; const h=Math.round((v/2)*100)/100; return [{label:`${r.period} H1`,value:h,interpolated:true},{label:`${r.period} H2`,value:h,interpolated:true}]; });
  }
  if (!raw.some(r=>r.value!=null)) return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:80,color:"var(--text3)",fontSize:11,fontStyle:"italic" }}>Data not available from source</div>
  );
  const barSize = Math.max(8, Math.min(28, Math.floor(320/Math.max(raw.length,1))-6));
  return (
    <div>
      {raw.some(d=>d.interpolated&&d.value!=null) && <div style={{ fontSize:10,color:"var(--text3)",marginBottom:4,fontStyle:"italic" }}>Quarterly unavailable — showing annual divided equally</div>}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={raw} margin={{ top:8,right:8,left:4,bottom:20 }} barSize={barSize}>
          <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" vertical={false} opacity={0.5} />
          <XAxis dataKey="label" tick={{ fill:"var(--text3)",fontSize:9,fontFamily:"var(--font-display)" }} axisLine={false} tickLine={false} angle={raw.length>6?-35:0} textAnchor={raw.length>6?"end":"middle"} interval={0} />
          <YAxis tick={{ fill:"var(--text3)",fontSize:9 }} axisLine={false} tickLine={false} tickFormatter={v=>fmtFinVal(v,currency)} width={60} />
          <Tooltip cursor={{ fill:"rgba(255,255,255,0.04)" }} contentStyle={{ background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:10,fontSize:12,padding:"10px 14px" }} formatter={(v,_,p)=>[fmtFinVal(v,currency)+(p?.payload?.interpolated?" (est.)":""),label]} labelStyle={{ color:"var(--text2)",fontWeight:700,marginBottom:4 }} />
          <Bar dataKey="value" radius={[3,3,0,0]} opacity={0.9}>
            {raw.map((d,i)=><Cell key={i} fill={d.value<0?"#ff4d6d":color} opacity={d.interpolated?0.5:(i===raw.length-1?1:0.8)} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function GranularityButtons({ value, onChange }) {
  return (
    <div style={{ display:"flex",gap:4 }}>
      {[{id:"3m",label:"3M"},{id:"6m",label:"6M"},{id:"1y",label:"1Y"}].map(o=>(
        <button key={o.id} onClick={()=>onChange(o.id)} style={{ padding:"2px 9px",borderRadius:6,border:"1px solid",fontSize:10,fontFamily:"var(--font-display)",fontWeight:700,cursor:"pointer",background:value===o.id?"#e0e0e0":"transparent",borderColor:value===o.id?"#999":"var(--border2)",color:value===o.id?"#111":"var(--text3)",transition:"all 0.12s" }}>{o.label}</button>
      ))}
    </div>
  );
}

function ChartCard({ annualData, quarterlyData, dataKey, label, color, currency }) {
  const [gran, setGran] = useState("1y");
  const latest = [...(annualData||[])].reverse().find(r=>r[dataKey]!=null);
  return (
    <div className="card" style={{ padding:"16px 20px" }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
        <div>
          <div style={{ fontFamily:"var(--font-display)",fontWeight:800,fontSize:13 }}>{label}</div>
          {latest?.[dataKey]!=null && <div style={{ fontSize:11,color:"var(--text3)",marginTop:2 }}>Latest: <span style={{ color:"var(--text2)",fontWeight:600 }}>{fmtFinVal(latest[dataKey],currency)}</span></div>}
        </div>
        <GranularityButtons value={gran} onChange={setGran} />
      </div>
      <FinChart annualData={annualData} quarterlyData={quarterlyData} dataKey={dataKey} label={label} color={color} currency={currency} granularity={gran} />
    </div>
  );
}

// ── Performance Tab ────────────────────────────────────────────
const _fundCache = {};
function PerformanceTab({ sym, stock: initialStock }) {
  const [fund,     setFund]     = useState(_fundCache[sym]?.data || initialStock || {});
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!sym) return;
    if (_fundCache[sym]) { setFund(_fundCache[sym].data); return; }
    setFund(initialStock||{});
    setFetching(true);
    const ctrl = new AbortController();
    fetch(`${BACKEND}/stocks/${sym}/fundamentals`, { signal:ctrl.signal })
      .then(r=>r.json())
      .then(d=>{ if(d.success&&d.data){ const m={...(initialStock||{}),...d.data}; _fundCache[sym]={data:m}; setFund(m); } })
      .catch(()=>{})
      .finally(()=>setFetching(false));
    return ()=>ctrl.abort();
  }, [sym]);

  const data = { ...(initialStock||{}), ...fund };
  const r2   = n => n!=null ? Math.round(n*100)/100 : null;

  const price  = data.price;
  // Support both field naming: DB uses change_pct, screeners use changePct
  const chgPct = data.change_pct ?? data.changePct ?? 0;
  const isUp   = chgPct >= 0;
  const rsi    = Math.min(Math.max(Math.round(50+chgPct*4),15),85);
  const macd   = chgPct>1.5?"bullish":chgPct<-1.5?"bearish":"neutral";

  // Support both naming: DB uses day_high/day_low, screeners use high/low
  const dayHigh  = data.day_high  ?? data.high       ?? null;
  const dayLow   = data.day_low   ?? data.low        ?? null;
  const dayOpen  = data.day_open  ?? data.open       ?? null;
  const w52High  = data.week52_high ?? data.week52High ?? null;
  const w52Low   = data.week52_low  ?? data.week52Low  ?? null;

  const _low       = dayLow  || w52Low;
  const _high      = dayHigh || w52High;
  const support    = _low  ? (_low *0.99).toFixed(2) : null;
  const resistance = _high ? (_high*1.01).toFixed(2) : null;

  // Support both naming: DB uses market_cap/pe_ratio, screeners use marketCap/pe
  const pe_ratio   = data.pe_ratio   ?? data.pe        ?? null;
  const market_cap = data.market_cap ?? data.marketCap ?? null;
  const eps        = data.eps!=null ? data.eps : (pe_ratio&&price ? r2(price/pe_ratio) : null);
  const book_value = data.book_value ?? null;
  const pb_ratio   = data.pb_ratio   ?? (book_value&&price ? r2(price/book_value) : null);
  const roe        = data.roe!=null  ? data.roe : (eps&&book_value ? r2((eps/book_value)*100) : null);
  const debt_equity = data.debt_equity ?? null;
  const div_yield   = data.div_yield   ?? null;
  const ind_pe      = data.ind_pe      ?? null;
  const face_value  = data.face_value  ?? null;

  if (!price) return (
    <div className="card" style={{ padding:48,textAlign:"center",color:"var(--text3)" }}>
      <div style={{ fontSize:36,marginBottom:12 }}>📊</div>
      <div style={{ fontFamily:"var(--font-display)",fontWeight:700,fontSize:15 }}>Stock data unavailable</div>
      <div style={{ fontSize:12,marginTop:8,lineHeight:1.6 }}>{sym} price data will appear once prices refresh.</div>
    </div>
  );

  return (
    <div>
      <div className="card" style={{ padding:"14px 20px",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div>
          <div style={{ fontSize:11,color:"var(--text3)",marginBottom:2 }}>{sym} · Current Price</div>
          <div style={{ fontFamily:"var(--font-display)",fontWeight:800,fontSize:24 }}>{"₹"}{price?.toLocaleString("en-IN",{minimumFractionDigits:2})}</div>
        </div>
        <div style={{ textAlign:"right" }}>
          <div style={{ fontFamily:"var(--font-display)",fontWeight:800,fontSize:18,color:isUp?"var(--bull)":"var(--bear)" }}>{isUp?"▲":"▼"} {Math.abs(chgPct).toFixed(2)}%</div>
          <div style={{ fontSize:12,fontWeight:600,color:isUp?"var(--bull)":"var(--bear)" }}>{isUp?"Bullish":"Bearish"} today</div>
        </div>
      </div>

      <div className="card" style={{ padding:"16px 20px",marginBottom:14 }}>
        <div style={{ fontFamily:"var(--font-display)",fontWeight:700,fontSize:11,color:"var(--text3)",letterSpacing:0.8,marginBottom:12,textTransform:"uppercase" }}>Key Metrics</div>
        {fetching && <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:10,color:"var(--text3)",fontSize:11,opacity:0.7 }}><div style={{ width:10,height:10,flexShrink:0,borderRadius:"50%",border:"2px solid var(--border2)",borderTopColor:"var(--accent)",animation:"spin 0.8s linear infinite" }} />Updating fundamentals...</div>}
        {/* Detect ETF: no PE/EPS/book_value — show ETF-relevant metrics */}
        {(!pe_ratio && !eps && !book_value && !roe) ? (
          <div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",columnGap:32 }}>
              <StatRow label="Market Cap / AUM" value={fmtCap(market_cap)} />
              <StatRow label="52W High"          value={w52High?"₹"+fmt(w52High):"—"} />
              <StatRow label="Volume"            value={data.volume!=null?data.volume>=1e7?(data.volume/1e7).toFixed(2)+" Cr":data.volume>=1e5?(data.volume/1e5).toFixed(2)+" L":data.volume.toLocaleString("en-IN"):"—"} />
              <StatRow label="52W Low"           value={w52Low?"₹"+fmt(w52Low):"—"} />
            </div>
            <div style={{ marginTop:12,padding:"10px 14px",borderRadius:8,background:"var(--bg3)",fontSize:12,color:"var(--text3)",lineHeight:1.6 }}>
              ℹ️ This is an <strong style={{color:"var(--text2)"}}>ETF / Index Fund</strong> — traditional stock metrics like P/E, EPS, and ROE don't apply. ETFs track an index or basket of assets.
            </div>
          </div>
        ) : (
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",columnGap:32 }}>
            <StatRow label="Market Cap"    value={fmtCap(market_cap)} />
            <StatRow label="Equity Return" value={roe?fmt(roe)+"%":"—"} />
            <StatRow label="P/E Ratio"     value={pe_ratio?fmt(pe_ratio):(eps!=null&&eps<0?"N/A (Loss)":"—")} />
            <StatRow label="EPS"           value={eps!=null?<span style={{color:eps<0?"var(--bear)":"inherit"}}>{"₹"+fmt(eps)}</span>:"—"} />
            <StatRow label="P/B Ratio"     value={pb_ratio?fmt(pb_ratio):"—"} />
            <StatRow label="Div. Yield"    value={div_yield?fmt(div_yield)+"%":"—"} />
            <StatRow label="Industry P/E"  value={ind_pe?fmt(ind_pe):"—"} />
            <StatRow label="Book Value"    value={book_value?"₹"+fmt(book_value):"—"} />
            <StatRow label="Debt/Equity"   value={debt_equity?fmt(debt_equity):"—"} />
            <StatRow label="Face Value"    value={face_value?"₹"+fmt(face_value):"—"} />
          </div>
        )}
      </div>

      <div className="card" style={{ padding:"16px 20px",marginBottom:14 }}>
        <div style={{ fontFamily:"var(--font-display)",fontWeight:700,fontSize:11,color:"var(--text3)",letterSpacing:0.8,marginBottom:14,textTransform:"uppercase" }}>Price Ranges</div>
        {[
          { label:"Today's Open vs Close", a:dayOpen, b:price,   aL:"Open",    bL:"Close"    },
          { label:"Today's Low vs High",   a:dayLow,  b:dayHigh, aL:"Low",     bL:"High"     },
          { label:"52-Week Low vs High",   a:w52Low,  b:w52High, aL:"52W Low", bL:"52W High" },
        ].map(({ label,a,b,aL,bL })=>{
          const diff=b-a; const up=diff>=0; const pct=a?((Math.abs(diff)/a)*100).toFixed(2):null;
          return (
            <div key={label} style={{ marginBottom:14 }}>
              <div style={{ fontSize:12,color:"var(--text3)",marginBottom:8,fontWeight:600 }}>{label}</div>
              <div style={{ display:"grid",gridTemplateColumns:"1fr auto 1fr",alignItems:"center",gap:10 }}>
                <div className="card" style={{ padding:"10px 14px",textAlign:"center",background:"var(--bg3)" }}>
                  <div style={{ fontSize:10,color:"var(--text3)",marginBottom:3 }}>{aL}</div>
                  <div style={{ fontFamily:"var(--font-display)",fontWeight:700,fontSize:14 }}>{fmt(a)}</div>
                </div>
                <div style={{ textAlign:"center",fontSize:12,fontWeight:700,color:up?"var(--bull)":"var(--bear)" }}>{up?"▲":"▼"}<br/>{pct?Math.abs(pct)+"%":"—"}</div>
                <div className="card" style={{ padding:"10px 14px",textAlign:"center",background:"var(--bg3)" }}>
                  <div style={{ fontSize:10,color:"var(--text3)",marginBottom:3 }}>{bL}</div>
                  <div style={{ fontFamily:"var(--font-display)",fontWeight:700,fontSize:14 }}>{fmt(b)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card" style={{ padding:"16px 20px" }}>
        <div style={{ fontFamily:"var(--font-display)",fontWeight:700,fontSize:11,color:"var(--text3)",letterSpacing:0.8,marginBottom:14,textTransform:"uppercase" }}>Technical Indicators</div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20 }}>
          <div style={{ background:"rgba(0,212,170,0.06)",border:"1px solid rgba(0,212,170,0.2)",borderRadius:10,padding:"12px 14px",textAlign:"center" }}>
            <div style={{ fontSize:11,color:"var(--text3)",marginBottom:4 }}>Support</div>
            <div style={{ fontFamily:"var(--font-display)",fontWeight:800,fontSize:16,color:"var(--bull)" }}>₹{support||"—"}</div>
            <div style={{ fontSize:10,color:"var(--text3)",marginTop:3 }}>Key buying zone</div>
          </div>
          <div style={{ background:"rgba(255,77,109,0.06)",border:"1px solid rgba(255,77,109,0.2)",borderRadius:10,padding:"12px 14px",textAlign:"center" }}>
            <div style={{ fontSize:11,color:"var(--text3)",marginBottom:4 }}>Resistance</div>
            <div style={{ fontFamily:"var(--font-display)",fontWeight:800,fontSize:16,color:"var(--bear)" }}>₹{resistance||"—"}</div>
            <div style={{ fontSize:10,color:"var(--text3)",marginTop:3 }}>Key selling zone</div>
          </div>
        </div>
        <div style={{ marginBottom:20 }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
            <div><span style={{ fontSize:13,fontWeight:600 }}>RSI (14)</span><span style={{ fontSize:11,color:"var(--text3)",marginLeft:8 }}>Relative Strength Index</span></div>
            <span style={{ fontFamily:"var(--font-display)",fontWeight:800,fontSize:18,color:rsi>70?"var(--bear)":rsi<30?"var(--bull)":"var(--text)" }}>{rsi}</span>
          </div>
          <div style={{ height:8,background:"var(--bg3)",borderRadius:4,position:"relative",marginBottom:6 }}>
            <div style={{ position:"absolute",inset:0,background:"linear-gradient(to right,var(--bull),#888,var(--bear))",borderRadius:4 }} />
            <div style={{ position:"absolute",top:"50%",left:`${rsi}%`,transform:"translate(-50%,-50%)",width:14,height:14,borderRadius:"50%",background:"white",border:"2px solid var(--bg)",boxShadow:"0 0 0 3px var(--accent)" }} />
          </div>
          <div style={{ display:"flex",justifyContent:"space-between",fontSize:10,color:"var(--text3)",marginBottom:8 }}>
            <span>0 — Oversold</span><span>30</span><span>70</span><span>100 — Overbought</span>
          </div>
          <div style={{ fontSize:12,padding:"8px 12px",borderRadius:8,background:rsi>70?"rgba(255,77,109,0.08)":rsi<30?"rgba(0,212,170,0.08)":"var(--bg3)",color:rsi>70?"var(--bear)":rsi<30?"var(--bull)":"var(--text2)" }}>
            {rsi>70?"Overbought — may pull back soon":rsi<30?"Oversold — may rebound soon":"✓ Neutral zone (30–70) — no extreme signal"}
          </div>
        </div>
        <div style={{ paddingTop:14,borderTop:"1px solid var(--border)" }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
            <div><span style={{ fontSize:13,fontWeight:600 }}>MACD</span><span style={{ fontSize:11,color:"var(--text3)",marginLeft:8 }}>Moving Avg. Convergence Divergence</span></div>
            <span style={{ fontFamily:"var(--font-display)",fontWeight:800,fontSize:12,textTransform:"uppercase",color:macd==="bullish"?"var(--bull)":macd==="bearish"?"var(--bear)":"var(--text3)",padding:"5px 12px",borderRadius:8,background:macd==="bullish"?"rgba(0,212,170,0.1)":macd==="bearish"?"rgba(255,77,109,0.1)":"var(--bg3)",border:`1px solid ${macd==="bullish"?"var(--bull)":macd==="bearish"?"var(--bear)":"var(--border2)"}` }}>{macd}</span>
          </div>
          <div style={{ fontSize:12,padding:"8px 12px",borderRadius:8,background:"var(--bg3)",color:"var(--text2)" }}>
            {macd==="bullish"?"MACD above signal — bullish momentum":macd==="bearish"?"MACD below signal — bearish momentum":"MACD near signal — market indecision"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Stats Graphs Tab ───────────────────────────────────────────
const _finCache = {};
function StatsGraphsTab({ sym }) {
  const [fin,      setFin]      = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [activeTab,setActiveTab]= useState("income");
  const pollRef = useRef(null);

  useEffect(() => {
    if (!sym) return;
    delete _finCache[sym];
    setLoading(true); setError(false); setFin(null); setRetrying(false);
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current=null; }
    const load = () => fetch(`${BACKEND}/stocks/${sym}/financials`).then(r=>r.json()).then(d=>{
      if (d.success&&d.data) {
        if (d.data.pending) {
          setLoading(false); setRetrying(true);
          pollRef.current = setInterval(()=>{ fetch(`${BACKEND}/stocks/${sym}/financials`).then(r=>r.json()).then(d2=>{ if(d2.success&&d2.data&&!d2.data.pending){ clearInterval(pollRef.current); pollRef.current=null; _finCache[sym]=d2.data; setFin(d2.data); setRetrying(false); } }).catch(()=>{}); },8000);
        } else { _finCache[sym]=d.data; setFin(d.data); setLoading(false); }
      } else { setError(true); setLoading(false); }
    }).catch(()=>{ setError(true); setLoading(false); });
    load();
    return ()=>{ if(pollRef.current){ clearInterval(pollRef.current); pollRef.current=null; } };
  }, [sym]);

  function handleRetry() {
    delete _finCache[sym]; setLoading(true); setError(false); setFin(null); setRetrying(false);
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current=null; }
    fetch(`${BACKEND}/stocks/${sym}/financials?force=1`).then(r=>r.json()).then(d=>{
      if (d.success&&d.data){ if(d.data.pending){ setLoading(false); setRetrying(true); pollRef.current=setInterval(()=>{ fetch(`${BACKEND}/stocks/${sym}/financials`).then(r=>r.json()).then(d2=>{ if(d2.success&&d2.data&&!d2.data.pending){ clearInterval(pollRef.current); pollRef.current=null; _finCache[sym]=d2.data; setFin(d2.data); setRetrying(false); } }).catch(()=>{}); },8000); } else{ _finCache[sym]=d.data; setFin(d.data); setLoading(false); } } else{ setError(true); setLoading(false); }
    }).catch(()=>{ setError(true); setLoading(false); });
  }

  if (loading) return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",padding:60,gap:12 }}>
      <div style={{ width:32,height:32,borderRadius:"50%",border:"3px solid var(--border2)",borderTopColor:"var(--accent)",animation:"spin 0.8s linear infinite" }} />
      <div style={{ fontSize:12,color:"var(--text3)" }}>Loading financial data...</div>
    </div>
  );
  if (retrying) return (
    <div className="card" style={{ padding:48,textAlign:"center",color:"var(--text3)" }}>
      <div style={{ fontSize:36,marginBottom:12,animation:"pulse 1.5s infinite" }}>📊</div>
      <div style={{ fontFamily:"var(--font-display)",fontWeight:700,fontSize:15,marginBottom:8,color:"var(--accent)" }}>Fetching financial data...</div>
      <div style={{ fontSize:12,color:"var(--text3)",marginBottom:16,lineHeight:1.7 }}>First load takes 15–30 seconds.<br/>Cached for 90 days after first fetch.</div>
      <div style={{ display:"flex",justifyContent:"center",gap:6 }}>{[0,1,2].map(i=><div key={i} style={{ width:8,height:8,borderRadius:"50%",background:"var(--accent)",animation:`pulse 1s ${i*0.2}s infinite` }} />)}</div>
    </div>
  );
  if (error||!fin) return (
    <div className="card" style={{ padding:48,textAlign:"center",color:"var(--text3)" }}>
      <div style={{ fontSize:32,marginBottom:10 }}>📉</div>
      <div style={{ fontFamily:"var(--font-display)",fontWeight:700,fontSize:14,marginBottom:8 }}>Financial statements unavailable</div>
      <div style={{ fontSize:12,color:"var(--text3)",marginBottom:16,lineHeight:1.8,maxWidth:340,margin:"0 auto 16px" }}>
        ETFs &amp; index funds don't publish income statements or balance sheets — those belong to the underlying companies they track.<br/><br/>
        For individual stocks, use <strong style={{color:"var(--text2)"}}>Retry</strong> to fetch from Screener.in.
      </div>
      <button onClick={handleRetry} style={{ padding:"8px 20px",borderRadius:8,background:"var(--accent)",color:"#000",border:"none",fontWeight:700,fontSize:12,cursor:"pointer" }}>Retry</button>
    </div>
  );

  const { annual, quarterly, currency, source } = fin;
  const currLabel = currency==="INR_CR"?"₹ Cr":"₹";
  const tabs = [
    { id:"income",   label:"Income"    },
    { id:"balance",  label:"Balance"   },
    { id:"cashflow", label:"Cash Flow" },
    ...(quarterly?.length?[{id:"earnings",label:"Earnings"}]:[]),
  ];

  return (
    <div>
      <div style={{ display:"flex",gap:8,marginBottom:16,flexWrap:"wrap",alignItems:"center" }}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{ padding:"6px 14px",borderRadius:8,border:"1px solid",fontFamily:"var(--font-display)",fontWeight:700,fontSize:11,cursor:"pointer",transition:"all 0.15s",background:activeTab===t.id?"#e8e8e8":"transparent",borderColor:activeTab===t.id?"#aaaaaa":"var(--border2)",color:activeTab===t.id?"#111111":"var(--text3)" }}>{t.label}</button>
        ))}
        <div style={{ marginLeft:"auto",fontSize:10,color:"var(--text3)" }}>
          {source==="cache"?"Cached":source==="screener"?"Screener.in":source==="macrotrends"?"Macrotrends":source==="yahoo"?"Yahoo":"Live"} · {currLabel}
        </div>
      </div>
      {activeTab==="income" && (
        <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
          {[{key:"revenue",label:"Revenue",color:"#00d4aa"},{key:"gross_profit",label:"Gross Profit",color:"#60a5fa"},{key:"net_income",label:"Net Income",color:"#4ade80"},{key:"ebit",label:"Operating Profit (EBIT)",color:"#f59e0b"},{key:"eps",label:"EPS per Share",color:"#a78bfa"}].map(g=>(
            <ChartCard key={g.key} annualData={annual} quarterlyData={quarterly} dataKey={g.key} label={g.label} color={g.color} currency={currency} />
          ))}
        </div>
      )}
      {activeTab==="balance" && (
        <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
          {[{key:"total_assets",label:"Total Assets",color:"#00d4aa"},{key:"equity",label:"Shareholders Equity",color:"#4ade80"},{key:"total_debt",label:"Total Debt",color:"#ff4d6d"}].map(g=>(
            <ChartCard key={g.key} annualData={annual} quarterlyData={quarterly} dataKey={g.key} label={g.label} color={g.color} currency={currency} />
          ))}
        </div>
      )}
      {activeTab==="cashflow" && (
        <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
          {[{key:"op_cashflow",label:"Operating Cash Flow",color:"#00d4aa"},{key:"free_cashflow",label:"Free Cash Flow",color:"#4ade80"},{key:"capex",label:"Capital Expenditure",color:"#f59e0b"}].map(g=>(
            <ChartCard key={g.key} annualData={annual} quarterlyData={quarterly} dataKey={g.key} label={g.label} color={g.color} currency={currency} />
          ))}
        </div>
      )}
      {activeTab==="earnings" && quarterly?.length>0 && (
        <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
          <div className="card" style={{ padding:"16px 20px" }}>
            <div style={{ fontFamily:"var(--font-display)",fontWeight:700,fontSize:12,marginBottom:12 }}>Quarterly EPS</div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={quarterly.slice().reverse()} margin={{ top:4,right:4,left:-10,bottom:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="period" tick={{ fill:"var(--text3)",fontSize:9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:"var(--text3)",fontSize:9 }} axisLine={false} tickLine={false} width={40} />
                <Tooltip contentStyle={{ background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:8,fontSize:11 }} />
                <Bar dataKey="eps" radius={[4,4,0,0]} opacity={0.85}>
                  {quarterly.slice().reverse().map((d,i)=><Cell key={i} fill={(d.eps??0)>=0?"#4ade80":"#ff4d6d"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {quarterly.some(q=>q.eps_surprise!=null) && (
            <div className="card" style={{ padding:"16px 20px" }}>
              <div style={{ fontFamily:"var(--font-display)",fontWeight:700,fontSize:12,marginBottom:12 }}>Earnings Surprises</div>
              <table style={{ width:"100%",borderCollapse:"collapse",fontSize:11 }}>
                <thead><tr style={{ color:"var(--text3)",borderBottom:"1px solid var(--border)" }}>{["Quarter","Reported","Estimate","Surprise"].map(h=><th key={h} style={{ padding:"6px 8px",textAlign:"right",fontWeight:600 }}>{h}</th>)}</tr></thead>
                <tbody>{quarterly.slice(0,6).map((q,i)=><tr key={i} style={{ borderBottom:"1px solid var(--border)",color:"var(--text2)" }}><td style={{ padding:"6px 8px" }}>{q.period}</td><td style={{ padding:"6px 8px",textAlign:"right" }}>{q.eps??"—"}</td><td style={{ padding:"6px 8px",textAlign:"right" }}>{q.eps_estimate??"—"}</td><td style={{ padding:"6px 8px",textAlign:"right",color:(q.eps_surprise??0)>=0?"var(--bull)":"var(--bear)",fontWeight:700 }}>{q.eps_surprise!=null?`${q.eps_surprise>=0?"+":""}${q.eps_surprise}`:"—"}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── All News Tab ───────────────────────────────────────────────
function AllNewsTab({ sym }) {
  const [news,    setNews]    = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!sym) return;
    fetch(`${BACKEND}/stocks/${sym}/news?limit=30`)
      .then(r=>r.json())
      .then(d=>{ if(d.success) setNews(d.data||[]); })
      .catch(()=>{})
      .finally(()=>setLoading(false));
  }, [sym]);
  if (loading) return (
    <div style={{ display:"flex",justifyContent:"center",padding:"32px 0" }}>
      <div style={{ width:28,height:28,borderRadius:"50%",border:"3px solid var(--border2)",borderTopColor:"var(--accent)",animation:"spin 0.8s linear infinite" }} />
    </div>
  );
  if (!news.length) return <div style={{ textAlign:"center",padding:"48px 0",color:"var(--text3)" }}>No articles found for {sym}</div>;
  return (
    <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
      {news.map((n,i)=>{
        const sent = n.sentiment;
        const sentColor = sent==="bullish"?"var(--bull)":sent==="bearish"?"var(--bear)":"var(--text3)";
        return (
          <div key={n.id||i} className="card" style={{ padding:"14px 16px",cursor:"pointer" }}
            onClick={()=>{ if(n.source_url) window.open(n.source_url,"_blank","noopener,noreferrer"); }}>
            <div style={{ display:"flex",gap:12,alignItems:"flex-start" }}>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex",gap:8,alignItems:"center",marginBottom:6,flexWrap:"wrap" }}>
                  {sent&&sent!=="neutral"&&<span style={{ fontSize:10,fontWeight:700,color:sentColor,fontFamily:"var(--font-display)" }}>{sent==="bullish"?"▲ BULLISH":"▼ BEARISH"}</span>}
                  <span style={{ fontSize:11,color:"var(--text3)" }}>{n.source}</span>
                  <span style={{ fontSize:11,color:"var(--text3)" }}>· {timeAgo(n.published_at)}</span>
                </div>
                <p style={{ fontFamily:"var(--font-display)",fontWeight:700,fontSize:13,lineHeight:1.4,color:"var(--text)",margin:"0 0 4px" }}>{n.headline}</p>
                {n.summary_20&&<p style={{ fontSize:12,color:"var(--text3)",margin:0,lineHeight:1.5 }}>{n.summary_20}</p>}
              </div>
              {n.image_url&&<img src={n.image_url} alt="" style={{ width:72,height:60,objectFit:"cover",borderRadius:8,flexShrink:0 }} onError={e=>e.target.style.display="none"} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────
export default function InlineCompanyView({ symbol, company, stock: initialStock, onBack, trackButton }) {
  const [tab,       setTab]       = useState("PERFORMANCE");
  const [stock,     setStock]     = useState(initialStock || null);
  const [showNews,  setShowNews]  = useState(false);
  const [news,      setNews]      = useState([]);
  const [newsLoad,  setNewsLoad]  = useState(false);
  const [newsFetched, setNewsFetched] = useState(false);
  const topRef = useRef(null);

  useEffect(() => {
    if (!symbol) return;
    setTab("PERFORMANCE");
    setShowNews(false);
    setNews([]);
    setNewsFetched(false);
    setNewsLoad(false);
    topRef.current?.scrollIntoView({ behavior:"smooth", block:"start" });
    if (!initialStock?.price) {
      fetch(`${BACKEND}/stocks/${symbol}`)
        .then(r=>r.json())
        .then(d=>{ if(d.success&&d.data) setStock(d.data); })
        .catch(()=>{});
    }
  }, [symbol]);

  function handleNewsToggle() {
    if (!showNews) {
      setShowNews(true);
      if (!newsFetched || !news.length) {
        setNewsLoad(true);
        fetch(`${BACKEND}/news/fetch-stock`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({symbol, company}) }).catch(()=>{});
        let attempts = 0;
        const poll = async () => {
          try {
            const r = await fetch(`${BACKEND}/stocks/${encodeURIComponent(symbol)}/news?limit=30`);
            const d = await r.json();
            if (d.success && d.data?.length) { setNews(d.data); setNewsLoad(false); setNewsFetched(true); return; }
          } catch {}
          attempts++;
          if (attempts < 20) setTimeout(poll, 2000);
          else { setNewsLoad(false); setNewsFetched(true); }
        };
        poll();
      }
    } else {
      setShowNews(false);
    }
  }

  function relTime(iso) { if(!iso)return""; const d=Math.floor((Date.now()-new Date(iso))/60000); if(d<60)return d+"m ago"; if(d<1440)return Math.floor(d/60)+"h ago"; return Math.floor(d/1440)+"d ago"; }

  const isUp = (stock?.change_pct ?? stock?.changePct ?? 0) >= 0;

  return (
    <div ref={topRef} style={{ padding:"20px 28px" }}>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}} @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}"}</style>

      {/* Back button — always shown */}
      <button onClick={onBack} style={{ display:"flex",alignItems:"center",gap:6,padding:"8px 14px",background:"var(--bg2)",border:"1px solid var(--border2)",borderRadius:8,color:"var(--text3)",cursor:"pointer",fontFamily:"var(--font-display)",fontSize:12,fontWeight:600,marginBottom:20 }}>
        ← Back
      </button>

      {/* Title row */}
      <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:trackButton?8:16 }}>
        <CompanyLogo symbol={symbol} size={44} />
        <div style={{ flex:1,minWidth:0 }}>
          <h1 style={{ fontFamily:"var(--font-display)",fontWeight:800,fontSize:20,lineHeight:1.2,margin:0 }}>{company||symbol}</h1>
          <div style={{ fontSize:13,color:"var(--text3)",display:"flex",gap:8,alignItems:"center",marginTop:2 }}>
            <span style={{ background:"var(--bg3)",border:"1px solid var(--border2)",borderRadius:6,padding:"2px 8px",fontFamily:"var(--font-display)",fontWeight:800,fontSize:11 }}>{symbol}</span>
            {stock?.price!=null&&<span style={{ fontWeight:700,color:isUp?"var(--bull)":"var(--bear)" }}>{isUp?"▲":"▼"} {Math.abs(stock.change_pct??stock.changePct??0).toFixed(2)}%</span>}
          </div>
        </div>
      </div>

      {/* Track button — only in screener mode */}
      {trackButton && (
        <div style={{ marginBottom:16 }}>{trackButton}</div>
      )}

      {/* NEWS toggle button above chart */}
      <div style={{ display:"flex",justifyContent:"flex-end",marginBottom:8 }}>
        <button onClick={handleNewsToggle}
          style={{ display:"flex",alignItems:"center",gap:6,padding:"7px 16px",borderRadius:8,border:`1px solid ${showNews?"var(--text)":"var(--border2)"}`,background:showNews?"var(--text)":"transparent",color:showNews?"var(--bg)":"var(--text2)",fontFamily:"var(--font-display)",fontWeight:700,fontSize:12,cursor:"pointer",transition:"all 0.15s" }}>
          {newsLoad && <span style={{ width:10,height:10,borderRadius:"50%",border:"2px solid currentColor",borderTopColor:"transparent",animation:"spin 0.7s linear infinite",display:"inline-block" }}/>}
          {showNews ? "📊 Dashboard" : "📰 News"}
        </button>
      </div>

      {/* NEWS FEED */}
      {showNews ? (
        <div>
          {newsLoad && (
            <div style={{ display:"flex",flexDirection:"column",alignItems:"center",padding:"48px 0",gap:12 }}>
              <div style={{ width:28,height:28,borderRadius:"50%",border:"3px solid var(--border2)",borderTopColor:"var(--accent)",animation:"spin 0.8s linear infinite" }}/>
              <div style={{ fontSize:13,color:"var(--text3)",fontFamily:"var(--font-display)" }}>Fetching news for {company||symbol}...</div>
              <div style={{ fontSize:11,color:"var(--text3)",opacity:0.7 }}>Takes up to 30s on first load · cached after</div>
            </div>
          )}
          {!newsLoad && news.length === 0 && (
            <div style={{ textAlign:"center",padding:"48px 0",color:"var(--text3)" }}>
              <div style={{ fontSize:32,marginBottom:10 }}>📭</div>
              <div style={{ fontFamily:"var(--font-display)",fontWeight:700,fontSize:14 }}>{newsFetched?"No news found":"Fetching articles..."}</div>
            </div>
          )}
          {news.length > 0 && (
            <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
              <div style={{ fontSize:11,color:"var(--text3)",fontFamily:"var(--font-display)",marginBottom:4 }}>{news.length} articles for {company||symbol}</div>
              {news.map((a,i) => (
                <div key={a.id||i}
                  onClick={()=>a.source_url&&window.open(a.source_url,"_blank","noopener,noreferrer")}
                  style={{ background:"var(--bg2)",border:"1px solid var(--border)",borderRadius:12,padding:"14px 16px",cursor:a.source_url?"pointer":"default",animation:"fadeUp 0.3s ease forwards",animationDelay:`${i*0.04}s`,opacity:0,transition:"border-color 0.15s" }}
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
      ) : (
        <div>
          <div style={{ marginBottom:16 }}><StockChart symbol={symbol} /></div>

          <div style={{ display:"flex",borderBottom:"1px solid var(--border)",marginBottom:20,overflowX:"auto",alignItems:"center" }}>
            {TABS.map(t=>(
              <button key={t} onClick={()=>setTab(t)} style={{ padding:"10px 14px",background:"none",border:"none",whiteSpace:"nowrap",borderBottom:tab===t?"2px solid #888888":"2px solid transparent",color:tab===t?"#111111":"var(--text3)",fontFamily:"var(--font-display)",fontSize:11,fontWeight:700,cursor:"pointer" }}>{t}</button>
            ))}
          </div>

          {tab==="PERFORMANCE"  && <PerformanceTab sym={symbol} stock={stock||initialStock} />}
          {tab==="STATS GRAPHS" && <StatsGraphsTab sym={symbol} />}
          {tab==="ALL NEWS"     && <AllNewsTab sym={symbol} />}
        </div>
      )}
    </div>
  );
}