// src/components/SearchBar.jsx
import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const BACKEND = "${process.env.REACT_APP_API_URL}";

const POPULAR = [
  { symbol: "RELIANCE",   name: "Reliance Industries",       exchange: "NSE",    sector: "Energy" },
  { symbol: "TCS",        name: "Tata Consultancy Services", exchange: "NSE",    sector: "IT" },
  { symbol: "INFY",       name: "Infosys",                   exchange: "NSE",    sector: "IT" },
  { symbol: "HDFCBANK",   name: "HDFC Bank",                 exchange: "NSE",    sector: "Banking" },
  { symbol: "ICICIBANK",  name: "ICICI Bank",                exchange: "NSE",    sector: "Banking" },
  { symbol: "SBIN",       name: "State Bank of India",       exchange: "NSE",    sector: "Banking" },
  { symbol: "WIPRO",      name: "Wipro",                     exchange: "NSE",    sector: "IT" },
  { symbol: "TATAMOTORS", name: "Tata Motors",               exchange: "NSE",    sector: "Auto" },
  { symbol: "AAPL",       name: "Apple Inc.",                exchange: "NASDAQ", sector: "Technology" },
  { symbol: "MSFT",       name: "Microsoft",                 exchange: "NASDAQ", sector: "Technology" },
  { symbol: "GOOGL",      name: "Alphabet Inc.",             exchange: "NASDAQ", sector: "Technology" },
  { symbol: "TSLA",       name: "Tesla Inc.",                exchange: "NASDAQ", sector: "EV/Auto" },
  { symbol: "NVDA",       name: "NVIDIA Corporation",        exchange: "NASDAQ", sector: "Semiconductors" },
  { symbol: "AMZN",       name: "Amazon.com",                exchange: "NASDAQ", sector: "E-Commerce" },
  { symbol: "META",       name: "Meta Platforms",            exchange: "NASDAQ", sector: "Social Media" },
  { symbol: "NFLX",       name: "Netflix",                   exchange: "NASDAQ", sector: "Streaming" },
  { symbol: "JPM",        name: "JPMorgan Chase",            exchange: "NYSE",   sector: "Banking" },
  { symbol: "BAJFINANCE", name: "Bajaj Finance",             exchange: "NSE",    sector: "Finance" },
  { symbol: "ADANIENT",   name: "Adani Enterprises",         exchange: "NSE",    sector: "Conglomerate" },
  { symbol: "MARUTI",     name: "Maruti Suzuki",             exchange: "NSE",    sector: "Auto" },
];

