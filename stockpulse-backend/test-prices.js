// Run this in your backend folder: node test-prices.js
// It will show exactly what price APIs work from your machine

const TEST_SYMBOLS = ["AAPL", "MSFT", "RELIANCE.NS", "TCS.NS"];

async function testSpark() {
  console.log("\n=== TEST 1: Yahoo Spark API ===");
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/spark?symbols=${TEST_SYMBOLS.join(",")}&range=1d&interval=5m`;
    const r = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json", "Referer": "https://finance.yahoo.com" }
    });
    console.log("Status:", r.status);
    const t = await r.text();
    console.log("Response:", t.slice(0, 300));
  } catch(e) { console.log("FAILED:", e.message); }
}

async function testStooq() {
  console.log("\n=== TEST 2: Stooq CSV (AAPL.US) ===");
  try {
    const r = await fetch("https://stooq.com/q/l/?s=aapl.us&f=sd2t2ohlcvn&e=csv");
    const t = await r.text();
    console.log("Response:", t);
  } catch(e) { console.log("FAILED:", e.message); }
}

async function testStooqIndia() {
  console.log("\n=== TEST 3: Stooq CSV (RELIANCE.NS) ===");
  try {
    const r = await fetch("https://stooq.com/q/l/?s=reliance.ns&f=sd2t2ohlcvn&e=csv");
    const t = await r.text();
    console.log("Response:", t);
  } catch(e) { console.log("FAILED:", e.message); }
}

async function testYahooQuote() {
  console.log("\n=== TEST 4: Yahoo v8/finance/quote ===");
  try {
    const r = await fetch("https://query2.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=1d", {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" }
    });
    console.log("Status:", r.status);
    const j = await r.json();
    const meta = j?.chart?.result?.[0]?.meta;
    console.log("AAPL price:", meta?.regularMarketPrice, meta?.currency);
  } catch(e) { console.log("FAILED:", e.message); }
}

async function testYahooQuoteV7() {
  console.log("\n=== TEST 5: Yahoo v7 crumb (currently used by yahoo-finance2) ===");
  try {
    const r = await fetch("https://query1.finance.yahoo.com/v7/finance/quote?symbols=AAPL", {
      headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" }
    });
    console.log("Status:", r.status, r.statusText);
    const t = await r.text();
    console.log("Response:", t.slice(0,200));
  } catch(e) { console.log("FAILED:", e.message); }
}

(async () => {
  await testSpark();
  await testStooq();
  await testStooqIndia();
  await testYahooQuote();
  await testYahooQuoteV7();
  console.log("\n=== DONE ===");
})();