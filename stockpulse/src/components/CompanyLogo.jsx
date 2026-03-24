// src/components/CompanyLogo.jsx
// Fetches logos via backend proxy (/api/logos) which serves cached data URLs.
// Backend fetches from Clearbit → Screener.in → Google Favicons server-side,
// so there are ZERO CORS issues in the browser.
// Falls back to styled colored initials — never shows a broken image.

import { useState, useEffect } from "react";

const BACKEND = "http://localhost:5000/api";

// ── Special non-company symbols: instant colored badges ───────────
const SPECIAL_ICONS = {
  "GC=F":       { label:"GOLD",  bg:"#d4a800" },
  "GLD":        { label:"GLD",   bg:"#d4a800" },
  "IAU":        { label:"IAU",   bg:"#c9a227" },
  "SI=F":       { label:"SILV",  bg:"#94a3b8" },
  "SLV":        { label:"SLV",   bg:"#94a3b8" },
  "CL=F":       { label:"OIL",   bg:"#78716c" },
  "BZ=F":       { label:"BRENT", bg:"#6b5c4e" },
  "^NSEI":      { label:"N50",   bg:"#0f3460" },
  "^BSESN":     { label:"BSE",   bg:"#1a3a6b" },
  "^NSEBANK":   { label:"BNK",   bg:"#1e40af" },
  "^NSEMDCP50": { label:"MID",   bg:"#1d4ed8" },
  "^CNXIT":     { label:"IT",    bg:"#4f46e5" },
  "^CNXPHARMA": { label:"PHR",   bg:"#7c3aed" },
  "^CNXFMCG":   { label:"FMC",   bg:"#059669" },
  "^CNXINFRA":  { label:"INF",   bg:"#0891b2" },
  "^CNXAUTO":   { label:"AUTO",  bg:"#b45309" },
  "^CNXMETAL":  { label:"MET",   bg:"#6b7280" },
  "^GSPC":      { label:"SPX",   bg:"#1e3a5f" },
  "^IXIC":      { label:"NDQ",   bg:"#1a1a2e" },
  "^DJI":       { label:"DJI",   bg:"#14213d" },
  "^VIX":       { label:"VIX",   bg:"#ef4444" },
  "^INDIAVIX":  { label:"VIX",   bg:"#ef4444" },
  "USDINR=X":   { label:"USD",   bg:"#15803d" },
  "EURINR=X":   { label:"EUR",   bg:"#0369a1" },
  "GBPINR=X":   { label:"GBP",   bg:"#7e22ce" },
  "EURUSD=X":   { label:"EUR",   bg:"#0369a1" },
  "USDJPY=X":   { label:"JPY",   bg:"#b91c1c" },
  "BTC-USD":    { label:"BTC",   bg:"#f59e0b" },
  "ETH-USD":    { label:"ETH",   bg:"#6366f1" },
};

// ── Color palette for initials ─────────────────────────────────────
const PALETTE = [
  "#1a1a2e","#16213e","#0f3460","#533483","#2b2d42",
  "#3d5a80","#293241","#1b4332","#3b1f2b","#2d4739",
  "#1c3144","#4a3728","#1e3a5f","#2d1b33","#1a2744",
];

