"""
Market agent — fetches prices, analyst ratings, and company metadata for all
portfolio tickers via yfinance (Yahoo Finance).

Writes:
  data/prices/<TICKER>.json
  data/analyst_ratings.json
  data/securities.json   (enriches existing with live market cap / PE)

Each ticker gets its own prices file to keep the data/ tree stable and allow
per-ticker staleness tracking without rewriting every file on each run.

Degrades gracefully: if a ticker fails, it marks that ticker stale and continues.
"""

import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

try:
    import yfinance as yf
except ImportError:
    print("[market] yfinance not installed. Run: pip install yfinance", file=sys.stderr)
    sys.exit(1)

DATA_DIR = Path(__file__).parent.parent / "data"
PRICES_DIR = DATA_DIR / "prices"

# ── helpers ───────────────────────────────────────────────────────────────────

def _read_json(path: Path):
    if path.exists():
        return json.loads(path.read_text())
    return None


def _write_json(path: Path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, default=str))
    print(f"  [market] wrote {path.relative_to(DATA_DIR.parent)}")


def _tickers_from_holdings() -> list[str]:
    holdings = _read_json(DATA_DIR / "holdings_latest.json") or []
    seen, out = set(), []
    for h in holdings:
        raw = (h.get("ticker") or "").replace(".C", "")
        if raw and raw not in seen:
            seen.add(raw)
            out.append(raw)
    # also add tickers from securities.json
    secs = _read_json(DATA_DIR / "securities.json") or {}
    for t in secs:
        clean = t.replace(".C", "")
        if clean not in seen:
            seen.add(clean)
            out.append(clean)
    return out


# ── fetchers ──────────────────────────────────────────────────────────────────

def _safe_val(info: dict, key: str, default=None):
    v = info.get(key)
    return v if v is not None else default


def fetch_ticker_data(ticker: str) -> dict | None:
    """Fetch price history, info, and analyst data for one ticker."""
    try:
        tk = yf.Ticker(ticker)
        info = tk.info or {}

        # 90-day daily history
        hist = tk.history(period="90d", interval="1d")
        price_history = []
        if hist is not None and not hist.empty:
            for dt, row in hist.iterrows():
                price_history.append({
                    "date":   str(dt)[:10],
                    "open":   round(float(row["Open"]), 4),
                    "high":   round(float(row["High"]), 4),
                    "low":    round(float(row["Low"]),  4),
                    "close":  round(float(row["Close"]),4),
                    "volume": int(row.get("Volume", 0) or 0),
                })

        current_price = _safe_val(info, "currentPrice") or _safe_val(info, "regularMarketPrice")
        prev_close    = _safe_val(info, "previousClose")
        day_change_pct = None
        if current_price and prev_close and prev_close != 0:
            day_change_pct = round((current_price - prev_close) / prev_close * 100, 2)

        # Analyst ratings
        ratings = {}
        try:
            recs = tk.recommendations
            if recs is not None and not recs.empty:
                latest = recs.tail(10)
                ratings = {
                    "strongBuy":  int(latest.get("strongBuy",  [0]).iloc[-1]) if "strongBuy"  in latest.columns else 0,
                    "buy":        int(latest.get("buy",        [0]).iloc[-1]) if "buy"         in latest.columns else 0,
                    "hold":       int(latest.get("hold",       [0]).iloc[-1]) if "hold"        in latest.columns else 0,
                    "sell":       int(latest.get("sell",       [0]).iloc[-1]) if "sell"        in latest.columns else 0,
                    "strongSell": int(latest.get("strongSell", [0]).iloc[-1]) if "strongSell" in latest.columns else 0,
                }
        except Exception:
            pass

        target_mean   = _safe_val(info, "targetMeanPrice")
        target_high   = _safe_val(info, "targetHighPrice")
        target_low    = _safe_val(info, "targetLowPrice")

        return {
            "ticker":         ticker,
            "current_price":  current_price,
            "prev_close":     prev_close,
            "day_change_pct": day_change_pct,
            "week_52_high":   _safe_val(info, "fiftyTwoWeekHigh"),
            "week_52_low":    _safe_val(info, "fiftyTwoWeekLow"),
            "market_cap":     _safe_val(info, "marketCap"),
            "pe_ratio":       _safe_val(info, "trailingPE") or _safe_val(info, "forwardPE"),
            "sector":         _safe_val(info, "sector"),
            "industry":       _safe_val(info, "industry"),
            "exchange":       _safe_val(info, "exchange"),
            "long_name":      _safe_val(info, "longName"),
            "description":    (_safe_val(info, "longBusinessSummary") or "")[:500],
            "ratings":        ratings,
            "target_mean":    target_mean,
            "target_high":    target_high,
            "target_low":     target_low,
            "price_history":  price_history,
            "as_of":          datetime.now(timezone.utc).isoformat(),
            "stale":          False,
        }
    except Exception as exc:
        print(f"  [market] WARN: {ticker} failed: {exc}", file=sys.stderr)
        return None


