"""
EDGAR agent — fetches the latest 13F-HR for Situational Awareness LP (CIK 0002045724),
parses the INFORMATION TABLE XML, and writes:
  data/filings.json
  data/holdings_latest.json
  data/position_changes.json
  data/alerts.json

SEC fair-access rules:
  - User-Agent must identify the caller (name + contact).
  - Max 10 req/s; we sleep 0.12s between every EDGAR call.
  - All URLs are constructed from public EDGAR endpoints only.
"""

import json
import os
import re
import sys
import time
import xml.etree.ElementTree as ET
from datetime import date, datetime, timezone
from pathlib import Path

import requests

# ── config ────────────────────────────────────────────────────────────────────
CIK           = "0002045724"
FORM_TYPE     = "13F-HR"
THRESHOLD     = 0.20          # ±20 % share change = material
DATA_DIR      = Path(__file__).parent.parent / "data"
CONTACT_EMAIL = os.getenv("SEC_CONTACT_EMAIL", "dashboard@example.com")
HEADERS = {
    "User-Agent": f"Leopold-13F-Dashboard/1.0 (automated research tool; contact {CONTACT_EMAIL})",
    "Accept": "application/json, application/xml, text/html",
}
EDGAR_BASE = "https://data.sec.gov"
EFTS_BASE  = "https://efts.sec.gov"
SEC_DELAY  = 0.12             # seconds between EDGAR requests

# ── helpers ───────────────────────────────────────────────────────────────────

def _get(url: str, *, as_json: bool = True, retries: int = 4):
    """GET with retries and EDGAR-compliant rate limit."""
    delay = 2.0
    for attempt in range(retries + 1):
        try:
            time.sleep(SEC_DELAY)
            r = requests.get(url, headers=HEADERS, timeout=30)
            r.raise_for_status()
            return r.json() if as_json else r.text
        except requests.HTTPError as exc:
            if exc.response is not None and exc.response.status_code == 429:
                print(f"  [edgar] rate-limited, waiting {delay}s …", file=sys.stderr)
                time.sleep(delay); delay *= 2; continue
            if attempt < retries:
                time.sleep(delay); delay *= 2; continue
            raise
        except Exception:
            if attempt < retries:
                time.sleep(delay); delay *= 2; continue
            raise


def _read_json(path: Path):
    if path.exists():
        return json.loads(path.read_text())
    return None


def _write_json(path: Path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, default=str))
    print(f"  [edgar] wrote {path.relative_to(DATA_DIR.parent)}")


# ── EDGAR fetchers ────────────────────────────────────────────────────────────

def fetch_filing_list() -> list[dict]:
    """Return all 13F-HR submissions for the CIK via the SEC submissions endpoint."""
    url = f"{EDGAR_BASE}/submissions/CIK{CIK}.json"
    data = _get(url)
    recent = data.get("filings", {}).get("recent", {})
    forms     = recent.get("form", [])
    accessions = recent.get("accessionNumber", [])
    periods    = recent.get("reportDate", [])
    filed      = recent.get("filingDate", [])

    results = []
    for form, acc, period, fd in zip(forms, accessions, periods, filed):
        if form.startswith(FORM_TYPE):
            results.append({
                "accession_no":    acc.replace("-", ""),
                "accession_dashed": acc,
                "period_of_report": period,
                "date_filed":       fd,
            })
    # also check older filings pages
    for page in data.get("filings", {}).get("files", []):
        if page.get("name", "").startswith("submissions"):
            try:
                pdata = _get(f"{EDGAR_BASE}/submissions/{page['name']}")
                for form, acc, period, fd in zip(
                    pdata.get("form", []),
                    pdata.get("accessionNumber", []),
                    pdata.get("reportDate", []),
                    pdata.get("filingDate", [])
                ):
                    if form.startswith(FORM_TYPE):
                        results.append({
                            "accession_no":    acc.replace("-", ""),
                            "accession_dashed": acc,
                            "period_of_report": period,
                            "date_filed":       fd,
                        })
            except Exception as exc:
                print(f"  [edgar] warn: could not load older page {page['name']}: {exc}", file=sys.stderr)
    # sort newest first
    results.sort(key=lambda x: x["period_of_report"], reverse=True)
    return results


