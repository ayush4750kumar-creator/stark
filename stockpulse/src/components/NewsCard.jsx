// src/components/NewsCard.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";

function liveRelativeTime(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (isNaN(diff) || diff < 0) return "just now";
  const s = Math.floor(diff / 1000);
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (s < 60)  return "just now";
  if (m < 60)  return `${m}m ago`;
  if (h < 24)  return `${h}h ago`;
  if (d < 30)  return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" });
}

// Detect sentiment direction from Groq's full sentence
function sentimentDirection(text) {
  if (!text) return "neutral";
  const t = text.toLowerCase();
  if (t.includes("positiv") || t.includes("bullish") || t.includes("upside") || t.includes("benefit") || t.includes("boost") || t.includes("gain")) return "bullish";
  if (t.includes("negativ") || t.includes("bearish") || t.includes("downside") || t.includes("concern") || t.includes("risk") || t.includes("decline") || t.includes("loss")) return "bearish";
  return "neutral";
}

// Truncate text to approximately N words
function truncateWords(text, n) {
  if (!text) return "";
  const words = text.trim().split(/\s+/);
  if (words.length <= n) return text;
  return words.slice(0, n).join(" ") + "…";
}

const IMG_DB = {
  banking: [
    "https://images.pexels.com/photos/6801640/pexels-photo-6801640.jpeg?w=700",
    "https://images.pexels.com/photos/6801641/pexels-photo-6801641.jpeg?w=700",
    "https://images.pexels.com/photos/6801642/pexels-photo-6801642.jpeg?w=700",
    "https://images.pexels.com/photos/6801643/pexels-photo-6801643.jpeg?w=700",
    "https://images.pexels.com/photos/6801644/pexels-photo-6801644.jpeg?w=700",
    "https://images.pexels.com/photos/6801645/pexels-photo-6801645.jpeg?w=700",
    "https://images.pexels.com/photos/6801646/pexels-photo-6801646.jpeg?w=700",
    "https://images.pexels.com/photos/6801647/pexels-photo-6801647.jpeg?w=700",
    "https://images.pexels.com/photos/6801648/pexels-photo-6801648.jpeg?w=700",
    "https://images.pexels.com/photos/6801649/pexels-photo-6801649.jpeg?w=700",
    "https://images.pexels.com/photos/6801650/pexels-photo-6801650.jpeg?w=700",
    "https://images.pexels.com/photos/6801651/pexels-photo-6801651.jpeg?w=700",
    "https://images.pexels.com/photos/6801652/pexels-photo-6801652.jpeg?w=700",
    "https://images.pexels.com/photos/6801653/pexels-photo-6801653.jpeg?w=700",
    "https://images.pexels.com/photos/6801654/pexels-photo-6801654.jpeg?w=700",
    "https://images.pexels.com/photos/6801655/pexels-photo-6801655.jpeg?w=700",
    "https://images.pexels.com/photos/6801874/pexels-photo-6801874.jpeg?w=700",
    "https://images.pexels.com/photos/6801875/pexels-photo-6801875.jpeg?w=700",
    "https://images.pexels.com/photos/6801876/pexels-photo-6801876.jpeg?w=700",
    "https://images.pexels.com/photos/6801877/pexels-photo-6801877.jpeg?w=700",
    "https://images.pexels.com/photos/7567443/pexels-photo-7567443.jpeg?w=700",
    "https://images.pexels.com/photos/7567444/pexels-photo-7567444.jpeg?w=700",
    "https://images.pexels.com/photos/7567445/pexels-photo-7567445.jpeg?w=700",
    "https://images.pexels.com/photos/7567446/pexels-photo-7567446.jpeg?w=700",
    "https://images.pexels.com/photos/5716001/pexels-photo-5716001.jpeg?w=700",
    "https://images.pexels.com/photos/5716002/pexels-photo-5716002.jpeg?w=700",
    "https://images.pexels.com/photos/5716003/pexels-photo-5716003.jpeg?w=700",
    "https://images.pexels.com/photos/8370752/pexels-photo-8370752.jpeg?w=700",
    "https://images.pexels.com/photos/8370753/pexels-photo-8370753.jpeg?w=700",
    "https://images.pexels.com/photos/8370772/pexels-photo-8370772.jpeg?w=700",
    "https://images.pexels.com/photos/5980856/pexels-photo-5980856.jpeg?w=700",
    "https://images.pexels.com/photos/5980857/pexels-photo-5980857.jpeg?w=700",
    "https://images.pexels.com/photos/6802042/pexels-photo-6802042.jpeg?w=700",
    "https://images.pexels.com/photos/6802043/pexels-photo-6802043.jpeg?w=700",
    "https://images.pexels.com/photos/4386368/pexels-photo-4386368.jpeg?w=700",
  ],
  market: [
    "https://images.pexels.com/photos/6801650/pexels-photo-6801650.jpeg?w=700",
    "https://images.pexels.com/photos/6801651/pexels-photo-6801651.jpeg?w=700",
    "https://images.pexels.com/photos/6801874/pexels-photo-6801874.jpeg?w=700",
    "https://images.pexels.com/photos/6801875/pexels-photo-6801875.jpeg?w=700",
    "https://images.pexels.com/photos/7567443/pexels-photo-7567443.jpeg?w=700",
    "https://images.pexels.com/photos/7567444/pexels-photo-7567444.jpeg?w=700",
    "https://images.pexels.com/photos/7567460/pexels-photo-7567460.jpeg?w=700",
    "https://images.pexels.com/photos/7567461/pexels-photo-7567461.jpeg?w=700",
    "https://images.pexels.com/photos/5716001/pexels-photo-5716001.jpeg?w=700",
    "https://images.pexels.com/photos/5716032/pexels-photo-5716032.jpeg?w=700",
    "https://images.pexels.com/photos/8370752/pexels-photo-8370752.jpeg?w=700",
    "https://images.pexels.com/photos/8370772/pexels-photo-8370772.jpeg?w=700",
    "https://images.pexels.com/photos/5980856/pexels-photo-5980856.jpeg?w=700",
    "https://images.pexels.com/photos/6802042/pexels-photo-6802042.jpeg?w=700",
    "https://images.pexels.com/photos/4386368/pexels-photo-4386368.jpeg?w=700",
    "https://images.pexels.com/photos/4386369/pexels-photo-4386369.jpeg?w=700",
    "https://images.pexels.com/photos/4386467/pexels-photo-4386467.jpeg?w=700",
    "https://images.pexels.com/photos/4386469/pexels-photo-4386469.jpeg?w=700",
  ],
  tech: [
    "https://images.pexels.com/photos/546819/pexels-photo-546819.jpeg?w=700",
    "https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?w=700",
    "https://images.pexels.com/photos/1181271/pexels-photo-1181271.jpeg?w=700",
    "https://images.pexels.com/photos/1181298/pexels-photo-1181298.jpeg?w=700",
    "https://images.pexels.com/photos/1181673/pexels-photo-1181673.jpeg?w=700",
    "https://images.pexels.com/photos/373543/pexels-photo-373543.jpeg?w=700",
    "https://images.pexels.com/photos/574071/pexels-photo-574071.jpeg?w=700",
    "https://images.pexels.com/photos/270348/pexels-photo-270348.jpeg?w=700",
    "https://images.pexels.com/photos/3861958/pexels-photo-3861958.jpeg?w=700",
    "https://images.pexels.com/photos/4164418/pexels-photo-4164418.jpeg?w=700",
    "https://images.pexels.com/photos/1148820/pexels-photo-1148820.jpeg?w=700",
    "https://images.pexels.com/photos/2004161/pexels-photo-2004161.jpeg?w=700",
    "https://images.pexels.com/photos/2582928/pexels-photo-2582928.jpeg?w=700",
    "https://images.pexels.com/photos/2599244/pexels-photo-2599244.jpeg?w=700",
    "https://images.pexels.com/photos/1714208/pexels-photo-1714208.jpeg?w=700",
    "https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?w=700",
    "https://images.pexels.com/photos/4974914/pexels-photo-4974914.jpeg?w=700",
    "https://images.pexels.com/photos/6801640/pexels-photo-6801640.jpeg?w=700",
  ],
  energy: [
    "https://images.pexels.com/photos/9875404/pexels-photo-9875404.jpeg?w=700",
    "https://images.pexels.com/photos/9875409/pexels-photo-9875409.jpeg?w=700",
    "https://images.pexels.com/photos/9875414/pexels-photo-9875414.jpeg?w=700",
    "https://images.pexels.com/photos/411195/pexels-photo-411195.jpeg?w=700",
    "https://images.pexels.com/photos/414837/pexels-photo-414837.jpeg?w=700",
    "https://images.pexels.com/photos/4254151/pexels-photo-4254151.jpeg?w=700",
    "https://images.pexels.com/photos/5691659/pexels-photo-5691659.jpeg?w=700",
    "https://images.pexels.com/photos/1643409/pexels-photo-1643409.jpeg?w=700",
    "https://images.pexels.com/photos/2988230/pexels-photo-2988230.jpeg?w=700",
    "https://images.pexels.com/photos/1036935/pexels-photo-1036935.jpeg?w=700",
    "https://images.pexels.com/photos/60575/pexels-photo-60575.jpeg?w=700",
    "https://images.pexels.com/photos/1108116/pexels-photo-1108116.jpeg?w=700",
    "https://images.pexels.com/photos/1108572/pexels-photo-1108572.jpeg?w=700",
    "https://images.pexels.com/photos/5980856/pexels-photo-5980856.jpeg?w=700",
  ],
  auto: [
    "https://images.pexels.com/photos/6801640/pexels-photo-6801640.jpeg?w=700",
    "https://images.pexels.com/photos/6801641/pexels-photo-6801641.jpeg?w=700",
    "https://images.pexels.com/photos/7567443/pexels-photo-7567443.jpeg?w=700",
    "https://images.pexels.com/photos/7567460/pexels-photo-7567460.jpeg?w=700",
    "https://images.pexels.com/photos/5716001/pexels-photo-5716001.jpeg?w=700",
    "https://images.pexels.com/photos/5716032/pexels-photo-5716032.jpeg?w=700",
    "https://images.pexels.com/photos/8370752/pexels-photo-8370752.jpeg?w=700",
    "https://images.pexels.com/photos/8370772/pexels-photo-8370772.jpeg?w=700",
    "https://images.pexels.com/photos/5980856/pexels-photo-5980856.jpeg?w=700",
    "https://images.pexels.com/photos/6802042/pexels-photo-6802042.jpeg?w=700",
    "https://images.pexels.com/photos/4386368/pexels-photo-4386368.jpeg?w=700",
  ],
  pharma: [
    "https://images.pexels.com/photos/3786126/pexels-photo-3786126.jpeg?w=700",
    "https://images.pexels.com/photos/3786127/pexels-photo-3786127.jpeg?w=700",
    "https://images.pexels.com/photos/139398/pexels-photo-139398.jpeg?w=700",
    "https://images.pexels.com/photos/3683056/pexels-photo-3683056.jpeg?w=700",
    "https://images.pexels.com/photos/3683098/pexels-photo-3683098.jpeg?w=700",
    "https://images.pexels.com/photos/3825586/pexels-photo-3825586.jpeg?w=700",
    "https://images.pexels.com/photos/4047077/pexels-photo-4047077.jpeg?w=700",
    "https://images.pexels.com/photos/5863391/pexels-photo-5863391.jpeg?w=700",
    "https://images.pexels.com/photos/6801640/pexels-photo-6801640.jpeg?w=700",
  ],
  retail: [
    "https://images.pexels.com/photos/1267350/pexels-photo-1267350.jpeg?w=700",
    "https://images.pexels.com/photos/3769747/pexels-photo-3769747.jpeg?w=700",
    "https://images.pexels.com/photos/1005638/pexels-photo-1005638.jpeg?w=700",
    "https://images.pexels.com/photos/5632397/pexels-photo-5632397.jpeg?w=700",
    "https://images.pexels.com/photos/3962285/pexels-photo-3962285.jpeg?w=700",
    "https://images.pexels.com/photos/1884581/pexels-photo-1884581.jpeg?w=700",
  ],
  india: [
    "https://images.pexels.com/photos/1007424/pexels-photo-1007424.jpeg?w=700",
    "https://images.pexels.com/photos/1007425/pexels-photo-1007425.jpeg?w=700",
    "https://images.pexels.com/photos/3520361/pexels-photo-3520361.jpeg?w=700",
    "https://images.pexels.com/photos/1587927/pexels-photo-1587927.jpeg?w=700",
    "https://images.pexels.com/photos/1603650/pexels-photo-1603650.jpeg?w=700",
    "https://images.pexels.com/photos/2846217/pexels-photo-2846217.jpeg?w=700",
  ],
  fmcg: [
    "https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg?w=700",
    "https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?w=700",
    "https://images.pexels.com/photos/5946958/pexels-photo-5946958.jpeg?w=700",
    "https://images.pexels.com/photos/3962292/pexels-photo-3962292.jpeg?w=700",
    "https://images.pexels.com/photos/6801640/pexels-photo-6801640.jpeg?w=700",
  ],
  realestate: [
    "https://images.pexels.com/photos/106399/pexels-photo-106399.jpeg?w=700",
    "https://images.pexels.com/photos/1546166/pexels-photo-1546166.jpeg?w=700",
    "https://images.pexels.com/photos/280222/pexels-photo-280222.jpeg?w=700",
    "https://images.pexels.com/photos/1396122/pexels-photo-1396122.jpeg?w=700",
    "https://images.pexels.com/photos/2102587/pexels-photo-2102587.jpeg?w=700",
    "https://images.pexels.com/photos/323780/pexels-photo-323780.jpeg?w=700",
  ],
  infrastructure: [
    "https://images.pexels.com/photos/236714/pexels-photo-236714.jpeg?w=700",
    "https://images.pexels.com/photos/1105766/pexels-photo-1105766.jpeg?w=700",
    "https://images.pexels.com/photos/247763/pexels-photo-247763.jpeg?w=700",
    "https://images.pexels.com/photos/2219024/pexels-photo-2219024.jpeg?w=700",
  ],
  conglomerate: [
    "https://images.pexels.com/photos/325185/pexels-photo-325185.jpeg?w=700",
    "https://images.pexels.com/photos/1454360/pexels-photo-1454360.jpeg?w=700",
    "https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg?w=700",
    "https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?w=700",
    "https://images.pexels.com/photos/1642228/pexels-photo-1642228.jpeg?w=700",
  ],
};

