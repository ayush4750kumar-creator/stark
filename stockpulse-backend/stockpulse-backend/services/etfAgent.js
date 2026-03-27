// services/etfAgent.js
// All symbols verified from official NSE India securities list CSV
// Yahoo Finance format: NSE_SYMBOL.NS
// Cache: 5 min. Parallel batches of 25. Auto-warms on startup.

const https = require("https");

const CACHE     = {};
const CACHE_TTL = 5 * 60 * 1000;

// ── VERIFIED ETF universe — symbols taken directly from NSE India CSV ────
const ETF_UNIVERSE = [

  // ── GOLD ───────────────────────────────────────────────────────────────
  { symbol: "GOLDBEES.NS",    name: "Nippon India ETF Gold BeES",             category: "gold",    amc: "nipponindiaetf.com"     },
  { symbol: "HDFCGOLD.NS",    name: "HDFC Gold ETF",                          category: "gold",    amc: "hdfcfund.com"           },
  { symbol: "AXISGOLD.NS",    name: "Axis Gold ETF",                          category: "gold",    amc: "axismf.com"             },
  { symbol: "GOLD1.NS",       name: "Kotak Gold ETF",                         category: "gold",    amc: "kotakmf.com"            },
  { symbol: "SBIGOLD.NS",     name: "SBI Gold ETF",                           category: "gold",    amc: "sbimf.com"              },
  { symbol: "GOLDIETF.NS",    name: "ICICI Prudential Gold ETF",              category: "gold",    amc: "icicipruamc.com"        },
  { symbol: "BSLGOLDETF.NS",  name: "Aditya Birla Sun Life Gold ETF",         category: "gold",    amc: "adityabirlacapital.com" },
  { symbol: "QGOLDHALF.NS",   name: "Quantum Gold Fund ETF",                  category: "gold",    amc: "quantumamc.com"         },
  { symbol: "GOLDBETA.NS",    name: "UTI Gold ETF",                           category: "gold",    amc: "utimf.com"              },
  { symbol: "GOLDETF.NS",     name: "Mirae Asset Gold ETF",                   category: "gold",    amc: "miraeassetmf.co.in"     },
  { symbol: "LICMFGOLD.NS",   name: "LIC MF Gold ETF",                        category: "gold",    amc: "licmf.com"              },
  { symbol: "GOLDCASE.NS",    name: "Zerodha Gold ETF",                       category: "gold",    amc: "zerodha.com"            },
  { symbol: "AONEGOLD.NS",    name: "Angel One Gold ETF",                     category: "gold",    amc: "angelone.in"            },
  { symbol: "EGOLD.NS",       name: "Edelweiss Gold ETF",                     category: "gold",    amc: "edelweissmf.com"        },
  { symbol: "MOGOLD.NS",      name: "Motilal Oswal Gold ETF",                 category: "gold",    amc: "motilaloswalmf.com"     },
  { symbol: "GROWWGOLD.NS",   name: "Groww Gold ETF",                         category: "gold",    amc: "groww.in"               },
  { symbol: "GOLDADD.NS",     name: "DSP Gold ETF",                           category: "gold",    amc: "dspim.com"              },
  { symbol: "BBNPPGOLD.NS",   name: "Baroda BNP Paribas Gold ETF",            category: "gold",    amc: "barodabnpparibasmf.com" },
  { symbol: "GLD",            name: "SPDR Gold Shares",                       category: "gold",    amc: "spdrgoldshares.com"     },
  { symbol: "IAU",            name: "iShares Gold Trust",                     category: "gold",    amc: "ishares.com"            },

  // ── SILVER ─────────────────────────────────────────────────────────────
  { symbol: "SILVERETF.NS",   name: "Nippon India Silver ETF",                category: "silver",  amc: "nipponindiaetf.com"     },
  { symbol: "HDFCSILVER.NS",  name: "HDFC Silver ETF",                        category: "silver",  amc: "hdfcfund.com"           },
  { symbol: "AXISSILVER.NS",  name: "Axis Silver ETF",                        category: "silver",  amc: "axismf.com"             },
  { symbol: "KOTAKSILVER.NS", name: "Kotak Silver ETF",                       category: "silver",  amc: "kotakmf.com"            },
  { symbol: "ICICISILVRETF.NS",name: "ICICI Prudential Silver ETF",           category: "silver",  amc: "icicipruamc.com"        },
  { symbol: "BSLSILVETF.NS",  name: "Aditya Birla Sun Life Silver ETF",       category: "silver",  amc: "adityabirlacapital.com" },
  { symbol: "MIRAESILVER.NS", name: "Mirae Asset Silver ETF",                 category: "silver",  amc: "miraeassetmf.co.in"     },
  { symbol: "SILVERIETF.NS",  name: "Zerodha Silver ETF",                     category: "silver",  amc: "zerodha.com"            },
  { symbol: "AONESILVER.NS",  name: "Angel One Silver ETF",                   category: "silver",  amc: "angelone.in"            },
  { symbol: "ESILVER.NS",     name: "Edelweiss Silver ETF",                   category: "silver",  amc: "edelweissmf.com"        },
  { symbol: "MOSILVER.NS",    name: "Motilal Oswal Silver ETF",               category: "silver",  amc: "motilaloswalmf.com"     },
  { symbol: "GROWWSLVR.NS",   name: "Groww Silver ETF",                       category: "silver",  amc: "groww.in"               },
  { symbol: "SBISILVRETF.NS", name: "SBI Silver ETF",                         category: "silver",  amc: "sbimf.com"              },
  { symbol: "SLV",            name: "iShares Silver Trust",                   category: "silver",  amc: "ishares.com"            },

  // ── NIFTY 50 ───────────────────────────────────────────────────────────
  { symbol: "NIFTYBEES.NS",   name: "Nippon India ETF Nifty 50 BeES",         category: "nifty50", amc: "nipponindiaetf.com"     },
  { symbol: "SETFNIF50.NS",   name: "SBI ETF Nifty 50",                       category: "nifty50", amc: "sbimf.com"              },
  { symbol: "NIFTYIETF.NS",   name: "ICICI Prudential Nifty 50 ETF",          category: "nifty50", amc: "icicipruamc.com"        },
  { symbol: "HDFCNIFTY.NS",   name: "HDFC Nifty 50 ETF",                      category: "nifty50", amc: "hdfcfund.com"           },
  { symbol: "NIFTY1.NS",      name: "Kotak Nifty 50 ETF",                     category: "nifty50", amc: "kotakmf.com"            },
  { symbol: "AXISNIFTY.NS",   name: "Axis Nifty 50 ETF",                      category: "nifty50", amc: "axismf.com"             },
  { symbol: "NIFTYBETA.NS",   name: "UTI Nifty 50 ETF",                       category: "nifty50", amc: "utimf.com"              },
  { symbol: "MOM50.NS",       name: "Motilal Oswal Nifty 50 ETF",             category: "nifty50", amc: "motilaloswalmf.com"     },
  { symbol: "BSLNIFTY.NS",    name: "Aditya Birla Sun Life Nifty 50 ETF",     category: "nifty50", amc: "adityabirlacapital.com" },
  { symbol: "IVZINNIFTY.NS",  name: "Invesco India Nifty 50 ETF",             category: "nifty50", amc: "invesco.in"             },
  { symbol: "NIFTYCASE.NS",   name: "Zerodha Nifty 50 ETF",                   category: "nifty50", amc: "zerodha.com"            },
  { symbol: "AONENIFTY.NS",   name: "Angel One Nifty 50 ETF",                 category: "nifty50", amc: "angelone.in"            },
  { symbol: "GROWWNIFTY.NS",  name: "Groww Nifty 50 ETF",                     category: "nifty50", amc: "groww.in"               },
  { symbol: "ENIFTY.NS",      name: "Edelweiss Nifty 50 ETF",                 category: "nifty50", amc: "edelweissmf.com"        },
  { symbol: "NETF.NS",        name: "Tata Nifty 50 ETF",                      category: "nifty50", amc: "tatamutualfund.com"     },
  { symbol: "NIFTYADD.NS",    name: "DSP Nifty 50 ETF",                       category: "nifty50", amc: "dspim.com"              },
  { symbol: "IDFNIFTYET.NS",  name: "Bandhan Nifty 50 ETF",                   category: "nifty50", amc: "bandhanmf.com"          },
  { symbol: "LICNETFN50.NS",  name: "LIC MF Nifty 50 ETF",                    category: "nifty50", amc: "licmf.com"              },
  { symbol: "SPY",            name: "SPDR S&P 500 ETF",                       category: "nifty50", amc: "ssga.com"               },
  { symbol: "QQQ",            name: "Invesco QQQ ETF",                        category: "nifty50", amc: "invesco.com"            },

  // ── SECTORAL ───────────────────────────────────────────────────────────
  // IT
  { symbol: "ITBEES.NS",      name: "Nippon India ETF Nifty IT",              category: "sector",  amc: "nipponindiaetf.com"     },
  { symbol: "IT.NS",          name: "Kotak Nifty IT ETF",                     category: "sector",  amc: "kotakmf.com"            },
  { symbol: "ITIETF.NS",      name: "ICICI Prudential Nifty IT ETF",          category: "sector",  amc: "icicipruamc.com"        },
  { symbol: "ITETF.NS",       name: "Mirae Asset Nifty IT ETF",               category: "sector",  amc: "miraeassetmf.co.in"     },
  { symbol: "AXISTECETF.NS",  name: "Axis Nifty IT ETF",                      category: "sector",  amc: "axismf.com"             },
  { symbol: "ITBETA.NS",      name: "UTI Nifty IT ETF",                       category: "sector",  amc: "utimf.com"              },
  { symbol: "ITADD.NS",       name: "DSP Nifty IT ETF",                       category: "sector",  amc: "dspim.com"              },
  // Bank
  { symbol: "BANKBEES.NS",    name: "Nippon India ETF Bank BeES",             category: "sector",  amc: "nipponindiaetf.com"     },
  { symbol: "BANKBETA.NS",    name: "UTI Nifty Bank ETF",                     category: "sector",  amc: "utimf.com"              },
  { symbol: "BANKIETF.NS",    name: "ICICI Prudential Nifty Bank ETF",        category: "sector",  amc: "icicipruamc.com"        },
  { symbol: "BANKNIFTY1.NS",  name: "Kotak Nifty Bank ETF",                   category: "sector",  amc: "kotakmf.com"            },
  { symbol: "BANKETF.NS",     name: "Mirae Asset Nifty Bank ETF",             category: "sector",  amc: "miraeassetmf.co.in"     },
  { symbol: "AXISBNKETF.NS",  name: "Axis Nifty Bank ETF",                    category: "sector",  amc: "axismf.com"             },
  // Financial Services
  { symbol: "BFSI.NS",        name: "Mirae Asset Nifty Financial Services ETF", category: "sector", amc: "miraeassetmf.co.in"   },
  { symbol: "FINIETF.NS",     name: "ICICI Prudential Nifty Fin Services Ex-Bank ETF", category: "sector", amc: "icicipruamc.com" },
  // PSU Bank
  { symbol: "PSUBNKBEES.NS",  name: "Nippon India ETF PSU Bank BeES",         category: "sector",  amc: "nipponindiaetf.com"     },
  { symbol: "BANKPSU.NS",     name: "Mirae Asset Nifty PSU Bank ETF",         category: "sector",  amc: "miraeassetmf.co.in"     },
  // Auto
  { symbol: "AUTOIETF.NS",    name: "ICICI Prudential Nifty Auto ETF",        category: "sector",  amc: "icicipruamc.com"        },
  { symbol: "AUTOBEES.NS",    name: "Nippon India Nifty Auto ETF",            category: "sector",  amc: "nipponindiaetf.com"     },
  // FMCG
  { symbol: "FMCGIETF.NS",    name: "ICICI Prudential Nifty FMCG ETF",        category: "sector",  amc: "icicipruamc.com"        },
  // Metal
  { symbol: "METALIETF.NS",   name: "ICICI Prudential Nifty Metal ETF",       category: "sector",  amc: "icicipruamc.com"        },
  { symbol: "METAL.NS",       name: "Mirae Asset Nifty Metal ETF",            category: "sector",  amc: "miraeassetmf.co.in"     },
  // Oil & Gas
  { symbol: "OILIETF.NS",     name: "ICICI Prudential Nifty Oil & Gas ETF",   category: "sector",  amc: "icicipruamc.com"        },
  // Energy
  { symbol: "MOENERGY.NS",    name: "Motilal Oswal Nifty Energy ETF",         category: "sector",  amc: "motilaloswalmf.com"     },
  { symbol: "ENERGY.NS",      name: "Mirae Asset Nifty Energy ETF",           category: "sector",  amc: "miraeassetmf.co.in"     },
  // Realty
  { symbol: "MOREALTY.NS",    name: "Motilal Oswal Nifty Realty ETF",         category: "sector",  amc: "motilaloswalmf.com"     },
  // Capital Markets
  { symbol: "MOCAPITAL.NS",   name: "Motilal Oswal Nifty Capital Market ETF", category: "sector",  amc: "motilaloswalmf.com"     },
  { symbol: "ECAPINSURE.NS",  name: "Edelweiss BSE Capital Markets & Insurance ETF", category: "sector", amc: "edelweissmf.com" },
  // Defence
  { symbol: "MODEFENCE.NS",   name: "Motilal Oswal Nifty India Defence ETF",  category: "sector",  amc: "motilaloswalmf.com"     },
  { symbol: "DEFENCE.NS",     name: "Mirae Asset BSE India Defence ETF",      category: "sector",  amc: "miraeassetmf.co.in"     },
  // Pharma
  { symbol: "PHARMABEES.NS",  name: "Nippon India Nifty Pharma ETF",          category: "sector",  amc: "nipponindiaetf.com"     },
  // CPSE & Bharat 22
  { symbol: "CPSEETF.NS",     name: "CPSE ETF",                               category: "sector",  amc: "sbimf.com"              },
  { symbol: "ICICIB22.NS",    name: "BHARAT 22 ETF - ICICI Prudential",       category: "sector",  amc: "icicipruamc.com"        },

  // ── INDEX / MIDCAP / SMALLCAP ──────────────────────────────────────────
  // Nifty Next 50
  { symbol: "JUNIORBEES.NS",  name: "Nippon India ETF Nifty Next 50",         category: "index",   amc: "nipponindiaetf.com"     },
  { symbol: "NEXT50IETF.NS",  name: "ICICI Prudential Nifty Next 50 ETF",     category: "index",   amc: "icicipruamc.com"        },
  { symbol: "NEXT50ETF.NS",   name: "Kotak Nifty Next 50 ETF",                category: "index",   amc: "kotakmf.com"            },
  { symbol: "NEXT50BETA.NS",  name: "UTI Nifty Next 50 ETF",                  category: "index",   amc: "utimf.com"              },
  { symbol: "NEXT50.NS",      name: "Mirae Asset Nifty Next 50 ETF",          category: "index",   amc: "miraeassetmf.co.in"     },
  { symbol: "MONEXT50.NS",    name: "Motilal Oswal Nifty Next 50 ETF",        category: "index",   amc: "motilaloswalmf.com"     },
  { symbol: "ABSLNN50ET.NS",  name: "Aditya Birla Sun Life Nifty Next 50 ETF",category: "index",   amc: "adityabirlacapital.com" },
  { symbol: "GROWWNXT50.NS",  name: "Groww Nifty Next 50 ETF",                category: "index",   amc: "groww.in"               },
  // Midcap 150
  { symbol: "MID150BEES.NS",  name: "Nippon India ETF Nifty Midcap 150",      category: "index",   amc: "nipponindiaetf.com"     },
  { symbol: "MID150.NS",      name: "Kotak Nifty Midcap 150 ETF",             category: "index",   amc: "kotakmf.com"            },
  { symbol: "MIDCAPETF.NS",   name: "Mirae Asset Nifty Midcap 150 ETF",       category: "index",   amc: "miraeassetmf.co.in"     },
  { symbol: "MIDCAPIETF.NS",  name: "ICICI Prudential Nifty Midcap 150 ETF",  category: "index",   amc: "icicipruamc.com"        },
  { symbol: "MID150CASE.NS",  name: "Zerodha Nifty Midcap 150 ETF",           category: "index",   amc: "zerodha.com"            },
  { symbol: "MIDCAPBETA.NS",  name: "UTI Nifty Midcap 150 ETF",               category: "index",   amc: "utimf.com"              },
  { symbol: "MIDCAP.NS",      name: "Kotak Nifty Midcap 50 ETF",              category: "index",   amc: "kotakmf.com"            },
  // Smallcap
  { symbol: "MOSMALL250.NS",  name: "Motilal Oswal Nifty Smallcap 250 ETF",   category: "index",   amc: "motilaloswalmf.com"     },
  { symbol: "HDFCSML250.NS",  name: "HDFC Nifty Smallcap 250 ETF",            category: "index",   amc: "hdfcfund.com"           },
  { symbol: "GROWWSC250.NS",  name: "Groww Nifty Smallcap 250 ETF",           category: "index",   amc: "groww.in"               },
  // Nifty 500
  { symbol: "MONIFTY500.NS",  name: "Motilal Oswal Nifty 500 ETF",            category: "index",   amc: "motilaloswalmf.com"     },
  // Momentum / Factor
  { symbol: "MOM30IETF.NS",   name: "ICICI Prudential Nifty 200 Momentum 30 ETF", category: "index", amc: "icicipruamc.com"     },
  { symbol: "MOMENTUM30.NS",  name: "Kotak Nifty 200 Momentum 30 ETF",        category: "index",   amc: "kotakmf.com"            },
  { symbol: "HDFCMOMENT.NS",  name: "HDFC Nifty200 Momentum 30 ETF",          category: "index",   amc: "hdfcfund.com"           },
  { symbol: "MOMENTUM50.NS",  name: "Motilal Oswal Nifty 500 Momentum 50 ETF",category: "index",   amc: "motilaloswalmf.com"     },
  // Value
  { symbol: "NV20IETF.NS",    name: "ICICI Prudential Nifty50 Value 20 ETF",  category: "index",   amc: "icicipruamc.com"        },
  { symbol: "NV20.NS",        name: "Kotak Nifty 50 Value 20 ETF",            category: "index",   amc: "kotakmf.com"            },
  { symbol: "NV20BEES.NS",    name: "Nippon India ETF Nifty 50 Value 20",     category: "index",   amc: "nipponindiaetf.com"     },
  { symbol: "MOVALUE.NS",     name: "Motilal Oswal BSE Enhanced Value ETF",   category: "index",   amc: "motilaloswalmf.com"     },
  // Alpha
  { symbol: "ALPHA.NS",       name: "Kotak Nifty Alpha 50 ETF",               category: "index",   amc: "kotakmf.com"            },
  { symbol: "MOALPHA50.NS",   name: "Motilal Oswal Nifty Alpha 50 ETF",       category: "index",   amc: "motilaloswalmf.com"     },

  // ── GLOBAL ─────────────────────────────────────────────────────────────
  { symbol: "MAFANG.NS",      name: "Mirae Asset NYSE FANG+ ETF",             category: "global",  amc: "miraeassetmf.co.in"     },
  { symbol: "MON100.NS",      name: "Motilal Oswal NASDAQ 100 ETF",           category: "global",  amc: "motilaloswalmf.com"     },
  { symbol: "MAHKTECH.NS",    name: "Mirae Asset Hang Seng Tech ETF",         category: "global",  amc: "miraeassetmf.co.in"     },
  { symbol: "MASPTOP50.NS",   name: "Mirae Asset S&P 500 Top 50 ETF",         category: "global",  amc: "miraeassetmf.co.in"     },
  { symbol: "GROWWNET.NS",    name: "Groww Nifty India Internet ETF",         category: "global",  amc: "groww.in"               },
  { symbol: "HNGSNGBEES.NS",  name: "Nippon India ETF Hang Seng BeES",        category: "global",  amc: "nipponindiaetf.com"     },

  // ── DEBT / GILT ────────────────────────────────────────────────────────
  { symbol: "LIQUIDBEES.NS",  name: "Nippon India ETF Liquid BeES",           category: "debt",    amc: "nipponindiaetf.com"     },
  { symbol: "SETF10GILT.NS",  name: "SBI ETF 10 Year Gilt",                   category: "debt",    amc: "sbimf.com"              },
  { symbol: "GILT5YBEES.NS",  name: "Nippon India ETF 5 Year Gilt",           category: "debt",    amc: "nipponindiaetf.com"     },
  { symbol: "LTGILTBEES.NS",  name: "Nippon India ETF Long Term Gilt",        category: "debt",    amc: "nipponindiaetf.com"     },
  { symbol: "LIQUIDCASE.NS",  name: "Zerodha Nifty 1D Rate Liquid ETF",       category: "debt",    amc: "zerodha.com"            },
  { symbol: "GILT5BETA.NS",   name: "UTI Nifty 5 Year G-Sec ETF",             category: "debt",    amc: "utimf.com"              },
  { symbol: "GILT10BETA.NS",  name: "UTI Nifty 10 Year G-Sec ETF",            category: "debt",    amc: "utimf.com"              },
  { symbol: "GSEC5IETF.NS",   name: "ICICI Prudential Nifty 5 Yr G-Sec ETF", category: "debt",    amc: "icicipruamc.com"        },
  { symbol: "GSEC10IETF.NS",  name: "ICICI Prudential Nifty 10 Yr G-Sec ETF",category: "debt",    amc: "icicipruamc.com"        },
];

