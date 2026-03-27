// src/pages/ScreenerPage.jsx  — handles all three screener types
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import IntradayScreenerPage from "./IntradayScreenerPage";

const BACKEND = process.env.REACT_APP_API_URL;

const CONFIG = {
  intraday: {
    title: "Intraday Screener",
    icon: "⚡",
    desc: "Top stocks with highest intraday momentum today",
    endpoint: "/data/fo/stocks",
    columns: ["SYMBOL","PRICE","CHANGE %","HIGH","LOW","VOLUME"],
    note: "Sorted by intraday volatility (high-low range)",
  },
  etf: {
    title: "ETF Screener",
    icon: "📈",
    desc: "Exchange Traded Funds — Indian & Global",
    endpoint: "/data/screener/etf",
    columns: ["ETF","PRICE","CHANGE %","52W HIGH","52W LOW","VOLUME"],
    note: "Showing top ETFs by AUM and activity",
  },
  indices: {
    title: "Indices Screener",
    icon: "🗂",
    desc: "Major Indian & Global market indices",
    endpoint: "/data/screener/indices",
    columns: ["INDEX","LEVEL","CHANGE %","HIGH","LOW","—"],
    note: "Real-time index levels",
  },
};

export default function ScreenerPage({ type: typeProp }) {
  const params = useParams();
  const type = typeProp || params.type;

  // Intraday has its own dedicated page with RSI/MACD filters
  if (type === "intraday") return <IntradayScreenerPage />;

  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const navigate = useNavigate();

  const cfg = CONFIG[type] || CONFIG.intraday;

  useEffect(() => {
    setLoading(true); setData([]);
    fetch(`${BACKEND}${cfg.endpoint}`)
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [type]);

  const filtered = data.filter(s =>
    !search ||
    (s.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.symbol || "").toLowerCase().includes(search.toLowerCase())
  );

  // For intraday: sort by intraday range %
  const sorted = type === "intraday"
    ? [...filtered].sort((a, b) => {
        const ra = a.high && a.low ? ((a.high - a.low) / a.low) * 100 : 0;
        const rb = b.high && b.low ? ((b.high - b.low) / b.low) * 100 : 0;
        return rb - ra;
      })
    : filtered;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "28px 32px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-headline)", fontWeight: 800, fontSize: 26, margin: 0 }}>
            {cfg.icon} {cfg.title}
          </h1>
          <div style={{ fontSize: 12, color: "var(--text3)", fontFamily: "var(--font-body)", marginTop: 2 }}>{cfg.desc}</div>
        </div>
        <input
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            marginLeft: "auto", padding: "8px 14px", borderRadius: 8,
            border: "1px solid var(--border)", fontFamily: "var(--font-body)",
            fontSize: 13, background: "var(--bg2)", outline: "none", width: 200,
          }}
        />
      </div>

      <div style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--font-display)", marginBottom: 14 }}>
        💡 {cfg.note}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text3)", fontFamily: "var(--font-display)" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>{cfg.icon}</div>
          Loading {cfg.title.toLowerCase()}...
        </div>
      ) : (
        <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr",
            padding: "10px 18px", background: "var(--bg3)",
            borderBottom: "1px solid var(--border)",
            fontFamily: "var(--font-display)", fontWeight: 700,
            fontSize: 11, color: "var(--text3)", letterSpacing: "0.06em",
          }}>
            {cfg.columns.map((col, i) => (
              <span key={i} style={{ textAlign: i > 0 ? "right" : "left" }}>{col}</span>
            ))}
          </div>
          {sorted.map((s, i) => {
            const up   = (s.changePct ?? 0) >= 0;
            const name = s.symbol?.replace(/\.(NS|BO)$/, "") || s.symbol;
            const range = s.high && s.low && s.low > 0
              ? ((s.high - s.low) / s.low * 100).toFixed(2)
              : null;
            return (
              <div key={s.symbol || i} style={{
                display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr",
                padding: "13px 18px",
                borderBottom: i < sorted.length - 1 ? "1px solid var(--border)" : "none",
                background: i % 2 === 0 ? "var(--bg)" : "var(--bg2)",
                cursor: "default", transition: "background 0.1s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--bg3)"}
              onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "var(--bg)" : "var(--bg2)"}
              >
                <div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13 }}>{name}</div>
                  <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 1, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.name}
                  </div>
                </div>
                <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 13, alignSelf: "center" }}>
                  ₹{s.price?.toLocaleString("en-IN", { maximumFractionDigits: 2 }) ?? "—"}
                </div>
                <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 13, color: up ? "var(--bull)" : "var(--bear)", alignSelf: "center" }}>
                  {up ? "▲" : "▼"} {Math.abs(s.changePct ?? 0).toFixed(2)}%
                </div>
                <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text2)", alignSelf: "center" }}>
                  ₹{(type === "etf" ? s.week52High : s.high)?.toLocaleString("en-IN", { maximumFractionDigits: 0 }) ?? "—"}
                </div>
                <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text2)", alignSelf: "center" }}>
                  ₹{(type === "etf" ? s.week52Low : s.low)?.toLocaleString("en-IN", { maximumFractionDigits: 0 }) ?? "—"}
                </div>
                <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text3)", alignSelf: "center" }}>
                  {type === "intraday" && range ? `${range}% range` : s.volume ? (s.volume / 1e6).toFixed(2) + "M" : "—"}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}