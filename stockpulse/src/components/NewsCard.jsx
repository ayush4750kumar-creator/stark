// src/components/NewsCard.jsx
import { useEffect, useState } from "react";
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

function cleanHeadline(h) {
  return (h || "").replace(/\s[-–|]\s*[A-Z][a-zA-Z\s.&]{2,}$/, "").trim() || h;
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

function imgHash(headline, articleId) {
  const id = parseInt(articleId) || 0;
  const scrambled = Math.imul(id, 2654435761) >>> 0;
  const mixed = (scrambled ^ (scrambled >>> 16) ^ Math.imul(id, 40503)) >>> 0;
  const str = `${mixed}::${(headline || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 80)}`;
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h ^ (h >>> 16)) >>> 0;
}

function getTopicImage(headline, symbol, articleId) {
  const hl = (headline || "").toLowerCase();
  let topic = null;
  for (const rule of SUBTOPIC_RULES) {
    if (rule.keys.some(k => hl.includes(k))) { topic = rule.pool; break; }
  }
  const SYMBOL_MAP = {
    RELIANCE:"energy", TCS:"tech", INFY:"tech", HDFCBANK:"banking", ICICIBANK:"banking",
    WIPRO:"tech", BAJFINANCE:"banking", SBIN:"banking", TATAMOTORS:"conglomerate", MARUTI:"market",
    ONGC:"energy", ADANIENT:"conglomerate", SUNPHARMA:"pharma", ITC:"fmcg",
    KOTAKBANK:"banking", HINDUNILVR:"fmcg", NESTLEIND:"fmcg", ASIANPAINT:"fmcg",
    LTIM:"tech", HCLTECH:"tech", TECHM:"tech",
    AAPL:"tech", MSFT:"tech", GOOGL:"tech", NVDA:"tech", TSLA:"market",
    META:"tech", AMZN:"retail", JPM:"banking", NDAQ:"market", ADI:"tech",
    IBM:"tech", QCOM:"tech", AVGO:"tech", INTC:"tech", AMD:"tech",
  };
  if (!topic) topic = SYMBOL_MAP[symbol] || null;
  if (!topic) topic = "market";
  const pool = IMG_DB[topic] || IMG_DB.market;
  const hash = imgHash(headline, articleId);
  const base = hash % pool.length;
  for (let offset = 0; offset < pool.length; offset++) {
    const idx = (base + offset) % pool.length;
    const url = pool[idx];
    if (!_seenImgs.has(url)) { _seenImgs.add(url); return url; }
  }
  const fallback = pool[base];
  _seenImgs.add(fallback);
  return fallback;
}

export default function NewsCard({ news, index, onTrack, trackedSymbols = [], onAboutCompany }) {
  const navigate    = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const isTracked   = trackedSymbols.includes(news.symbol);
  const isMarket    = !news.symbol || news.symbol === "MARKET";
  const displayTime = liveRelativeTime(news.publishedAt || news.published_at);
  const changeSign  = (news.change ?? 0) >= 0 ? "+" : "";
  const imgUrl      = news.hasImage && news.image
    ? news.image
    : getTopicImage(news.headline, news.symbol, news.id);
  const label    = isMarket ? "MARKET" : (news.symbol || "").toUpperCase();
  const subLabel = isMarket ? "Global News" : (news.company || news.symbol || "");

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
        summary_20:   news.summary,
        summary_long: news.summary_long || null,
        full_text:    news.fullText || news.summary || "",
        sentiment:    news.sentiment,
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
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        minHeight: 320,
        position: "relative",
      }}
      onClick={openSource}
    >
      {/* Background image */}
      <div style={{ position: "absolute", inset: 0 }}>
        <img
          src={imgUrl}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onError={e => {
            e.target.onerror = null;
            const attempts = parseInt(e.target.dataset.attempt || "0") + 1;
            e.target.dataset.attempt = attempts;
            e.target.src = getTopicImage(
              news.headline, news.symbol,
              String((parseInt(news.id || 0) + attempts * 13) ^ (attempts * 7919))
            );
          }}
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
        background: "rgba(5, 3, 1, 0.35)",
        backdropFilter: "blur(18px) saturate(1.4)",
        WebkitBackdropFilter: "blur(18px) saturate(1.4)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        padding: "14px 16px 0",
      }}>
        {/* Meta row */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 7, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontFamily: "var(--font-display)" }}>{displayTime}</span>
          {news.source && (
            <>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.22)" }}>·</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontFamily: "var(--font-display)" }}>{news.source}</span>
            </>
          )}
          {(news.sentiment === "bullish" || news.sentiment === "bearish") && (
            <>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.22)" }}>·</span>
              <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--font-display)", opacity: 0.9, color: news.sentiment === "bullish" ? "#4ade80" : "#ff6b6b" }}>
                {news.sentiment === "bullish" ? "▲ BULLISH" : "▼ BEARISH"}
              </span>
            </>
          )}
        </div>

        {/* Headline */}
        <p style={{ fontFamily: "var(--font-headline)", fontWeight: 700, fontSize: 15, lineHeight: 1.35, color: "rgba(255,255,255,0.95)", margin: "0 0 7px", letterSpacing: "-0.01em" }}>
          {cleanHeadline(news.headline)}
        </p>

        {/* Summary + expandable More */}
        {news.summary && (
          <div style={{ marginBottom: 7 }}>
            <p style={{ fontSize: 12, lineHeight: 1.65, color: "rgba(255,255,255,0.65)", margin: "0 0 4px", fontFamily: "var(--font-body)" }}>
              {news.summary}
            </p>
            {news.summary_long && (
              <>
                {expanded && (
                  <p style={{ fontSize: 12, lineHeight: 1.7, color: "rgba(255,255,255,0.50)", margin: "6px 0 4px", fontFamily: "var(--font-body)" }}>
                    {news.summary_long}
                  </p>
                )}
                <button
                  onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 12, padding: "3px 10px",
                    fontSize: 11, color: "rgba(255,255,255,0.55)",
                    cursor: "pointer", fontFamily: "var(--font-display)",
                    fontWeight: 600, marginBottom: 4,
                  }}
                >
                  {expanded ? "▲ Less" : "▼ More"}
                </button>
              </>
            )}
          </div>
        )}

        {/* Tap to read */}
        <p style={{ fontSize: 11, color: "rgba(255,210,100,0.65)", fontFamily: "var(--font-display)", fontWeight: 600, margin: "0 0 12px", letterSpacing: "0.03em" }}>
          Tap to read on {news.source || "source"} ↗
        </p>

        {/* Action buttons */}
        {!isMarket && !isTracked && (
          <div style={{ display: "flex", borderTop: "1px solid rgba(255,255,255,0.07)", margin: "0 -16px" }}>
            <button
              onClick={e => { e.stopPropagation(); onTrack && onTrack(news.symbol); }}
              style={{ flex: 1, padding: "11px 10px", background: "transparent", border: "none", borderRight: "1px solid rgba(255,255,255,0.07)", cursor: "pointer", color: "rgba(255,255,255,0.45)", fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.2s", letterSpacing: "0.04em" }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
              </svg>
              TRACK
            </button>
            <button
              onClick={e => { e.stopPropagation(); onAboutCompany ? onAboutCompany(news.symbol, news.company) : openDetailPage("performance"); }}
              style={{ flex: 1, padding: "11px 10px", background: "transparent", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.45)", fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "all 0.2s", letterSpacing: "0.04em" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.07)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              ABOUT {label}
            </button>
          </div>
        )}
        {isMarket && <div style={{ height: 8 }} />}
      </div>
    </div>
  );
}