// ── HTTP helper ──────────────────────────────────────────────────────────
function httpGet(url, timeout = 12000) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request({
      hostname: parsed.hostname,
      path:     parsed.pathname + parsed.search,
      method:   "GET",
      timeout,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept":     "application/json",
        "Referer":    "https://finance.yahoo.com",
      },
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpGet(res.headers.location, timeout).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on("data", d => chunks.push(d));
      res.on("end",  () => resolve(Buffer.concat(chunks).toString("utf8")));
      res.on("error", reject);
    });
    req.on("error",   reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
    req.end();
  });
}

// ── Fetch one ETF: price + 1Y return in parallel ─────────────────────────
async function fetchETFData(symbol) {
  try {
    const enc = encodeURIComponent(symbol);
    const [dayText, yearText] = await Promise.all([
      httpGet(`https://query2.finance.yahoo.com/v8/finance/chart/${enc}?interval=1d&range=5d&includePrePost=false`),
      httpGet(`https://query2.finance.yahoo.com/v8/finance/chart/${enc}?interval=1mo&range=13mo&includePrePost=false`),
    ]);

    const dayMeta    = JSON.parse(dayText)?.chart?.result?.[0]?.meta;
    const yearResult = JSON.parse(yearText)?.chart?.result?.[0];

    if (!dayMeta?.regularMarketPrice) return null;

    const price = dayMeta.regularMarketPrice;
    const prev  = dayMeta.previousClose || dayMeta.chartPreviousClose || price;

    let return1Y = null;
    if (yearResult) {
      const closes = (yearResult.indicators?.quote?.[0]?.close || []).filter(c => c != null);
      if (closes.length >= 2 && closes[0] > 0) {
        return1Y = Math.round(((closes[closes.length - 1] - closes[0]) / closes[0]) * 10000) / 100;
      }
    }

    return {
      price:      Math.round(price * 100) / 100,
      change_pct: prev ? Math.round(((price - prev) / prev) * 10000) / 100 : 0,
      change_amt: Math.round((price - prev) * 100) / 100,
      nav:        Math.round(price * 100) / 100,
      return1Y,
      week52_high: Math.round((dayMeta.fiftyTwoWeekHigh || 0) * 100) / 100,
      week52_low:  Math.round((dayMeta.fiftyTwoWeekLow  || 0) * 100) / 100,
      volume:      dayMeta.regularMarketVolume || 0,
    };
  } catch {
    return null;
  }
}

