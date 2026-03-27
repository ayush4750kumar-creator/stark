// src/components/RightSidebar.jsx
import { useState } from "react";

const CATEGORIES = [
  { id:"trending",    label:"Trending Today",  tag:"LIVE",  tagColor:"#ef4444", desc:"Most active right now"     },
  { id:"gainers",     label:"Top Gainers",     tag:"TODAY", tagColor:"#22c55e", desc:"Biggest movers up"          },
  { id:"losers",      label:"Top Losers",      tag:"TODAY", tagColor:"#f97316", desc:"Biggest movers down"        },
  { id:"indices",     label:"Indian Index",    tag:"NSE",   tagColor:"#3b82f6", desc:"Nifty · Sensex · BankNifty" },
  { id:"gold",        label:"Gold",            tag:"MCX",   tagColor:"#eab308", desc:"Spot & futures prices"      },
  { id:"silver",      label:"Silver",          tag:"MCX",   tagColor:"#94a3b8", desc:"Spot & futures prices"      },
  { id:"tech",        label:"Top Indian Tech", tag:"IT",    tagColor:"#6366f1", desc:"TCS · Infy · Wipro & more"  },
  { id:"oil",         label:"Oil",             tag:"CRUDE", tagColor:"#78716c", desc:"Crude · ONGC · Reliance"    },
  { id:"finance",     label:"Finance / Banks", tag:"BANK",  tagColor:"#0ea5e9", desc:"HDFC · ICICI · SBI"         },
  { id:"us",          label:"US Market",       tag:"NYSE",  tagColor:"#8b5cf6", desc:"S&P · NASDAQ · Top Tech"    },

];

export default function RightSidebar({ onSelectCategory }) {
  const [hovered, setHovered] = useState(null);

  return (
    <aside style={{ width:"100%", display:"flex", flexDirection:"column", background:"transparent" }}>

      {/* Header */}
      <div style={{ padding:"18px 16px 12px" }}>
        <div style={{ fontFamily:"var(--font-bebas)", fontSize:16, letterSpacing:"0.12em", color:"var(--text)" }}>
          MARKETS
        </div>
        <div style={{ fontSize:10, color:"var(--text3)", fontFamily:"var(--font-body)", marginTop:2 }}>
          Tap a category to explore
        </div>
      </div>

      {/* Category tiles */}
      <div style={{ padding:"0 10px 16px", display:"flex", flexDirection:"column", gap:5 }}>
        {CATEGORIES.map((cat) => {
          const isHov = hovered === cat.id;
          return (
            <div
              key={cat.id}
              onClick={() => onSelectCategory && onSelectCategory(cat.id)}
              onMouseEnter={() => setHovered(cat.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display:"flex", alignItems:"center", gap:10,
                padding:"9px 11px",
                borderRadius:4,
                border:`1px solid ${isHov ? "#bbbbbb" : "var(--border)"}`,
                background: isHov ? "var(--bg3)" : "var(--bg)",
                cursor:"pointer",
                transition:"all 0.12s",
                boxShadow: isHov ? "0 1px 6px rgba(0,0,0,0.06)" : "none",
              }}
            >
              <span style={{
                width:6, height:6, borderRadius:"50%", flexShrink:0,
                background: cat.tagColor,
                display:"inline-block",
                opacity: isHov ? 1 : 0.65,
                transition:"opacity 0.12s",
              }} />

              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                  <span style={{
                    fontFamily:"var(--font-display)", fontWeight:700, fontSize:12.5,
                    color: isHov ? "var(--text)" : "var(--text2)",
                    transition:"color 0.12s",
                  }}>
                    {cat.label}
                  </span>
                  <span style={{
                    fontSize:8, fontWeight:800, fontFamily:"var(--font-display)",
                    letterSpacing:"0.06em",
                    color: cat.tagColor,
                    background: cat.tagColor + "15",
                    border:`1px solid ${cat.tagColor}30`,
                    padding:"1px 5px", borderRadius:3,
                  }}>
                    {cat.tag}
                  </span>
                </div>
                <div style={{
                  fontSize:10, color:"var(--text3)", fontFamily:"var(--font-body)",
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                }}>
                  {cat.desc}
                </div>
              </div>

              <span style={{
                fontSize:12, color: isHov ? "var(--text2)" : "var(--text3)",
                transition:"all 0.12s",
                transform: isHov ? "translateX(2px)" : "none",
                flexShrink:0,
              }}>›</span>
            </div>
          );
        })}
      </div>
    </aside>
  );
}