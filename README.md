# Situational Awareness LP — 13F Intelligence Dashboard

Live financial-intelligence dashboard tracking Leopold Aschenbrenner's publicly disclosed SEC 13F portfolio, enriched with market data, news, and sentiment.

**[→ Live Dashboard](https://as-2523.github.io/leo26/site/)** · [SEC EDGAR Filing](https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0002045724&type=13F-HR)

---

## What it is

A static site served from GitHub Pages that displays:

- **Portfolio overview** — holdings table with type (stock / call / put), value, % of portfolio, sector allocation treemap / donut / bar chart
- **Change tracking** — position changes vs the prior 13F filing (NEW / INCREASED / DECREASED / EXITED / HELD) with material-change badges
- **Alerts feed** — material moves (≥±20% shares, new entries, full exits, option flips)
- **Unified news** — scrolling marquee + filterable feed of press coverage per ticker
- **Drill-down rows** — expand any holding to see value history sparkline, thesis layer, and full filing detail

### What 13Fs cover — and what they don't

13Fs disclose **only** long U.S. equity and listed options. They do **not** disclose short stock, bonds, cash, FX, or private holdings. The reported value is the market value at the end of the quarter, not entry cost. For options, the "value" is the notional exposure — not the same as the 13F-reported value.

> **This is research, not investment advice.**

---

## Repo layout

```
leo26/
├── site/                     # Static dashboard (served by GitHub Pages)
│   └── index.html            # React app (CDN React + Babel standalone)
├── agents/                   # Python data agents
│   ├── edgar_agent.py        # SEC EDGAR: fetch & parse 13F INFORMATION TABLE
│   ├── market_agent.py       # Yahoo Finance: prices, ratings, metadata
│   ├── news_agent.py         # NewsAPI + Yahoo Finance RSS: headlines
│   ├── run_all.py            # Orchestrator (runs all three + updates meta.json)
│   ├── requirements.txt      # Python deps
│   └── __init__.py
├── data/                     # Committed JSON files; site reads only these
│   ├── meta.json             # Freshness, next filing due, fund info
│   ├── filings.json          # All known 13F-HR filings
│   ├── holdings_latest.json  # Latest 13F holdings
│   ├── position_changes.json # Change detection vs prior filing
│   ├── alerts.json           # Material-change alerts
│   ├── news.json             # Recent headlines
│   ├── securities.json       # Company metadata
│   ├── analyst_ratings.json  # Consensus ratings per ticker
│   ├── prices/               # <TICKER>.json — price history + current
│   └── position_history/     # <TICKER>.json — value across filings
└── .github/workflows/
    └── refresh.yml           # Daily cron + manual dispatch
```

---

## How it works

1. **GitHub Actions** runs `refresh.yml` daily at 06:30 UTC.
2. The workflow runs `agents/run_all.py` which calls each agent in sequence.
3. Each agent writes its output to `data/`. If a source fails, it marks that data stale and continues.
4. If any file in `data/` changed, the workflow commits `"chore: daily data refresh <date>"` and pushes.
5. GitHub Pages serves `site/index.html`, which fetches all JSON from `../data/` at load time. No server required at runtime.

### Data sources and provenance

| Source | What it provides | Auth required |
|--------|-----------------|---------------|
| SEC EDGAR `data.sec.gov` | 13F-HR filing list, INFORMATION TABLE XML | None — public |
| Yahoo Finance (yfinance) | Prices, analyst ratings, company metadata | None |
| NewsAPI.org | News headlines per ticker | `NEWSAPI_KEY` (free tier) |
| Yahoo Finance RSS | Fallback news headlines | None |

EDGAR is the **source of truth** for all holding figures. Every holding is traceable to the accession number shown in the footer.

---

## Setup

### Prerequisites

Python 3.11+, Git

```bash
pip install -r agents/requirements.txt
```

### Required GitHub Actions secrets

| Secret | Required | Description |
|--------|----------|-------------|
| `SEC_CONTACT_EMAIL` | **Yes** | Your email for SEC User-Agent (fair-access rules) |
| `NEWSAPI_KEY` | No | Free key from [newsapi.org](https://newsapi.org) |

Set at: `Settings → Secrets and variables → Actions`

---

## Running agents locally

```bash
# Run all agents
python agents/run_all.py

# Force re-parse EDGAR XML
python agents/run_all.py --force-edgar

# Skip steps
python agents/run_all.py --skip-market --skip-news
```

Required env vars:
```bash
export SEC_CONTACT_EMAIL="you@example.com"
export NEWSAPI_KEY="your_key_here"   # optional
```

---

## Previewing the site locally

```bash
# Python built-in server (from repo root)
python -m http.server 8080
# Open: http://localhost:8080/site/index.html
```

---

## Enabling GitHub Pages

1. `Settings → Pages → Source: Deploy from a branch`
2. Branch: `main`, Folder: `/site`
3. Save. Live at `https://as-2523.github.io/leo26/site/`

---

## Cron schedule

`30 6 * * *` — 06:30 UTC daily (≈ 02:30 ET). Also supports manual dispatch from the Actions tab.

---

## Disclaimer

Automated research tool. All data sourced from public filings (SEC EDGAR) and public market data. Nothing here constitutes investment advice. 13F filings are disclosed 45 days after quarter-end and reflect positions as of that date — not current positions.