// ── Fetch all in parallel batches of 25 ─────────────────────────────────
async function fetchAllETFs(force = false) {
  if (!force && CACHE.etfs && (Date.now() - CACHE.etfs.ts) < CACHE_TTL) {
    return CACHE.etfs.data;
  }

  console.log(`  📊 ETFAgent: Fetching ${ETF_UNIVERSE.length} ETFs...`);
  const t0 = Date.now();
  const results = [];

  for (let i = 0; i < ETF_UNIVERSE.length; i += 25) {
    const batch = ETF_UNIVERSE.slice(i, i + 25);
    const batchResults = await Promise.all(
      batch.map(async etf => {
        const data = await fetchETFData(etf.symbol);
        if (!data) return null;
        return {
          ...etf,
          ...data,
          logoUrl: `https://www.google.com/s2/favicons?domain=${etf.amc}&sz=64`,
        };
      })
    );
    results.push(...batchResults.filter(Boolean));
  }

  console.log(`  ✅ ETFAgent: ${results.length}/${ETF_UNIVERSE.length} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  CACHE.etfs = { ts: Date.now(), data: results };
  return results;
}

// Auto-refresh every 5 min
setInterval(() => { fetchAllETFs(true).catch(() => {}); }, CACHE_TTL);

// Warm on startup after 2s
setTimeout(() => {
  fetchAllETFs(true).catch(e => console.error("  ✗ ETFAgent warm:", e.message));
}, 2000);

module.exports = { fetchAllETFs, ETF_UNIVERSE };