const SUBTOPIC_RULES = [
  { keys:["credit card","debit card","card spend","card issuer"],         pool:"banking" },
  { keys:["interest rate","repo rate","rbi rate","fed rate","rate hike"], pool:"market"  },
  { keys:["ipo","initial public offering","listing","nse debut"],         pool:"market"  },
  { keys:["loan","lending","npa","bad loan","credit","nbfc","emi"],        pool:"banking" },
  { keys:["bank","hdfc","icici","sbi","kotak","axis","rbl","pnb","barclays","jpmorgan","goldman"], pool:"banking" },
  { keys:["insurance","lic","bajaj allianz","policy","premium","claim"],  pool:"banking" },
  { keys:["mutual fund","sip","aum","nav","asset management"],            pool:"market"  },
  { keys:["rupee","dollar","forex","currency","exchange rate"],            pool:"market"  },
  { keys:["inflation","cpi","wpi","gdp","fiscal deficit","rbi"],          pool:"india"   },
  { keys:["artificial intelligence","ai model","chatgpt","llm","generative ai"], pool:"tech" },
  { keys:["chip","semiconductor","nvidia","tsmc","amd","intel","wafer"],  pool:"tech"    },
  { keys:["cloud","aws","azure","google cloud","saas"],                   pool:"tech"    },
  { keys:["cybersecurity","data breach","hack","ransomware","malware"],   pool:"tech"    },
  { keys:["5g","6g","telecom","spectrum","jio","airtel","bsnl"],          pool:"infrastructure" },
  { keys:["software","tcs","infosys","wipro","hcl","tech mahindra"],      pool:"tech"    },
  { keys:["smartphone","iphone","android","samsung","apple"],             pool:"tech"    },
  { keys:["startup","unicorn","funding","series a","venture capital"],    pool:"tech"    },
  { keys:["solar panel","solar farm","solar energy","solar power"],       pool:"energy"  },
  { keys:["wind turbine","wind energy","wind farm","offshore wind"],      pool:"energy"  },
  { keys:["oil price","crude oil","brent","wti","opec","petroleum"],      pool:"energy"  },
  { keys:["natural gas","lng","gas pipeline","gas price"],                pool:"energy"  },
  { keys:["electric vehicle","ev","charging station","battery"],          pool:"auto"    },
  { keys:["renewable","green energy","clean energy","carbon"],            pool:"energy"  },
  { keys:["car launch","new model","suv launch","sedan"],                 pool:"auto"    },
  { keys:["maruti","tata motors","hyundai","mahindra","kia","mg motors"], pool:"auto"    },
  { keys:["tesla","rivian","lucid","ford","gm","volkswagen","bmw"],       pool:"auto"    },
  { keys:["automobile","auto sales","vehicle sales","two-wheeler"],       pool:"auto"    },
  { keys:["drug approval","fda","clinical trial","phase 3","nda"],        pool:"pharma"  },
  { keys:["vaccine","covid","mrna","booster","immunization"],             pool:"pharma"  },
  { keys:["hospital","healthcare","diagnostic","patient","medicine"],     pool:"pharma"  },
  { keys:["sun pharma","cipla","drl","lupin","biocon","abbott"],          pool:"pharma"  },
  { keys:["ecommerce","amazon","flipkart","online shopping","delivery"],  pool:"retail"  },
  { keys:["supermarket","grocery","d-mart","big bazaar","reliance retail"], pool:"retail" },
  { keys:["fmcg","hindustan unilever","nestle","itc","dabur","marico"],   pool:"fmcg"   },
  { keys:["food delivery","zomato","swiggy","restaurant"],                pool:"retail"  },
  { keys:["fashion","apparel","clothing","brand","luxury"],               pool:"retail"  },
  { keys:["real estate","property","housing","apartment","flat","dlf","godrej"], pool:"realestate" },
  { keys:["construction","cement","ultratech","acc","ambuja"],            pool:"infrastructure" },
  { keys:["airport","adani port","seaport","logistics","shipping"],       pool:"infrastructure" },
  { keys:["highway","road","expressway","national highway","nhai"],       pool:"infrastructure" },
  { keys:["railway","metro","train","irctc","irtc"],                      pool:"infrastructure" },
  { keys:["sensex","nifty","bse","nse","dalal street","stock market"],    pool:"market"  },
  { keys:["nasdaq","dow jones","s&p 500","wall street","nyse"],           pool:"market"  },
  { keys:["profit","revenue","earnings","quarterly results","q1","q2","q3","q4"], pool:"market" },
  { keys:["merger","acquisition","takeover","buyout","deal"],             pool:"conglomerate" },
  { keys:["budget","finance minister","nirmala","tax","income tax"],      pool:"india"   },
  { keys:["india","modi","government","sebi","rbi policy"],               pool:"india"   },
];

