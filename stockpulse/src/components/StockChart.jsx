// src/components/StockChart.jsx
import { useState, useEffect, useRef } from "react";

const BACKEND = "http://localhost:5000/api";
const PERIODS = ["1D", "1W", "1M", "1Y", "3Y"];
const TO_API  = { "1D":"1d", "1W":"1w", "1M":"1m", "1Y":"1y", "3Y":"3y" };

// ── Candlestick chart rendered on Canvas ──────────────────────────
function CandleCanvas({ data, width, height, color }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.length) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = width  * dpr;
    canvas.height = height * dpr;
    canvas.style.width  = width  + "px";
    canvas.style.height = height + "px";
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const pad   = { top:12, right:12, bottom:36, left:64 };
    const cw    = width  - pad.left - pad.right;
    const ch    = height - pad.top  - pad.bottom;

    const allVals = data.flatMap(d => [d.high, d.low].filter(v => v != null));
    const minVal  = Math.min(...allVals);
    const maxVal  = Math.max(...allVals);
    const range   = maxVal - minVal || 1;

    const toY = v => pad.top + ch - ((v - minVal) / range) * ch;
    const n   = data.length;
    const candleW = Math.max(2, Math.min(14, (cw / n) * 0.7));
    const gap     = cw / n;

    const textColor = "rgba(80,60,40,0.7)";
    const gridColor = "rgba(80,60,40,0.08)";
    const axisColor = "rgba(80,60,40,0.25)";

    const yTicks = 5;
    ctx.font = "bold 10px system-ui";
    for (let i = 0; i <= yTicks; i++) {
      const val = minVal + (range / yTicks) * (yTicks - i);
      const y   = pad.top + (ch / yTicks) * i;
      ctx.strokeStyle = gridColor; ctx.lineWidth = 1; ctx.setLineDash([3,4]);
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + cw, y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = axisColor; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.left-4, y); ctx.lineTo(pad.left, y); ctx.stroke();
      const label = val >= 1000 ? val.toLocaleString("en-IN",{maximumFractionDigits:0}) : val.toFixed(2);
      ctx.fillStyle = textColor; ctx.textAlign = "right"; ctx.textBaseline = "middle";
      ctx.fillText(label, pad.left - 7, y);
    }
    ctx.strokeStyle = axisColor; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(pad.left, pad.top); ctx.lineTo(pad.left, pad.top+ch); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad.left, pad.top+ch); ctx.lineTo(pad.left+cw, pad.top+ch); ctx.stroke();

    const labelCount = Math.min(6, n);
    const xStep = Math.max(1, Math.floor((n-1)/(labelCount-1)));
    const xIndices = new Set();
    for (let i=0; i<n; i+=xStep) xIndices.add(i);
    xIndices.add(n-1);
    ctx.font = "bold 10px system-ui"; ctx.fillStyle = textColor; ctx.textAlign = "center"; ctx.textBaseline = "top";
    xIndices.forEach(i => {
      const x = pad.left + i * gap + gap/2;
      ctx.strokeStyle = axisColor; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, pad.top+ch); ctx.lineTo(x, pad.top+ch+4); ctx.stroke();
      ctx.fillStyle = textColor;
      ctx.fillText(data[i].label||"", x, pad.top+ch+7);
    });

    data.forEach((d, i) => {
      const x     = pad.left + i * gap + gap / 2;
      const open  = d.open  ?? d.close;
      const close = d.close ?? d.open;
      const high  = d.high  ?? Math.max(open, close);
      const low   = d.low   ?? Math.min(open, close);
      const up    = close >= open;
      const clr   = up ? "#00d4aa" : "#ff4d6d";

      ctx.strokeStyle = clr; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, toY(high)); ctx.lineTo(x, toY(low)); ctx.stroke();

      const bodyTop    = toY(Math.max(open, close));
      const bodyBottom = toY(Math.min(open, close));
      const bodyH      = Math.max(1, bodyBottom - bodyTop);
      ctx.fillStyle = clr;
      ctx.globalAlpha = up ? 0.9 : 0.85;
      ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH);
      ctx.globalAlpha = 1;
    });
  }, [data, width, height]);

  return <canvas ref={canvasRef} style={{ display:"block" }} />;
}

