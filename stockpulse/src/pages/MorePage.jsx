// src/pages/MorePage.jsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

const BACKEND = "${process.env.REACT_APP_API_URL}";

const CRYPTO_SYMBOLS = [
  "BTC-USD","ETH-USD","BNB-USD","SOL-USD","XRP-USD",
  "ADA-USD","DOGE-USD","AVAX-USD","DOT-USD","MATIC-USD",
];
const GLOBAL_ETF_SYMBOLS = ["SPY","QQQ","DIA","GLD","SLV","IAU","EFA","VWO","AGG","TLT"];

const PAGE_CONFIG = {
  ipo:    { title: "IPO",         icon: "🚀", desc: "Upcoming & recent IPOs on Indian markets" },
  etfs:   { title: "Global ETFs", icon: "🌍", desc: "Top global ETFs — US & international markets" },
  bonds:  { title: "Bonds",       icon: "📜", desc: "Government & corporate bond yields" },
  crypto: { title: "Crypto",      icon: "₿",  desc: "Top cryptocurrencies by market cap" },
};

// Static IPO data (real agent would fetch from NSE API)
const IPO_DATA = [
  { name: "Bajaj Housing Finance",  issue: "₹6,560 Cr",  status: "Listed",    listingGain: "+114%", date: "Sep 2024" },
  { name: "Hyundai India",          issue: "₹27,870 Cr", status: "Listed",    listingGain: "-1.3%", date: "Oct 2024" },
  { name: "NTPC Green Energy",      issue: "₹10,000 Cr", status: "Listed",    listingGain: "+3.4%", date: "Nov 2024" },
  { name: "Swiggy",                 issue: "₹11,327 Cr", status: "Listed",    listingGain: "-8.2%", date: "Nov 2024" },
  { name: "Vishal Mega Mart",       issue: "₹8,000 Cr",  status: "Listed",    listingGain: "+40%",  date: "Dec 2024" },
  { name: "One Mobikwik Systems",   issue: "₹572 Cr",    status: "Listed",    listingGain: "+60%",  date: "Dec 2024" },
  { name: "Indo Farm Equipment",    issue: "₹260 Cr",    status: "Listed",    listingGain: "+25%",  date: "Jan 2025" },
  { name: "Upcoming IPO 1",         issue: "₹TBD",       status: "Upcoming",  listingGain: "—",     date: "2025" },
];

const BOND_DATA = [
  { name: "India 10Y G-Sec",    yield: 6.72, change: -0.04, type: "Government" },
  { name: "India 5Y G-Sec",     yield: 6.58, change: -0.02, type: "Government" },
  { name: "India 2Y G-Sec",     yield: 6.48, change: +0.01, type: "Government" },
  { name: "US 10Y Treasury",    yield: 4.25, change: -0.06, type: "US Govt"    },
  { name: "US 2Y Treasury",     yield: 4.61, change: -0.03, type: "US Govt"    },
  { name: "SBI 5Y Bond",        yield: 7.40, change: 0,     type: "Corporate"  },
  { name: "HDFC Bank 3Y NCD",   yield: 7.65, change: 0,     type: "Corporate"  },
  { name: "REC Ltd 10Y Bond",   yield: 7.28, change: +0.02, type: "PSU"        },
  { name: "NHAI 15Y Bond",      yield: 7.15, change: -0.01, type: "PSU"        },
];

