// src/pages/CommoditiesPage.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const BACKEND = "http://localhost:5000/api";

const ICONS = {
  "Gold": "🥇", "Silver": "🥈", "Crude Oil": "🛢", "Brent Crude": "⛽",
  "Natural Gas": "🔥", "Copper": "🟤", "Corn": "🌽", "Wheat": "🌾",
  "Soybeans": "🫘", "Palladium": "💿", "Platinum": "⬜", "Aluminium": "🔩",
};

export default function CommoditiesPage() {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${BACKEND}/data/fo/commodities`)
      .then(r => r.json())
      .then(d => { if (d.success) setData(d.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "28px 32px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-headline)", fontWeight: 800, fontSize: 26, margin: 0 }}>Commodities</h1>
          <div style={{ fontSize: 12, color: "var(--text3)", fontFamily: "var(--font-body)", marginTop: 2 }}>
            MCX & Global commodity futures — live prices
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text3)", fontFamily: "var(--font-display)" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🪙</div>
          Fetching commodity prices...
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {data.map(c => {
            const up = (c.changePct ?? 0) >= 0;
            return (
              <div key={c.symbol} style={{
                border: "1px solid var(--border)", borderRadius: 12,
                padding: "18px 20px", background: "var(--bg)",
                transition: "box-shadow 0.15s, border-color 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"; e.currentTarget.style.borderColor = "var(--border2)"; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "var(--border)"; }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 22, marginBottom: 4 }}>{ICONS[c.name] || "📦"}</div>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)", fontFamily: "var(--font-body)" }}>per {c.unit}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 18 }}>
                      ₹{c.price?.toLocaleString("en-IN", { maximumFractionDigits: 2 }) ?? "—"}
                    </div>
                    <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 12, color: up ? "var(--bull)" : "var(--bear)", marginTop: 2 }}>
                      {up ? "▲" : "▼"} {Math.abs(c.changePct ?? 0).toFixed(2)}%
                    </div>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--font-display)", fontWeight: 600, letterSpacing: "0.05em" }}>DAY HIGH</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, marginTop: 2 }}>₹{c.high?.toLocaleString("en-IN", { maximumFractionDigits: 2 }) ?? "—"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--text3)", fontFamily: "var(--font-display)", fontWeight: 600, letterSpacing: "0.05em" }}>DAY LOW</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600, marginTop: 2 }}>₹{c.low?.toLocaleString("en-IN", { maximumFractionDigits: 2 }) ?? "—"}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}