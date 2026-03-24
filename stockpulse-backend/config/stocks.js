// config/stocks.js
// Master list of stocks the system tracks

const INDIAN_STOCKS = [
  { symbol: "RELIANCE",   name: "Reliance Industries",           yahooSymbol: "RELIANCE.NS",  sector: "Energy" },
  { symbol: "TCS",        name: "Tata Consultancy Services",     yahooSymbol: "TCS.NS",       sector: "IT" },
  { symbol: "INFY",       name: "Infosys",                       yahooSymbol: "INFY.NS",      sector: "IT" },
  { symbol: "HDFCBANK",   name: "HDFC Bank",                     yahooSymbol: "HDFCBANK.NS",  sector: "Banking" },
  { symbol: "ICICIBANK",  name: "ICICI Bank",                    yahooSymbol: "ICICIBANK.NS", sector: "Banking" },
  { symbol: "WIPRO",      name: "Wipro",                         yahooSymbol: "WIPRO.NS",     sector: "IT" },
  { symbol: "BAJFINANCE", name: "Bajaj Finance",                 yahooSymbol: "BAJFINANCE.NS",sector: "Finance" },
  { symbol: "ADANIENT",   name: "Adani Enterprises",             yahooSymbol: "ADANIENT.NS",  sector: "Conglomerate" },
  { symbol: "SBIN",       name: "State Bank of India",           yahooSymbol: "SBIN.NS",      sector: "Banking" },
  { symbol: "TATAMOTORS", name: "Tata Motors",                   yahooSymbol: "TATAMOTORS.NS",sector: "Auto" },
  { symbol: "MARUTI",     name: "Maruti Suzuki",                 yahooSymbol: "MARUTI.NS",    sector: "Auto" },
  { symbol: "SUNPHARMA",  name: "Sun Pharma",                    yahooSymbol: "SUNPHARMA.NS", sector: "Pharma" },
  { symbol: "LTIM",       name: "LTIMindtree",                   yahooSymbol: "LTIM.NS",      sector: "IT" },
  { symbol: "AXISBANK",   name: "Axis Bank",                     yahooSymbol: "AXISBANK.NS",  sector: "Banking" },
  { symbol: "KOTAKBANK",  name: "Kotak Mahindra Bank",           yahooSymbol: "KOTAKBANK.NS", sector: "Banking" },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever",            yahooSymbol: "HINDUNILVR.NS",sector: "FMCG" },
  { symbol: "ITC",        name: "ITC Limited",                   yahooSymbol: "ITC.NS",       sector: "FMCG" },
  { symbol: "ONGC",       name: "Oil & Natural Gas Corp",        yahooSymbol: "ONGC.NS",      sector: "Energy" },
  { symbol: "NTPC",       name: "NTPC Limited",                  yahooSymbol: "NTPC.NS",      sector: "Power" },
  { symbol: "POWERGRID",  name: "Power Grid Corporation",        yahooSymbol: "POWERGRID.NS", sector: "Power" },
];

const GLOBAL_STOCKS = [
  { symbol: "AAPL",   name: "Apple Inc.",           yahooSymbol: "AAPL",  sector: "Technology" },
  { symbol: "MSFT",   name: "Microsoft Corporation",yahooSymbol: "MSFT",  sector: "Technology" },
  { symbol: "GOOGL",  name: "Alphabet Inc.",         yahooSymbol: "GOOGL", sector: "Technology" },
  { symbol: "AMZN",   name: "Amazon.com Inc.",       yahooSymbol: "AMZN",  sector: "E-Commerce" },
  { symbol: "NVDA",   name: "NVIDIA Corporation",    yahooSymbol: "NVDA",  sector: "Semiconductors" },
  { symbol: "TSLA",   name: "Tesla Inc.",            yahooSymbol: "TSLA",  sector: "Auto/EV" },
  { symbol: "META",   name: "Meta Platforms",        yahooSymbol: "META",  sector: "Social Media" },
  { symbol: "JPM",    name: "JPMorgan Chase",        yahooSymbol: "JPM",   sector: "Banking" },
];

// Keywords used by AgentA and AgentB to filter relevant news
const INDIAN_SEARCH_KEYWORDS = [
  "NSE", "BSE", "Nifty", "Sensex", "RBI", "SEBI",
  "Indian stock", "India market", "Dalal Street",
  ...INDIAN_STOCKS.map(s => s.name),
  ...INDIAN_STOCKS.map(s => s.symbol),
];

const GLOBAL_SEARCH_KEYWORDS = [
  "stock market", "NYSE", "NASDAQ", "S&P 500", "Federal Reserve",
  "earnings", "IPO", "merger", "acquisition", "market rally",
  "market crash", "interest rate", "inflation",
  ...GLOBAL_STOCKS.map(s => s.name),
];

module.exports = {
  INDIAN_STOCKS,
  GLOBAL_STOCKS,
  ALL_STOCKS: [...INDIAN_STOCKS, ...GLOBAL_STOCKS],
  INDIAN_SEARCH_KEYWORDS,
  GLOBAL_SEARCH_KEYWORDS,
};