const _seenImgs = new Set();
export function resetSeenImgs() { _seenImgs.clear(); }

function getTopicImageUrl(headline, symbol) {
  const hl = (headline || "").toLowerCase();
  const TOPIC_QUERIES = {
    banking:        "bank,finance,money",
    tech:           "technology,computer,digital",
    energy:         "oil,energy,solar",
    auto:           "automobile,car,vehicle",
    pharma:         "medicine,healthcare,hospital",
    retail:         "shopping,retail,store",
    fmcg:           "consumer,products,grocery",
    realestate:     "realestate,property,building",
    infrastructure: "infrastructure,construction,bridge",
    india:          "india,economy,city",
    market:         "stockmarket,trading,finance",
    conglomerate:   "business,corporate,industry",
  };
  let topic = "market";
  for (const rule of SUBTOPIC_RULES) {
    if (rule.keys.some(k => hl.includes(k))) { topic = rule.pool; break; }
  }
  const SYMBOL_MAP = {
    RELIANCE:"energy", TCS:"tech", INFY:"tech", HDFCBANK:"banking", ICICIBANK:"banking",
    WIPRO:"tech", BAJFINANCE:"banking", SBIN:"banking", TATAMOTORS:"auto", MARUTI:"auto",
    ONGC:"energy", ADANIENT:"conglomerate", SUNPHARMA:"pharma", ITC:"fmcg",
    AAPL:"tech", MSFT:"tech", GOOGL:"tech", NVDA:"tech", TSLA:"auto",
    META:"tech", AMZN:"retail", JPM:"banking",
  };
  const sym = (symbol || "").replace(/\.NS$|\.BO$/, "").toUpperCase();
  if (!topic || topic === "market") topic = SYMBOL_MAP[sym] || "market";
  const query = TOPIC_QUERIES[topic] || "stockmarket,finance";
  const sig = Math.abs((headline || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % 1000;
  return `https://loremflickr.com/700/400/${query}?lock=${sig}`;
}

// Sky blue active color
const SKY_BLUE = "#38bdf8";
const SKY_BLUE_BG = "rgba(56,189,248,0.15)";
const SKY_BLUE_BORDER = "rgba(56,189,248,0.35)";

export default function NewsCard({ news, index, onTrack, trackedSymbols = [], onAboutCompany }) {
  const navigate    = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const isMarket    = !news.symbol || news.symbol === "MARKET";
  const displayTime = liveRelativeTime(news.publishedAt || news.published_at);
  const changeSign  = (news.change ?? 0) >= 0 ? "+" : "";
  const imgUrl      = news.hasImage && news.image
    ? news.image
    : getTopicImageUrl(news.headline, news.symbol);

  const label    = isMarket ? "MARKET" : (news.symbol || "").toUpperCase();
  const subLabel = isMarket ? "Global News" : (news.company || news.symbol || "");

  const shortSummary = news.summary_20 || news.summary || null;
  const longSummary  = news.summary_long || null;
  const sentiment    = news.sentiment || null;
  const sentDir      = sentimentDirection(sentiment);

  // Show "more" pill if there's sentiment or long summary to expand into
  const hasMore = !!(sentiment || longSummary || shortSummary);

  // Collapsed: show ~10 words of summary. Expanded: show full summary (longSummary or shortSummary, 50-60 words)
  const collapsedPreview = shortSummary ? truncateWords(shortSummary, 10) : null;
  const expandedSummary  = longSummary
    ? truncateWords(longSummary, 60)
    : shortSummary
      ? truncateWords(shortSummary, 60)
      : null;

  function openSource() {
    const url = news.sourceUrl || news.source_url;
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    else openDetailPage();
  }

  function openDetailPage(tab = "performance") {
    try {
      sessionStorage.setItem(`article_${news.id}`, JSON.stringify({
        id:           news.id,
        symbol:       news.symbol,
        company:      news.company,
        headline:     news.headline,
        summary_20:   shortSummary,
        summary_long: longSummary,
        full_text:    news.fullText || news.summary || "",
        sentiment:    sentiment,
        source:       news.source,
        source_url:   news.sourceUrl,
        image_url:    news.image,
        published_at: news.publishedAt,
        price:        news.price,
        change_pct:   news.change,
      }));
    } catch {}
    navigate(`/news/${news.id}?tab=${tab}`);
  }

  return (
    <div
      className="card"
      style={{
        overflow: "hidden",
        animation: `fadeIn 0.4s ease forwards`,
        animationDelay: `${index * 0.06}s`,
        opacity: 0,
        display: "flex",
        flexDirection: "column",
        minHeight: 320,
        position: "relative",
      }}
    >
      {/* Sentiment pill — top-left */}
      {sentDir !== "neutral" && (
        <div style={{
          position: "absolute", top: 12, right: 12, zIndex: 10,
          background: sentDir === "bullish" ? "rgba(74,222,128,0.88)" : "rgba(255,107,107,0.88)",
          backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
          borderRadius: 20, padding: "3px 10px",
          fontSize: 10, fontWeight: 800,
          fontFamily: "var(--font-display)", color: "#fff",
          letterSpacing: "0.06em",
          boxShadow: sentDir === "bullish"
            ? "0 2px 8px rgba(74,222,128,0.45)"
            : "0 2px 8px rgba(255,107,107,0.45)",
        }}>
          {sentDir === "bullish" ? "▲ BULLISH" : "▼ BEARISH"}
        </div>
      )}



      {/* Background image */}
      <div style={{ position: "absolute", inset: 0 }}>
        <img
          src={imgUrl} alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onError={e => { e.target.onerror = null; e.target.src = getTopicImageUrl(news.headline, news.symbol); }}
        />
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.0) 30%, rgba(0,0,0,0.28) 60%, rgba(0,0,0,0.60) 100%)",
        }} />
      </div>

      {/* Top: label + price */}
      <div style={{ position: "relative", padding: "16px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 13, color: "rgba(255,255,255,0.92)", letterSpacing: "0.08em", textShadow: "0 1px 8px rgba(0,0,0,0.5)" }}>
            {label}
          </div>
          {subLabel && subLabel !== label && (
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", fontFamily: "var(--font-display)", fontWeight: 500 }}>
              {subLabel}
            </div>
          )}
        </div>
        {!isMarket && news.price != null && (
          <div style={{ background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderRadius: 8, padding: "5px 10px", textAlign: "right", border: "1px solid rgba(255,255,255,0.18)" }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.9)" }}>{news.price.toLocaleString()}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: (news.change ?? 0) >= 0 ? "#6ee7b7" : "#fca5a5" }}>
              {news.change != null ? `${changeSign}${news.change}%` : ""}
            </div>
          </div>
        )}
      </div>

      <div style={{ flex: 1 }} />

      {/* Bottom overlay */}
      <div style={{
        position: "relative",
        background: "rgba(5,3,1,0.35)",
        backdropFilter: "blur(18px) saturate(1.4)",
        WebkitBackdropFilter: "blur(18px) saturate(1.4)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        padding: "14px 16px 0",
      }}>

        {/* Meta: time · source */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 7, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontFamily: "var(--font-display)" }}>{displayTime}</span>
          {news.source && (
            <>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.22)" }}>·</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontFamily: "var(--font-display)" }}>{news.source}</span>
            </>
          )}
        </div>

        {/* Action buttons — above headline */}
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button
            onClick={e => { e.stopPropagation(); openSource(); }}
            style={{ flex: 1, padding: "6px 0", borderRadius: 8, fontSize: 11, fontWeight: 600, fontFamily: "var(--font-display)", cursor: "pointer", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.22)", color: "rgba(255,255,255,0.85)", transition: "background 0.2s, color 0.2s" }}
            onMouseEnter={e => { e.currentTarget.style.background = SKY_BLUE_BG; e.currentTarget.style.color = SKY_BLUE; e.currentTarget.style.borderColor = SKY_BLUE_BORDER; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "rgba(255,255,255,0.85)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)"; }}
          >Read Article ↗</button>
          {!isMarket && (
            <button
              onClick={e => { e.stopPropagation(); window.__openDashboard && window.__openDashboard(news.symbol, news.company || news.symbol); }}
              style={{ flex: 1, padding: "6px 0", borderRadius: 8, fontSize: 11, fontWeight: 600, fontFamily: "var(--font-display)", cursor: "pointer", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.22)", color: "rgba(255,255,255,0.85)", transition: "background 0.2s, color 0.2s" }}
              onMouseEnter={e => { e.currentTarget.style.background = SKY_BLUE_BG; e.currentTarget.style.color = SKY_BLUE; e.currentTarget.style.borderColor = SKY_BLUE_BORDER; }}
              onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "rgba(255,255,255,0.85)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.22)"; }}
            >Stock Analysis →</button>
          )}
          {!isMarket && onTrack && (
            <button
              onClick={e => { e.stopPropagation(); onTrack({ symbol: news.symbol, name: news.company || news.symbol }); }}
              title={trackedSymbols.includes(news.symbol) ? "In watchlist" : "Add to watchlist"}
              style={{ width: 34, flexShrink: 0, padding: "6px 0", borderRadius: 8, fontSize: 16, fontWeight: 800, cursor: "pointer", background: trackedSymbols.includes(news.symbol) ? "rgba(74,222,128,0.2)" : "rgba(255,255,255,0.12)", border: trackedSymbols.includes(news.symbol) ? "1px solid rgba(74,222,128,0.4)" : "1px solid rgba(255,255,255,0.22)", color: trackedSymbols.includes(news.symbol) ? "#4ade80" : "rgba(255,255,255,0.85)", transition: "background 0.2s" }}
            >{trackedSymbols.includes(news.symbol) ? "✓" : "+"}</button>
          )}
        </div>

        {/* Headline — exactly as-is */}
        <p style={{ fontFamily: "var(--font-headline)", fontWeight: 700, fontSize: 15, lineHeight: 1.35, color: "rgba(255,255,255,0.95)", margin: "0 0 8px", letterSpacing: "-0.01em" }}>
          {news.headline}
        </p>

        {/* Summary preview — collapsed: ~10 words */}
        {collapsedPreview && !expanded && (
          <p style={{ fontSize: 12, lineHeight: 1.65, color: "rgba(255,255,255,0.55)", margin: "0 0 6px", fontFamily: "var(--font-body)" }}>
            {collapsedPreview}
          </p>
        )}

        {/* "more" / "less" pill */}
        {hasMore && (
          <button
            onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              background: expanded ? SKY_BLUE_BG : "none",
              border: expanded ? `1px solid ${SKY_BLUE_BORDER}` : "none",
              borderRadius: expanded ? 20 : 0,
              padding: expanded ? "2px 10px 2px" : "0 0 8px",
              fontSize: 11, fontWeight: 700,
              fontFamily: "var(--font-display)",
              color: expanded ? SKY_BLUE : "rgba(255,255,255,0.32)",
              cursor: "pointer",
              letterSpacing: "0.04em",
              transition: "color 0.2s, background 0.2s",
              marginBottom: expanded ? 6 : 0,
            }}
            onMouseEnter={e => { if (!expanded) e.currentTarget.style.color = "rgba(255,255,255,0.65)"; }}
            onMouseLeave={e => { if (!expanded) e.currentTarget.style.color = "rgba(255,255,255,0.32)"; }}
          >
            {expanded ? "▲ less" : "▼ more"}
          </button>
        )}

        {/* Expanded section */}
        <div style={{
          overflow: "hidden",
          maxHeight: expanded ? "500px" : "0px",
          transition: "max-height 0.35s ease",
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 10 }}>

            {/* Full summary (50–60 words) */}
            {expandedSummary && (
              <p style={{ fontSize: 12, lineHeight: 1.7, color: "rgba(255,255,255,0.62)", margin: 0, fontFamily: "var(--font-body)" }}>
                {expandedSummary}
              </p>
            )}

            {/* Sentiment row */}
            {sentiment && (
              <div style={{
                display: "flex", alignItems: "flex-start", gap: 8,
                background: sentDir === "bullish" ? "rgba(74,222,128,0.08)" : sentDir === "bearish" ? "rgba(255,107,107,0.08)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${sentDir === "bullish" ? "rgba(74,222,128,0.22)" : sentDir === "bearish" ? "rgba(255,107,107,0.22)" : "rgba(255,255,255,0.10)"}`,
                borderRadius: 8, padding: "7px 10px",
              }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>
                  {sentDir === "bullish" ? "📈" : sentDir === "bearish" ? "📉" : "➡️"}
                </span>
                <span style={{
                  fontSize: 11, lineHeight: 1.6, fontFamily: "var(--font-body)",
                  color: sentDir === "bullish" ? "rgba(74,222,128,0.9)" : sentDir === "bearish" ? "rgba(255,107,107,0.9)" : "rgba(255,255,255,0.50)",
                }}>
                  {sentiment.replace(/^sentiment:\s*/i, "")}
                </span>
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={e => { e.stopPropagation(); openSource(); }}
                style={{
                  flex: 1, padding: "7px 0", borderRadius: 8,
                  fontSize: 11, fontWeight: 600, fontFamily: "var(--font-display)",
                  cursor: "pointer",
                  background: SKY_BLUE_BG,
                  border: `1px solid ${SKY_BLUE_BORDER}`,
                  color: SKY_BLUE,
                  transition: "background 0.2s, color 0.2s",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "rgba(56,189,248,0.28)";
                  e.currentTarget.style.color = "#fff";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = SKY_BLUE_BG;
                  e.currentTarget.style.color = SKY_BLUE;
                }}
              >
                Read Article ↗
              </button>
              <button
                onClick={e => { e.stopPropagation(); if(news.symbol && news.symbol !== "MARKET") { window.__openDashboard && window.__openDashboard(news.symbol, news.company || news.symbol); } else { openDetailPage("performance"); } }}
                style={{
                  flex: 1, padding: "7px 0", borderRadius: 8,
                  fontSize: 11, fontWeight: 600, fontFamily: "var(--font-display)",
                  cursor: "pointer",
                  background: SKY_BLUE_BG,
                  border: `1px solid ${SKY_BLUE_BORDER}`,
                  color: SKY_BLUE,
                  transition: "background 0.2s, color 0.2s",
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = "rgba(56,189,248,0.28)";
                  e.currentTarget.style.color = "#fff";
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = SKY_BLUE_BG;
                  e.currentTarget.style.color = SKY_BLUE;
                }}
              >
                Stock Analysis →
              </button>
            </div>

          </div>
        </div>

        <div style={{ height: 8 }} />
      </div>
    </div>
  );
}