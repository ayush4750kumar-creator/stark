// server.js
require("dotenv").config();

const express   = require("express");
const cors      = require("cors");
const helmet    = require("helmet");
const morgan    = require("morgan");
const rateLimit = require("express-rate-limit");

const app  = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 5000;

app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(morgan("dev"));
app.use(express.json());
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use("/api/", rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true }));

// ── Wait for DB then mount routes and start ───────────────────
const { dbReady } = require("./config/database");

dbReady.then(() => {
  const newsRouter          = require("./routes/news");
  const stocksRouter        = require("./routes/stocks");
  const { router: authRouter } = require("./routes/auth");
  const categoryFetchRouter = require("./routes/categoryFetchRoute");
  const dataRouter          = require("./routes/dataRoute");
  const intradayRouter      = require("./routes/intradayAgent");
  const etfRouter           = require("./routes/etfRoute");
  const indicesRouter       = require("./routes/indicesRoute");
  const logoRouter          = require("./routes/logoRoute");
  const bulkPriceRouter     = require("./routes/bulkPriceRoute");
  const sidebarRouter       = require("./routes/sidebarRoute");

  app.use("/api/news",      newsRouter);
  app.use("/api/stocks",    stocksRouter);
  app.use("/api/stocks",    bulkPriceRouter);
  app.use("/api/auth",      authRouter);
  app.use("/api/fetch",     categoryFetchRouter);
  app.use("/api/data",      dataRouter);
  app.use("/api/intraday",  intradayRouter);
  app.use("/api/etf",       etfRouter);
  app.use("/api/indices",   indicesRouter);
  app.use("/api/logos",     logoRouter);
  app.use("/api/sidebar",   sidebarRouter);

  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok", time: new Date().toISOString(),
      env: {
        finnhub: process.env.FINNHUB_API_KEY ? "✅ set" : "❌ missing",
        gnews:   process.env.GNEWS_API_KEY   ? "✅ set" : "❌ missing",
      },
    });
  });

  app.post("/api/admin/run-agents", (req, res) => {
    const { runNewsPipeline } = require("./scheduler/runAgents");
    res.json({ success: true, message: "Pipeline triggered" });
    runNewsPipeline();
  });

  app.post("/api/admin/refresh-prices", (req, res) => {
    const { runPricePipeline } = require("./scheduler/runAgents");
    res.json({ success: true, message: "Price refresh triggered" });
    runPricePipeline();
  });

  app.get("/", (req, res) => { res.json({ success: true, message: "Gramble API is running!" }); });
  app.use((req, res) => res.status(404).json({ success: false, error: `Route ${req.path} not found` }));
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, error: "Internal server error" });
  });

  app.listen(PORT, () => {
    console.log("\n" + "═".repeat(50));
    console.log("  Gramble Backend running!");
    console.log(`   API:      http://localhost:${PORT}/api`);
    console.log(`   Health:   http://localhost:${PORT}/api/health`);
    console.log(`   Auth:     http://localhost:${PORT}/api/auth`);
    console.log(`   News:     http://localhost:${PORT}/api/news`);
    console.log(`   Stocks:   http://localhost:${PORT}/api/stocks`);
    console.log(`   Fetch:    http://localhost:${PORT}/api/fetch/category`);
    console.log(`   Data:     http://localhost:${PORT}/api/data`);
    console.log(`   ETF:      http://localhost:${PORT}/api/etf`);
    console.log(`   Indices:  http://localhost:${PORT}/api/indices`);
    console.log(`   Logos:    http://localhost:${PORT}/api/logos`);
    console.log(`   Sidebar:  http://localhost:${PORT}/api/sidebar`);
    console.log("═".repeat(50) + "\n");

    const { startScheduler } = require("./scheduler/runAgents");
    startScheduler();

    // Pre-warm caches
    require("./services/dataFetchAgent").warmCache().catch(() => {});
    // Pre-fetch company logos into DB cache (runs 8s after startup)
    require("./services/logoService").warmLogos();
    // Pre-warm sidebar category cache (runs 3s after startup, refreshes every 3 min)
    require("./services/sidebarAgent").warmAll().catch(() => {});
  });
}).catch(err => {
  console.error("Failed to init database:", err);
  process.exit(1);
}); 