function getBg(str) {
  let h = 0;
  for (let i = 0; i < (str||"").length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function getInitials(name, symbol) {
  const src = name || symbol || "?";
  return src.split(/[\s-_]+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";
}

// ── Module-level batch queue ───────────────────────────────────────
// Collects all symbols requested within 100ms and fires ONE request
const _cache    = {};   // cleanSymbol → dataUrl | null
const _waiters  = {};   // cleanSymbol → [resolve, ...]
const _queue    = new Set();
let   _timer    = null;
let   _inflight = new Set();

function cleanSym(symbol) {
  return (symbol || "").replace(/\.(NS|BO|L|T|HK|AX)$/i, "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
}

function flushQueue() {
  _timer = null;
  const batch = [..._queue].filter(s => !_inflight.has(s));
  _queue.clear();
  if (!batch.length) return;

  batch.forEach(s => _inflight.add(s));

  fetch(`${BACKEND}/logos?symbols=${batch.join(",")}`)
    .then(r => r.json())
    .then(json => {
      for (const sym of batch) {
        const url = json.data?.[sym] || null;
        _cache[sym] = url;
        _waiters[sym]?.forEach(cb => cb(url));
        delete _waiters[sym];
        _inflight.delete(sym);
      }
    })
    .catch(() => {
      for (const sym of batch) {
        _cache[sym] = null;
        _waiters[sym]?.forEach(cb => cb(null));
        delete _waiters[sym];
        _inflight.delete(sym);
      }
    });
}

function requestLogo(symbol) {
  const clean = cleanSym(symbol);
  return new Promise(resolve => {
    if (_cache[clean] !== undefined) return resolve(_cache[clean]);
    if (!_waiters[clean]) _waiters[clean] = [];
    _waiters[clean].push(resolve);
    _queue.add(clean);
    if (!_timer) _timer = setTimeout(flushQueue, 100);
  });
}

// ── Main component ─────────────────────────────────────────────────
export default function CompanyLogo({ symbol, name, size = 34 }) {
  const radius = Math.round(size * 0.26);
  const imgSize = Math.round(size * 0.72);
  const bg = getBg(name || symbol);
  const initials = getInitials(name, symbol);

  // 1. Special symbols → instant badge
  if (symbol && SPECIAL_ICONS[symbol]) {
    const s = SPECIAL_ICONS[symbol];
    return (
      <div style={{
        width:size, height:size, borderRadius:radius, flexShrink:0,
        background:s.bg, display:"flex", alignItems:"center", justifyContent:"center",
        userSelect:"none",
      }}>
        <span style={{
          fontFamily:"var(--font-display)", fontWeight:800,
          fontSize:Math.round(size*0.27), color:"#fff",
          letterSpacing:"-0.02em", lineHeight:1,
        }}>{s.label}</span>
      </div>
    );
  }

  return (
    <LogoWithFallback
      symbol={symbol}
      name={name}
      size={size}
      radius={radius}
      imgSize={imgSize}
      bg={bg}
      initials={initials}
    />
  );
}

// ── Logo fetcher with fallback to initials ─────────────────────────
function LogoWithFallback({ symbol, name, size, radius, imgSize, bg, initials }) {
  const clean = cleanSym(symbol);
  const [logoUrl, setLogoUrl] = useState(() => _cache[clean]);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
    if (!symbol) return;

    // Serve from cache instantly
    if (_cache[clean] !== undefined) {
      setLogoUrl(_cache[clean]);
      return;
    }

    setLogoUrl(undefined); // loading
    requestLogo(symbol).then(url => {
      setLogoUrl(url);
    });
  }, [symbol, clean]);

  // Loading state — show initials placeholder (same size, no flash)
  if (logoUrl === undefined) {
    return <InitialsBox size={size} radius={radius} bg={bg} initials={initials} loading />;
  }

  // No logo found or image failed — show styled initials
  if (!logoUrl || imgFailed) {
    return <InitialsBox size={size} radius={radius} bg={bg} initials={initials} />;
  }

  // Got a data URL from backend — render it
  return (
    <div style={{
      width:size, height:size, borderRadius:radius, flexShrink:0,
      background:"#ffffff", border:"1px solid #e8e8e8",
      display:"flex", alignItems:"center", justifyContent:"center",
      overflow:"hidden",
    }}>
      <img
        src={logoUrl}
        alt={name || symbol}
        width={imgSize}
        height={imgSize}
        style={{ objectFit:"contain", display:"block" }}
        onError={() => setImgFailed(true)}
      />
    </div>
  );
}

// ── Initials box ───────────────────────────────────────────────────
function InitialsBox({ size, radius, bg, initials, loading }) {
  return (
    <div style={{
      width:size, height:size, borderRadius:radius, flexShrink:0,
      background: loading ? "var(--bg3)" : bg,
      border: loading ? "1px solid var(--border)" : "1px solid rgba(255,255,255,0.07)",
      display:"flex", alignItems:"center", justifyContent:"center",
      userSelect:"none",
      transition:"background 0.2s",
    }}>
      {!loading && (
        <span style={{
          fontFamily:"var(--font-display)", fontWeight:800,
          fontSize:Math.round(size * 0.32), color:"#fff",
          letterSpacing:"-0.02em", lineHeight:1,
        }}>{initials}</span>
      )}
    </div>
  );
}