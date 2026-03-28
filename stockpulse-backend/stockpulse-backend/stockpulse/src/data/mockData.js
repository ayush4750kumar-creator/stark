// src/data/mockData.js

export const STOCKS = [
  { symbol: "RELIANCE", name: "Reliance Industries", price: 2847.60, change: +34.20, changePct: +1.22, sector: "Energy" },
  { symbol: "TCS", name: "Tata Consultancy Services", price: 3921.15, change: -18.45, changePct: -0.47, sector: "IT" },
  { symbol: "INFY", name: "Infosys", price: 1567.80, change: +22.10, changePct: +1.43, sector: "IT" },
  { symbol: "HDFCBANK", name: "HDFC Bank", price: 1689.30, change: -9.75, changePct: -0.57, sector: "Banking" },
  { symbol: "ICICIBANK", name: "ICICI Bank", price: 1102.45, change: +15.60, changePct: +1.43, sector: "Banking" },
  { symbol: "WIPRO", name: "Wipro", price: 487.20, change: +5.80, changePct: +1.21, sector: "IT" },
  { symbol: "BAJFINANCE", name: "Bajaj Finance", price: 7234.50, change: -123.40, changePct: -1.68, sector: "Finance" },
  { symbol: "ADANIENT", name: "Adani Enterprises", price: 2456.75, change: +89.30, changePct: +3.77, sector: "Conglomerate" },
  { symbol: "SBIN", name: "State Bank of India", price: 812.60, change: +12.40, changePct: +1.55, sector: "Banking" },
  { symbol: "TATAMOTORS", name: "Tata Motors", price: 978.30, change: -7.20, changePct: -0.73, sector: "Auto" },
  { symbol: "MARUTI", name: "Maruti Suzuki", price: 11240.00, change: +210.50, changePct: +1.91, sector: "Auto" },
  { symbol: "SUNPHARMA", name: "Sun Pharma", price: 1623.40, change: +34.80, changePct: +2.19, sector: "Pharma" },
];

export const TRENDING_STOCKS = ["RELIANCE", "TCS", "ADANIENT", "SBIN", "TATAMOTORS"];
export const BEST_BUY = ["INFY", "MARUTI", "SUNPHARMA"];
export const BEST_SELL = ["BAJFINANCE", "HDFCBANK"];