def build_index_url(cik_numeric: str, accession_no: str) -> str:
    acc_dashed = f"{accession_no[:10]}-{accession_no[10:12]}-{accession_no[12:]}"
    return f"https://www.sec.gov/Archives/edgar/data/{cik_numeric}/{accession_no}/{acc_dashed}-index.htm"


def fetch_info_table_xml(cik_numeric: str, accession_no: str) -> str | None:
    """Find and fetch the INFORMATION TABLE XML from the filing index."""
    index_url = f"https://data.sec.gov/Archives/edgar/data/{cik_numeric}/{accession_no}/{accession_no}-index.json"
    try:
        index = _get(index_url)
        for doc in index.get("documents", []):
            doc_type = (doc.get("type") or "").strip()
            name = (doc.get("documentName") or "").lower()
            if doc_type == "INFORMATION TABLE" or (name.endswith(".xml") and "infotable" in name.lower()):
                doc_url = f"https://www.sec.gov/Archives/edgar/data/{cik_numeric}/{accession_no}/{doc['documentName']}"
                return _get(doc_url, as_json=False)
            # some filings list .xml files with type "13F-HR/A" etc.
        # fallback: look for any .xml in the index
        for doc in index.get("documents", []):
            if (doc.get("documentName") or "").lower().endswith(".xml"):
                doc_url = f"https://www.sec.gov/Archives/edgar/data/{cik_numeric}/{accession_no}/{doc['documentName']}"
                return _get(doc_url, as_json=False)
    except Exception as exc:
        print(f"  [edgar] could not fetch info table: {exc}", file=sys.stderr)
    return None


# ── XML parser ────────────────────────────────────────────────────────────────
_NS_RE = re.compile(r'xmlns(?::\w+)?="[^"]*"')

# post-2022 13F INFORMATION TABLE schema
_INFO_TABLE_FIELDS = {
    "nameOfIssuer":     ["ns1:nameOfIssuer", "nameOfIssuer"],
    "titleOfClass":     ["ns1:titleOfClass", "titleOfClass"],
    "cusip":            ["ns1:cusip",         "cusip"],
    "value":            ["ns1:value",         "value"],
    "sshPrnamt":        ["ns1:shrsOrPrnAmt/ns1:sshPrnamt",  "shrsOrPrnAmt/sshPrnamt"],
    "sshPrnamtType":    ["ns1:shrsOrPrnAmt/ns1:sshPrnamtType","shrsOrPrnAmt/sshPrnamtType"],
    "putCall":          ["ns1:putCall",       "putCall"],
    "investmentDiscretion": ["ns1:investmentDiscretion","investmentDiscretion"],
    "votingAuthority":  ["ns1:votingAuthSole","votingAuthSole"],
}


def _text(el, paths):
    for p in paths:
        try:
            child = el.find(p)
            if child is not None and child.text:
                return child.text.strip()
        except Exception:
            pass
    return None


