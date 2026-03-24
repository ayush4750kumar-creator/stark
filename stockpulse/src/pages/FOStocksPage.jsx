// src/pages/FOStocksPage.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import CompanyLogo from "../components/CompanyLogo";
import InlineCompanyView from "../components/InlineCompanyView";

const BACKEND = "http://localhost:5000/api";

function relTime(iso) {
  if (!iso) return "";
  const d = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (d < 60)   return d + "m ago";
  if (d < 1440) return Math.floor(d / 60) + "h ago";
  return Math.floor(d / 1440) + "d ago";
}
function fmtPrice(v)  { return v  != null ? `₹${v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"; }
function fmtPct(v)    { return v  != null ? `${v >= 0 ? "▲" : "▼"} ${Math.abs(v).toFixed(2)}%` : "—"; }
function fmtVol(v)    {
  if (v == null) return "—";
  if (v >= 1e7)  return `${(v / 1e7).toFixed(2)} Cr`;
  if (v >= 1e5)  return `${(v / 1e5).toFixed(2)} L`;
  return v.toLocaleString("en-IN");
}

const BASE_FO_LIST = [
  { symbol:"TATAELXSI.NS",  name:"Tata Elxsi"            },
  { symbol:"INOXWIND.NS",   name:"INOX Wind"              },
  { symbol:"IDEA.NS",       name:"Vodafone Idea"          },
  { symbol:"LAURUSLABS.NS", name:"Laurus Labs"            },
  { symbol:"HINDPETRO.NS",  name:"HPCL"                   },
  { symbol:"GLENMARK.NS",   name:"Glenmark Pharma"        },
  { symbol:"BHEL.NS",       name:"BHEL"                   },
  { symbol:"JINDALSTEL.NS", name:"Jindal Steel"           },
  { symbol:"LTIM.NS",       name:"LTIMindtree"            },
  { symbol:"AUROPHARMA.NS", name:"Aurobindo Pharma"       },
  { symbol:"OFSS.NS",       name:"Oracle Finl. Service"   },
  { symbol:"TECHM.NS",      name:"Tech Mahindra"          },
  { symbol:"JSWSTEEL.NS",   name:"JSW Steel"              },
  { symbol:"TATATECH.NS",   name:"Tata Technologies"      },
  { symbol:"BANKINDIA.NS",  name:"Bank Of India"          },
  { symbol:"BIOCON.NS",     name:"Biocon"                 },
  { symbol:"TATASTEEL.NS",  name:"Tata Steel"             },
  { symbol:"PIDILITIND.NS", name:"Pidilite Industries"    },
  { symbol:"UNIONBANK.NS",  name:"Union Bank of India"    },
  { symbol:"LUPIN.NS",      name:"Lupin"                  },
  { symbol:"COALINDIA.NS",  name:"Coal India"             },
  { symbol:"PERSISTENT.NS", name:"Persistent Systems"     },
  { symbol:"INFY.NS",       name:"Infosys"                },
  { symbol:"GMRINFRA.NS",   name:"GMR Airports"           },
  { symbol:"DELHIVERY.NS",  name:"Delhivery"              },
  { symbol:"CUMMINSIND.NS", name:"Cummins India"          },
  { symbol:"BANKBARODA.NS", name:"Bank of Baroda"         },
  { symbol:"CANBK.NS",      name:"Canara Bank"            },
  { symbol:"TRENT.NS",      name:"Trent"                  },
  { symbol:"PAGEIND.NS",    name:"Page Industries"        },
  { symbol:"APLAPOLLO.NS",  name:"APL Apollo Tubes"       },
  { symbol:"BAJAJ-AUTO.NS", name:"Bajaj Auto"             },
  { symbol:"INDIANB.NS",    name:"Indian Bank"            },
  { symbol:"KALYANKJIL.NS", name:"Kalyan Jewellers"       },
  { symbol:"PGEL.NS",       name:"PG Electroplast"        },
  { symbol:"DIVISLAB.NS",   name:"Divi's Labs"            },
  { symbol:"RELIANCE.NS",   name:"Reliance Industries"    },
  { symbol:"MPHASIS.NS",    name:"Mphasis"                },
  { symbol:"SUZLON.NS",     name:"Suzlon Energy"          },
  { symbol:"TITAN.NS",      name:"Titan Co"               },
  { symbol:"NMDC.NS",       name:"NMDC"                   },
  { symbol:"EICHERMOT.NS",  name:"Eicher Motors"          },
  { symbol:"IEX.NS",        name:"IEX"                    },
  { symbol:"NAUKRI.NS",     name:"Info Edge (India)"      },
  { symbol:"PNB.NS",        name:"PNB"                    },
  { symbol:"ZOMATO.NS",     name:"Eternal (Zomato)"       },
  { symbol:"NTPC.NS",       name:"NTPC"                   },
  { symbol:"RBLBANK.NS",    name:"RBL Bank"               },
  { symbol:"TATAMOTORS.NS", name:"Tata Motors"            },
  { symbol:"UNOMINDA.NS",   name:"UNO Minda"              },
  { symbol:"TCS.NS",        name:"TCS"                    },
  { symbol:"HEROMOTOCO.NS", name:"Hero MotoCorp"          },
  { symbol:"INDUSTOWER.NS", name:"Indus Towers"           },
  { symbol:"SYNGENE.NS",    name:"Syngene Intl"           },
  { symbol:"DRREDDY.NS",    name:"Dr Reddy's Labs"        },
  { symbol:"CIPLA.NS",      name:"Cipla"                  },
  { symbol:"LTF.NS",        name:"L&T Finance"            },
  { symbol:"IOC.NS",        name:"IOCL"                   },
  { symbol:"ZYDUSLIFE.NS",  name:"Zydus"                  },
  { symbol:"KAYNES.NS",     name:"Kaynes Technology"      },
  { symbol:"SUNPHARMA.NS",  name:"Sun Pharma"             },
  { symbol:"UPL.NS",        name:"UPL"                    },
  { symbol:"HINDZINC.NS",   name:"Hindustan Zinc"         },
  { symbol:"TORNTPHARM.NS", name:"Torrent Pharma"         },
  { symbol:"DIXON.NS",      name:"Dixon Technologies"     },
  { symbol:"CONCOR.NS",     name:"Container Corp"         },
  { symbol:"SIEMENS.NS",    name:"Siemens"                },
  { symbol:"WIPRO.NS",      name:"Wipro"                  },
  { symbol:"ABB.NS",        name:"ABB India"              },
  { symbol:"ADANIGREEN.NS", name:"Adani Green Energy"     },
  { symbol:"SONACOMS.NS",   name:"Sona BLW Precision"     },
  { symbol:"NESTLEIND.NS",  name:"Nestle"                 },
  { symbol:"LICI.NS",       name:"LIC"                    },
  { symbol:"APOLLOHOSP.NS", name:"Apollo Hospitals"       },
  { symbol:"PIIND.NS",      name:"PI Industries"          },
  { symbol:"TATAPOWER.NS",  name:"Tata Power"             },
  { symbol:"POLICYBZR.NS",  name:"PolicyBazaar"           },
  { symbol:"BOSCHLTD.NS",   name:"Bosch"                  },
  { symbol:"NHPC.NS",       name:"NHPC"                   },
  { symbol:"ULTRACEMCO.NS", name:"UltraTech Cement"       },
  { symbol:"BHARTIARTL.NS", name:"Bharti Airtel"          },
  { symbol:"M&M.NS",        name:"Mahindra & Mahindra"    },
  { symbol:"NBCC.NS",       name:"NBCC (India)"           },
  { symbol:"MAXHEALTH.NS",  name:"Max Healthcare"         },
  { symbol:"YESBANK.NS",    name:"Yes Bank"               },
  { symbol:"SHREECEM.NS",   name:"Shree Cement"           },
  { symbol:"SBIN.NS",       name:"SBI"                    },
  { symbol:"TIINDIA.NS",    name:"Tube Investments"       },
  { symbol:"ADANIPORTS.NS", name:"Adani Ports"            },
  { symbol:"BPCL.NS",       name:"BPCL"                   },
  { symbol:"ASIANPAINT.NS", name:"Asian Paints"           },
  { symbol:"HINDUNILVR.NS", name:"Hindustan Unilever"     },
  { symbol:"PAYTM.NS",      name:"Paytm"                  },
  { symbol:"ALKEM.NS",      name:"Alkem Laboratories"     },
  { symbol:"COLPAL.NS",     name:"Colgate-Palmolive"      },
  { symbol:"PETRONET.NS",   name:"Petronet LNG"           },
  { symbol:"MCX.NS",        name:"MCX"                    },
  { symbol:"BSE.NS",        name:"BSE"                    },
  { symbol:"HINDALCO.NS",   name:"Hindalco"               },
  { symbol:"LODHA.NS",      name:"Lodha Developers"       },
  { symbol:"PHOENIXLTD.NS", name:"Phoenix Mills"          },
  { symbol:"ICICIPRULI.NS", name:"ICICI Prudential"       },
  { symbol:"HDFCBANK.NS",   name:"HDFC Bank"              },
  { symbol:"MANAPPURAM.NS", name:"Manappuram Finance"     },
  { symbol:"PRESTIGE.NS",   name:"Prestige Estates"       },
  { symbol:"NATIONALUM.NS", name:"NALCO"                  },
  { symbol:"VOLTAS.NS",     name:"Voltas"                 },
  { symbol:"SHRIRAMFIN.NS", name:"Shriram Finance"        },
  { symbol:"MAZDOCK.NS",    name:"Mazagon Dock Ship"      },
  { symbol:"HDFCLIFE.NS",   name:"HDFC Life Insurance"    },
  { symbol:"SOLARINDS.NS",  name:"Solar Industries"       },
  { symbol:"ONGC.NS",       name:"ONGC"                   },
  { symbol:"BAJAJHLDNG.NS", name:"Bajaj Hold & Invest"    },
  { symbol:"SWIGGY.NS",     name:"Swiggy"                 },
  { symbol:"BRITANNIA.NS",  name:"Britannia Industries"   },
  { symbol:"HAVELLS.NS",    name:"Havells India"          },
  { symbol:"CGPOWER.NS",    name:"CG Power & Inds"        },
  { symbol:"GAIL.NS",       name:"GAIL (India)"           },
  { symbol:"VBL.NS",        name:"Varun Beverages"        },
  { symbol:"SBILIFE.NS",    name:"SBI Life Insurance"     },
  { symbol:"KEI.NS",        name:"KEI Industries"         },
  { symbol:"SUPREMEIND.NS", name:"Supreme Industries"     },
  { symbol:"AUBANK.NS",     name:"AU Small Fin. Bank"     },
  { symbol:"ICICIGI.NS",    name:"ICICI Lombard Gen."     },
  { symbol:"CHOLAFIN.NS",   name:"Cholamandalam Invest"   },
  { symbol:"DMART.NS",      name:"Avenue Supermarts"      },
  { symbol:"ASTRAL.NS",     name:"Astral"                 },
  { symbol:"SRF.NS",        name:"SRF"                    },
  { symbol:"BLUESTARCO.NS", name:"Blue Star"              },
  { symbol:"ANGELONE.NS",   name:"Angel One"              },
  { symbol:"BEL.NS",        name:"Bharat Electronics"     },
  { symbol:"HAL.NS",        name:"HAL"                    },
  { symbol:"IRFC.NS",       name:"IRFC"                   },
  { symbol:"OIL.NS",        name:"Oil India"              },
  { symbol:"BDL.NS",        name:"Bharat Dynamics"        },
  { symbol:"POLYCAB.NS",    name:"Polycab India"          },
  { symbol:"DLF.NS",        name:"DLF"                    },
  { symbol:"ADANIENT.NS",   name:"Adani Enterprises"      },
  { symbol:"WAAREEENER.NS", name:"Waaree Energies"        },
  { symbol:"KOTAKBANK.NS",  name:"Kotak Mahindra Bank"    },
  { symbol:"ABCAPITAL.NS",  name:"Aditya Birla Cap"       },
  { symbol:"CDSL.NS",       name:"Central Dep. Service"   },
  { symbol:"GODREJPROP.NS", name:"Godrej Properties"      },
  { symbol:"IREDA.NS",      name:"Indian Ren. Energy"     },
  { symbol:"BAJFINANCE.NS", name:"Bajaj Finance"          },
  { symbol:"INDIGO.NS",     name:"Interglobe Aviation"    },
  { symbol:"JUBLFOOD.NS",   name:"Jubilant Foodworks"     },
  { symbol:"MUTHOOTFIN.NS", name:"Muthoot Finance"        },
  { symbol:"PATANJALI.NS",  name:"Patanjali Foods"        },
  { symbol:"SBICARD.NS",    name:"SBI Cards"              },
  { symbol:"GODREJCP.NS",   name:"Godrej Consumer"        },
  { symbol:"PREMIERENE.NS", name:"Premier Energies"       },
  { symbol:"BHARATFORG.NS", name:"Bharat Forge"           },
  { symbol:"AXISBANK.NS",   name:"Axis Bank"              },
  { symbol:"DALBHARAT.NS",  name:"Dalmia Bharat"          },
  { symbol:"HDFCAMC.NS",    name:"HDFC Asset Mgmt"        },
  { symbol:"OBEROIRLTY.NS", name:"Oberoi Realty"          },
  { symbol:"MANKIND.NS",    name:"Mankind Pharma"         },
  { symbol:"AMBER.NS",      name:"Amber Enterprises"      },
  { symbol:"RECLTD.NS",     name:"RECL"                   },
  { symbol:"NUVAMA.NS",     name:"Nuvama Wealth"          },
  { symbol:"PFC.NS",        name:"Power Finance Corp"     },
  { symbol:"ICICIBANK.NS",  name:"ICICI Bank"             },
  { symbol:"JIOFIN.NS",     name:"JIO Financial Serv."    },
  { symbol:"LT.NS",         name:"Larsen & Toubro"        },
  { symbol:"HCLTECH.NS",    name:"HCL Technologies"       },
  { symbol:"POWERGRID.NS",  name:"Power Grid Corp"        },
  { symbol:"MARUTI.NS",     name:"Maruti Suzuki"          },
  { symbol:"GRASIM.NS",     name:"Grasim Industries"      },
  { symbol:"TATACONSUM.NS", name:"Tata Consumer"          },
  { symbol:"PPLPHARMA.NS",  name:"Piramal Pharma"         },
  { symbol:"MCDOWELL-N.NS", name:"United Spirits"         },
];

const FO_LIST = Array.from(new Map(BASE_FO_LIST.map(s => [s.symbol, s])).values());

export default function FOStocksPage() {
  const [foList,        setFoList]        = useState([]);
  const [quotes,        setQuotes]        = useState({});
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(false);
  const [filter,        setFilter]        = useState("all");
  const [sortCol,       setSortCol]       = useState("change");
  const [sortDir,       setSortDir]       = useState("desc");
  const [searchQuery,   setSearchQuery]   = useState("");
  const [searchRes,     setSearchRes]     = useState([]);
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [watchlist,     setWatchlist]     = useState(() => {
    try { return JSON.parse(localStorage.getItem("fo_watchlist") || "[]"); } catch { return []; }
  });
  const [activeDash, setActiveDash] = useState(null);

  const didFetch    = useRef(false);
  const searchRef   = useRef();
  const searchTimer = useRef();

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;
    Promise.all([
      fetch(`${BACKEND}/data/fo/list`).then(r => r.json()).catch(() => null),
      fetch(`${BACKEND}/data/fo/stocks`).then(r => r.json()).catch(() => null),
    ]).then(([listRes, stocksRes]) => {
      const map = {};
      if (stocksRes?.success && stocksRes.data?.length) {
        stocksRes.data.forEach(q => { map[q.symbol] = q; });
        setQuotes(map);
      }
      if (listRes?.success && listRes.data?.length) setFoList(listRes.data);
      else if (stocksRes?.success && stocksRes.data?.length)
        setFoList(stocksRes.data.map(q => ({ symbol: q.symbol, name: q.name })));
      else { setFoList(FO_LIST); setError(true); }
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    localStorage.setItem("fo_watchlist", JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    const h = e => { if (!searchRef.current?.contains(e.target)) setSearchOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleSearch = useCallback((q) => {
    setSearchQuery(q);
    clearTimeout(searchTimer.current);
    if (!q.trim()) { setSearchRes([]); setSearchOpen(false); return; }
    const qUp = q.toUpperCase();
    const local = (foList.length ? foList : FO_LIST)
      .filter(s => s.symbol.replace(/\.(NS|BO)$/, "").includes(qUp) || (s.name || "").toUpperCase().includes(qUp))
      .slice(0, 8)
      .map(s => ({ ...s, ...(quotes[s.symbol] || {}) }));
    if (local.length) { setSearchRes(local); setSearchOpen(true); }
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const r = await fetch(`${BACKEND}/stocks/search?q=${encodeURIComponent(q)}`);
        const d = await r.json();
        if (d.success && d.data?.length) {
          const results = d.data
            .filter(s => s.symbol?.endsWith(".NS") || s.symbol?.endsWith(".BO") || s.exchange?.includes("NSE"))
            .slice(0, 8)
            .map(s => ({ symbol: s.symbol, name: s.name || s.symbol, price: s.price, changePct: s.change_pct }));
          if (results.length) { setSearchRes(results); setSearchOpen(true); }
        }
      } catch {} finally { setSearchLoading(false); }
    }, 350);
  }, [foList, quotes]);

  const addToWatchlist = useCallback((stock) => {
    setWatchlist(prev => {
      if (prev.find(s => s.symbol === stock.symbol)) return prev;
      return [...prev, { symbol: stock.symbol, name: stock.name || stock.symbol.replace(/\.(NS|BO)$/, "") }];
    });
  }, []);

  const removeFromWatchlist = useCallback((symbol) => {
    setWatchlist(prev => prev.filter(s => s.symbol !== symbol));
    if (activeDash?.symbol === symbol) setActiveDash(null);
  }, [activeDash]);

  const isTracked = (symbol) => watchlist.some(s => s.symbol === symbol);

  const openDashboard = useCallback((stockOrSym) => {
    const sym  = typeof stockOrSym === "string" ? stockOrSym : stockOrSym.symbol;
    const meta = (foList.length ? foList : FO_LIST).find(s => s.symbol === sym);
    const q    = quotes[sym];
    setActiveDash({
      symbol:    sym,
      name:      meta?.name || q?.name || sym.replace(/\.(NS|BO)$/, ""),
      price:     q?.price     ?? null,
      changePct: q?.changePct ?? null,
      changeAmt: q?.change    ?? null,
      volume:    q?.volume    ?? null,
    });
  }, [foList, quotes]);

  // Build table rows
  const rows = (foList.length ? foList : FO_LIST).map(co => {
    const q = quotes[co.symbol];
    return {
      symbol:    co.symbol,
      name:      q?.name || co.name || co.symbol.replace(/\.(NS|BO)$/, ""),
      price:     q?.price     ?? null,
      changePct: q?.changePct ?? null,
      changeAmt: q?.change    ?? null,
      volume:    q?.volume    ?? null,
    };
  });

  const tableRows = rows.filter(r => {
    const matchFilter =
      filter === "gainers" ? (r.changePct ?? 0) >= 0 :
      filter === "losers"  ? (r.changePct ?? 0) < 0  : true;
    const q = searchQuery.toUpperCase();
    const matchSearch = !searchQuery ||
      r.symbol.replace(/\.(NS|BO)$/, "").includes(q) ||
      r.name.toUpperCase().includes(q);
    return matchFilter && matchSearch;
  });

  const sorted = [...tableRows].sort((a, b) => {
    let va, vb;
    if (sortCol === "name")   { va = a.name; vb = b.name; }
    if (sortCol === "price")  { va = a.price ?? -1; vb = b.price ?? -1; }
    if (sortCol === "change") { va = a.changePct ?? -999; vb = b.changePct ?? -999; }
    if (sortCol === "volume") { va = a.volume ?? -1; vb = b.volume ?? -1; }
    if (typeof va === "string") return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    return sortDir === "asc" ? va - vb : vb - va;
  });

  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
  }

  const gainers = rows.filter(r => (r.changePct ?? 0) >= 0).length;
  const losers  = rows.filter(r => (r.changePct ?? 0) < 0).length;

  if (loading) return (
    <div style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"80px 0",gap:14 }}>
      <div style={{ width:32,height:32,borderRadius:"50%",border:"3px solid var(--border2)",borderTopColor:"var(--accent)",animation:"spin 0.8s linear infinite" }}/>
      <div style={{ fontFamily:"var(--font-display)",fontSize:13,color:"var(--text3)" }}>Fetching live F&O prices...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ display:"flex",height:"100%",overflow:"hidden",background:"var(--bg)" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        .fo-row:hover { background: var(--bg2) !important; }
        .fo-track-btn { opacity: 0; transition: opacity 0.12s; }
        .fo-row:hover .fo-track-btn { opacity: 1; }
        .fo-table-wrap::-webkit-scrollbar { height: 4px; width: 4px; }
        .fo-table-wrap::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 4px; }
      `}</style>

      {/* ── LEFT SIDEBAR ─────────────────────────────────────────────── */}
      <div style={{ width:224,flexShrink:0,borderRight:"1px solid var(--border)",display:"flex",flexDirection:"column",background:"var(--bg)" }}>

        <div style={{ padding:"14px 14px 8px",borderBottom:"1px solid var(--border)",flexShrink:0 }}>
          <div style={{ fontFamily:"var(--font-display)",fontWeight:800,fontSize:11,color:"var(--text3)",letterSpacing:"0.1em" }}>F&O WATCHLIST</div>
          <div style={{ fontSize:10,color:"var(--text3)",marginTop:1 }}>{watchlist.length} tracked</div>
        </div>

        {/* Search */}
        <div ref={searchRef} style={{ padding:"8px 10px 4px",position:"relative",flexShrink:0 }}>
          <div style={{ position:"relative" }}>
            <svg style={{ position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:"var(--text3)",pointerEvents:"none" }} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input placeholder="Search F&O stocks…" value={searchQuery} onChange={e => handleSearch(e.target.value)} onFocus={() => { if (searchRes.length) setSearchOpen(true); }}
              style={{ width:"100%",padding:"7px 28px 7px 26px",borderRadius:8,border:"1px solid var(--border)",fontFamily:"var(--font-display)",fontSize:11,background:"var(--bg2)",color:"var(--text)",outline:"none",boxSizing:"border-box" }}/>
            {searchQuery && <button onClick={() => { setSearchQuery(""); setSearchRes([]); setSearchOpen(false); }} style={{ position:"absolute",right:7,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"var(--text3)",cursor:"pointer",fontSize:13,padding:0 }}>×</button>}
          </div>

          {searchOpen && searchRes.length > 0 && (
            <div style={{ position:"absolute",top:"calc(100% - 2px)",left:10,right:10,background:"var(--bg)",border:"1px solid var(--border2)",borderRadius:10,zIndex:400,boxShadow:"0 8px 28px rgba(0,0,0,0.14)",overflow:"hidden",maxHeight:300,overflowY:"auto" }}>
              {searchLoading && <div style={{ padding:"8px 12px",fontSize:11,color:"var(--text3)",fontFamily:"var(--font-display)",display:"flex",alignItems:"center",gap:6 }}><div style={{ width:9,height:9,borderRadius:"50%",border:"2px solid var(--border2)",borderTopColor:"var(--accent)",animation:"spin 0.7s linear infinite" }}/>Searching…</div>}
              {searchRes.map((s, i) => {
                const up      = (s.changePct ?? 0) >= 0;
                const tracked = isTracked(s.symbol);
                return (
                  <div key={s.symbol + i} style={{ display:"flex",alignItems:"center",gap:8,padding:"9px 12px",borderBottom:"1px solid var(--border)",transition:"background 0.1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--bg2)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <CompanyLogo symbol={s.symbol} name={s.name} size={26}/>
                    {/* Name → opens dashboard */}
                    <div style={{ flex:1,minWidth:0,cursor:"pointer" }} onClick={() => { openDashboard(s); setSearchOpen(false); setSearchQuery(""); setSearchRes([]); }}>
                      <div style={{ fontFamily:"var(--font-display)",fontWeight:700,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{s.name || s.symbol.replace(/\.(NS|BO)$/, "")}</div>
                      <div style={{ fontSize:10,color:"var(--text3)",display:"flex",gap:5 }}>
                        <span>{s.symbol.replace(/\.(NS|BO)$/, "")}</span>
                        {(s.changePct ?? s.change_pct) != null && <span style={{ color:up?"var(--bull)":"var(--bear)",fontWeight:700 }}>{up?"▲":"▼"}{Math.abs(s.changePct ?? s.change_pct ?? 0).toFixed(1)}%</span>}
                      </div>
                    </div>
                    {/* + button */}
                    <button onClick={e => { e.stopPropagation(); tracked ? removeFromWatchlist(s.symbol) : addToWatchlist(s); }}
                      style={{ width:24,height:24,borderRadius:6,flexShrink:0,background:tracked?"rgba(0,212,170,0.12)":"var(--accent)",border:tracked?"1px solid var(--bull)":"none",color:tracked?"var(--bull)":"#fff",fontWeight:800,fontSize:15,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.12s" }}>
                      {tracked ? "✓" : "+"}
                    </button>
                  </div>
                );
              })}
              <div style={{ padding:"6px 12px",fontSize:10,color:"var(--text3)",fontFamily:"var(--font-display)",textAlign:"center",borderTop:"1px solid var(--border)" }}>Click name to open dashboard · + to track</div>
            </div>
          )}
        </div>

        {/* Watchlist items */}
        <div style={{ flex:1,overflowY:"auto",padding:"2px 0" }}>
          {watchlist.length === 0 ? (
            <div style={{ padding:"14px",color:"var(--text3)",fontSize:11,lineHeight:1.7,fontFamily:"var(--font-display)" }}>Search and add stocks to track them here.</div>
          ) : watchlist.map(ws => {
            const q        = quotes[ws.symbol];
            const up       = (q?.changePct ?? 0) >= 0;
            const isActive = activeDash?.symbol === ws.symbol;
            return (
              <div key={ws.symbol} onClick={() => openDashboard(ws)}
                style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 12px",cursor:"pointer",background:isActive?"rgba(0,212,170,0.06)":"transparent",borderLeft:`2px solid ${isActive?"var(--bull)":"transparent"}`,transition:"all 0.12s" }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "var(--bg2)"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}>
                <CompanyLogo symbol={ws.symbol} name={ws.name} size={30}/>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontFamily:"var(--font-display)",fontWeight:700,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{ws.symbol.replace(/\.(NS|BO)$/, "")}</div>
                  <div style={{ fontSize:10,color:"var(--text3)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{ws.name}</div>
                </div>
                <div style={{ textAlign:"right",flexShrink:0 }}>
                  {q?.price != null && <div style={{ fontSize:11,fontFamily:"var(--font-display)",fontWeight:700 }}>₹{q.price.toLocaleString("en-IN", { maximumFractionDigits:0 })}</div>}
                  {q?.changePct != null && <div style={{ fontSize:10,fontWeight:700,color:up?"var(--bull)":"var(--bear)" }}>{up?"▲":"▼"}{Math.abs(q.changePct).toFixed(2)}%</div>}
                </div>
                <button onClick={e => { e.stopPropagation(); removeFromWatchlist(ws.symbol); }}
                  style={{ width:16,height:16,flexShrink:0,border:"none",background:"transparent",color:"var(--text3)",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",opacity:0.4,transition:"opacity 0.12s" }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.color = "var(--bear)"; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = "0.4"; e.currentTarget.style.color = "var(--text3)"; }}>×</button>
              </div>
            );
          })}
        </div>

        {/* Sidebar footer */}
        <div style={{ padding:"8px 14px",borderTop:"1px solid var(--border)",flexShrink:0 }}>
          <div style={{ fontSize:10,color:"var(--text3)",fontFamily:"var(--font-display)",display:"flex",gap:8 }}>
            <span style={{ color:"var(--bull)" }}>▲ {gainers}</span>
            <span style={{ color:"var(--bear)" }}>▼ {losers}</span>
            <span style={{ marginLeft:"auto" }}>{(foList.length || FO_LIST.length)} stocks</span>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────── */}
      <div style={{ flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minWidth:0 }}>

        {activeDash ? (
          /* ── InlineCompanyView dashboard ── */
          <div style={{ height:"100%",overflowY:"auto",maxWidth:860 }}>
            <InlineCompanyView symbol={activeDash.symbol} company={activeDash.name} onBack={() => setActiveDash(null)} stock={{ price: activeDash.price, change_pct: activeDash.changePct, change_amt: activeDash.changeAmt, volume: activeDash.volume, market_cap: activeDash.marketCap }}
              trackButton={<button onClick={()=>isTracked(activeDash.symbol)?removeFromWatchlist(activeDash.symbol):addToWatchlist(activeDash)} style={{ padding:"7px 16px",borderRadius:8,border:`1px solid ${isTracked(activeDash.symbol)?"var(--bull)":"var(--border2)"}`,background:isTracked(activeDash.symbol)?"rgba(0,212,170,0.08)":"transparent",color:isTracked(activeDash.symbol)?"var(--bull)":"var(--text2)",fontFamily:"var(--font-display)",fontWeight:700,fontSize:12,cursor:"pointer" }}>{isTracked(activeDash.symbol)?"✓ Tracked":"+ Track"}</button>}
            />
          </div>
        ) : (
          /* ── Table ── */
          <>
            {/* Toolbar */}
            <div style={{ padding:"12px 18px 10px",borderBottom:"1px solid var(--border)",display:"flex",gap:7,alignItems:"center",flexWrap:"wrap",flexShrink:0 }}>
              {[
                { id:"all",     label:"All",      count: rows.filter(r => r.price != null).length },
                { id:"gainers", label:"▲ Gainers", count: gainers },
                { id:"losers",  label:"▼ Losers",  count: losers  },
              ].map(tab => (
                <button key={tab.id} onClick={() => setFilter(tab.id)}
                  style={{ padding:"5px 14px",borderRadius:40,border:filter===tab.id?"1.5px solid var(--text)":"1.5px solid var(--border)",background:filter===tab.id?"var(--text)":"transparent",color:filter===tab.id?"var(--bg)":"var(--text2)",fontFamily:"var(--font-display)",fontWeight:700,fontSize:11,cursor:"pointer",transition:"all 0.15s",display:"flex",alignItems:"center",gap:5 }}>
                  {tab.label}
                  <span style={{ fontSize:9,padding:"0 4px",borderRadius:8,background:filter===tab.id?"rgba(255,255,255,0.18)":"var(--bg3)" }}>{tab.count}</span>
                </button>
              ))}
              <span style={{ marginLeft:"auto",fontSize:10,color:"var(--text3)",fontFamily:"var(--font-display)" }}>
                Showing {sorted.length} stocks · Click name to open dashboard
              </span>
            </div>

            {/* Horizontally scrollable table */}
            <div className="fo-table-wrap" style={{ flex:1,overflow:"auto" }}>
              <div style={{ minWidth:740 }}>
                {/* Sticky header */}
                <div style={{ display:"grid",gridTemplateColumns:"2.6fr 1fr 1.1fr 1fr 90px",padding:"9px 18px",background:"var(--bg2)",borderBottom:"1px solid var(--border)",position:"sticky",top:0,zIndex:10 }}>
                  {[
                    { col:"name",   label:"Stock",  align:"left"  },
                    { col:"price",  label:"Price",  align:"right" },
                    { col:"change", label:"Change", align:"right" },
                    { col:"volume", label:"Volume", align:"right" },
                    { col:null,     label:"Action", align:"right" },
                  ].map(({ col, label, align }) => (
                    <div key={label} onClick={() => col && toggleSort(col)}
                      style={{ display:"flex",alignItems:"center",gap:3,justifyContent:align==="right"?"flex-end":"flex-start",fontFamily:"var(--font-display)",fontWeight:700,fontSize:11,color:sortCol===col?"var(--text)":"var(--text3)",letterSpacing:"0.05em",cursor:col?"pointer":"default",userSelect:"none" }}>
                      {label}
                      {col && <span style={{ fontSize:9,opacity:sortCol===col?1:0.28 }}>{sortCol===col?(sortDir==="asc"?"↑":"↓"):"↕"}</span>}
                    </div>
                  ))}
                </div>

                {/* Rows */}
                {sorted.length === 0 ? (
                  <div style={{ textAlign:"center",padding:"48px",color:"var(--text3)",fontFamily:"var(--font-display)",fontSize:13 }}>No stocks match</div>
                ) : sorted.map(row => {
                  const up      = (row.changePct ?? 0) >= 0;
                  const tracked = isTracked(row.symbol);
                  const isActive = activeDash?.symbol === row.symbol;
                  return (
                    <div key={row.symbol} className="fo-row"
                      style={{ display:"grid",gridTemplateColumns:"2.6fr 1fr 1.1fr 1fr 90px",padding:"9px 18px",alignItems:"center",borderBottom:"1px solid var(--border)",background:isActive?"rgba(0,212,170,0.04)":"transparent",transition:"background 0.1s" }}>

                      <div style={{ display:"flex",alignItems:"center",gap:9,minWidth:0 }}>
                        <div style={{ flexShrink:0,cursor:"pointer" }} onClick={() => openDashboard(row)}>
                          <CompanyLogo symbol={row.symbol} name={row.name} size={34}/>
                        </div>
                        <div style={{ minWidth:0,flex:1 }}>
                          <div onClick={() => openDashboard(row)}
                            style={{ fontFamily:"var(--font-display)",fontWeight:700,fontSize:13,color:"var(--text)",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",cursor:"pointer",maxWidth:170 }}
                            title={row.name}>{row.name}</div>
                          <div style={{ display:"flex",alignItems:"center",gap:6,marginTop:2 }}>
                            <span style={{ fontSize:10,color:"var(--text3)",fontFamily:"var(--font-display)" }}>{row.symbol.replace(/\.(NS|BO)$/, "")}</span>
                            <button className="fo-track-btn" onClick={e => { e.stopPropagation(); tracked ? removeFromWatchlist(row.symbol) : addToWatchlist(row); }}
                              style={{ padding:"1px 6px",borderRadius:4,border:`1px solid ${tracked?"var(--bull)":"var(--border2)"}`,background:tracked?"rgba(0,212,170,0.08)":"var(--bg3)",color:tracked?"var(--bull)":"var(--text3)",fontFamily:"var(--font-display)",fontWeight:700,fontSize:9,cursor:"pointer",letterSpacing:"0.04em",whiteSpace:"nowrap" }}>
                              {tracked ? "✓ TRACKED" : "+ TRACK"}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign:"right",fontFamily:"var(--font-mono)",fontWeight:700,fontSize:13 }}>
                        {row.price != null ? fmtPrice(row.price) : <span style={{ color:"var(--text3)",fontSize:11,fontWeight:400 }}>—</span>}
                      </div>

                      <div style={{ textAlign:"right" }}>
                        {row.changePct != null ? (
                          <>
                            <div style={{ fontFamily:"var(--font-mono)",fontWeight:700,fontSize:13,color:up?"var(--bull)":"var(--bear)" }}>{fmtPct(row.changePct)}</div>
                            {row.changeAmt != null && <div style={{ fontSize:10,color:up?"var(--bull)":"var(--bear)",opacity:0.65 }}>{up?"+":"−"}₹{Math.abs(row.changeAmt).toFixed(2)}</div>}
                          </>
                        ) : <span style={{ color:"var(--text3)",fontSize:11 }}>—</span>}
                      </div>

                      <div style={{ textAlign:"right",fontFamily:"var(--font-mono)",fontSize:12,color:"var(--text2)" }}>
                        {row.volume != null ? fmtVol(row.volume) : <span style={{ color:"var(--text3)" }}>—</span>}
                      </div>

                      <div style={{ textAlign:"right" }}>
                        <button onClick={() => openDashboard(row)}
                          style={{ padding:"5px 10px",borderRadius:7,border:"1px solid var(--border2)",background:"transparent",fontFamily:"var(--font-display)",fontWeight:700,fontSize:10,color:"var(--text3)",cursor:"pointer",transition:"all 0.12s" }}
                          onMouseEnter={e => { e.currentTarget.style.background = "var(--text)"; e.currentTarget.style.color = "var(--bg)"; e.currentTarget.style.borderColor = "var(--text)"; }}
                          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text3)"; e.currentTarget.style.borderColor = "var(--border2)"; }}>
                          View →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}