// ── Area chart rendered on Canvas ────────────────────────────────
function AreaCanvas({ data, width, height, color }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data.length) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = width  * dpr;
    canvas.height = height * dpr;
    canvas.style.width  = width  + "px";
    canvas.style.height = height + "px";
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const pad   = { top:12, right:12, bottom:36, left:64 };
    const cw    = width  - pad.left - pad.right;
    const ch    = height - pad.top  - pad.bottom;

    const vals   = data.map(d => d.close).filter(v => v != null);
    const minVal = Math.min(...vals) * 0.998;
    const maxVal = Math.max(...vals) * 1.002;
    const range  = maxVal - minVal || 1;

    const toX = i => pad.left + (i / Math.max(data.length - 1, 1)) * cw;
    const toY = v => pad.top + ch - ((v - minVal) / range) * ch;

    const textColor = "rgba(80,60,40,0.7)";
    const gridColor = "rgba(80,60,40,0.08)";
    const axisColor = "rgba(80,60,40,0.25)";

    const yTicks = 5;
    ctx.font = "bold 10px system-ui";
    for (let i = 0; i <= yTicks; i++) {
      const val = minVal + (range / yTicks) * (yTicks - i);
      const y   = pad.top + (ch / yTicks) * i;
      ctx.strokeStyle = gridColor; ctx.lineWidth = 1; ctx.setLineDash([3,4]);
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left+cw, y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = axisColor; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.left-4, y); ctx.lineTo(pad.left, y); ctx.stroke();
      const label = val >= 1000 ? val.toLocaleString("en-IN",{maximumFractionDigits:0}) : val.toFixed(2);
      ctx.fillStyle = textColor; ctx.textAlign = "right"; ctx.textBaseline = "middle";
      ctx.fillText(label, pad.left-7, y);
    }
    ctx.strokeStyle = axisColor; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(pad.left, pad.top); ctx.lineTo(pad.left, pad.top+ch); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pad.left, pad.top+ch); ctx.lineTo(pad.left+cw, pad.top+ch); ctx.stroke();

    const labelledPts = data.map((d,i) => ({i, lbl:d.label})).filter(x => x.lbl);
    const showEvery = Math.max(1, Math.floor(labelledPts.length / 6));
    const toShow = labelledPts.filter((_,idx) => idx % showEvery === 0 || idx === labelledPts.length-1);
    ctx.font = "bold 10px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "top";
    toShow.forEach(({ i, lbl }) => {
      const x = toX(i);
      ctx.strokeStyle = axisColor; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, pad.top+ch); ctx.lineTo(x, pad.top+ch+4); ctx.stroke();
      ctx.fillStyle = textColor;
      ctx.fillText(lbl, x, pad.top+ch+7);
    });

    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + ch);
    grad.addColorStop(0, color + "55");
    grad.addColorStop(1, color + "00");

    ctx.beginPath();
    ctx.moveTo(toX(0), toY(data[0].close));
    data.forEach((d, i) => {
      if (i === 0) return;
      const prev = data[i - 1];
      const cpx  = (toX(i - 1) + toX(i)) / 2;
      ctx.bezierCurveTo(cpx, toY(prev.close), cpx, toY(d.close), toX(i), toY(d.close));
    });
    ctx.lineTo(toX(data.length - 1), pad.top + ch);
    ctx.lineTo(toX(0), pad.top + ch);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    data.forEach((d, i) => {
      if (i === 0) { ctx.moveTo(toX(0), toY(d.close)); return; }
      const prev = data[i - 1];
      const cpx  = (toX(i - 1) + toX(i)) / 2;
      ctx.bezierCurveTo(cpx, toY(prev.close), cpx, toY(d.close), toX(i), toY(d.close));
    });
    ctx.stroke();
  }, [data, width, height, color]);

  return <canvas ref={canvasRef} style={{ display:"block" }} />;
}

