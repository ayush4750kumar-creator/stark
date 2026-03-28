// agents/agent5_images.js
// Tries article's own image first, falls back to Unsplash search

const axios  = require("axios");
const { getDB } = require("../config/database");

const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;

async function isImageAccessible(url) {
  if (!url) return false;
  try {
    const res = await axios.head(url, { timeout: 5000 });
    return res.status === 200 && (res.headers["content-type"] || "").startsWith("image");
  } catch {
    return false;
  }
}

async function searchUnsplash(query) {
  if (!UNSPLASH_KEY || UNSPLASH_KEY.length < 10) return null;
  try {
    const res = await axios.get("https://api.unsplash.com/search/photos", {
      params: { query, per_page: 1, orientation: "landscape" },
      headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` },
      timeout: 8000,
    });
    return res.data?.results?.[0]?.urls?.regular || null;
  } catch (e) {
    console.error("  ⚠ Unsplash error:", e.message);
    return null;
  }
}

function buildSearchQuery(article) {
  // Use company name if stock-specific, else use source/sector keywords
  if (article.company) return `${article.company} stock market finance`;
  if (article.symbol)  return `${article.symbol} stock market`;
  return "stock market finance business";
}

async function runAgent5(limit = 50) {
  console.log("\n🖼  Agent5 — fetching images...");
  const db = getDB();
  const t0 = Date.now();

  // Get articles that have been summarized (processed=2) but have no confirmed image
  const { rows: articles } = await db.query(`
    SELECT id, headline, image_url, symbol, company, source
    FROM articles
    WHERE processed = 2 AND (image_url IS NULL OR image_url = '')
    ORDER BY id DESC
    LIMIT $1
  `, [limit]);

  if (!articles.length) {
    console.log("  ✓ Agent5: no images needed");
    return 0;
  }

  console.log(`  🖼  Agent5: processing ${articles.length} articles...`);
  let fromArticle = 0, fromUnsplash = 0, failed = 0;

  for (const article of articles) {
    try {
      let finalImage = null;

      // Step 1: try the article's own image
      if (article.image_url && await isImageAccessible(article.image_url)) {
        finalImage = article.image_url;
        fromArticle++;
      }

      // Step 2: fallback to Unsplash
      if (!finalImage) {
        const query = buildSearchQuery(article);
        finalImage  = await searchUnsplash(query);
        if (finalImage) fromUnsplash++;
      }

      if (finalImage) {
        await db.query(`
          UPDATE articles SET image_url = $1, processed = 3 WHERE id = $2
        `, [finalImage, article.id]);
      } else {
        // No image found — still mark as done so we don't retry forever
        await db.query("UPDATE articles SET processed = 3 WHERE id = $1", [article.id]);
        failed++;
      }

      await new Promise(r => setTimeout(r, 100));
    } catch (e) {
      console.error(`  ⚠ Agent5 error on id ${article.id}:`, e.message);
    }
  }

  console.log(`✅ Agent5 done — ${fromArticle} from article, ${fromUnsplash} from Unsplash, ${failed} no image in ${((Date.now()-t0)/1000).toFixed(1)}s`);
  return fromArticle + fromUnsplash;
}

module.exports = { runAgent5 };