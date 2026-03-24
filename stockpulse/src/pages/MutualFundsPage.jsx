// src/pages/MutualFundsPage.jsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

const BACKEND = process.env.REACT_APP_API_URL;

export default function MutualFundsPage({ type: typeProp }) {
  const params = useParams();
  const type = typeProp || params.type; // screener | compare
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${BACKEND}/data/mf`)
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isCompare = type === "compare";

  const toggleSelect = (name) => {
    setSelected(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : prev.length < 3 ? [...prev, name] : prev
    );
  };

  const comparing = isCompare ? data.filter(d => selected.includes(d.name)) : [];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "28px 32px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-headline)", fontWeight: 800, fontSize: 26, margin: 0 }}>
            {isCompare ? "⚖️ Compare Mutual Funds" : "🔍 Mutual Funds Screener"}
          </h1>
          <div style={{ fontSize: 12, color: "var(--text3)", fontFamily: "var(--font-body)", marginTop: 2 }}>
            {isCompare ? "Select up to 3 funds to compare side by side" : "Indian Mutual Fund categories — performance overview"}
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text3)", fontFamily: "var(--font-display)" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
          Loading mutual fund data...
        </div>
      ) : (
        <>
          {/* Compare panel */}
          {isCompare && comparing.length > 0 && (
            <div style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 20, marginBottom: 20, background: "var(--bg2)" }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, marginBottom: 14, color: "var(--text3)" }}>COMPARISON</div>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${comparing.length}, 1fr)`, gap: 16 }}>
                {comparing.map(f => (
                  <div key={f.name} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 16, background: "var(--bg)" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, marginBottom: 12 }}>{f.name}</div>
                    {[
                      ["1Y Returns", `${f.returns1y}%`, (f.returns1y ?? 0) >= 0 ? "var(--bull)" : "var(--bear)"],
                      ["AUM", f.aum, "var(--text)"],
                      ["NAV Proxy", f.price ? `₹${f.price.toFixed(2)}` : "—", "var(--text)"],
                      ["Day Change", f.changePct ? `${f.changePct >= 0 ? "▲" : "▼"} ${Math.abs(f.changePct).toFixed(2)}%` : "—", (f.changePct ?? 0) >= 0 ? "var(--bull)" : "var(--bear)"],
                    ].map(([label, val, color]) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--border)" }}>
                        <span style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--font-display)", fontWeight: 600 }}>{label}</span>
                        <span style={{ fontSize: 12, fontFamily: "var(--font-mono)", fontWeight: 700, color }}>{val}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {isCompare && (
            <div style={{ fontSize: 12, color: "var(--text3)", fontFamily: "var(--font-display)", marginBottom: 14 }}>
              Select up to 3 funds below · {selected.length}/3 selected
            </div>
          )}

          {/* Fund cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {data.map(f => {
              const up = (f.changePct ?? 0) >= 0;
              const isSelected = selected.includes(f.name);
              return (
                <div key={f.name}
                  onClick={() => isCompare && toggleSelect(f.name)}
                  style={{
                    border: `1.5px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: 12, padding: "18px 20px",
                    background: isSelected ? "var(--bg3)" : "var(--bg)",
                    cursor: isCompare ? "pointer" : "default",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = "var(--border2)"; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = "var(--border)"; }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14 }}>{f.name}</div>
                    {isCompare && (
                      <div style={{
                        width: 20, height: 20, borderRadius: 5,
                        border: `2px solid ${isSelected ? "var(--accent)" : "var(--border2)"}`,
                        background: isSelected ? "var(--accent)" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 11, color: "#fff", flexShrink: 0,
                      }}>
                        {isSelected ? "✓" : ""}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {[
                      ["1Y Returns",  `${f.returns1y}%`,                (f.returns1y ?? 0) >= 0 ? "var(--bull)" : "var(--bear)"],
                      ["AUM",         f.aum,                            "var(--text)"],
                      ["NAV (Proxy)", f.price ? `₹${f.price.toFixed(2)}` : "—", "var(--text)"],
                      ["Day Chg",     f.changePct != null ? `${up ? "▲" : "▼"} ${Math.abs(f.changePct).toFixed(2)}%` : "—", up ? "var(--bull)" : "var(--bear)"],
                    ].map(([label, val, color]) => (
                      <div key={label}>
                        <div style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--font-display)", fontWeight: 600, letterSpacing: "0.04em" }}>{label}</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 13, color, marginTop: 2 }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}