export default function MorePage({ type: typeProp }) {
  const params = useParams();
  const type = typeProp || params.type;
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const cfg = PAGE_CONFIG[type] || PAGE_CONFIG.ipo;

  useEffect(() => {
    if (type === "ipo" || type === "bonds") {
      setLoading(false);
      return;
    }
    // Fetch live data for crypto and global ETFs via the stocks API
    const symbols = type === "crypto" ? CRYPTO_SYMBOLS : GLOBAL_ETF_SYMBOLS;
    Promise.all(
      symbols.map(sym =>
        fetch(`${BACKEND}/stocks/${sym}`).then(r => r.json()).catch(() => null)
      )
    ).then(results => {
      setData(results.filter(r => r?.success && r.data).map(r => r.data));
    }).finally(() => setLoading(false));
  }, [type]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "28px 32px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-headline)", fontWeight: 800, fontSize: 26, margin: 0 }}>
            {cfg.icon} {cfg.title}
          </h1>
          <div style={{ fontSize: 12, color: "var(--text3)", fontFamily: "var(--font-body)", marginTop: 2 }}>{cfg.desc}</div>
        </div>
      </div>

      {/* IPO Table */}
      {type === "ipo" && (
        <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr 1fr 1fr", padding: "10px 18px", background: "var(--bg3)", borderBottom: "1px solid var(--border)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 11, color: "var(--text3)", letterSpacing: "0.06em" }}>
            <span>COMPANY</span><span style={{ textAlign:"right" }}>ISSUE SIZE</span><span style={{ textAlign:"right" }}>LISTING GAIN</span><span style={{ textAlign:"center" }}>STATUS</span><span style={{ textAlign:"right" }}>DATE</span>
          </div>
          {IPO_DATA.map((ipo, i) => {
            const isUp = ipo.listingGain.startsWith("+");
            const isNeg = ipo.listingGain.startsWith("-");
            return (
              <div key={ipo.name} style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr 1fr 1fr", padding: "14px 18px", borderBottom: i < IPO_DATA.length - 1 ? "1px solid var(--border)" : "none", background: i % 2 === 0 ? "var(--bg)" : "var(--bg2)", transition: "background 0.1s" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--bg3)"}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "var(--bg)" : "var(--bg2)"}
              >
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13 }}>{ipo.name}</div>
                <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 13, alignSelf: "center" }}>{ipo.issue}</div>
                <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 13, color: isUp ? "var(--bull)" : isNeg ? "var(--bear)" : "var(--text3)", alignSelf: "center" }}>{ipo.listingGain}</div>
                <div style={{ textAlign: "center", alignSelf: "center" }}>
                  <span style={{ fontSize: 10, fontFamily: "var(--font-display)", fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: ipo.status === "Listed" ? "rgba(22,163,74,0.1)" : "rgba(234,179,8,0.1)", color: ipo.status === "Listed" ? "var(--bull)" : "#ca8a04", border: `1px solid ${ipo.status === "Listed" ? "rgba(22,163,74,0.2)" : "rgba(234,179,8,0.2)"}` }}>{ipo.status}</span>
                </div>
                <div style={{ textAlign: "right", fontSize: 12, color: "var(--text3)", fontFamily: "var(--font-display)", alignSelf: "center" }}>{ipo.date}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bond Table */}
      {type === "bonds" && (
        <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr 1fr", padding: "10px 18px", background: "var(--bg3)", borderBottom: "1px solid var(--border)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 11, color: "var(--text3)", letterSpacing: "0.06em" }}>
            <span>BOND</span><span style={{ textAlign:"right" }}>YIELD %</span><span style={{ textAlign:"right" }}>CHANGE</span><span style={{ textAlign:"right" }}>TYPE</span>
          </div>
          {BOND_DATA.map((b, i) => {
            const up = b.change >= 0;
            return (
              <div key={b.name} style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr 1fr", padding: "14px 18px", borderBottom: i < BOND_DATA.length - 1 ? "1px solid var(--border)" : "none", background: i % 2 === 0 ? "var(--bg)" : "var(--bg2)", transition: "background 0.1s" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--bg3)"}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "var(--bg)" : "var(--bg2)"}
              >
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13 }}>{b.name}</div>
                <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 14, alignSelf: "center" }}>{b.yield.toFixed(2)}%</div>
                <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 13, color: b.change === 0 ? "var(--text3)" : up ? "var(--bear)" : "var(--bull)", alignSelf: "center" }}>
                  {b.change === 0 ? "—" : `${up ? "▲" : "▼"} ${Math.abs(b.change).toFixed(2)}`}
                </div>
                <div style={{ textAlign: "right", alignSelf: "center" }}>
                  <span style={{ fontSize: 10, fontFamily: "var(--font-display)", fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "var(--bg3)", border: "1px solid var(--border)" }}>{b.type}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Crypto / Global ETF live data */}
      {(type === "crypto" || type === "etfs") && (
        loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text3)", fontFamily: "var(--font-display)" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>{cfg.icon}</div>
            Fetching live {cfg.title.toLowerCase()} data...
          </div>
        ) : (
          <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "10px 18px", background: "var(--bg3)", borderBottom: "1px solid var(--border)", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 11, color: "var(--text3)", letterSpacing: "0.06em" }}>
              <span>NAME</span><span style={{ textAlign:"right" }}>PRICE</span><span style={{ textAlign:"right" }}>CHANGE %</span><span style={{ textAlign:"right" }}>52W HIGH</span><span style={{ textAlign:"right" }}>52W LOW</span>
            </div>
            {data.map((s, i) => {
              const up = (s.change_pct ?? 0) >= 0;
              return (
                <div key={s.symbol} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "13px 18px", borderBottom: i < data.length - 1 ? "1px solid var(--border)" : "none", background: i % 2 === 0 ? "var(--bg)" : "var(--bg2)", transition: "background 0.1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--bg3)"}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "var(--bg)" : "var(--bg2)"}
                >
                  <div>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13 }}>{s.symbol}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)" }}>{s.name}</div>
                  </div>
                  <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 13, alignSelf: "center" }}>₹{s.price?.toLocaleString("en-IN", { maximumFractionDigits: 2 }) ?? "—"}</div>
                  <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 13, color: up ? "var(--bull)" : "var(--bear)", alignSelf: "center" }}>{up ? "▲" : "▼"} {Math.abs(s.change_pct ?? 0).toFixed(2)}%</div>
                  <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text2)", alignSelf: "center" }}>₹{s.week_52_high?.toLocaleString("en-IN", { maximumFractionDigits: 0 }) ?? "—"}</div>
                  <div style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text2)", alignSelf: "center" }}>₹{s.week_52_low?.toLocaleString("en-IN", { maximumFractionDigits: 0 }) ?? "—"}</div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}