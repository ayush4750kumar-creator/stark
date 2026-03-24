// src/pages/HomePage.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import NewsCard from "../components/NewsCard";
import InlineCompanyView from "../components/InlineCompanyView";
import CategoryFeedPage from "../components/CategoryFeedPage";
import { STOCKS } from "../data/mockData";
import { getNewsForStock } from "../services/newsService";

const PAGE_SIZE = 10;
const BACKEND   = "http://localhost:5000/api";

function relativeTime(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso);
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1)   return "just now";
  if (m < 60)  return `${m}m ago`;
  if (h < 24)  return `${h}h ago`;
  if (d < 30)  return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

async function fetchPriceMap() {
  try {
    const res  = await fetch(`${BACKEND}/stocks`);
    const data = await res.json();
    if (!data.success) return {};
    const map = {};
    for (const s of (data.data || [])) {
      map[s.symbol] = { price: s.price, change: s.change_pct };
    }
    return map;
  } catch {
    return {};
  }
}

async function fetchGlobalNews(priceMap) {
  try {
    const res  = await fetch(`${BACKEND}/news?limit=100`);
    const data = await res.json();
    if (!data.success || !data.data?.length) return [];

    const seen = new Set();
    const unique = [];
    for (const a of data.data) {
      const key = String(a.id);
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(a);
    }

    return unique.map(a => {
      const sym   = a.symbol || "MARKET";
      const price = priceMap[sym];
      return {
        id:          a.id,
        symbol:      sym,
        company:     a.company     || "Market",
        headline:    a.headline,
        summary:     a.summary_20  || a.headline,
        sentiment:   a.sentiment   || "neutral",
        image:       a.image_url   || "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&q=80",
        time:        relativeTime(a.published_at),
        source:      a.source      || "StockPulse",
        sourceUrl:   a.source_url  || "",
        publishedAt: a.published_at,
        price:       price?.price  ?? null,
        change:      price?.change ?? null,
      };
    });
  } catch {
    return [];
  }
}

