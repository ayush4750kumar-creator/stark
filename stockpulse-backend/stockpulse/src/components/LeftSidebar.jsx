// src/components/LeftSidebar.jsx
import { useState } from "react";

export default function LeftSidebar({ trackedStocks, activeFilter, setActiveFilter, onRemoveTracked, user, onLogout }) {
  const [editMode, setEditMode] = useState(false);

  return (
    <aside style={{
      width: "100%", flexShrink: 0,
      display: "flex", flexDirection: "column",
      height: "100%",
      background: "transparent",
      overflow: "hidden",
    }}>
      {/* User block */}
      <div style={{ padding: "20px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: "linear-gradient(135deg, var(--accent), #0066cc)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "var(--font-display)", fontWeight: 800, color: "#000", fontSize: 14,
            flexShrink: 0,
          }}>
            {user?.initials || "U"}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.name || "User"}
            </div>
            <div style={{ color: "var(--accent)", fontSize: 11, fontWeight: 600 }}>
              {user?.email || "Trader"}
            </div>
          </div>
        </div>
      </div>

      {/* Tracked Stocks */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 0" }}>

        {/* Header row with EDIT toggle */}
        <div style={{ padding: "0 16px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: "var(--text3)", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", fontFamily: "var(--font-display)" }}>
            WATCHLIST
          </span>
          {trackedStocks.length > 0 && (
            <button
              onClick={() => setEditMode(e => !e)}
              style={{
                background: editMode ? "rgba(255,77,109,0.12)" : "var(--bg3)",
                border: `1px solid ${editMode ? "var(--bear)" : "var(--border2)"}`,
                borderRadius: 6, padding: "3px 9px",
                color: editMode ? "var(--bear)" : "var(--text3)",
                fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 10,
                cursor: "pointer", letterSpacing: 0.5, transition: "all 0.15s",
              }}>
              {editMode ? "DONE" : "EDIT"}
            </button>
          )}
        </div>

        {/* Tracked stocks list */}
        {trackedStocks.map(stock => (
          <div
            key={stock.symbol}
            onClick={() => { if (!editMode) { setActiveFilter(stock.symbol); } }}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 16px", cursor: editMode ? "default" : "pointer",
              background: !editMode && activeFilter === stock.symbol ? "rgba(0,212,170,0.08)" : "transparent",
              borderLeft: !editMode && activeFilter === stock.symbol ? "2px solid var(--accent)" : "2px solid transparent",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { if (!editMode && activeFilter !== stock.symbol) e.currentTarget.style.background = "var(--bg3)"; }}
            onMouseLeave={e => { if (!editMode) e.currentTarget.style.background = activeFilter === stock.symbol ? "rgba(0,212,170,0.08)" : "transparent"; }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12.5 }}>{stock.symbol}</div>
              <div style={{ color: "var(--text3)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {stock.name.split(" ").slice(0, 2).join(" ")}
              </div>
            </div>

            {/* Edit mode: show remove button */}
            {editMode ? (
              <button
                onClick={e => { e.stopPropagation(); onRemoveTracked && onRemoveTracked(stock.symbol); }}
                style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: "var(--bear)", border: "none",
                  color: "white", fontSize: 14, fontWeight: 700,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, lineHeight: 1,
                }}>
                ×
              </button>
            ) : (
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700 }}>
                  {stock.price != null ? "₹" + stock.price.toLocaleString("en-IN", {maximumFractionDigits:2}) : "—"}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: (stock.changePct ?? stock.change_pct ?? 0) >= 0 ? "var(--bull)" : "var(--bear)" }}>
                  {(stock.changePct ?? stock.change_pct) != null
                    ? `${(stock.changePct ?? stock.change_pct) >= 0 ? "+" : ""}${(stock.changePct ?? stock.change_pct).toFixed(2)}%`
                    : "—"}
                </div>
              </div>
            )}
          </div>
        ))}

        {trackedStocks.length === 0 && (
          <div style={{ padding: "12px 16px", color: "var(--text3)", fontSize: 12, lineHeight: 1.6 }}>
            Search and add stocks to track them here.
          </div>
        )}
      </div>
    </aside>
  );
}