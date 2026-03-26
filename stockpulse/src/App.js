// src/App.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate as useNavigate_ } from "react-router-dom";
import "./styles/global.css";
import SearchBar         from "./components/SearchBar";
import LeftSidebar       from "./components/LeftSidebar";
import RightSidebar      from "./components/RightSidebar";
import MobileTrackedBar  from "./components/MobileTrackedBar";
import HomePage          from "./pages/HomePage";
import NewsDetailPage    from "./pages/NewsDetailPage";
import FOStocksPage      from "./pages/FOStocksPage";
import CommoditiesPage   from "./pages/CommoditiesPage";
import ScreenerPage           from "./pages/ScreenerPage";
import ETFScreenerPage        from "./pages/ETFScreenerPage";
import IntradayScreenerPage   from "./pages/IntradayScreenerPage";
import IndicesScreenerPage    from "./pages/IndicesScreenerPage";
import MutualFundsPage   from "./pages/MutualFundsPage";
import MorePage          from "./pages/MorePage";
import LoginPage         from "./pages/LoginPage";

const BACKEND       = process.env.REACT_APP_API_URL;
const PRICE_REFRESH = 30 * 1000;

// ── Gramble brand sky-blue (matched from gramble.in logo)
const GRAMBLE_BLUE     = "#6AAFE6";
const GRAMBLE_BLUE_BG  = "#EAF4FC";   // very light tint for selected state
const GRAMBLE_BLUE_MID = "#5BA3DD";   // slightly deeper for borders/hover

const DEFAULT_SYMBOLS = ["RELIANCE", "TCS", "INFY", "SBIN", "AAPL", "TSLA"];