# ── main ──────────────────────────────────────────────────────────────────────

def run():
    print("[market] Starting market agent …")
    PRICES_DIR.mkdir(parents=True, exist_ok=True)

    tickers = _tickers_from_holdings()
    print(f"[market] Fetching data for {len(tickers)} tickers …")

    existing_securities = _read_json(DATA_DIR / "securities.json") or {}
    existing_ratings    = _read_json(DATA_DIR / "analyst_ratings.json") or {}
    new_ratings = {k: v for k, v in existing_ratings.items() if not k.startswith("_")}

    for ticker in tickers:
        print(f"  [market] {ticker} …")
        data = fetch_ticker_data(ticker)
        time.sleep(0.5)   # polite to Yahoo Finance

        if data is None:
            # mark existing data stale but keep it
            price_path = PRICES_DIR / f"{ticker}.json"
            if price_path.exists():
                old = json.loads(price_path.read_text())
                old["stale"] = True
                _write_json(price_path, old)
            continue

        # Write prices/<ticker>.json (history + latest)
        price_doc = {
            "ticker":         ticker,
            "current_price":  data["current_price"],
            "prev_close":     data["prev_close"],
            "day_change_pct": data["day_change_pct"],
            "week_52_high":   data["week_52_high"],
            "week_52_low":    data["week_52_low"],
            "history":        data["price_history"],
            "as_of":          data["as_of"],
            "stale":          False,
        }
        _write_json(PRICES_DIR / f"{ticker}.json", price_doc)

        # Enrich securities.json
        if data.get("long_name"):
            sec = existing_securities.get(ticker, {})
            sec.update({k: v for k, v in {
                "name":        data["long_name"],
                "exchange":    data["exchange"],
                "sector":      data["sector"],
                "market_cap":  data["market_cap"],
                "pe_ratio":    data["pe_ratio"],
                "description": data["description"],
            }.items() if v is not None})
            existing_securities[ticker] = sec

        # Update analyst ratings
        if data.get("ratings"):
            r = data["ratings"]
            new_ratings[ticker] = {
                "buy":        (r.get("buy") or 0) + (r.get("strongBuy") or 0),
                "hold":       r.get("hold") or 0,
                "sell":       (r.get("sell") or 0) + (r.get("strongSell") or 0),
                "strong_buy": r.get("strongBuy") or 0,
                "target_mean": data.get("target_mean"),
                "target_high": data.get("target_high"),
                "target_low":  data.get("target_low"),
                "recent_upgrades":   [],
                "recent_downgrades": [],
            }

    _write_json(DATA_DIR / "securities.json", existing_securities)

    new_ratings["_note"]   = "Analyst ratings from Yahoo Finance. Not investment advice."
    new_ratings["_as_of"]  = datetime.now(timezone.utc).isoformat()
    _write_json(DATA_DIR / "analyst_ratings.json", new_ratings)

    print("[market] Done.")


if __name__ == "__main__":
    run()
