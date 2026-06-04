"""
Orchestrator — runs all three agents in sequence and updates meta.json.

Usage:
    python agents/run_all.py [--force-edgar]

    --force-edgar   Re-parse EDGAR XML even if the filing was already processed.
"""

import argparse
import json
import sys
from datetime import date, datetime, timezone
from pathlib import Path

DATA_DIR = Path(__file__).parent.parent / "data"


def _write_json(path: Path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, default=str))


def update_meta(edgar_ok: bool, market_ok: bool, news_ok: bool):
    meta_path = DATA_DIR / "meta.json"
    meta = {}
    if meta_path.exists():
        meta = json.loads(meta_path.read_text())

    now = datetime.now(timezone.utc).isoformat()

    # read next_filing_due from filings.json if available
    filings_path = DATA_DIR / "filings.json"
    next_due = meta.get("next_filing_due")
    if filings_path.exists():
        filings = json.loads(filings_path.read_text())
        if filings:
            from datetime import timedelta
            period = filings[0].get("period_of_report", "")
            if period:
                try:
                    q_end = date.fromisoformat(period)
                    next_due = (q_end + timedelta(days=45)).isoformat()
                except ValueError:
                    pass

    freshness = meta.get("data_freshness", {})
    if edgar_ok:
        freshness["holdings"] = {**(freshness.get("holdings") or {}), "as_of": now, "stale": False, "source": "SEC EDGAR"}
    else:
        if "holdings" in freshness:
            freshness["holdings"]["stale"] = True

    if market_ok:
        freshness["prices"]          = {**(freshness.get("prices")          or {}), "as_of": now, "stale": False, "source": "Yahoo Finance"}
        freshness["analyst_ratings"] = {**(freshness.get("analyst_ratings") or {}), "as_of": now, "stale": False, "source": "Yahoo Finance"}
    else:
        for k in ("prices", "analyst_ratings"):
            if k in freshness:
                freshness[k]["stale"] = True

    if news_ok:
        freshness["news"] = {**(freshness.get("news") or {}), "as_of": now, "stale": False, "source": "NewsAPI / Yahoo Finance RSS"}
    else:
        if "news" in freshness:
            freshness["news"]["stale"] = True

    meta["last_updated"]    = now
    meta["next_filing_due"] = next_due
    meta["data_freshness"]  = freshness

    _write_json(meta_path, meta)
    print(f"[run_all] meta.json updated — last_updated={now}")


def run_agent(name: str, fn):
    print(f"\n{'='*60}\n[run_all] Running {name} agent\n{'='*60}")
    try:
        fn()
        return True
    except Exception as exc:
        print(f"[run_all] ERROR in {name}: {exc}", file=sys.stderr)
        import traceback; traceback.print_exc()
        return False


def main():
    parser = argparse.ArgumentParser(description="Run all 13F dashboard agents")
    parser.add_argument("--force-edgar", action="store_true")
    parser.add_argument("--skip-edgar",  action="store_true")
    parser.add_argument("--skip-market", action="store_true")
    parser.add_argument("--skip-news",   action="store_true")
    args = parser.parse_args()

    from agents import edgar_agent, market_agent, news_agent  # noqa: PLC0415

    edgar_ok  = True
    market_ok = True
    news_ok   = True

    if not args.skip_edgar:
        edgar_ok = run_agent("EDGAR", lambda: edgar_agent.run(force=args.force_edgar))

    if not args.skip_market:
        market_ok = run_agent("market", market_agent.run)

    if not args.skip_news:
        news_ok = run_agent("news", news_agent.run)

    update_meta(edgar_ok, market_ok, news_ok)

    all_ok = edgar_ok and market_ok and news_ok
    if not all_ok:
        print("\n[run_all] Some agents failed — data is partially stale. See logs above.", file=sys.stderr)
        sys.exit(1)
    print("\n[run_all] All agents completed successfully.")


if __name__ == "__main__":
    # Allow running from repo root: python agents/run_all.py
    import os, sys
    sys.path.insert(0, str(Path(__file__).parent.parent))
    main()
