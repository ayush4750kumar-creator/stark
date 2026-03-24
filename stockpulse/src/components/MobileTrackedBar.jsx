// src/components/MobileTrackedBar.jsx
import { useState, useCallback, useRef } from "react";

export default function MobileTrackedBar({ trackedStocks, activeFilter, setActiveFilter, onAddTracked }) {
  const [searchMode, setSearchMode] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  const timerRef = useRef();
  const handleSearch = (q) => {
    setQuery(q);
    clearTimeout(timerRef.current);
    if (!q) { setResults([]); return; }
    timerRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(`${process.env.REACT_APP_API_URL}/stocks/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(data.data || []);
      } catch { setResults([]); }
    }, 300);
  };

  return (
    <div style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
      {searchMode ? (
        <div style={{ padding: "10px 12px" }}>
          <div style={{ position: "relative" }}>
            <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text3)" }}
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              className="search-input"
              style={{ paddingLeft: 32 }}
              placeholder="Search stocks..."
              value={query}
              onChange={e => handleSearch(e.target.value)}
              autoFocus
            />
            <button
              onClick={() => { setSearchMode(false); setQuery(""); setResults([]); }}
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text3)", cursor: "pointer", fontSize: 13 }}
            >✕</button>
          </div>

          {results.length > 0 && (
            <div style={{ background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: "var(--radius)", marginTop: 6, overflow: "hidden" }}>
              {results.map(s => (
                <div key={s.symbol} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13 }}>{s.symbol}</div>
                    <div style={{ color: "var(--text3)", fontSize: 11 }}>{s.name}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>₹{s.price.toFixed(0)}</div>
                      <div style={{ fontSize: 11, color: s.changePct >= 0 ? "var(--bull)" : "var(--bear)", fontWeight: 600 }}>{s.changePct >= 0 ? "+" : ""}{s.changePct}%</div>
                    </div>
                    <button
                      onClick={() => { onAddTracked(s); setSearchMode(false); setQuery(""); setResults([]); }}
                      style={{ width: 26, height: 26, borderRadius: 6, background: "var(--accent)", border: "none", color: "#000", fontWeight: 800, fontSize: 16, cursor: "pointer" }}
                    >+</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto", padding: "10px 12px", gap: 8 }}>
          {/* Global */}
          <button
            onClick={() => setActiveFilter("global")}
            style={{
              flexShrink: 0, padding: "6px 14px", borderRadius: 20,
              background: activeFilter === "global" ? "var(--accent)" : "var(--bg3)",
              border: "1px solid",
              borderColor: activeFilter === "global" ? "var(--accent)" : "var(--border)",
              color: activeFilter === "global" ? "#000" : "var(--text3)",
              fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 700,
              cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 4
            }}
          >
            🌍 Global
          </button>

          {trackedStocks.map(s => (
            <button
              key={s.symbol}
              onClick={() => setActiveFilter(s.symbol)}
              style={{
                flexShrink: 0, padding: "6px 12px", borderRadius: 20,
                background: activeFilter === s.symbol ? "var(--accent)" : "var(--bg3)",
                border: "1px solid",
                borderColor: activeFilter === s.symbol ? "var(--accent)" : "var(--border)",
                color: activeFilter === s.symbol ? "#000" : "var(--text2)",
                fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 700,
                cursor: "pointer", transition: "all 0.2s"
              }}
            >
              {s.symbol}
            </button>
          ))}

          <button
            onClick={() => setSearchMode(true)}
            style={{
              flexShrink: 0, width: 32, height: 32, borderRadius: "50%",
              background: "var(--bg3)", border: "1px solid var(--border2)",
              color: "var(--text2)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}