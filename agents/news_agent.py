"""
News agent — fetches recent headlines for portfolio tickers.

Sources (in priority order, all free / low-friction):
  1. NewsAPI.org (requires NEWSAPI_KEY secret — free tier: 100 req/day)
  2. Yahoo Finance RSS per ticker (no auth required)

Writes:
  data/news.json

Degrades gracefully: if a source fails, keep last-good items and mark stale.
"""

import hashlib
import json
import os
import sys
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.parse import quote

import requests

DATA_DIR = Path(__file__).parent.parent / "data"
NEWSAPI_KEY = os.getenv("NEWSAPI_KEY", "")
MAX_ITEMS   = 50   # cap total news items in news.json


def _read_json(path: Path):
    if path.exists():
        return json.loads(path.read_text())
    return None


def _write_json(path: Path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, default=str))
    print(f"  [news] wrote {path.relative_to(DATA_DIR.parent)}")


def _tickers() -> list[str]:
    holdings = _read_json(DATA_DIR / "holdings_latest.json") or []
    seen, out = set(), []
    for h in holdings:
        raw = (h.get("ticker") or "").replace(".C", "")
        if raw and raw not in seen:
            seen.add(raw)
            out.append(raw)
    return out[:20]   # cap at 20 tickers to stay within free API quotas


def _stable_id(url: str, headline: str) -> str:
    return "n" + hashlib.md5((url + headline).encode()).hexdigest()[:10]


# ── NewsAPI ───────────────────────────────────────────────────────────────────

def fetch_newsapi(tickers: list[str]) -> list[dict]:
    if not NEWSAPI_KEY:
        return []
    items = []
    seen_urls = set()
    query = " OR ".join(f'"{t}"' for t in tickers[:8])   # NewsAPI has query length limits
    url = (
        f"https://newsapi.org/v2/everything"
        f"?q={quote(query)}"
        f"&sortBy=publishedAt"
        f"&pageSize=30"
        f"&language=en"
        f"&apiKey={NEWSAPI_KEY}"
    )
    try:
        r = requests.get(url, timeout=20)
        r.raise_for_status()
        for article in r.json().get("articles", []):
            href = article.get("url") or ""
            headline = article.get("title") or ""
            source   = (article.get("source") or {}).get("name") or ""
            pub_at   = article.get("publishedAt") or ""
            if not href or href in seen_urls or not headline:
                continue
            seen_urls.add(href)
            # find which tickers are mentioned
            matched = [t for t in tickers if t.upper() in (headline + " " + (article.get("description") or "")).upper()]
            items.append({
                "id":       _stable_id(href, headline),
                "headline": headline[:200],
                "source":   source,
                "tickers":  matched[:4] or tickers[:1],
                "ts":       pub_at,
                "url":      href,
            })
    except Exception as exc:
        print(f"  [news] NewsAPI error: {exc}", file=sys.stderr)
    return items


# ── Yahoo Finance RSS ─────────────────────────────────────────────────────────

def fetch_yahoo_rss(ticker: str) -> list[dict]:
    """Fetch Yahoo Finance RSS for a single ticker."""
    url = f"https://feeds.finance.yahoo.com/rss/2.0/headline?s={ticker}&region=US&lang=en-US"
    try:
        time.sleep(0.3)
        r = requests.get(url, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
        r.raise_for_status()
        root = ET.fromstring(r.text)
        items = []
        for item in root.findall(".//item")[:5]:
            title   = (item.findtext("title") or "").strip()
            link    = (item.findtext("link")  or "").strip()
            pub_date = (item.findtext("pubDate") or "").strip()
            if not title or not link:
                continue
            try:
                ts = datetime.strptime(pub_date, "%a, %d %b %Y %H:%M:%S %z").isoformat()
            except Exception:
                ts = datetime.now(timezone.utc).isoformat()
            items.append({
                "id":       _stable_id(link, title),
                "headline": title[:200],
                "source":   "Yahoo Finance",
                "tickers":  [ticker],
                "ts":       ts,
                "url":      link,
            })
        return items
    except Exception as exc:
        print(f"  [news] Yahoo RSS {ticker}: {exc}", file=sys.stderr)
        return []


# ── main ──────────────────────────────────────────────────────────────────────

def run():
    print("[news] Starting news agent …")
    tickers = _tickers()
    print(f"[news] Fetching news for {len(tickers)} tickers …")

    existing = _read_json(DATA_DIR / "news.json") or []
    existing_ids = {n["id"] for n in existing}

    new_items = []

    # Try NewsAPI first (covers all tickers in one call)
    if NEWSAPI_KEY:
        print("  [news] NewsAPI …")
        newsapi_items = fetch_newsapi(tickers)
        print(f"  [news] NewsAPI returned {len(newsapi_items)} articles")
        for item in newsapi_items:
            if item["id"] not in existing_ids:
                new_items.append(item)
                existing_ids.add(item["id"])

    # Supplement with Yahoo Finance RSS per ticker
    for ticker in tickers[:15]:   # limit per-ticker RSS to avoid hammering
        rss_items = fetch_yahoo_rss(ticker)
        for item in rss_items:
            if item["id"] not in existing_ids:
                new_items.append(item)
                existing_ids.add(item["id"])

    print(f"  [news] {len(new_items)} new articles found")

    # Merge: newest first, cap at MAX_ITEMS
    merged = new_items + existing
    merged.sort(key=lambda x: x.get("ts",""), reverse=True)
    merged = merged[:MAX_ITEMS]

    if merged or not existing:
        _write_json(DATA_DIR / "news.json", merged)
    else:
        print("  [news] No new items; keeping existing data.")

    print("[news] Done.")


if __name__ == "__main__":
    run()
