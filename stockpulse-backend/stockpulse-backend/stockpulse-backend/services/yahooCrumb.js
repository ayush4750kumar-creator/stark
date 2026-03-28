// services/yahooCrumb.js
// Yahoo Finance now requires a crumb token + cookie for all API calls.
// This module fetches and caches the crumb so other services can use it.

let _crumb  = null;
let _cookie = null;
let _fetchedAt = 0;
const CRUMB_TTL = 60 * 60 * 1000; // 1 hour

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function fetchCrumb() {
  // Step 1: hit the consent/cookie page to get a session cookie
  try {
    const cookieRes = await fetch("https://fc.yahoo.com", {
      headers: { "User-Agent": UA },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    const rawCookie = cookieRes.headers.get("set-cookie") || "";
    _cookie = rawCookie.split(";")[0] || "";
  } catch {
    // fc.yahoo.com sometimes fails — try without cookie
    _cookie = "";
  }

  // Step 2: hit any Yahoo Finance page to get a crumb
  const crumbRes = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
    headers: {
      "User-Agent": UA,
      "Cookie": _cookie,
      "Accept": "*/*",
      "Referer": "https://finance.yahoo.com",
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!crumbRes.ok) {
    // Fallback: scrape from the finance.yahoo.com page
    const pageRes = await fetch("https://finance.yahoo.com/quote/AAPL", {
      headers: { "User-Agent": UA, "Cookie": _cookie },
      signal: AbortSignal.timeout(10000),
    });
    const html = await pageRes.text();
    const match = html.match(/"crumb"\s*:\s*"([^"]+)"/);
    if (match) {
      _crumb     = match[1].replace(/\\u002F/g, "/");
      _fetchedAt = Date.now();
      console.log(`  🔑 Yahoo crumb (scraped): ${_crumb.slice(0, 8)}...`);
      return _crumb;
    }
    throw new Error(`crumb endpoint ${crumbRes.status}`);
  }

  _crumb     = (await crumbRes.text()).trim();
  _fetchedAt = Date.now();
  console.log(`  🔑 Yahoo crumb fetched: ${_crumb.slice(0, 8)}...`);
  return _crumb;
}

async function getCrumb() {
  if (_crumb && (Date.now() - _fetchedAt) < CRUMB_TTL) return { crumb: _crumb, cookie: _cookie };
  try {
    await fetchCrumb();
    return { crumb: _crumb, cookie: _cookie };
  } catch (e) {
    console.warn("  ⚠ Failed to get Yahoo crumb:", e.message);
    return { crumb: null, cookie: null };
  }
}

function getHeaders(crumb, cookie) {
  return {
    "User-Agent": UA,
    "Accept": "application/json, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://finance.yahoo.com",
    ...(cookie ? { "Cookie": cookie } : {}),
  };
}

module.exports = { getCrumb, getHeaders };