function Layout({ user, onLogin, onLogout }) {
  const [trackedStocks, setTrackedStocks] = useState([]);
  const [overlay, setOverlay] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginModalMode, setLoginModalMode] = useState("login");

  const PATH_TITLES = {
    "/fo/stocks":         "F&O Stocks",
    "/fo/commodities":    "Commodities",
    "/screener/intraday": "Intraday Screener",
    "/screener/etf":      "ETF Screener",
    "/screener/indices":  "Indices Screener",
    "/mf/screener":       "Mutual Funds Screener",
    "/mf/compare":        "Compare Mutual Funds",
    "/more/ipo":          "IPO",
    "/more/etfs":         "Global ETFs",
    "/more/bonds":        "Bonds",
    "/more/crypto":       "Crypto",
  };

  useEffect(() => {
    window.__setOverlay = (path) => setOverlay({ path, title: PATH_TITLES[path] || path });
    return () => { delete window.__setOverlay; };
  }, []);

  const fetchedAt = useRef({});
  const [activeFilter, setActiveFilter] = useState("global");
  const [openPage, setOpenPage]         = useState(null);
  const [activeStock, setActiveStock]   = useState(null);
  const [isMobile, setIsMobile]         = useState(window.innerWidth < 900);
  const location = useLocation();
  const isDetail = location.pathname.includes("/news/") || location.pathname.includes("/stock/");

  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 900);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);

  useEffect(() => {
    async function bootStocks() {
      let symbolsToLoad = DEFAULT_SYMBOLS;

      if (user?.token) {
        try {
          const res  = await fetch(`${BACKEND}/auth/watchlist`, {
            headers: { Authorization: `Bearer ${user.token}` }
          });
          const data = await res.json();
          if (data.success && data.data?.length) {
            symbolsToLoad = data.data;
          }
        } catch {}
      } else {
        try {
          const saved = localStorage.getItem(`sp_tracked_guest`);
          if (saved) symbolsToLoad = JSON.parse(saved);
        } catch {}
      }

      const loaded = [];
      for (const sym of symbolsToLoad) {
        try {
          const res  = await fetch(`${BACKEND}/stocks/${sym}`);
          const data = await res.json();
          if (data.success && data.data) {
            loaded.push({
              symbol:     data.data.symbol,
              name:       data.data.name,
              sector:     data.data.sector || "Stock",
              price:      data.data.price,
              change:     data.data.change_amt,
              changePct:  data.data.change_pct,
              change_pct: data.data.change_pct,
              currency:   data.data.currency,
            });
          }
        } catch {}
      }
      if (loaded.length > 0) {
        setTrackedStocks(loaded);
        for (const s of loaded) {
          fetchedAt.current[s.symbol] = Date.now();
          fetch(`${BACKEND}/news/fetch-stock`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ symbol: s.symbol, company: s.name }),
          }).catch(() => {});
        }
      }
    }
    bootStocks();
  }, [user?.token]);

  const refreshPrices = useCallback(async () => {
    if (trackedStocks.length === 0) return;
    try {
      const res  = await fetch(`${BACKEND}/stocks`);
      const data = await res.json();
      if (!data.success || !data.data?.length) return;
      const liveMap = {};
      data.data.forEach(s => { liveMap[s.symbol] = s; });
      setTrackedStocks(prev => prev.map(stock => {
        const live = liveMap[stock.symbol];
        if (!live || !live.price) return stock;
        return {
          ...stock,
          price:      live.price,
          change:     live.change_amt,
          changePct:  live.change_pct,
          change_pct: live.change_pct,
        };
      }));
    } catch {}
  }, [trackedStocks.length]);

  useEffect(() => {
    refreshPrices();
    const interval = setInterval(refreshPrices, PRICE_REFRESH);
    return () => clearInterval(interval);
  }, [refreshPrices]);

  useEffect(() => {
    if (user?.token || trackedStocks.length === 0) return;
    try {
      localStorage.setItem("sp_tracked_guest", JSON.stringify(trackedStocks.map(s => s.symbol)));
    } catch {}
  }, [trackedStocks, user?.token]);

  const addTracked = useCallback(async (stockOrSymbol) => {
    // ── Require login to add to watchlist ──
    if (!user) {
      setLoginModalMode("login");
      setShowLoginModal(true);
      return;
    }

    let stock = typeof stockOrSymbol === "string"
      ? { symbol: stockOrSymbol, name: stockOrSymbol }
      : stockOrSymbol;

    if (!stock?.symbol) return;

    try {
      const res  = await fetch(`${BACKEND}/stocks/${stock.symbol}`);
      const data = await res.json();
      if (data.success && data.data) {
        stock = {
          symbol:     data.data.symbol,
          name:       data.data.name       || stock.name,
          sector:     data.data.sector     || stock.sector || "Stock",
          price:      data.data.price,
          change:     data.data.change_amt,
          changePct:  data.data.change_pct,
          change_pct: data.data.change_pct,
          currency:   data.data.currency,
        };
      }
    } catch {}

    setTrackedStocks(prev => {
      if (prev.find(s => s.symbol === stock.symbol)) return prev;
      return [...prev, stock];
    });

    if (user?.token) {
      try {
        await fetch(`${BACKEND}/auth/watchlist`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${user.token}` },
          body: JSON.stringify({ symbol: stock.symbol }),
        });
      } catch {}
    }

    setActiveFilter(stock.symbol);
    setActiveStock(stock);
    triggerInstantFetch(stock.symbol, stock.name);
  }, [user]);

  function triggerInstantFetch(symbol, name) {
    const CACHE_MS = 5 * 60 * 1000;
    const last = fetchedAt.current[symbol] || 0;
    if (Date.now() - last < CACHE_MS) return;
    fetchedAt.current[symbol] = Date.now();
    fetch(`${BACKEND}/news/fetch-stock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbol, company: name }),
    }).catch(() => {});
  }

  const removeTracked = async (symbol) => {
    setTrackedStocks(prev => prev.filter(s => s.symbol !== symbol));
    if (activeFilter === symbol) setActiveFilter("global");
    if (user?.token) {
      try {
        await fetch(`${BACKEND}/auth/watchlist/${symbol}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${user.token}` },
        });
      } catch {}
    }
  };

  const trackedSymbols = trackedStocks.map(s => s.symbol);

  const handleFilterChange = (symbol) => {
    setActiveFilter(symbol);
    setActiveStock(trackedStocks.find(s => s.symbol === symbol) || null);
    if (symbol && symbol !== "global" && !symbol.startsWith("cat:")) {
      const stock = trackedStocks.find(s => s.symbol === symbol);
      triggerInstantFetch(symbol, stock?.name || symbol);
    }
  };

  useEffect(() => {
    window.__setActiveFilter = (filter) => handleFilterChange(filter);
    return () => { delete window.__setActiveFilter; };
  });

  const handleStockSelectWithDashboard = (symbol, company) => {
    if (window.__isDashboardOpen && window.__isDashboardOpen()) {
      window.__openDashboard && window.__openDashboard(symbol, company);
    } else {
      handleFilterChange(symbol);
    }
  };

  const openLoginModal = (mode = "login") => {
    setLoginModalMode(mode);
    setShowLoginModal(true);
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>

      {/* HEADER */}
      <header style={{
        flexShrink: 0, zIndex: 200,
        background: "rgba(255,255,255,0.97)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center",
        padding: isMobile ? "10px 14px" : "12px 20px",
        gap: isMobile ? 10 : 20,
      }}>
        <div
          style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, cursor: "pointer" }}
          onClick={() => {
            handleFilterChange("global");
            if (window.__isDashboardOpen && window.__isDashboardOpen()) {
              window.__closeDashboard && window.__closeDashboard();
            }
          }}
        >
          <span style={{
            fontFamily: "var(--font-headline)",
            fontWeight: 900, fontSize: 28,
            letterSpacing: "-0.03em", color: "var(--text)",
            fontStyle: "italic", lineHeight: 1, userSelect: "none",
          }}>
            Gramble
          </span>
        </div>

        {!isMobile && <SearchBar onAddTracked={addTracked} onSelectStock={(stock) => handleStockSelectWithDashboard(stock.symbol, stock.name || stock.symbol)} />}
        {!isMobile && <NavTabs />}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          {isMobile && <SearchBar onAddTracked={addTracked} onSelectStock={(stock) => handleStockSelectWithDashboard(stock.symbol, stock.name || stock.symbol)} />}

          {/* ── Profile area: logged in vs logged out ── */}
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: `linear-gradient(135deg, ${GRAMBLE_BLUE}, ${GRAMBLE_BLUE_MID})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--font-display)", fontWeight: 800, color: "#fff", fontSize: 12, flexShrink: 0,
              }}>
                {user.initials}
              </div>
              {!isMobile && (
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 13, color: "var(--text2)" }}>
                  {user.name}
                </span>
              )}
              <button onClick={onLogout} style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "7px 12px", borderRadius: 8, background: "transparent",
                border: "1px solid var(--border2)", color: "var(--text3)",
                cursor: "pointer", fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 600,
                transition: "all 0.2s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--bear)"; e.currentTarget.style.color = "var(--bear)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border2)"; e.currentTarget.style.color = "var(--text3)"; }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                {!isMobile && "Logout"}
              </button>
            </div>
          ) : (
            // ── Single "Account" button – opens modal with Login / Sign Up tabs inside ──
            <button
              onClick={() => openLoginModal("login")}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "7px 14px", borderRadius: 8,
                border: `1.5px solid ${GRAMBLE_BLUE}`,
                background: GRAMBLE_BLUE_BG,
                color: GRAMBLE_BLUE_MID,
                fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12,
                cursor: "pointer", transition: "all 0.2s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = GRAMBLE_BLUE;
                e.currentTarget.style.color = "#fff";
                e.currentTarget.style.borderColor = GRAMBLE_BLUE;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = GRAMBLE_BLUE_BG;
                e.currentTarget.style.color = GRAMBLE_BLUE_MID;
                e.currentTarget.style.borderColor = GRAMBLE_BLUE;
              }}
            >
              {/* Person icon */}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              Account
            </button>
          )}
        </div>
      </header>

      {isMobile && !isDetail && (
        <div style={{ flexShrink: 0 }}>
          <MobileTrackedBar
            trackedStocks={trackedStocks}
            activeFilter={activeFilter}
            setActiveFilter={(sym) => handleStockSelectWithDashboard(sym, trackedStocks.find(s=>s.symbol===sym)?.name || sym)}
            onRemoveTracked={removeTracked}
            onAddTracked={addTracked}
          />
        </div>
      )}

      <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0, gap: 0 }}>
        {!isMobile && !isDetail && (
          <div style={{ width: 340, flexShrink: 0, padding: "16px 0 16px 16px", display: "flex", flexDirection: "column" }}>
            <div style={{
              flex: 1, borderRadius: 18, border: "1px solid var(--border2)",
              background: "var(--bg)", overflow: "hidden",
              display: "flex", flexDirection: "column",
              boxShadow: "0 2px 16px rgba(0,0,0,0.08)",
            }}>
              <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
                <LeftSidebar
                  trackedStocks={trackedStocks}
                  activeFilter={activeFilter}
                  setActiveFilter={(sym) => handleStockSelectWithDashboard(sym, trackedStocks.find(s=>s.symbol===sym)?.name || sym)}
                  onRemoveTracked={removeTracked}
                  user={user}
                  onLogout={onLogout}
                />
              </div>
            </div>
          </div>
        )}

        <main style={{ flex: 1, overflowY: "auto", overflowX: "hidden", minWidth: 0, minHeight: 0 }}>
          <Routes>
            <Route path="/" element={
              <HomePage
                activeFilter={activeFilter}
                activeStock={activeStock}
                onTrack={addTracked}
                trackedSymbols={trackedSymbols}
                onGoGlobal={() => {
                  if (window.__dashboardBackOverride) {
                    window.__dashboardBackOverride();
                  } else {
                    handleFilterChange("global");
                  }
                }}
                onSwitchToStock={(sym) => handleFilterChange(sym)}
              />
            } />
            <Route path="/news/:id"      element={<NewsDetailPage />} />
            <Route path="/stock/:symbol" element={<NewsDetailPage />} />
          </Routes>
        </main>

        {!isMobile && !isDetail && (
          <div style={{ width: 360, flexShrink: 0, padding: "16px 16px 16px 0", display: "flex", flexDirection: "column" }}>
            <div style={{
              flex: 1, borderRadius: 18, border: "1px solid var(--border2)",
              background: "var(--bg)", overflow: "hidden",
              display: "flex", flexDirection: "column",
              boxShadow: "0 2px 16px rgba(0,0,0,0.08)",
            }}>
              <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
                <RightSidebar onSelectCategory={(catId) => handleFilterChange("cat:" + catId)} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Full-screen overlay for nav pages ── */}
      {overlay && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 500,
          background: "var(--bg)", animation: "fadeIn 0.15s ease",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          <div style={{
            flexShrink: 0, borderBottom: "1px solid var(--border)",
            padding: "13px 24px", display: "flex", alignItems: "center", gap: 14,
            background: "rgba(255,255,255,0.97)", backdropFilter: "blur(12px)", zIndex: 10,
          }}>
            <button onClick={() => setOverlay(null)}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--text3)", padding: 0 }}>
              ←
            </button>
            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15 }}>{overlay.title}</span>
            <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text3)", fontFamily: "var(--font-display)" }}>
              Live · refreshes every 5 min
            </span>
          </div>
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {overlay.path === "/fo/stocks"          && <FOStocksPage />}
            {overlay.path === "/fo/commodities"     && <CommoditiesPage />}
            {overlay.path === "/screener/intraday"  && <IntradayScreenerPage />}
            {overlay.path === "/screener/etf"       && <ETFScreenerPage />}
            {overlay.path === "/screener/indices"   && <IndicesScreenerPage />}
            {overlay.path === "/mf/screener"        && <MutualFundsPage type="screener" />}
            {overlay.path === "/mf/compare"         && <MutualFundsPage type="compare" />}
            {overlay.path === "/more/ipo"           && <MorePage type="ipo" />}
            {overlay.path === "/more/etfs"          && <MorePage type="etfs" />}
            {overlay.path === "/more/bonds"         && <MorePage type="bonds" />}
            {overlay.path === "/more/crypto"        && <MorePage type="crypto" />}
          </div>
        </div>
      )}

      {/* ── Login / Sign-Up modal ── */}
      {showLoginModal && (
        <div
          onClick={() => setShowLoginModal(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20,
          }}
        >
          {/* ── Square compact card with Gramble-blue accent ── */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: "relative",
              width: 360, height: 360,          /* square */
              borderRadius: 16,
              background: "#fff",
              border: `2px solid ${GRAMBLE_BLUE}`,
              boxShadow: `0 8px 40px rgba(106,175,230,0.25), 0 2px 12px rgba(0,0,0,0.10)`,
              overflow: "hidden",
              display: "flex", flexDirection: "column",
            }}
          >
            {/* Blue top stripe */}
            <div style={{
              height: 5, flexShrink: 0,
              background: `linear-gradient(90deg, ${GRAMBLE_BLUE}, ${GRAMBLE_BLUE_MID})`,
            }} />

            {/* Close button */}
            <button
              onClick={() => setShowLoginModal(false)}
              style={{
                position: "absolute", top: 14, right: 14, zIndex: 10,
                width: 26, height: 26, borderRadius: "50%",
                background: GRAMBLE_BLUE_BG,
                border: `1px solid ${GRAMBLE_BLUE}`,
                cursor: "pointer", fontSize: 13, color: GRAMBLE_BLUE_MID,
                display: "flex", alignItems: "center", justifyContent: "center",
                lineHeight: 1,
              }}
            >✕</button>

            {/* ── Tab switcher: Log In / Sign Up ── */}
            <div style={{
              flexShrink: 0,
              display: "flex",
              borderBottom: `1px solid ${GRAMBLE_BLUE}22`,
              margin: "10px 20px 0",
              gap: 4,
            }}>
              {["login", "signup"].map(mode => (
                <button
                  key={mode}
                  onClick={() => setLoginModalMode(mode)}
                  style={{
                    flex: 1, padding: "8px 0",
                    border: "none", borderRadius: "6px 6px 0 0",
                    cursor: "pointer", transition: "all 0.15s",
                    fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 12.5,
                    background: loginModalMode === mode ? GRAMBLE_BLUE : "transparent",
                    color: loginModalMode === mode ? "#fff" : GRAMBLE_BLUE_MID,
                    borderBottom: loginModalMode === mode ? `2px solid ${GRAMBLE_BLUE}` : "2px solid transparent",
                  }}
                >
                  {mode === "login" ? "Log In" : "Sign Up"}
                </button>
              ))}
            </div>

            {/* LoginPage fills the rest */}
            <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
              <LoginPage
                initialMode={loginModalMode}
                onLogin={(u) => {
                  onLogin(u);
                  setShowLoginModal(false);
                }}
                compact={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Nav Tabs with dropdowns ──────────────────────────────────────────────
const NAV_TABS = [
  {
    label: "F&O", sub: "(Indian)",
    items: [
      { label: "F&O Stocks",  icon: "📊", path: "/fo/stocks"      },
      { label: "Commodities", icon: "🪙", path: "/fo/commodities" },
    ],
  },
  {
    label: "Screeners", sub: null,
    items: [
      { label: "Intraday Screener", icon: "⚡", path: "/screener/intraday" },
      { label: "ETF Screener",      icon: "📈", path: "/screener/etf"      },
      { label: "Indices Screener",  icon: "🗂", path: "/screener/indices"  },
    ],
  },
  {
    label: "Mutual Funds", sub: "(Indian)",
    items: [
      { label: "Mutual Funds Screener", icon: "🔍", path: "/mf/screener" },
      { label: "Compare MFs",           icon: "⚖️", path: "/mf/compare"  },
    ],
  },
  {
    label: "More", sub: null,
    items: [
      { label: "IPO",         icon: "🚀", path: "/more/ipo"    },
      { label: "Global ETFs", icon: "🌍", path: "/more/etfs"   },
      { label: "Bonds",       icon: "📜", path: "/more/bonds"  },
      { label: "Crypto",      icon: "₿",  path: "/more/crypto" },
    ],
  },
];

function NavTabs() {
  const [open, setOpen] = React.useState(null);
  const ref      = React.useRef(null);
  const navigate = useNavigate_();

  const doNav = (path) => {
    if (window.__setOverlay) window.__setOverlay(path);
    else navigate(path);
  };

  React.useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ display: "flex", alignItems: "center", gap: 2 }}>
      {NAV_TABS.map((tab) => {
        const isActive = open === tab.label;
        return (
          <div key={tab.label} style={{ position: "relative" }}>
            <button
              onClick={() => setOpen(isActive ? null : tab.label)}
              style={{
                display: "flex", alignItems: "center", gap: 3,
                padding: "6px 11px", borderRadius: 7, border: "none",
                // ── CHANGE: sky-blue tint when selected instead of dark bg ──
                background: isActive ? GRAMBLE_BLUE_BG : "transparent",
                cursor: "pointer", transition: "background 0.15s",
                fontFamily: "var(--font-display)", fontWeight: 600,
                fontSize: 12.5,
                // ── CHANGE: Gramble blue text when active ──
                color: isActive ? GRAMBLE_BLUE_MID : "var(--text2)",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={e => {
                if (!isActive) e.currentTarget.style.background = GRAMBLE_BLUE_BG;
                if (!isActive) e.currentTarget.style.color = GRAMBLE_BLUE_MID;
              }}
              onMouseLeave={e => {
                if (!isActive) e.currentTarget.style.background = "transparent";
                if (!isActive) e.currentTarget.style.color = "var(--text2)";
              }}
            >
              {tab.label}
              {tab.sub && (
                <span style={{ fontSize: 9, color: "var(--text3)", fontWeight: 500, marginLeft: 1 }}>{tab.sub}</span>
              )}
              <span style={{
                fontSize: 8,
                color: isActive ? GRAMBLE_BLUE_MID : "var(--text3)",
                marginLeft: 2,
                transform: isActive ? "rotate(180deg)" : "none",
                transition: "transform 0.15s", display: "inline-block",
              }}>▼</span>
            </button>

            {isActive && (
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", left: 0,
                background: "#fff", border: "1px solid var(--border)",
                borderRadius: 9, boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
                zIndex: 999, minWidth: 180, overflow: "hidden",
                animation: "fadeInFast 0.15s ease",
              }}>
                {tab.items.map((item, i) => (
                  <div
                    key={item.label}
                    onClick={() => { setOpen(null); doNav(item.path); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 14px",
                      borderBottom: i < tab.items.length - 1 ? "1px solid var(--border)" : "none",
                      cursor: "pointer", transition: "background 0.1s",
                      fontFamily: "var(--font-display)", fontWeight: 600,
                      fontSize: 12.5, color: "var(--text2)",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = GRAMBLE_BLUE_BG}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <span style={{ fontSize: 14 }}>{item.icon}</span>
                    {item.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);

  // On first load, check for saved token
  useEffect(() => {
    const saved = localStorage.getItem("sp_token");
    if (!saved) return;
    const API = (process.env.REACT_APP_API_URL || "https://stark-production-4b5e.up.railway.app/api") + "/auth";
    fetch(`${API}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: saved }),
    })
      .then(r => r.json())
      .then(data => { if (data.success) setUser({ ...data.user, token: saved }); })
      .catch(() => localStorage.removeItem("sp_token"));
  }, []);

  const handleLogin = (u) => setUser(u);
  const handleLogout = () => {
    localStorage.removeItem("sp_token");
    setUser(null);
  };

  return (
    <BrowserRouter>
      <NavigateInjector />
      <Layout user={user} onLogin={handleLogin} onLogout={handleLogout} />
    </BrowserRouter>
  );
}

function NavigateInjector() {
  const nav = useNavigate_();
  React.useEffect(() => { window.__appNavigate = nav; }, [nav]);
  return null;
}