def parse_info_table(xml_text: str) -> list[dict]:
    """Parse 13F INFORMATION TABLE XML into a list of holdings dicts."""
    if not xml_text:
        return []
    # strip namespaces for easier parsing
    clean = _NS_RE.sub("", xml_text)
    try:
        root = ET.fromstring(clean)
    except ET.ParseError as exc:
        print(f"  [edgar] XML parse error: {exc}", file=sys.stderr)
        return []

    holdings = []
    for entry in root.iter("infoTable"):
        name     = _text(entry, ["nameOfIssuer"])
        cusip    = _text(entry, ["cusip"])
        val_txt  = _text(entry, ["value"])
        shr_txt  = _text(entry, ["shrsOrPrnAmt/sshPrnamt"])
        shr_type = _text(entry, ["shrsOrPrnAmt/sshPrnamtType"])
        put_call = _text(entry, ["putCall"])

        if not cusip:
            continue

        # post-2023: values in whole dollars; pre-2024: thousands.
        # The SEC changed the requirement for whole-dollar reporting in May 2024.
        # We store raw value as-is; the meta will note the unit.
        try:
            value_usd = int(val_txt) if val_txt else 0
        except ValueError:
            value_usd = 0

        try:
            shares = int(shr_txt) if shr_txt else 0
        except ValueError:
            shares = 0

        holdings.append({
            "cusip":        cusip,
            "issuer_name":  name or "",
            "title_class":  shr_type or "SH",
            "put_call":     put_call,   # None, "Put", or "Call"
            "value_usd":    value_usd,
            "shares":       shares,
        })
    return holdings


# ── change detection ──────────────────────────────────────────────────────────

def compute_changes(prev: list[dict], curr: list[dict], threshold: float = THRESHOLD) -> tuple[list[dict], list[dict]]:
    """Compute position changes between two holdings lists. Match on CUSIP + put_call."""
    def key(h):
        return (h["cusip"], (h.get("put_call") or "").upper())

    prev_map = {key(h): h for h in (prev or [])}
    curr_map = {key(h): h for h in (curr or [])}

    changes = []
    alerts  = []
    alert_id = 1

    all_keys = set(prev_map) | set(curr_map)
    for k in sorted(all_keys, key=lambda x: x[0]):
        p = prev_map.get(k)
        c = curr_map.get(k)
        ticker = (c or p).get("ticker") or (c or p).get("cusip")

        if p is None and c:
            ctype = "NEW"
            pct_shares = pct_value = None
        elif c is None and p:
            ctype = "EXITED"
            pct_shares = pct_value = None
        else:
            pshares = p.get("shares") or 0
            cshares = c.get("shares") or 0
            pct_shares = (cshares - pshares) / pshares if pshares else 0.0
            pct_value  = ((c.get("value_usd", 0) or 0) - (p.get("value_usd", 0) or 0)) / max(p.get("value_usd", 1) or 1, 1)
            if pct_shares > 0.001:
                ctype = "INCREASED"
            elif pct_shares < -0.001:
                ctype = "DECREASED"
            else:
                ctype = "HELD"

        is_material = (
            ctype in ("NEW", "EXITED") or
            (pct_shares is not None and abs(pct_shares) >= threshold) or
            ((p or {}).get("put_call") != (c or {}).get("put_call"))
        )

        row = {
            "ticker":          ticker,
            "cusip":           k[0],
            "put_call":        k[1] or None,
            "change_type":     ctype,
            "prev_shares":     p.get("shares") if p else None,
            "new_shares":      c.get("shares") if c else None,
            "prev_value":      p.get("value_usd") if p else None,
            "new_value":       c.get("value_usd") if c else None,
            "pct_change_shares": round(pct_shares * 100, 1) if pct_shares is not None else None,
            "pct_change_value":  round(pct_value  * 100, 1) if pct_value  is not None else None,
            "is_material":     is_material,
        }
        changes.append(row)

        if is_material and ctype != "HELD":
            sev = "high" if ctype in ("NEW", "EXITED") else "medium" if abs(pct_shares or 0) >= 0.30 else "low"
            if ctype == "NEW":
                msg = f"New position opened — {ticker}"
            elif ctype == "EXITED":
                prev_v = p.get("value_usd", 0) or 0
                msg = f"Full exit — {ticker} (${prev_v/1e6:.0f}M)"
            elif ctype == "INCREASED":
                msg = f"{ticker} increased {pct_shares*100:+.0f}% in shares"
            else:
                msg = f"{ticker} decreased {pct_shares*100:+.0f}% in shares"

            alerts.append({
                "id":      f"a{alert_id}",
                "type":    "NEW_LONG" if ctype == "NEW" else ("EXIT" if ctype == "EXITED" else ctype),
                "severity": sev,
                "ticker":  ticker,
                "message": msg,
                "ts":      datetime.now(timezone.utc).isoformat(),
                "status":  "UNREAD",
            })
            alert_id += 1

    return changes, alerts


