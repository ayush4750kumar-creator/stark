// services/dataFetchAgent.js
// Uses Yahoo Finance /v8/finance/chart per-symbol (no auth needed)
// Fetches all symbols in parallel batches of 20 — very fast (~2-3s for 170 stocks)

const https = require("https");

const CACHE     = {};
const CACHE_TTL = 5 * 60 * 1000;   // 5 min
const FO_LIST_TTL = 24 * 60 * 60 * 1000; // 24h

function isFresh(key) {
  return CACHE[key] && (Date.now() - CACHE[key].ts < CACHE_TTL);
}

// ── HTTP helper ───────────────────────────────────────────────
function httpGet(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.request({
      hostname: parsed.hostname,
      path:     parsed.pathname + parsed.search,
      method:   "GET",
      timeout:  10000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept":     "application/json",
      },
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpGet(res.headers.location).then(resolve).catch(reject);
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

// ── Single symbol quote via /v8/finance/chart (no auth needed) ─
async function fetchOne(symbol) {
  try {
    const url  = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d&includePrePost=false`;
    const text = await httpGet(url);
    const json = JSON.parse(text);
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta || meta.regularMarketPrice == null) return null;
    const prev  = meta.previousClose || meta.chartPreviousClose || meta.regularMarketPrice;
    const price = meta.regularMarketPrice;
    return {
      symbol,
      name:      meta.longName || meta.shortName || symbol,
      price,
      change:    price - prev,
      changePct: ((price - prev) / prev) * 100,
      high:      meta.regularMarketDayHigh  || null,
      low:       meta.regularMarketDayLow   || null,
      volume:    meta.regularMarketVolume   || null,
      marketCap: meta.marketCap             || null,
    };
  } catch {
    return null;
  }
}

// ── Parallel batch fetch ──────────────────────────────────────
// Runs up to CONCURRENCY requests at once — fast without hammering Yahoo
async function fetchAllParallel(symbols, concurrency = 20) {
  const results = [];
  for (let i = 0; i < symbols.length; i += concurrency) {
    const batch = symbols.slice(i, i + concurrency);
    const batch_results = await Promise.all(batch.map(fetchOne));
    results.push(...batch_results.filter(Boolean));
  }
  return results;
}

// ── F&O list (hardcoded, refreshed from NSE in background) ───
const BASE_FO_LIST = [
  { symbol: "TATAELXSI.NS",  name: "Tata Elxsi"            },
  { symbol: "INOXWIND.NS",   name: "INOX Wind"              },
  { symbol: "IDEA.NS",       name: "Vodafone Idea"          },
  { symbol: "LAURUSLABS.NS", name: "Laurus Labs"            },
  { symbol: "HINDPETRO.NS",  name: "HPCL"                   },
  { symbol: "GLENMARK.NS",   name: "Glenmark Pharma"        },
  { symbol: "BHEL.NS",       name: "BHEL"                   },
  { symbol: "JINDALSTEL.NS", name: "Jindal Steel"           },
  { symbol: "LTIM.NS",       name: "LTIMindtree"            },
  { symbol: "AUROPHARMA.NS", name: "Aurobindo Pharma"       },
  { symbol: "OFSS.NS",       name: "Oracle Finl. Service"   },
  { symbol: "TECHM.NS",      name: "Tech Mahindra"          },
  { symbol: "JSWSTEEL.NS",   name: "JSW Steel"              },
  { symbol: "TATATECH.NS",   name: "Tata Technologies"      },
  { symbol: "BANKINDIA.NS",  name: "Bank Of India"          },
  { symbol: "BIOCON.NS",     name: "Biocon"                 },
  { symbol: "TATASTEEL.NS",  name: "Tata Steel"             },
  { symbol: "PIDILITIND.NS", name: "Pidilite Industries"    },
  { symbol: "UNIONBANK.NS",  name: "Union Bank of India"    },
  { symbol: "LUPIN.NS",      name: "Lupin"                  },
  { symbol: "COALINDIA.NS",  name: "Coal India"             },
  { symbol: "PERSISTENT.NS", name: "Persistent Systems"     },
  { symbol: "INFY.NS",       name: "Infosys"                },
  { symbol: "GMRINFRA.NS",   name: "GMR Airports"           },
  { symbol: "DELHIVERY.NS",  name: "Delhivery"              },
  { symbol: "CUMMINSIND.NS", name: "Cummins India"          },
  { symbol: "BANKBARODA.NS", name: "Bank of Baroda"         },
  { symbol: "CANBK.NS",      name: "Canara Bank"            },
  { symbol: "TRENT.NS",      name: "Trent"                  },
  { symbol: "PAGEIND.NS",    name: "Page Industries"        },
  { symbol: "APLAPOLLO.NS",  name: "APL Apollo Tubes"       },
  { symbol: "BAJAJ-AUTO.NS", name: "Bajaj Auto"             },
  { symbol: "INDIANB.NS",    name: "Indian Bank"            },
  { symbol: "KALYANKJIL.NS", name: "Kalyan Jewellers"       },
  { symbol: "PGEL.NS",       name: "PG Electroplast"        },
  { symbol: "DIVISLAB.NS",   name: "Divi's Labs"            },
  { symbol: "RELIANCE.NS",   name: "Reliance Industries"    },
  { symbol: "MPHASIS.NS",    name: "Mphasis"                },
  { symbol: "SUZLON.NS",     name: "Suzlon Energy"          },
  { symbol: "TITAN.NS",      name: "Titan Co"               },
  { symbol: "NMDC.NS",       name: "NMDC"                   },
  { symbol: "EICHERMOT.NS",  name: "Eicher Motors"          },
  { symbol: "IEX.NS",        name: "IEX"                    },
  { symbol: "NAUKRI.NS",     name: "Info Edge (India)"      },
  { symbol: "PNB.NS",        name: "PNB"                    },
  { symbol: "ZOMATO.NS",     name: "Eternal (Zomato)"       },
  { symbol: "NTPC.NS",       name: "NTPC"                   },
  { symbol: "RBLBANK.NS",    name: "RBL Bank"               },
  { symbol: "TATAMOTORS.NS", name: "Tata Motors"            },
  { symbol: "UNOMINDA.NS",   name: "UNO Minda"              },
  { symbol: "TCS.NS",        name: "TCS"                    },
  { symbol: "HEROMOTOCO.NS", name: "Hero MotoCorp"          },
  { symbol: "INDUSTOWER.NS", name: "Indus Towers"           },
  { symbol: "SYNGENE.NS",    name: "Syngene Intl"           },
  { symbol: "DRREDDY.NS",    name: "Dr Reddy's Labs"        },
  { symbol: "CIPLA.NS",      name: "Cipla"                  },
  { symbol: "LTF.NS",        name: "L&T Finance"            },
  { symbol: "IOC.NS",        name: "IOCL"                   },
  { symbol: "ZYDUSLIFE.NS",  name: "Zydus"                  },
  { symbol: "KAYNES.NS",     name: "Kaynes Technology"      },
  { symbol: "SUNPHARMA.NS",  name: "Sun Pharma"             },
  { symbol: "UPL.NS",        name: "UPL"                    },
  { symbol: "HINDZINC.NS",   name: "Hindustan Zinc"         },
  { symbol: "TORNTPHARM.NS", name: "Torrent Pharma"         },
  { symbol: "DIXON.NS",      name: "Dixon Technologies"     },
  { symbol: "CONCOR.NS",     name: "Container Corp"         },
  { symbol: "SIEMENS.NS",    name: "Siemens"                },
  { symbol: "WIPRO.NS",      name: "Wipro"                  },
  { symbol: "ABB.NS",        name: "ABB India"              },
  { symbol: "ADANIGREEN.NS", name: "Adani Green Energy"     },
  { symbol: "SONACOMS.NS",   name: "Sona BLW Precision"     },
  { symbol: "NESTLEIND.NS",  name: "Nestle"                 },
  { symbol: "LICI.NS",       name: "LIC"                    },
  { symbol: "APOLLOHOSP.NS", name: "Apollo Hospitals"       },
  { symbol: "PIIND.NS",      name: "PI Industries"          },
  { symbol: "TATAPOWER.NS",  name: "Tata Power"             },
  { symbol: "POLICYBZR.NS",  name: "PolicyBazaar"           },
  { symbol: "BOSCHLTD.NS",   name: "Bosch"                  },
  { symbol: "NHPC.NS",       name: "NHPC"                   },
  { symbol: "ULTRACEMCO.NS", name: "UltraTech Cement"       },
  { symbol: "BHARTIARTL.NS", name: "Bharti Airtel"          },
  { symbol: "M&M.NS",        name: "Mahindra & Mahindra"    },
  { symbol: "NBCC.NS",       name: "NBCC (India)"           },
  { symbol: "MAXHEALTH.NS",  name: "Max Healthcare"         },
  { symbol: "YESBANK.NS",    name: "Yes Bank"               },
  { symbol: "SHREECEM.NS",   name: "Shree Cement"           },
  { symbol: "SBIN.NS",       name: "SBI"                    },
  { symbol: "TIINDIA.NS",    name: "Tube Investments"       },
  { symbol: "ADANIPORTS.NS", name: "Adani Ports"            },
  { symbol: "BPCL.NS",       name: "BPCL"                   },
  { symbol: "ASIANPAINT.NS", name: "Asian Paints"           },
  { symbol: "HINDUNILVR.NS", name: "Hindustan Unilever"     },
  { symbol: "PAYTM.NS",      name: "Paytm"                  },
  { symbol: "ALKEM.NS",      name: "Alkem Laboratories"     },
  { symbol: "COLPAL.NS",     name: "Colgate-Palmolive"      },
  { symbol: "PETRONET.NS",   name: "Petronet LNG"           },
  { symbol: "MCX.NS",        name: "MCX"                    },
  { symbol: "BSE.NS",        name: "BSE"                    },
  { symbol: "HINDALCO.NS",   name: "Hindalco"               },
  { symbol: "LODHA.NS",      name: "Lodha Developers"       },
  { symbol: "PHOENIXLTD.NS", name: "Phoenix Mills"          },
  { symbol: "ICICIPRULI.NS", name: "ICICI Prudential"       },
  { symbol: "HDFCBANK.NS",   name: "HDFC Bank"              },
  { symbol: "MANAPPURAM.NS", name: "Manappuram Finance"     },
  { symbol: "PRESTIGE.NS",   name: "Prestige Estates"       },
  { symbol: "NATIONALUM.NS", name: "NALCO"                  },
  { symbol: "VOLTAS.NS",     name: "Voltas"                 },
  { symbol: "SHRIRAMFIN.NS", name: "Shriram Finance"        },
  { symbol: "MAZDOCK.NS",    name: "Mazagon Dock Ship"      },
  { symbol: "HDFCLIFE.NS",   name: "HDFC Life Insurance"    },
  { symbol: "SOLARINDS.NS",  name: "Solar Industries"       },
  { symbol: "ONGC.NS",       name: "ONGC"                   },
  { symbol: "BAJAJHLDNG.NS", name: "Bajaj Hold & Invest"    },
  { symbol: "SWIGGY.NS",     name: "Swiggy"                 },
  { symbol: "BRITANNIA.NS",  name: "Britannia Industries"   },
  { symbol: "HAVELLS.NS",    name: "Havells India"          },
  { symbol: "CGPOWER.NS",    name: "CG Power & Inds"        },
  { symbol: "GAIL.NS",       name: "GAIL (India)"           },
  { symbol: "VBL.NS",        name: "Varun Beverages"        },
  { symbol: "SBILIFE.NS",    name: "SBI Life Insurance"     },
  { symbol: "KEI.NS",        name: "KEI Industries"         },
  { symbol: "SUPREMEIND.NS", name: "Supreme Industries"     },
  { symbol: "AUBANK.NS",     name: "AU Small Fin. Bank"     },
  { symbol: "ICICIGI.NS",    name: "ICICI Lombard Gen."     },
  { symbol: "CHOLAFIN.NS",   name: "Cholamandalam Invest"   },
  { symbol: "DMART.NS",      name: "Avenue Supermarts"      },
  { symbol: "ASTRAL.NS",     name: "Astral"                 },
  { symbol: "SRF.NS",        name: "SRF"                    },
  { symbol: "BLUESTARCO.NS", name: "Blue Star"              },
  { symbol: "ANGELONE.NS",   name: "Angel One"              },
  { symbol: "BEL.NS",        name: "Bharat Electronics"     },
  { symbol: "HAL.NS",        name: "HAL"                    },
  { symbol: "IRFC.NS",       name: "IRFC"                   },
  { symbol: "OIL.NS",        name: "Oil India"              },
  { symbol: "BDL.NS",        name: "Bharat Dynamics"        },
  { symbol: "POLYCAB.NS",    name: "Polycab India"          },
  { symbol: "DLF.NS",        name: "DLF"                    },
  { symbol: "ADANIENT.NS",   name: "Adani Enterprises"      },
  { symbol: "WAAREEENER.NS", name: "Waaree Energies"        },
  { symbol: "KOTAKBANK.NS",  name: "Kotak Mahindra Bank"    },
  { symbol: "ABCAPITAL.NS",  name: "Aditya Birla Cap"       },
  { symbol: "CDSL.NS",       name: "Central Dep. Service"   },
  { symbol: "GODREJPROP.NS", name: "Godrej Properties"      },
  { symbol: "IREDA.NS",      name: "Indian Ren. Energy"     },
  { symbol: "BAJFINANCE.NS", name: "Bajaj Finance"          },
  { symbol: "INDIGO.NS",     name: "Interglobe Aviation"    },
  { symbol: "JUBLFOOD.NS",   name: "Jubilant Foodworks"     },
  { symbol: "MUTHOOTFIN.NS", name: "Muthoot Finance"        },
  { symbol: "PATANJALI.NS",  name: "Patanjali Foods"        },
  { symbol: "SBICARD.NS",    name: "SBI Cards"              },
  { symbol: "GODREJCP.NS",   name: "Godrej Consumer"        },
  { symbol: "PREMIERENE.NS", name: "Premier Energies"       },
  { symbol: "BHARATFORG.NS", name: "Bharat Forge"           },
  { symbol: "AXISBANK.NS",   name: "Axis Bank"              },
  { symbol: "DALBHARAT.NS",  name: "Dalmia Bharat"          },
  { symbol: "HDFCAMC.NS",    name: "HDFC Asset Mgmt"        },
  { symbol: "OBEROIRLTY.NS", name: "Oberoi Realty"          },
  { symbol: "MANKIND.NS",    name: "Mankind Pharma"         },
  { symbol: "AMBER.NS",      name: "Amber Enterprises"      },
  { symbol: "RECLTD.NS",     name: "RECL"                   },
  { symbol: "NUVAMA.NS",     name: "Nuvama Wealth"          },
  { symbol: "PFC.NS",        name: "Power Finance Corp"     },
  { symbol: "ICICIBANK.NS",  name: "ICICI Bank"             },
  { symbol: "JIOFIN.NS",     name: "JIO Financial Serv."    },
  { symbol: "LT.NS",         name: "Larsen & Toubro"        },
  { symbol: "HCLTECH.NS",    name: "HCL Technologies"       },
  { symbol: "POWERGRID.NS",  name: "Power Grid Corp"        },
  { symbol: "MARUTI.NS",     name: "Maruti Suzuki"          },
  { symbol: "GRASIM.NS",     name: "Grasim Industries"      },
  { symbol: "TATACONSUM.NS", name: "Tata Consumer"          },
  { symbol: "PPLPHARMA.NS",  name: "Piramal Pharma"         },
  { symbol: "MCDOWELL-N.NS", name: "United Spirits"         },
  { symbol: "ICICIBANK.NS",  name: "ICICI Bank"             },
];

// Deduplicate
const FO_LIST = Array.from(new Map(BASE_FO_LIST.map(s => [s.symbol, s])).values());

async function getFOList() {
  return FO_LIST;
}

// ── Public fetch functions ────────────────────────────────────
async function getFOStocks(force = false) {
  if (!force && isFresh("fo_stocks")) return CACHE.fo_stocks.data;
  console.log(`  📊 DataAgent: Fetching ${FO_LIST.length} F&O stocks in parallel...`);

  const nameMap = Object.fromEntries(FO_LIST.map(s => [s.symbol, s.name]));
  const symbols = FO_LIST.map(s => s.symbol);
  const raw     = await fetchAllParallel(symbols, 20);
  const data    = raw.map(q => ({ ...q, name: nameMap[q.symbol] || q.name }));

  data.sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
  CACHE.fo_stocks = { ts: Date.now(), data };
  console.log(`  ✓ DataAgent: Got ${data.length}/${symbols.length} F&O stocks`);
  return data;
}

// ── Commodities ───────────────────────────────────────────────
const COMMODITY_SYMBOLS = [
  { symbol: "GC=F",  name: "Gold",        unit: "oz"    },
  { symbol: "SI=F",  name: "Silver",      unit: "oz"    },
  { symbol: "CL=F",  name: "Crude Oil",   unit: "bbl"   },
  { symbol: "BZ=F",  name: "Brent Crude", unit: "bbl"   },
  { symbol: "NG=F",  name: "Natural Gas", unit: "MMBtu" },
  { symbol: "HG=F",  name: "Copper",      unit: "lb"    },
  { symbol: "ZC=F",  name: "Corn",        unit: "bu"    },
  { symbol: "ZW=F",  name: "Wheat",       unit: "bu"    },
  { symbol: "ZS=F",  name: "Soybeans",    unit: "bu"    },
  { symbol: "ALI=F", name: "Aluminium",   unit: "lb"    },
];

async function getCommodities(force = false) {
  if (!force && isFresh("commodities")) return CACHE.commodities.data;
  const raw  = await fetchAllParallel(COMMODITY_SYMBOLS.map(c => c.symbol), 10);
  const data = raw.map(q => {
    const m = COMMODITY_SYMBOLS.find(c => c.symbol === q.symbol) || {};
    return { ...q, name: m.name || q.name, unit: m.unit || "" };
  });
  CACHE.commodities = { ts: Date.now(), data };
  return data;
}

// ── ETFs ──────────────────────────────────────────────────────
const ETF_SYMBOLS = [
  "NIFTYBEES.NS","BANKBEES.NS","JUNIORBEES.NS","GOLDBEES.NS",
  "LIQUIDBEES.NS","SETFNIF50.NS","ITBEES.NS","MOM100.NS",
  "SPY","QQQ","DIA","GLD","SLV",
];

async function getETFs(force = false) {
  if (!force && isFresh("etfs")) return CACHE.etfs.data;
  const data = await fetchAllParallel(ETF_SYMBOLS, 13);
  CACHE.etfs = { ts: Date.now(), data };
  return data;
}

// ── Indices ───────────────────────────────────────────────────
const INDEX_SYMBOLS = [
  { symbol: "^NSEI",      name: "Nifty 50"        },
  { symbol: "^BSESN",     name: "Sensex"           },
  { symbol: "^NSEBANK",   name: "Bank Nifty"       },
  { symbol: "^NSEMDCP50", name: "Nifty Midcap 50" },
  { symbol: "^CNXIT",     name: "Nifty IT"         },
  { symbol: "^CNXPHARMA", name: "Nifty Pharma"     },
  { symbol: "^CNXAUTO",   name: "Nifty Auto"       },
  { symbol: "^CNXMETAL",  name: "Nifty Metal"      },
];

async function getIndices(force = false) {
  if (!force && isFresh("indices")) return CACHE.indices.data;
  const raw  = await fetchAllParallel(INDEX_SYMBOLS.map(s => s.symbol), 8);
  const data = raw.map(q => {
    const m = INDEX_SYMBOLS.find(i => i.symbol === q.symbol) || {};
    return { ...q, name: m.name || q.name };
  });
  CACHE.indices = { ts: Date.now(), data };
  return data;
}

// ── Mutual Funds ──────────────────────────────────────────────
const MF_CATEGORIES = [
  { name: "Large Cap",     proxy: "NIFTYBEES.NS",  aum: "₹1,20,000 Cr", returns1y: 13.9 },
  { name: "Mid Cap",       proxy: "JUNIORBEES.NS", aum: "₹34,000 Cr",   returns1y: 22.8 },
  { name: "Small Cap",     proxy: "MOM100.NS",     aum: "₹18,000 Cr",   returns1y: 28.4 },
  { name: "Debt Fund",     proxy: "LIQUIDBEES.NS", aum: "₹56,000 Cr",   returns1y:  7.2 },
  { name: "Index Fund",    proxy: "SETFNIF50.NS",  aum: "₹44,000 Cr",   returns1y: 13.9 },
  { name: "Sectoral - IT", proxy: "ITBEES.NS",     aum: "₹8,000 Cr",    returns1y: 19.7 },
];

async function getMutualFunds(force = false) {
  if (!force && isFresh("mf")) return CACHE.mf.data;
  const proxies = [...new Set(MF_CATEGORIES.map(m => m.proxy))];
  const raw     = await fetchAllParallel(proxies, proxies.length);
  const data    = MF_CATEGORIES.map(m => {
    const q = raw.find(r => r.symbol === m.proxy);
    return { ...m, price: q?.price, changePct: q?.changePct };
  });
  CACHE.mf = { ts: Date.now(), data };
  return data;
}

async function warmCache() {
  console.log("  🔥 DataAgent: Warming cache...");
  try { await getFOStocks(); }  catch (e) { console.error("  ✗ FO:", e.message); }
  try { await getIndices(); }   catch (e) { console.error("  ✗ Idx:", e.message); }
}

// Auto-refresh every 5 min
setInterval(() => {
  getFOStocks(true).catch(() => {});
  getIndices(true).catch(() => {});
}, CACHE_TTL);

module.exports = { getFOStocks, getFOList, getCommodities, getETFs, getIndices, getMutualFunds, warmCache };