// ── Tooltip overlay ──────────────────────────────────────────────
function ChartTooltip({ data, width, height, type }) {
  const [hover, setHover] = useState(null);
  const pad = { top:12, right:12, bottom:36, left:64 };
  const cw  = width - pad.left - pad.right;

  const handleMove = e => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x    = e.clientX - rect.left - pad.left;
    const idx  = Math.round((x / cw) * (data.length - 1));
    if (idx >= 0 && idx < data.length) setHover({ idx, d: data[idx] });
  };

  return (
    <div style={{ position:"relative", width, height }}
      onMouseMove={handleMove} onMouseLeave={() => setHover(null)}>
      {hover && (
        <div style={{
          position:"absolute",
          left: Math.min(hover.idx / data.length * cw + pad.left + 10, width - 175),
          top: 10,
          background:"var(--bg)", border:"1px solid var(--border2)",
          borderRadius:8, padding:"10px 14px", pointerEvents:"none", zIndex:10,
          minWidth:160,
        }}>
          <div style={{ fontSize:10, color:"var(--text3)", marginBottom:6 }}>{hover.d.label}</div>
          {type === "candle" ? (
            <div style={{ display:"grid", gridTemplateColumns:"auto auto", gap:"2px 14px" }}>
              {[["O", hover.d.open], ["H", hover.d.high], ["L", hover.d.low], ["C", hover.d.close]].map(([k,v]) => (
                <><span key={k+"k"} style={{ fontSize:11, color:"var(--text3)" }}>{k}</span>
                  <span key={k+"v"} style={{ fontSize:11, fontFamily:"var(--font-display)", fontWeight:700 }}>
                    {v?.toLocaleString("en-IN", { maximumFractionDigits:2 }) ?? "—"}
                  </span></>
              ))}
            </div>
          ) : (
            <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:16 }}>
              {hover.d.close?.toLocaleString("en-IN", { minimumFractionDigits:2 })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Responsive wrapper ───────────────────────────────────────────
function ResponsiveChart({ data, type, color }) {
  const containerRef = useRef(null);
  const [width, setWidth] = useState(600);
  const height = 300;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(entries => {
      setWidth(entries[0].contentRect.width);
    });
    obs.observe(el);
    setWidth(el.offsetWidth);
    return () => obs.disconnect();
  }, []);

  return (
    <div ref={containerRef} style={{ width:"100%", position:"relative" }}>
      <div style={{ position:"relative" }}>
        {type === "candle"
          ? <CandleCanvas data={data} width={width} height={height} color={color} />
          : <AreaCanvas   data={data} width={width} height={height} color={color} />
        }
        <div style={{ position:"absolute", inset:0 }}>
          <ChartTooltip data={data} width={width} height={height} type={type} />
        </div>
      </div>
    </div>
  );
}

// ── Main StockChart component ────────────────────────────────────
export default function StockChart({ symbol }) {
  const [period,    setPeriod]  = useState("1D");
  const [type,      setType]    = useState("area");
  const [chartData, setChart]   = useState({ candle:[], area:[] });
  const [stockInfo, setInfo]    = useState(null);
  const [loading,   setLoading] = useState(false);
  const [chartErr,  setErr]     = useState(null);

  const [displayed, setDisplayed] = useState({
    chgAmt: null,
    chgPct: null,
    isUp:   true,
    period: "1D",
  });

  const reqRef = useRef(0);

  useEffect(() => {
    if (!symbol || symbol === "MARKET") return;
    fetch(`${BACKEND}/stocks/${symbol}`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          setInfo(d.data);
          setDisplayed(prev => {
            if (prev.chgAmt !== null) return prev;
            return {
              chgAmt: d.data.change_amt ?? null,
              chgPct: d.data.change_pct ?? 0,
              isUp:   (d.data.change_pct ?? 0) >= 0,
              period: "1D",
            };
          });
        }
      })
      .catch(() => {});
  }, [symbol]);

  useEffect(() => {
    if (!symbol || symbol === "MARKET") return;

    const thisReq = ++reqRef.current;

    setLoading(true);
    setErr(null);

    fetch(`${BACKEND}/stocks/${symbol}/chart?period=${TO_API[period] || "1d"}`)
      .then(r => r.json())
      .then(d => {
        if (thisReq !== reqRef.current) return;

        if (!d.success || !d.data?.length) { setErr("No chart data available"); return; }
        const raw = d.data;

        const fmtDate = iso => {
          const dt = new Date(iso);
          if (period === "1D") return dt.toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" });
          if (period === "1W") return dt.toLocaleDateString("en-IN", { weekday:"short", day:"numeric" });
          if (period === "1Y" || period === "3Y") return dt.toLocaleDateString("en-IN", { month:"short", year:"2-digit" });
          return dt.toLocaleDateString("en-IN", { day:"numeric", month:"short" });
        };

        const maxC  = period === "3Y" ? 120 : period === "1Y" ? 150 : 200;
        const cStep = Math.max(1, Math.ceil(raw.length / maxC));
        const candleData = raw
          .filter((_,i) => i % cStep === 0 || i === raw.length-1)
          .map(c => ({ ...c, label: fmtDate(c.date) }));

        const maxA  = 150;
        const aStep = Math.max(1, Math.ceil(raw.length / maxA));
        const sampled = raw.filter((_,i) => i % aStep === 0 || i === raw.length-1);
        let seed = 42;
        const rand = () => { seed=(seed*1664525+1013904223)&0xffffffff; return (seed>>>0)/0xffffffff; };
        const subs = period === "1D" ? 4 : period === "1W" ? 6 : 8;
        const areaData = [];
        sampled.forEach(c => {
          const open=c.open??c.close, close=c.close??c.open;
          const high=c.high??Math.max(open,close), low=c.low??Math.min(open,close);
          const vol=(high-low)*0.35;
          for (let j=0;j<subs;j++) {
            const base=open+(close-open)*(j/subs);
            const price=Math.min(high,Math.max(low,base+(rand()-0.5)*vol));
            areaData.push({close:price,open,high,low,volume:c.volume,label:j===0?fmtDate(c.date):"",date:c.date});
          }
          areaData.push({close,open,high,low,volume:c.volume,label:"",date:c.date});
        });

        setChart({ candle: candleData, area: areaData });

        const firstCandle = candleData.find(c => (c.open ?? c.close) != null);
        const lastCandle  = [...candleData].reverse().find(c => c.close != null);
        const start = firstCandle?.open ?? firstCandle?.close;
        const end   = lastCandle?.close;

        if (start && end) {
          const chgAmt = end - start;
          const chgPct = (chgAmt / start) * 100;
          setDisplayed({
            chgAmt: Math.round(chgAmt * 100) / 100,
            chgPct: Math.round(chgPct * 100) / 100,
            isUp:   chgPct >= 0,
            period,
          });
        }
      })
      .catch(() => {
        if (thisReq === reqRef.current) setErr("Network error");
      })
      .finally(() => {
        if (thisReq === reqRef.current) setLoading(false);
      });
  }, [symbol, period]);

  if (!symbol || symbol === "MARKET") return (
    <div className="card" style={{ padding:30, textAlign:"center", color:"var(--text3)", fontSize:13 }}>
      📰 General market news — no specific stock chart
    </div>
  );

  const price = stockInfo?.price;
  const color = displayed.isUp ? "#00d4aa" : "#ff4d6d";

  const periodLabel = {
    "1D": "today",
    "1W": "past week",
    "1M": "past month",
    "1Y": "past year",
    "3Y": "past 3 years",
  }[displayed.period] || displayed.period;

  return (
    <div className="card" style={{ padding:0, overflow:"hidden" }}>
      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes dotpulse { 0%,100%{opacity:0.2} 50%{opacity:1} }
      `}</style>

      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12, padding:"18px 18px 0" }}>
        <div>
          <div style={{ fontSize:11, color:"var(--text3)", marginBottom:3, fontWeight:600 }}>
            {stockInfo?.name || symbol} &nbsp;·&nbsp;
            <span style={{ fontFamily:"var(--font-display)" }}>{symbol}</span>
          </div>

          <div style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:26, letterSpacing:-0.5 }}>
            {price != null ? "₹" + price.toLocaleString("en-IN", { minimumFractionDigits:2 }) : "—"}
          </div>

          <div style={{
            marginTop: 4,
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            opacity: loading ? 0.45 : 1,
            transition: "opacity 0.2s ease",
          }}>
            {displayed.chgAmt != null && (
              <span style={{ color, fontFamily:"var(--font-display)", fontWeight:700, fontSize:15 }}>
                {displayed.isUp ? "▲ +" : "▼ "}{displayed.chgAmt.toFixed(2)}
              </span>
            )}
            {displayed.chgPct != null && (
              <span style={{
                color, fontFamily:"var(--font-display)", fontWeight:800, fontSize:15,
                background: displayed.isUp ? "rgba(0,212,170,0.10)" : "rgba(255,77,109,0.10)",
                padding:"2px 8px", borderRadius:6,
              }}>
                {displayed.isUp ? "+" : ""}{displayed.chgPct.toFixed(2)}%
              </span>
            )}
            <span style={{ color:"var(--text3)", fontSize:11, fontFamily:"var(--font-display)" }}>
              {periodLabel}
            </span>
            {loading && (
              <span style={{ display:"inline-flex", gap:3, alignItems:"center" }}>
                {[0,1,2].map(i => (
                  <span key={i} style={{
                    width:3, height:3, borderRadius:"50%", background:color,
                    display:"inline-block",
                    animation:`dotpulse 0.8s ${i*0.13}s ease-in-out infinite`,
                  }}/>
                ))}
              </span>
            )}
          </div>
        </div>

        {/* Chart type toggle */}
        <div style={{ display:"flex", gap:6 }}>
          {[["area","📈 Line"],["candle","🕯 Candle"]].map(([t, label]) => (
            <button key={t} onClick={() => setType(t)} style={{
              padding:"6px 12px", borderRadius:7, border:"1px solid",
              borderColor: type === t ? color : "var(--border2)",
              background:  type === t ? (displayed.isUp ? "rgba(0,212,170,0.12)" : "rgba(255,77,109,0.12)") : "transparent",
              color:       type === t ? color : "var(--text3)",
              fontFamily:"var(--font-display)", fontWeight:700, fontSize:11, cursor:"pointer",
              transition:"all 0.15s",
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* Period selector */}
      <div style={{ display:"flex", gap:4, padding:"8px 18px 10px" }}>
        {PERIODS.map(p => (
          <button key={p} onClick={() => setPeriod(p)} style={{
            padding:"4px 12px", borderRadius:6, border:"none",
            background: period === p ? color : "transparent",
            color:       period === p ? (displayed.isUp ? "#000" : "#fff") : "var(--text3)",
            fontFamily:"var(--font-display)", fontSize:12, fontWeight:700,
            cursor:"pointer", transition:"all 0.2s ease",
          }}>{p}</button>
        ))}
      </div>

      {/* Chart */}
      <div style={{
        opacity: loading ? 0.3 : 1,
        transition: "opacity 0.2s ease",
        minHeight: 300,
        position: "relative",
      }}>
        {loading && chartData.candle.length === 0 && chartData.area.length === 0 && (
          <div style={{
            position:"absolute", inset:0,
            display:"flex", alignItems:"center", justifyContent:"center", gap:10,
          }}>
            <div style={{ width:22, height:22, borderRadius:"50%", border:`3px solid var(--border2)`, borderTopColor:color, animation:"spin 0.8s linear infinite" }} />
            <span style={{ color:"var(--text3)", fontSize:13 }}>Loading {period} chart...</span>
          </div>
        )}

        {chartErr && !loading && (
          <div style={{
            position:"absolute", inset:0,
            display:"flex", alignItems:"center", justifyContent:"center",
            flexDirection:"column", gap:8, color:"var(--text3)",
          }}>
            <div style={{ fontSize:28 }}>📉</div>
            <div style={{ fontFamily:"var(--font-display)", fontWeight:600 }}>{chartErr}</div>
            <div style={{ fontSize:11 }}>Market may be closed · Try a different period</div>
          </div>
        )}

        {(chartData.candle?.length > 0 || chartData.area?.length > 0) && (
          <ResponsiveChart
            data={type === 'candle' ? chartData.candle : chartData.area}
            type={type}
            color={color}
          />
        )}
      </div>

      {/* Volume bar */}
      {!loading && chartData.candle?.length > 0 && chartData.candle.some(d => d.volume) && (
        <div style={{ display:"flex", alignItems:"flex-end", height:20, gap:1, opacity:0.25 }}>
          {chartData.candle.map((d, i) => {
            const maxVol = Math.max(...chartData.candle.map(x => x.volume || 0));
            const pct    = maxVol ? (d.volume || 0) / maxVol : 0;
            const up     = (d.close ?? 0) >= (d.open ?? 0);
            return <div key={i} style={{ flex:1, height:`${pct*100}%`, background: up ? "#00d4aa" : "#ff4d6d", minHeight:1, borderRadius:1 }} />;
          })}
        </div>
      )}
    </div>
  );
}