# ── CIK normalisation ─────────────────────────────────────────────────────────

def cik_numeric(cik: str) -> str:
    """Return the bare 10-digit numeric CIK."""
    return cik.lstrip("0").zfill(1) if cik.lstrip("0") else "0"


def cik_10(cik: str) -> str:
    return cik.zfill(10)


# ── main ──────────────────────────────────────────────────────────────────────

def run(force: bool = False):
    print("[edgar] Starting EDGAR agent …")
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Fetch filing list
    print("[edgar] Fetching filing list …")
    filings_raw = fetch_filing_list()
    if not filings_raw:
        print("[edgar] No 13F filings found — keeping last-good data.", file=sys.stderr)
        return

    latest = filings_raw[0]
    prev_filings = _read_json(DATA_DIR / "filings.json") or []

    # 2. Check if latest filing is new. We store the dashed accession (matches
    #    EDGAR display and the dashboard's holdings/<accession>.json fetch).
    existing_accessions = {f.get("accession_no") for f in prev_filings}
    is_new_filing = latest["accession_dashed"] not in existing_accessions

    if not is_new_filing and not force:
        print(f"[edgar] Latest filing {latest['accession_no']} already processed. Skipping XML parse.")
    else:
        print(f"[edgar] Processing new filing {latest['accession_no']} (period {latest['period_of_report']}) …")

        # 3. Fetch INFORMATION TABLE XML
        cik_num = int(CIK.lstrip("0") or "0")
        xml_text = fetch_info_table_xml(str(cik_num), latest["accession_no"])

        if not xml_text:
            print("[edgar] Could not fetch XML — keeping last-good holdings.", file=sys.stderr)
        else:
            curr_holdings = parse_info_table(xml_text)
            print(f"[edgar] Parsed {len(curr_holdings)} rows from INFORMATION TABLE.")

            if curr_holdings:
                # Merge ticker from existing data (EDGAR XML has issuer name, not ticker)
                prev_holdings = _read_json(DATA_DIR / "holdings_latest.json") or []
                cusip_to_ticker = {h["cusip"]: h.get("ticker") for h in prev_holdings if h.get("ticker")}
                cusip_to_layer  = {h["cusip"]: h.get("layer")  for h in prev_holdings if h.get("layer")}
                cusip_to_sector = {h["cusip"]: h.get("sector") for h in prev_holdings if h.get("sector")}

                total_value = sum(h["value_usd"] for h in curr_holdings)
                for h in curr_holdings:
                    cusip = h["cusip"]
                    h["ticker"]  = cusip_to_ticker.get(cusip, cusip)
                    h["layer"]   = cusip_to_layer.get(cusip, "unknown")
                    h["sector"]  = cusip_to_sector.get(cusip, "Unknown")
                    h["pct_of_portfolio"] = round(h["value_usd"] / total_value * 100, 2) if total_value else 0
                    h["verified"] = True   # direct from INFORMATION TABLE XML

                _write_json(DATA_DIR / "holdings_latest.json", curr_holdings)
                # Archive this filing's holdings so the dashboard's filing-period
                # dropdown can load it later (data/holdings/<accession>.json).
                _write_json(DATA_DIR / "holdings" / f"{latest['accession_dashed']}.json", curr_holdings)

                # 4. Compute changes
                changes, new_alerts = compute_changes(prev_holdings, curr_holdings)
                _write_json(DATA_DIR / "position_changes.json", changes)

                # Merge alerts (preserve READ status of existing)
                existing_alerts = _read_json(DATA_DIR / "alerts.json") or []
                existing_ids = {a["id"] for a in existing_alerts}
                merged_alerts = existing_alerts + [a for a in new_alerts if a["id"] not in existing_ids]
                _write_json(DATA_DIR / "alerts.json", merged_alerts)

    # 5. Build filings.json (always refresh the full list)
    prev_filings_map = {f["accession_no"]: f for f in prev_filings}
    out_filings = []
    cik_num = int(CIK.lstrip("0") or "0")
    for raw in filings_raw:
        acc      = raw["accession_dashed"]   # dashed: display, storage, archive filename, frontend fetch
        acc_raw  = raw["accession_no"]        # undashed: EDGAR URL path segment
        idx_url  = build_index_url(str(cik_num), acc_raw)
        existing = prev_filings_map.get(acc, {})
        # If this filing's holdings have been archived, fill in totals/count from it.
        archive = _read_json(DATA_DIR / "holdings" / f"{acc}.json")
        total_value  = existing.get("total_value")
        num_holdings = existing.get("num_holdings")
        if archive:
            total_value  = sum(h["value_usd"] for h in archive)
            num_holdings = len(archive)
        out_filings.append({
            "q":               existing.get("q", f"({raw['period_of_report']})"),
            "accession_no":    acc,
            "accession_raw":   acc_raw,
            "period_of_report": raw["period_of_report"],
            "date_filed":      raw["date_filed"],
            "total_value":     total_value,
            "num_holdings":    num_holdings,
            "index_url":       idx_url,
            "info_table_url":  existing.get("info_table_url"),
            "top_positions":   existing.get("top_positions"),
        })
    _write_json(DATA_DIR / "filings.json", out_filings)

    print("[edgar] Done.")