export default function SearchBar({ onAddTracked, onSelectStock }) {
  const [query,   setQuery]   = useState("");
  const [results, setResults] = useState([]);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const ref      = useRef();
  const timerRef = useRef();
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const h = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleSearch = useCallback((q) => {
    setQuery(q);
    clearTimeout(timerRef.current);
    if (!q.trim()) { setResults([]); setOpen(false); return; }

    // Instant local results while API loads
    const qUp = q.toUpperCase();
    const local = POPULAR.filter(s =>
      s.symbol.includes(qUp) || s.name.toUpperCase().includes(qUp)
    ).slice(0, 5);
    if (local.length) { setResults(local); setOpen(true); }

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res  = await fetch(`${BACKEND}/stocks/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (data.success && data.data?.length) {
          setResults(data.data);
          setOpen(true);
        } else if (local.length === 0) {
          setResults([]);
        }
      } catch {
        // Keep local results on error
      } finally {
        setLoading(false);
      }
    }, 350);
  }, []);

  // Clicking the row body → switch feed to that company's news
  const handleOpenStock = (stock) => {
    setQuery("");
    setResults([]);
    setOpen(false);
    onSelectStock && onSelectStock(stock);
  };

  // Clicking the + button → add to tracked watchlist
  const handleTrack = (e, stock) => {
    e.stopPropagation();
    onAddTracked && onAddTracked(stock);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  const currency = (stock) => {
    const ex = (stock.exchange || "").toUpperCase();
    if (ex.includes("NSE") || ex.includes("BSE")) return "₹";
    if (ex.includes("LSE") || ex.includes("LON")) return "£";
    if (ex.includes("EUR") || ex.includes("XETRA")) return "€";
    return "$";
  };

  return (
    <div ref={ref} style={{ position: "relative", flex: 1, maxWidth: 480 }}>
      <div style={{ position: "relative" }}>
        <svg style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)", color:"var(--text3)", pointerEvents:"none" }}
          width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          className="search-input"
          placeholder="Search any stock worldwide... AAPL, TSLA, RELIANCE"
          value={query}
          onChange={e => handleSearch(e.target.value)}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          style={{ paddingLeft: 34, paddingRight: loading ? 36 : 12 }}
        />
        {loading && (
          <div style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", width:14, height:14, borderRadius:"50%", border:"2px solid var(--border2)", borderTopColor:"var(--accent)", animation:"spin 0.7s linear infinite" }} />
        )}
      </div>

      {open && results.length > 0 && (
        <div style={{
          position:"absolute", top:"calc(100% + 6px)", left:0, right:0,
          background:"var(--bg2)", border:"1px solid var(--border2)",
          borderRadius:12, overflow:"hidden",
          zIndex:9999, boxShadow:"0 8px 40px rgba(0,0,0,0.15)",
          maxHeight:380, overflowY:"auto",
        }}>
          <div style={{ padding:"7px 14px 5px", fontSize:10, color:"var(--text3)", fontFamily:"var(--font-display)", fontWeight:700, borderBottom:"1px solid var(--border)", letterSpacing:1 }}>
            {results.length} STOCKS FOUND
          </div>

          {results.map((stock, i) => (
            <div
              key={`${stock.symbol}-${i}`}
              onClick={() => handleOpenStock(stock)}
              style={{
                display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"10px 14px", borderBottom:"1px solid var(--border)",
                cursor:"pointer", transition:"background 0.1s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--bg3)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              {/* Stock info — clicking this opens company page */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                  <span style={{ fontFamily:"var(--font-display)", fontWeight:800, fontSize:13 }}>{stock.symbol}</span>
                  {stock.exchange && (
                    <span style={{ fontSize:10, color:"var(--text3)", background:"var(--bg3)", padding:"1px 5px", borderRadius:4, border:"1px solid var(--border2)" }}>
                      {stock.exchange}
                    </span>
                  )}
                </div>
                <div style={{ color:"var(--text2)", fontSize:12, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {stock.name}
                </div>
                {stock.sector && stock.sector !== "Stock" && (
                  <div style={{ color:"var(--accent)", fontSize:10, marginTop:1, fontFamily:"var(--font-display)" }}>
                    {stock.sector}
                  </div>
                )}
              </div>

              <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0, marginLeft:12 }}>
                {/* Price (if available) */}
                {stock.price != null && stock.price > 0 && (
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontFamily:"var(--font-display)", fontWeight:700, fontSize:13 }}>
                      {currency(stock)}{stock.price.toLocaleString(undefined, { maximumFractionDigits:2 })}
                    </div>
                    {stock.change_pct != null && (
                      <div style={{ fontSize:11, fontWeight:600, color:stock.change_pct >= 0 ? "var(--bull)" : "var(--bear)" }}>
                        {stock.change_pct >= 0 ? "+" : ""}{stock.change_pct.toFixed(2)}%
                      </div>
                    )}
                  </div>
                )}

                {/* + button — only tracks, does NOT open page */}
                <div
                  onClick={e => handleTrack(e, stock)}
                  title="Add to watchlist"
                  style={{
                    width:30, height:30, borderRadius:8,
                    background:"var(--accent)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontWeight:800, fontSize:18, color:"#fff", flexShrink:0,
                    cursor:"pointer", transition:"transform 0.15s",
                    userSelect:"none",
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.12)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                >+</div>
              </div>
            </div>
          ))}

          <div style={{ padding:"6px 14px", fontSize:10, color:"var(--text3)", textAlign:"center", borderTop:"1px solid var(--border)" }}>
            Click a stock to view its news · + to track
          </div>
        </div>
      )}

      {open && !loading && query.length > 1 && results.length === 0 && (
        <div style={{
          position:"absolute", top:"calc(100% + 6px)", left:0, right:0,
          background:"var(--bg2)", border:"1px solid var(--border2)", borderRadius:12,
          padding:"20px 14px", zIndex:9999, textAlign:"center", color:"var(--text3)", fontSize:13
        }}>
          No results for "{query}"
        </div>
      )}

      <style>{"@keyframes spin{to{transform:rotate(360deg)}}"}</style>
    </div>
  );
}