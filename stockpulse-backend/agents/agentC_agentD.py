# agents/agentC_agentD.py
# Persistent loop — loads models ONCE, processes articles forever
# Start: py -3.11 agents/agentC_agentD.py --loop

import sqlite3, os, time, sys
from dotenv import load_dotenv
from transformers import pipeline
from scraper import scrape_article

load_dotenv()
DB_PATH  = os.getenv("DB_PATH", "./database/stockpulse.db")
BATCH    = int(os.getenv("MAX_ARTICLES_PER_RUN", 50))
INTERVAL = int(os.getenv("AGENT_RUN_INTERVAL", 5))  # minutes between checks

# ── Load models ONCE ──────────────────────────────────────────
print("🤖 Loading AI models (one-time ~30s)...")
t0 = time.time()

summarizer = pipeline(
    "summarization",
    model="sshleifer/distilbart-cnn-12-6",
    max_length=60, min_length=15, truncation=True,
)
sentiment_analyzer = pipeline(
    "text-classification",
    model="mrm8488/distilroberta-finetuned-financial-news-sentiment-analysis",
    truncation=True, max_length=512,
)

# Second summarizer for longer article-page summaries (3-5 sentences)
summarizer_long = pipeline(
    "summarization",
    model="sshleifer/distilbart-cnn-12-6",
    max_length=200, min_length=80, truncation=True,
)
print(f"✅ Models loaded in {round(time.time()-t0,1)}s\n")

# ── DB helpers ────────────────────────────────────────────────
def get_unprocessed(limit):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT id, headline, full_text, source_url, symbol FROM articles WHERE processed = 0 ORDER BY id DESC LIMIT ?",
        (limit,)
    ).fetchall()
    conn.close()
    return rows

def save(article_id, full_text, summary_short, summary_long, sentiment, score, image_url=None):
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """UPDATE articles
           SET full_text       = ?,
               summary_20      = ?,
               summary_long    = ?,
               sentiment       = ?,
               sentiment_score = ?,
               image_url       = COALESCE(NULLIF(image_url,''), ?),
               processed       = 2
           WHERE id = ?""",
        (full_text, summary_short, summary_long, sentiment, score, image_url, article_id)
    )
    conn.commit()
    conn.close()

def search_image(headline, symbol, company=None):
    """Search Bing Image Search for a relevant news image (requires BING_IMAGE_KEY in .env)."""
    import urllib.request, urllib.parse, json as _json
    bing_key = os.getenv("BING_IMAGE_KEY", "")
    if not bing_key:
        return None
    query = f"{company or symbol or ''} {headline}".strip()[:80]
    try:
        url = ("https://api.bing.microsoft.com/v7.0/images/search?"
               f"q={urllib.parse.quote(query + ' news')}&count=3"
               "&imageType=Photo&minWidth=400&minHeight=200&safeSearch=Strict")
        req = urllib.request.Request(url, headers={"Ocp-Apim-Subscription-Key": bing_key})
        with urllib.request.urlopen(req, timeout=5) as r:
            data = _json.loads(r.read())
        imgs = data.get("value", [])
        if imgs:
            return imgs[0].get("thumbnailUrl") or imgs[0].get("contentUrl")
    except Exception:
        pass
    return None

LABEL_MAP = {
    "positive":"bullish","negative":"bearish","neutral":"neutral",
    "POSITIVE":"bullish","NEGATIVE":"bearish","NEUTRAL":"neutral",
    "LABEL_0":"bearish","LABEL_1":"neutral","LABEL_2":"bullish",
}

# ── Process one article ───────────────────────────────────────
def process(article):
    headline     = article["headline"] or ""
    stored_text  = (article["full_text"] or "").strip()
    source_url   = article["source_url"] or ""

    # Default values — prevents undefined variable warnings
    summary_short = " ".join(headline.split()[:20])
    summary_long  = headline
    sentiment     = "neutral"
    score         = 0.5

    # Step 1: Always try to scrape full article from source for accurate sentiment
    full_text = stored_text
    if source_url:
        try:
            scraped = scrape_article(source_url, timeout=10)
            if scraped is None:
                # Paywalled site — use stored RSS text (already good quality)
                full_text = stored_text
                print(f"    🔒 Paywalled — using RSS text ({len(stored_text)} chars)")
            elif scraped and len(scraped) > max(len(stored_text), 100):
                full_text = scraped
                print(f"    🌐 Scraped {len(scraped)} chars from source")
            else:
                print(f"    ⚠  Scrape short/failed — using stored text ({len(stored_text)} chars)")
        except Exception as se:
            print(f"    ⚠  Scrape error: {se}")

    source_for_ai = full_text if len(full_text) > 60 else headline
    # Use up to 4000 chars for better sentiment accuracy
    source_for_ai = source_for_ai[:4000]

    # Step 2: AgentC — short summary for feed cards (~20 words)
    try:
        raw = summarizer(source_for_ai[:1500])[0]["summary_text"].strip()
        words = raw.split()
        summary_short = " ".join(words[:20]) + ("." if not raw.endswith(".") else "")
    except Exception as e:
        print(f"    ⚠  AgentC short error: {e}")

    # Step 2b: Longer summary for article detail page (3-5 sentences)
    try:
        summary_long = summarizer_long(source_for_ai)[0]["summary_text"].strip()
    except Exception as e:
        print(f"    ⚠  AgentC long error: {e}")

    # Step 3: AgentD — Sentiment
    # Only assign bullish/bearish if confidence >= 65%, else mark as "unknown"
    CONFIDENCE_THRESHOLD = 0.65
    try:
        sentiment_text = (full_text if len(full_text) > 60 else headline)[:1024]
        r = sentiment_analyzer(sentiment_text)[0]
        raw_label = LABEL_MAP.get(r["label"], "neutral")
        score     = round(r["score"], 4)
        if score < CONFIDENCE_THRESHOLD and raw_label != "neutral":
            sentiment = "unknown"  # hide badge on frontend
            print(f"    ⚠  Low confidence ({score:.2f}) — marking as unknown")
        else:
            sentiment = raw_label
    except Exception as e:
        print(f"    ⚠  AgentD error: {e}")

    result = (full_text, summary_short, summary_long, sentiment, score)
    return result

# ── Process one article (called from thread pool) ────────────
# ── Run one batch ─────────────────────────────────────────────
def run_once():
    articles = get_unprocessed(BATCH)
    if not articles:
        return 0

    print(f"\n🤖 Processing {len(articles)} articles...")
    start = time.time()
    count = 0

    for a in articles:
        sym = a["symbol"] or "MARKET"
        print(f"  [{count+1}/{len(articles)}] #{a['id']} ({sym}) — {a['headline'][:65]}...")
        full_text, summary_short, summary_long, sentiment, score = process(a)
        img_url = None
        if a["symbol"]:
            try:
                img_url = search_image(a["headline"], a["symbol"])
            except Exception:
                pass
        save(a["id"], full_text, summary_short, summary_long, sentiment, score, img_url)
        count += 1

    print(f"✅ Done {count} articles in {round(time.time()-start,1)}s")
    return count

# ── Entry point ───────────────────────────────────────────────
if __name__ == "__main__":
    if "--loop" in sys.argv:
        print(f"🔄 Loop mode — checking every {INTERVAL} min\n")
        while True:
            try:
                run_once()
            except Exception as e:
                print(f"⚠️  Error: {e}")
            print(f"  Sleeping {INTERVAL} min...")
            time.sleep(INTERVAL * 60)
    else:
        run_once()