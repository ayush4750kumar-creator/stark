// src/components/RightSidebar.jsx
import { useState } from "react";
import CategoryFeedPage from "./CategoryFeedPage";

const CATEGORIES = [
  { id: "trending", label: "Trending Today",  tag: "LIVE",  tagColor: "#ef4444", desc: "Most active right now"      },
  { id: "gainers",  label: "Top Gainers",     tag: "TODAY", tagColor: "#22c55e", desc: "Biggest movers up"          },
  { id: "losers",   label: "Top Losers",      tag: "TODAY", tagColor: "#f97316", desc: "Biggest movers down"        },
  { id: "indices",  label: "Indian Index",    tag: "NSE",   tagColor: "#3b82f6", desc: "Nifty · Sensex · BankNifty" },
  { id: "gold",     label: "Gold",            tag: "MCX",   tagColor: "#eab308", desc: "Spot & futures prices"      },
  { id: "silver",   label: "Silver",          tag: "MCX",   tagColor: "#94a3b8", desc: "Spot & futures prices"      },
  { id: "tech",     label: "Top Indian Tech", tag: "IT",    tagColor: "#6366f1", desc: "TCS · Infy · Wipro & more"  },
  { id: "oil",      label: "Oil",             tag: "CRUDE", tagColor: "#78716c", desc: "Crude · ONGC · Reliance"    },
  { id: "finance",  label: "Finance / Banks", tag: "BANK",  tagColor: "#0ea5e9", desc: "HDFC · ICICI · SBI"         },
  { id: "us",       label: "US Market",       tag: "NYSE",  tagColor: "#8b5cf6", desc: "S&P · NASDAQ · Top Tech"    },
];

export default function RightSidebar({ onSelectCategory }) {
  const [openId, setOpenId] = useState(null);

  const handleClick = (id) => {
    // Toggle: clicking same tile closes it
    setOpenId(prev => prev === id ? null : id);
    onSelectCategory && onSelectCategory(id);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        .rs-sidebar * {
          font-family: 'DM Sans', sans-serif !important;
          box-sizing: border-box;
        }
        .rs-tile {
          border-radius: 6px;
          border: 1px solid var(--border);
          background: var(--bg);
          cursor: pointer;
          transition: background 0.13s, border-color 0.13s, box-shadow 0.13s;
          overflow: hidden;
        }
        .rs-tile:hover {
          border-color: #cccccc;
        }
        .rs-tile.rs-open {
          border-color: var(--accent, #3b82f6);
          box-shadow: 0 1px 8px rgba(59,130,246,0.10);
        }
        .rs-tile-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 11px;
          transition: background 0.13s;
        }
        .rs-tile-header:hover {
          background: var(--bg3);
        }
        .rs-tile.rs-open .rs-tile-header {
          background: var(--bg3);
          border-bottom: 1px solid var(--border);
        }
        .rs-label {
          font-weight: 600;
          font-size: 12.5px;
          color: var(--text2);
          transition: color 0.12s;
          letter-spacing: -0.01em;
        }
        .rs-tile:hover .rs-label,
        .rs-tile.rs-open .rs-label {
          color: var(--text);
        }
        .rs-desc {
          font-size: 10px;
          color: var(--text3);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-weight: 400;
        }
        .rs-tag {
          font-size: 8px;
          font-weight: 700;
          letter-spacing: 0.05em;
          padding: 1px 5px;
          border-radius: 3px;
        }
        .rs-arrow {
          font-size: 13px;
          color: var(--text3);
          flex-shrink: 0;
          transition: transform 0.18s, color 0.12s;
        }
        .rs-tile.rs-open .rs-arrow {
          transform: rotate(90deg);
          color: var(--text2);
        }
        .rs-dropdown {
          padding: 12px 10px;
          animation: rsFadeIn 0.18s ease forwards;
        }
        @keyframes rsFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: none; }
        }
        .rs-header-title {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.13em;
          color: var(--text);
          text-transform: uppercase;
        }
        .rs-header-sub {
          font-size: 10px;
          color: var(--text3);
          font-weight: 400;
          margin-top: 2px;
        }
      `}</style>

      <aside className="rs-sidebar" style={{ width: "100%", display: "flex", flexDirection: "column", background: "transparent" }}>

        {/* Header */}
        <div style={{ padding: "18px 16px 12px" }}>
          <div className="rs-header-title">WORLD MARKETS</div>
          <div className="rs-header-sub">Tap a category to explore</div>
        </div>

        {/* Category tiles */}
        <div style={{ padding: "0 10px 16px", display: "flex", flexDirection: "column", gap: 5 }}>
          {CATEGORIES.map((cat) => {
            const isOpen = openId === cat.id;
            return (
              <div
                key={cat.id}
                className={`rs-tile${isOpen ? " rs-open" : ""}`}
              >
                {/* Clickable header row */}
                <div
                  className="rs-tile-header"
                  onClick={() => handleClick(cat.id)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <span className="rs-label">{cat.label}</span>
                      <span
                        className="rs-tag"
                        style={{
                          color: cat.tagColor,
                          background: cat.tagColor + "15",
                          border: `1px solid ${cat.tagColor}30`,
                        }}
                      >
                        {cat.tag}
                      </span>
                    </div>
                    <div className="rs-desc">{cat.desc}</div>
                  </div>
                  <span className="rs-arrow">›</span>
                </div>

                {/* Inline dropdown — CategoryFeedPage renders here */}
                {isOpen && (
                  <div className="rs-dropdown">
                    <CategoryFeedPage
                      categoryId={cat.id}
                      onBack={() => setOpenId(null)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </aside>
    </>
  );
}