export default function HomePage({ activeFilter, activeStock, onTrack, trackedSymbols, onGoGlobal, onSwitchToStock }) {
  const [allNews,      setAllNews]      = useState([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading,      setLoading]      = useState(false);
  const [stockInfo,    setStockInfo]    = useState(null);
  const [newCount,     setNewCount]     = useState(0);
  const [fetchingNews, setFetchingNews] = useState(false);
  const [pendingNews,  setPendingNews]  = useState([]);
  const [inlineCompany, setInlineCompany] = useState(null);
  const loaderRef    = useRef();
  const feedRef      = useRef();
  const loadingRef   = useRef(false);
  const latestIdRef  = useRef(null);
  const pollTimerRef  = useRef(null);
  const stockPollRef  = useRef(null);

  useEffect(() => {
    window.__openDashboard   = (sym, company) => setInlineCompany({ symbol: sym, company });
    window.__closeDashboard  = () => setInlineCompany(null);
    window.__isDashboardOpen = () => !!inlineCompany;
    return () => {
      delete window.__openDashboard;
      delete window.__closeDashboard;
      delete window.__isDashboardOpen;
    };
  }, [inlineCompany]);

  useEffect(() => {
    setInlineCompany(null);
  }, [activeFilter]);

  useEffect(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (stockPollRef.current) { clearInterval(stockPollRef.current); stockPollRef.current = null; }
    setVisibleCount(PAGE_SIZE);
    setAllNews([]);
    setStockInfo(null);
    setFetchingNews(false);
    setLoading(true);

    (async () => {
      try {
        let articles = [];

        if (activeFilter === "global") {
          const priceMap = await fetchPriceMap();
          articles = await fetchGlobalNews(priceMap);
        } else if (activeFilter.startsWith("cat:")) {
          setLoading(false);
          loadingRef.current = false;
          return;
        } else {
          let stock = activeStock || STOCKS.find(s => s.symbol === activeFilter);
          if (!stock) {
            try {
              const res  = await fetch(`${BACKEND}/stocks/${activeFilter}`);
              const data = await res.json();
              if (data.success) stock = data.data;
            } catch {}
          }
          setStockInfo(stock || { symbol: activeFilter, name: activeFilter });

          const name = stock?.name || activeFilter;
          const raw  = await getNewsForStock(activeFilter, name, stock);

          const seen = new Set();
          articles = raw.filter(a => {
            const key = String(a.id || a.headline);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          }).map(a => ({
            ...a,
            price:  a.price  ?? stock?.price      ?? null,
            change: a.change ?? stock?.change_pct  ?? null,
          }));
        }

        setAllNews(articles);
        setNewCount(0);
        setPendingNews([]);
        setFetchingNews(false);
        if (articles.length) {
          latestIdRef.current = Math.max(...articles.map(a => Number(a.id) || 0));
        }
        if (feedRef.current) feedRef.current.scrollTop = 0;

        if (!activeFilter.startsWith("cat:") && activeFilter !== "global") {
          const sym = activeFilter;
          setFetchingNews(true);

          fetch(`${BACKEND}/fetch/category`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ symbols: [sym] }),
          }).catch(() => {});
          fetch(`${BACKEND}/admin/run-agents`, { method: "POST" }).catch(() => {});

          let attempts = 0;
          stockPollRef.current = setInterval(async () => {
            attempts++;
            try {
              const r = await fetch(`${BACKEND}/stocks/${sym}/news?limit=30`);
              const d = await r.json();
              if (!d.success || !d.data?.length) {
                if (attempts >= 30) { clearInterval(stockPollRef.current); stockPollRef.current = null; setFetchingNews(false); }
                return;
              }
              clearInterval(stockPollRef.current); stockPollRef.current = null;
              setFetchingNews(false);
              const priceMap = await fetchPriceMap();
              const mapArt = a => ({
                id: a.id, symbol: sym, company: a.company || sym,
                headline: a.headline, summary: a.summary_20 || a.headline,
                sentiment: a.sentiment || "neutral",
                image: a.image_url || "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&q=80",
                source: a.source || "StockPulse", sourceUrl: a.source_url || "",
                publishedAt: a.published_at, fullText: a.full_text || null,
                price: priceMap[sym]?.price ?? null, change: priceMap[sym]?.change ?? null,
              });
              const seenH    = new Set();
              const allFresh = d.data.map(mapArt).filter(a => {
                const key = a.headline.toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,60);
                if (seenH.has(key)) return false;
                seenH.add(key); return true;
              });
              const maxId = allFresh.length ? Math.max(...allFresh.map(a => Number(a.id)||0)) : 0;
              setAllNews(prev => {
                const existIds  = new Set(prev.map(x => x.id));
                const existH    = new Set(prev.map(x => x.headline.toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,60)));
                const brandNew  = allFresh.filter(a => {
                  if (existIds.has(a.id)) return false;
                  const hk = a.headline.toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,60);
                  return !existH.has(hk);
                });
                brandNew.sort((a,b) => new Date(b.publishedAt) - new Date(a.publishedAt));
                if (brandNew.length > 0) return [...brandNew, ...prev];
                if (prev.length === 0) return allFresh;
                return prev;
              });
              if (maxId) latestIdRef.current = maxId;
            } catch {}
            if (attempts >= 30) { clearInterval(stockPollRef.current); stockPollRef.current = null; setFetchingNews(false); }
          }, 1500);
        }
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    })();

    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(async () => {
      if (activeFilter !== "global") return;
      try {
        const priceMap = await fetchPriceMap();
        const fresh = await fetchGlobalNews(priceMap);
        if (!fresh.length) return;

        const currentLatest = latestIdRef.current;
        const brandNew = fresh.filter(a => {
          if (currentLatest === null) return false;
          return Number(a.id) > Number(currentLatest);
        });

        if (brandNew.length > 0) {
          setPendingNews(prev => {
            const existingIds = new Set(prev.map(x => x.id));
            const toAdd = brandNew.filter(a => !existingIds.has(a.id));
            const merged = [...toAdd, ...prev];
            setNewCount(merged.length);
            return merged;
          });
        }
      } catch {}
    }, 150000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (stockPollRef.current) { clearInterval(stockPollRef.current); stockPollRef.current = null; }
    };
  }, [activeFilter, activeStock]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisibleCount(v => Math.min(v + PAGE_SIZE, allNews.length)); },
      { threshold: 0.1 }
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [allNews]);

  function showNewArticles() {
    if (!pendingNews.length) return;
    const sorted = [...pendingNews].sort((a, b) => Number(b.id) - Number(a.id));
    setAllNews(prev => {
      const existingIds = new Set(prev.map(a => a.id));
      const toAdd = sorted.filter(a => !existingIds.has(a.id));
      return [...toAdd, ...prev];
    });
    const maxId = Math.max(...sorted.map(a => Number(a.id)));
    if (maxId > Number(latestIdRef.current || 0)) latestIdRef.current = maxId;
    setPendingNews([]);
    setNewCount(0);
    setVisibleCount(v => v + sorted.length);
    if (feedRef.current) feedRef.current.scrollTop = 0;
  }

  const visibleNews = allNews.slice(0, visibleCount);
  const hasMore     = visibleCount < allNews.length;
  const isCat       = activeFilter.startsWith("cat:");
  const isStock     = !isCat && activeFilter !== "global";
  const stock       = isStock ? (stockInfo || STOCKS.find(s => s.symbol === activeFilter)) : null;
  const stockName   = isCat ? (stockInfo?.name || activeFilter.slice(4)) : (stock?.name || activeFilter);
  const price       = stock?.price;
  const changePct   = stock?.change_pct ?? stock?.changePct;

  return (
    <div ref={feedRef} style={{ maxWidth: 900, margin: "0 auto", padding: "16px" }}>

      {inlineCompany && (
        <InlineCompanyView
          symbol={inlineCompany.symbol}
          company={inlineCompany.company}
          onBack={() => setInlineCompany(null)}
        />
      )}

      {!inlineCompany && isCat && (
        <CategoryFeedPage
          categoryId={activeFilter.slice(4)}
          onBack={() => onGoGlobal && onGoGlobal()}
        />
      )}

      {!inlineCompany && !isCat && (<>

        {fetchingNews && allNews.length > 0 && (
          <div style={{
            position: "sticky", top: 0, zIndex: 99,
            height: 3, background: "var(--border)",
            borderRadius: 2, overflow: "hidden", marginBottom: 8,
          }}>
            <div style={{
              height: "100%", width: "40%",
              background: "var(--accent)",
              borderRadius: 2,
              animation: "loadingSlide 1.2s ease-in-out infinite",
            }} />
          </div>
        )}

        {newCount > 0 && (
          <div
            onClick={showNewArticles}
            style={{
              position: "sticky", top: 8, zIndex: 100,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              background: "#ffffff", color: "#000000",
              borderRadius: 24, padding: "10px 20px",
              fontWeight: 700, fontSize: 13, cursor: "pointer",
              boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
              border: "1px solid var(--border2)",
              margin: "0 auto 12px", width: "fit-content",
              animation: "slideDown 0.3s ease",
            }}
          >
            <span style={{ fontSize: 16 }}>🔔</span>
            {newCount} new article{newCount > 1 ? "s" : ""} – tap to load
          </div>
        )}

        <div style={{
          position: "sticky", top: 0, zIndex: 10,
          background: "var(--bg)",
          paddingTop: 4, paddingBottom: 12,
          marginBottom: 4,
          borderBottom: "1px solid var(--border)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {(activeFilter !== "global") && (
                <button
                  onClick={() => onGoGlobal && onGoGlobal()}
                  style={{
                    background: "transparent", border: "none", cursor: "pointer",
                    color: "var(--text3)", fontSize: 18, padding: "0 4px 0 0",
                    lineHeight: 1, display: "flex", alignItems: "center",
                    fontWeight: 300,
                  }}
                  title="Back to Global Feed"
                >←</button>
              )}
              <div style={{
                fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 17,
                color: "var(--text)",
              }}>
                {activeFilter === "global" ? "Global Feed" : stockName}
              </div>
            </div>

            {isStock && stock && price != null && (
              <div style={{
                padding: "3px 10px", borderRadius: 20, flexShrink: 0,
                background: changePct >= 0 ? "rgba(0,212,170,0.12)" : "rgba(255,77,109,0.12)",
                border: `1px solid ${changePct >= 0 ? "var(--bull)" : "var(--bear)"}`,
                fontSize: 12, fontWeight: 700, fontFamily: "var(--font-display)",
                color: changePct >= 0 ? "var(--bull)" : "var(--bear)",
              }}>
                {"₹"}{price?.toLocaleString("en-IN", {maximumFractionDigits:2})} &nbsp;
                {changePct >= 0 ? "▲" : "▼"} {Math.abs(changePct || 0).toFixed(2)}%
              </div>
            )}

            <div style={{ flex: 1 }} />

            {isStock && (
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => onTrack && onTrack(stock || { symbol: activeFilter, name: stockName })}
                  style={{
                    padding: "6px 14px", borderRadius: 8, cursor: "pointer",
                    background: trackedSymbols.includes(activeFilter) ? "#e8e8e8" : "transparent",
                    border: "1px solid var(--border2)",
                    fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 700,
                    color: trackedSymbols.includes(activeFilter) ? "#555" : "var(--text2)",
                    transition: "all 0.15s",
                  }}
                >
                  {trackedSymbols.includes(activeFilter) ? "Watchlisted ✓" : "+ Add to Watchlist"}
                </button>
                <button
                  onClick={() => {
                    window.__openDashboard && window.__openDashboard(activeFilter, stockName);
                  }}
                  style={{
                    padding: "6px 14px", borderRadius: 8, cursor: "pointer",
                    background: "var(--text)", border: "1px solid var(--text)",
                    fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 700,
                    color: "var(--bg)", transition: "all 0.15s",
                  }}
                >
                  Dashboard
                </button>
              </div>
            )}
          </div>
        </div>

        {loading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0", gap: 14 }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              border: "3px solid var(--border2)", borderTopColor: "var(--accent)",
              animation: "spin 0.8s linear infinite"
            }} />
            <div style={{ color: "var(--text3)", fontFamily: "var(--font-display)", fontSize: 13 }}>
              Loading {activeFilter === "global" ? "global feed" : stockName}...
            </div>
          </div>
        )}

        {!loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {visibleNews.map((news, i) => (
              <NewsCard
                key={String(news.id)}
                news={news}
                index={i % PAGE_SIZE}
                onTrack={onTrack}
                trackedSymbols={trackedSymbols}
                onAboutCompany={(symbol, company) => setInlineCompany({ symbol, company })}
              />
            ))}
          </div>
        )}

        {!loading && allNews.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text3)" }}>
            {fetchingNews ? (
              <>
                <div style={{ fontSize: 36, marginBottom: 16, animation: "pulse 1.2s infinite" }}>📡</div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 14, marginBottom: 4, color: "var(--text)" }}>
                  Fetching live news for {activeFilter}...
                </div>
                <div style={{ marginTop: 16, display: "flex", justifyContent: "center", gap: 6 }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{
                      width: 8, height: 8, borderRadius: "50%", background: "var(--accent)",
                      animation: `pulse 1s ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 40, marginBottom: 16 }}>📭</div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
                  No real news found yet
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.6, maxWidth: 280, margin: "0 auto" }}>
                  {activeFilter === "global"
                    ? "The agents are fetching live market news. Check back in a few minutes."
                    : `No articles found for ${activeFilter} in the last 15 days.`}
                </div>
              </>
            )}
          </div>
        )}

        {!loading && allNews.length > 0 && (
          <div ref={loaderRef} style={{ padding: 24, display: "flex", justifyContent: "center" }}>
            {hasMore ? (
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                border: "3px solid var(--border2)", borderTopColor: "var(--accent)",
                animation: "spin 0.8s linear infinite"
              }} />
            ) : (
              <div style={{ color: "var(--text3)", fontSize: 12, fontFamily: "var(--font-display)" }}>
                — {allNews.length} articles —
              </div>
            )}
          </div>
        )}

      </>)}

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  );
}