export const NEWS_FEED = [
  {
    id: 1,
    symbol: "RELIANCE",
    company: "Reliance Industries",
    headline: "Reliance Jio adds 4.2M subscribers; stock surges on strong quarterly results.",
    summary: "Jio's record subscriber growth drives Reliance to all-time high amid bullish investor sentiment.",
    sentiment: "bullish",
    price: 2847.60,
    change: +1.22,
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&q=80",
    time: "2 min ago",
    source: "Economic Times",
    article: `Reliance Industries Ltd posted a stellar performance this quarter, driven primarily by its telecom arm Jio Platforms. The company added 4.2 million new subscribers, bringing the total user base to over 470 million — a figure that has analysts buzzing with optimism.\n\nThe retail segment also showed resilience, posting a 14% year-over-year revenue growth. Chairman Mukesh Ambani highlighted the company's green energy push, with a ₹75,000 crore investment planned over the next three years in solar and hydrogen projects.\n\nInstitutional investors have been aggressively accumulating the stock, with FII net buying reaching ₹1,200 crore in the past week alone. Technically, the stock broke a key resistance level at ₹2,800 and now eyes ₹3,100 as the next target.`,
    stats: { marketCap: "19.2L Cr", pe: 28.4, pb: 2.1, eps: 100.3, roe: 8.2, debtEquity: 0.43, faceValue: 10, bookValue: 1356, divYield: 0.3, indPE: 24.1 },
    ohlc: { open: 2810, close: 2847, low: 2795, high: 2863, yearLow: 2220, yearHigh: 2950 },
    rsi: 68, macdSignal: "bullish",
    chartData: generateChartData(2500, 2847),
  },
  {
    id: 2,
    symbol: "TCS",
    company: "Tata Consultancy Services",
    headline: "TCS misses Q3 revenue estimates; deal wins at $9.2B signal recovery ahead.",
    summary: "Despite revenue miss, massive deal pipeline suggests TCS may rebound in upcoming quarters.",
    sentiment: "neutral",
    price: 3921.15,
    change: -0.47,
    image: "https://images.unsplash.com/photo-1518186285589-2f7649de83e0?w=400&q=80",
    time: "14 min ago",
    source: "Mint",
    article: `Tata Consultancy Services reported Q3 revenues of $7.1 billion, slightly below analyst estimates of $7.3 billion. However, the company's deal wins of $9.2 billion for the quarter — the highest in six quarters — gave markets reason to remain cautiously optimistic.\n\nCEO K Krithivasan noted that discretionary spending remains under pressure in key geographies like North America and Europe, but the BFSI segment is showing early signs of recovery. The company's headcount reduction of 5,000 employees reflects its focus on operational efficiency.\n\nAnalysts from Goldman Sachs maintained a 'Buy' rating with a target price of ₹4,400, citing the strong deal pipeline as the primary catalyst for re-rating.`,
    stats: { marketCap: "14.2L Cr", pe: 31.2, pb: 13.4, eps: 125.8, roe: 43.1, debtEquity: 0.02, faceValue: 1, bookValue: 293, divYield: 1.7, indPE: 28.6 },
    ohlc: { open: 3945, close: 3921, low: 3905, high: 3960, yearLow: 3200, yearHigh: 4200 },
    rsi: 45, macdSignal: "neutral",
    chartData: generateChartData(3600, 3921),
  },
  {
    id: 3,
    symbol: "ADANIENT",
    company: "Adani Enterprises",
    headline: "Adani Group wins ₹12,000Cr airport modernization contract; shares jump 3.7%.",
    summary: "New infrastructure contract boosts Adani Enterprises; analysts raise targets amid growth momentum.",
    sentiment: "bullish",
    price: 2456.75,
    change: +3.77,
    image: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=400&q=80",
    time: "31 min ago",
    source: "Business Standard",
    article: `Adani Enterprises secured a major contract worth ₹12,000 crore for the modernization and expansion of six airports across India. This win adds to the group's already robust infrastructure portfolio and comes at a time when India's aviation sector is witnessing unprecedented growth.\n\nThe company's airport business, managed through Adani Airport Holdings, now operates eight airports across India. Traffic at these airports has grown by 22% year-over-year, outpacing the industry average of 15%.\n\nThe stock reacted strongly, surging 3.77% on high volumes — nearly 2.5x the 30-day average. Several brokerages upgraded the stock to 'Strong Buy' following the announcement.`,
    stats: { marketCap: "2.8L Cr", pe: 87.4, pb: 5.2, eps: 28.1, roe: 6.0, debtEquity: 1.82, faceValue: 1, bookValue: 472, divYield: 0.0, indPE: 42.0 },
    ohlc: { open: 2370, close: 2456, low: 2350, high: 2480, yearLow: 1850, yearHigh: 3050 },
    rsi: 74, macdSignal: "bullish",
    chartData: generateChartData(2000, 2456),
  },
  {
    id: 4,
    symbol: "BAJFINANCE",
    company: "Bajaj Finance",
    headline: "Bajaj Finance NPA concerns grow as RBI raises red flags on consumer lending.",
    summary: "Regulatory pressure and rising bad loans drag Bajaj Finance lower amid broader NBFC caution.",
    sentiment: "bearish",
    price: 7234.50,
    change: -1.68,
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&q=80",
    time: "1 hr ago",
    source: "Reuters India",
    article: `The Reserve Bank of India's latest circular flagging elevated stress in consumer lending segments sent ripples across the NBFC sector, with Bajaj Finance bearing the brunt. The company's gross NPA ratio has risen to 1.1% from 0.85% a year ago — still low by industry standards but the direction of movement concerns analysts.\n\nManagement acknowledged the headwinds in an investor call, assuring that the provisioning coverage remains adequate at 67%. The company's AUM grew 28% year-over-year to ₹3.4 lakh crore, but the growth trajectory is expected to moderate.\n\nShort interest in the stock has risen sharply, with futures data suggesting institutional hedging activity.`,
    stats: { marketCap: "4.4L Cr", pe: 32.1, pb: 5.8, eps: 225.4, roe: 18.2, debtEquity: 3.2, faceValue: 2, bookValue: 1247, divYield: 0.4, indPE: 28.0 },
    ohlc: { open: 7360, close: 7234, low: 7180, high: 7390, yearLow: 6200, yearHigh: 8200 },
    rsi: 28, macdSignal: "bearish",
    chartData: generateChartData(7800, 7234),
  },
  {
    id: 5,
    symbol: "SBIN",
    company: "State Bank of India",
    headline: "SBI reports 18% profit jump; loan book crosses ₹35 lakh crore for first time.",
    summary: "SBI's record profit and loan growth signal strong banking sector revival amid economic expansion.",
    sentiment: "bullish",
    price: 812.60,
    change: +1.55,
    image: "https://images.unsplash.com/photo-1501167786227-4cba60f6d58f?w=400&q=80",
    time: "2 hr ago",
    source: "NDTV Profit",
    article: `State Bank of India posted a net profit of ₹19,800 crore for Q3FY25, an 18% increase year-over-year, beating analyst expectations of ₹17,500 crore. The bank's loan book crossed the historic ₹35 lakh crore mark, driven by strong retail and SME lending.\n\nNet Interest Margin (NIM) improved to 3.45% from 3.28% in the same period last year, reflecting the bank's improved pricing power. The gross NPA ratio declined to 2.3%, the lowest in over a decade, underscoring the quality of the book.\n\nThe stock touched a 52-week high during intraday trade and analysts see potential for further upside as the credit cycle remains supportive.`,
    stats: { marketCap: "7.2L Cr", pe: 10.4, pb: 1.6, eps: 78.1, roe: 15.8, debtEquity: 12.4, faceValue: 1, bookValue: 507, divYield: 1.8, indPE: 12.2 },
    ohlc: { open: 800, close: 812, low: 796, high: 818, yearLow: 620, yearHigh: 830 },
    rsi: 62, macdSignal: "bullish",
    chartData: generateChartData(680, 812),
  },
  {
    id: 6,
    symbol: "INFY",
    company: "Infosys",
    headline: "Infosys raises FY25 guidance to 4.5-5%; AI-driven deals fuel confidence.",
    summary: "Upgraded guidance and surging AI project wins position Infosys as top IT sector pick this year.",
    sentiment: "bullish",
    price: 1567.80,
    change: +1.43,
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad979?w=400&q=80",
    time: "3 hr ago",
    source: "Bloomberg Quint",
    article: `Infosys raised its full-year revenue growth guidance to 4.5-5% in constant currency terms, up from the earlier estimate of 3.75-4.5%. The upgrade was primarily driven by a strong pipeline of AI and cloud transformation deals, with the company signing $2.1 billion in large deals during the quarter.\n\nCEO Salil Parekh highlighted that AI-related services now account for over 15% of new deal TCV, up from virtually zero two years ago. The company's Infosys Topaz AI platform has been adopted by over 300 clients globally.\n\nThe stock reacted positively, touching ₹1,580 intraday before settling. Analysts from Morgan Stanley upgraded the stock to 'Overweight' with a target of ₹1,850.`,
    stats: { marketCap: "6.5L Cr", pe: 27.8, pb: 9.1, eps: 56.4, roe: 32.7, debtEquity: 0.03, faceValue: 5, bookValue: 172, divYield: 2.1, indPE: 28.6 },
    ohlc: { open: 1545, close: 1567, low: 1538, high: 1582, yearLow: 1280, yearHigh: 1740 },
    rsi: 58, macdSignal: "bullish",
    chartData: generateChartData(1300, 1567),
  },
];

function generateChartData(startPrice, endPrice) {
  const data = [];
  const days = 30;
  let price = startPrice;
  const step = (endPrice - startPrice) / days;
  for (let i = 0; i < days; i++) {
    price += step + (Math.random() - 0.5) * (startPrice * 0.02);
    data.push({
      day: i + 1,
      price: Math.round(price * 100) / 100,
      volume: Math.floor(Math.random() * 5000000) + 1000000,
    });
  }
  return data;
}

export const REVENUE_DATA = [
  { month: "Jan", revenue: 4200, profit: 820, expenses: 3380, netWorth: 18200, ebit: 1100 },
  { month: "Feb", revenue: 3900, profit: 710, expenses: 3190, netWorth: 18910, ebit: 980 },
  { month: "Mar", revenue: 4800, profit: 1020, expenses: 3780, netWorth: 19930, ebit: 1340 },
  { month: "Apr", revenue: 5100, profit: 1150, expenses: 3950, netWorth: 21080, ebit: 1490 },
  { month: "May", revenue: 4700, profit: 940, expenses: 3760, netWorth: 22020, ebit: 1220 },
  { month: "Jun", revenue: 5400, profit: 1280, expenses: 4120, netWorth: 23300, ebit: 1650 },
];