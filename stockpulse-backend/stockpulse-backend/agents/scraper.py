# agents/scraper.py
# Fetches full article text from a URL, strips HTML noise

import urllib.request
import re
import time

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate",
    "Connection": "keep-alive",
    "Upgrade-Insecure-Requests": "1",
    "Cache-Control": "no-cache",
}

# Paywalled sites — use stored RSS text (already extracted), don't waste time scraping
PAYWALLED_DOMAINS = [
    "wsj.com", "ft.com", "bloomberg.com", "barrons.com",
    "seekingalpha.com", "thetimes.co.uk", "economist.com",
]

def is_paywalled(url):
    return any(d in url for d in PAYWALLED_DOMAINS)

def scrape_article(url, timeout=10):
    """
    Fetch full article text from URL.
    Returns cleaned text string, or empty string on failure.
    """
    if not url or not url.startswith("http"):
        return ""
    # For paywalled sites, return None to signal "use stored RSS text"
    if is_paywalled(url):
        return None
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            html = resp.read().decode("utf-8", errors="ignore")

        # Remove noise blocks
        html = re.sub(r'<script[\s\S]*?</script>', '', html, flags=re.IGNORECASE)
        html = re.sub(r'<style[\s\S]*?</style>',  '', html, flags=re.IGNORECASE)
        html = re.sub(r'<(nav|header|footer|aside|form|figure)[^>]*>[\s\S]*?</\1>', '', html, flags=re.IGNORECASE)

        # Convert paragraph/br tags to newlines
        html = re.sub(r'<br\s*/?>', '\n', html, flags=re.IGNORECASE)
        html = re.sub(r'</p>', '\n\n', html, flags=re.IGNORECASE)
        html = re.sub(r'<[^>]+>', ' ', html)

        # Decode entities
        html = html.replace('&nbsp;', ' ').replace('&amp;', '&')
        html = html.replace('&lt;', '<').replace('&gt;', '>').replace('&quot;', '"')
        html = re.sub(r'\s{3,}', '\n\n', html).strip()

        # Extract meaningful paragraphs
        paras = html.split('\n\n')
        good = []
        for p in paras:
            p = p.strip().replace('\n', ' ')
            p = re.sub(r'\s+', ' ', p)
            # Keep paragraphs that look like real content
            if (len(p) > 60 and len(p) < 3000
                and not re.search(r'cookie|subscribe|sign.?up|advertisement|©|all rights reserved|javascript required|enable cookies', p, re.IGNORECASE)):
                good.append(p)

        return '\n\n'.join(good[:20])  # up to 20 paragraphs for better sentiment

    except Exception as e:
        return ""


if __name__ == "__main__":
    # Quick test
    url = "https://economictimes.indiatimes.com/markets/stocks/news/sensex-rises-640-points/articleshow/test.cms"
    print(scrape_article(url) or "No content scraped")