def backfill_history():
    """Fetch & archive the INFORMATION TABLE for every historical filing into
    data/holdings/<accession>.json, so the dashboard's filing-period dropdown
    can show real line-item holdings for past quarters. Idempotent: skips
    filings already archived. Best-effort: a fetch/parse failure for one filing
    is logged and skipped, never fatal."""
    print("[edgar] Backfilling historical holdings …")
    filings_raw = fetch_filing_list()
    cik_num = int(CIK.lstrip("0") or "0")
    # ticker/layer/sector enrichment map from the latest holdings
    latest_holdings = _read_json(DATA_DIR / "holdings_latest.json") or []
    by_cusip = {h["cusip"]: h for h in latest_holdings}

    archived = 0
    for raw in filings_raw:
        acc     = raw["accession_dashed"]   # storage / archive filename
        acc_raw = raw["accession_no"]        # EDGAR URL path segment
        out_path = DATA_DIR / "holdings" / f"{acc}.json"
        if out_path.exists():
            continue
        xml_text = fetch_info_table_xml(str(cik_num), acc_raw)
        if not xml_text:
            print(f"  [edgar] backfill: no XML for {acc} ({raw['period_of_report']}) — skipped", file=sys.stderr)
            continue
        rows = parse_info_table(xml_text)
        if not rows:
            print(f"  [edgar] backfill: empty parse for {acc} — skipped", file=sys.stderr)
            continue
        total = sum(r["value_usd"] for r in rows)
        for r in rows:
            ref = by_cusip.get(r["cusip"], {})
            r["ticker"] = ref.get("ticker", r["cusip"])
            r["layer"]  = ref.get("layer", "unknown")
            r["sector"] = ref.get("sector", "Unknown")
            r["pct_of_portfolio"] = round(r["value_usd"] / total * 100, 2) if total else 0
            r["verified"] = True
        _write_json(out_path, rows)
        archived += 1
    print(f"[edgar] Backfill complete — archived {archived} new filing(s).")


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--force", action="store_true", help="Re-parse even if filing already processed")
    p.add_argument("--backfill", action="store_true", help="Archive INFORMATION TABLE for all historical filings")
    args = p.parse_args()
    if args.backfill:
        backfill_history()
    else:
        run(force=args.force)
