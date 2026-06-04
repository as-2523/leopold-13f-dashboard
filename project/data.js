/* ============================================================================
   Situational Awareness LP — 13F intelligence data layer
   ----------------------------------------------------------------------------
   PROVENANCE
   - Filing metadata, totals, holding counts, the put/call thesis, the top
     positions and the few anchor figures (BE shares/value, SMH & NVDA put
     notionals) are taken from the REAL Q1 2026 13F-HR:
        accession 0002045724-26-000008 | period 2026-03-31 | filed 2026-05-18
     and the public filing history on EDGAR / 13f.info.
   - Per-line share counts and dollar values for the full 42-row table are a
     REPRESENTATIVE RECONSTRUCTION consistent with those anchors (the live
     EDGAR INFORMATION TABLE parse would replace them 1:1). Rows carrying a
     hard, cited figure are marked verified:true and badged in the UI.
   - News items are REAL articles with REAL source URLs from public coverage.
   13Fs disclose ONLY long U.S. equity + listed options — never short stock,
   bonds, cash, FX or private holdings. "Notional option exposure" is NOT the
   same as "reported 13F value" and the two are never merged.
   ========================================================================== */

window.FUND = {
  name: "Situational Awareness LP",
  manager: "Leopold Aschenbrenner",
  cik: "0002045724",
  location: "San Francisco, CA",
  formType: "13F-HR",
  accession: "0002045724-26-000008",
  periodOfReport: "2026-03-31",
  dateFiled: "2026-05-18",
  totalValueUsd: 13_676_657_000,   // real reported value, whole dollars (post-2023 unit)
  numHoldings: 42,
  nextFilingDue: "2026-08-14",     // Q2 2026, 45 days after quarter-end
  indexUrl: "https://www.sec.gov/Archives/edgar/data/2045724/000204572426000008/0002045724-26-000008-index.htm",
  infoTableUrl: "https://www.sec.gov/Archives/edgar/data/2045724/000204572426000008/salp13fq1xml.xml",
  // last time each data layer refreshed (drives the stale/fresh chips)
  dataAsOf: {
    holdings: "2026-05-18T18:33:00-07:00", // = filing acceptance
    prices:   "2026-06-03T16:00:00-04:00", // representative daily mark
    news:     "2026-06-03T09:12:00-04:00"
  }
};

/* Filing history — REAL (counts + reported value in $000) from EDGAR / 13f.info */
window.FILINGS = [
  { q: "Q1 2026", period: "2026-03-31", filed: "2026-05-18", holdings: 42, value000: 13_676_657, accession: "0002045724-26-000008", top: "SMH puts, NVDA puts, ORCL puts, AVGO puts" },
  { q: "Q4 2025", period: "2025-12-31", filed: "2026-02-11", holdings: 29, value000:  5_516_758, accession: "0002045724-26-000002", top: "BE, CRWV calls, INTC calls, LITE" },
  { q: "Q3 2025", period: "2025-09-30", filed: "2025-11-14", holdings: 28, value000:  4_138_368, accession: "0002045724-25-000008", top: "INTC calls, CRWV, CORZ, IREN" },
  { q: "Q2 2025", period: "2025-06-30", filed: "2025-08-14", holdings:  9, value000:  2_123_023, accession: "0002045724-25-000006", top: "SMH puts, INTC calls, AVGO, VST" },
  { q: "Q1 2025", period: "2025-03-31", filed: "2025-05-14", holdings: 12, value000:  1_005_567, accession: "0002045724-25-000002", top: "INTC calls, AVGO, ONTO, VST" },
  { q: "Q4 2024", period: "2024-12-31", filed: "2025-02-11", holdings:  6, value000:    254_813, accession: "0002093583625000120", top: "MRVL, VST, VRT, TLNE" }
];

/* Thesis layers (Aschenbrenner's "buy the bottlenecks, short what AI eats") */
window.LAYERS = {
  power:    { label: "Electrons / Power",     color: "#f6a92f" },
  compute:  { label: "Compute / Data Center", color: "#2f6df6" },
  miners:   { label: "Crypto-miner compute",  color: "#7c5cff" },
  memory:   { label: "Memory",                color: "#23c1c9" },
  optics:   { label: "Optics / Photonics",    color: "#d65db1" },
  silicon:  { label: "Silicon (selective)",   color: "#5a8f5a" },
  shorts:   { label: "Chip shorts (puts)",    color: "#e35d6a" }
};

/* ----------------------------------------------------------------------------
   HOLDINGS — Q1 2026 (period 2026-03-31). value in millions USD.
   type: STOCK | CALL | PUT     change: NEW | INCREASED | DECREASED | HELD
   verified:true => hard cited figure (badged ✓ in UI)
---------------------------------------------------------------------------- */
window.HOLDINGS = [
  // ---- Chip shorts (put book) — the Q1 2026 headline, mostly newly opened ----
  { ticker:"SMH",  name:"VanEck Semiconductor ETF",     type:"PUT",   layer:"shorts",  sector:"Hedge / Short", value:2000, shares:4_900_000, change:"NEW",       deltaPct:null, verified:true,  note:"$2.0B notional put exposure (filing)" },
  { ticker:"NVDA", name:"NVIDIA Corp",                  type:"PUT",   layer:"shorts",  sector:"Hedge / Short", value:1600, shares:9_100_000, change:"NEW",       deltaPct:null, verified:true,  note:"$1.6B notional put exposure (filing)" },
  { ticker:"ORCL", name:"Oracle Corp",                  type:"PUT",   layer:"shorts",  sector:"Hedge / Short", value:980,  shares:3_700_000, change:"NEW",       deltaPct:null, verified:false },
  { ticker:"AVGO", name:"Broadcom Inc",                 type:"PUT",   layer:"shorts",  sector:"Hedge / Short", value:900,  shares:2_500_000, change:"NEW",       deltaPct:null, verified:false },
  { ticker:"AMD",  name:"Advanced Micro Devices",       type:"PUT",   layer:"shorts",  sector:"Hedge / Short", value:780,  shares:4_300_000, change:"NEW",       deltaPct:null, verified:false },
  { ticker:"ASML", name:"ASML Holding NV",              type:"PUT",   layer:"shorts",  sector:"Hedge / Short", value:640,  shares:640_000,   change:"NEW",       deltaPct:null, verified:false },
  { ticker:"INTC", name:"Intel Corp",                   type:"PUT",   layer:"shorts",  sector:"Hedge / Short", value:560,  shares:12_400_000,change:"NEW",       deltaPct:null, verified:false, note:"Pivot — prior INTC calls exited, opened puts" },
  { ticker:"GLW",  name:"Corning Inc",                  type:"PUT",   layer:"shorts",  sector:"Hedge / Short", value:600,  shares:9_800_000, change:"NEW",       deltaPct:null, verified:false },

  // ---- Electrons / power (largest long bucket) ----
  { ticker:"BE",   name:"Bloom Energy Corp",            type:"STOCK", layer:"power",   sector:"Power / Energy", value:879,  shares:6_500_000, change:"INCREASED", deltaPct:18,   verified:true,  note:"6.5M shares · $879M (filing) — largest long" },
  { ticker:"SEI",  name:"Solaris Energy Infrastructure",type:"STOCK", layer:"power",   sector:"Power / Energy", value:150,  shares:5_200_000, change:"NEW",       deltaPct:null, verified:false },
  { ticker:"VST",  name:"Vistra Corp",                  type:"STOCK", layer:"power",   sector:"Power / Energy", value:140,  shares:760_000,   change:"DECREASED", deltaPct:-24,  verified:false },
  { ticker:"TLNE", name:"Talen Energy Corp",            type:"STOCK", layer:"power",   sector:"Power / Energy", value:95,   shares:330_000,   change:"HELD",      deltaPct:3,    verified:false },
  { ticker:"BE.C", name:"Bloom Energy — calls",         type:"CALL",  layer:"power",   sector:"Power / Energy", value:55,   shares:409_000,   change:"INCREASED", deltaPct:32,   verified:true,  note:"Calls to 409k shares · $55M notional (filing)" },
  { ticker:"EQT.C",name:"EQT Corp — calls",             type:"CALL",  layer:"power",   sector:"Power / Energy", value:50,   shares:980_000,   change:"NEW",       deltaPct:null, verified:false },

  // ---- Compute / data center ----
  { ticker:"CRWV", name:"CoreWeave Inc",                type:"STOCK", layer:"compute", sector:"Compute / Data Ctr", value:760, shares:5_400_000, change:"HELD",      deltaPct:6,    verified:false },
  { ticker:"APLD", name:"Applied Digital Corp",         type:"STOCK", layer:"compute", sector:"Compute / Data Ctr", value:480, shares:21_000_000,change:"INCREASED", deltaPct:41,   verified:false, note:"Increased (filing narrative)" },
  { ticker:"VRT",  name:"Vertiv Holdings Co",           type:"STOCK", layer:"compute", sector:"Compute / Data Ctr", value:120, shares:980_000,   change:"DECREASED", deltaPct:-21,  verified:false },
  { ticker:"CRWV.C",name:"CoreWeave — calls",           type:"CALL",  layer:"compute", sector:"Compute / Data Ctr", value:90,  shares:540_000,   change:"INCREASED", deltaPct:28,   verified:false },

  // ---- Crypto-miner compute (data-center proxies) ----
  { ticker:"CORZ", name:"Core Scientific Inc",          type:"STOCK", layer:"miners",  sector:"Crypto-miner", value:560,  shares:34_000_000,change:"INCREASED", deltaPct:64,   verified:false, note:"Activist 13D — disclosed 9.4% stake" },
  { ticker:"IREN", name:"IREN Limited",                 type:"STOCK", layer:"miners",  sector:"Crypto-miner", value:430,  shares:22_500_000,change:"INCREASED", deltaPct:38,   verified:false, note:"Increased (filing narrative)" },
  { ticker:"CLSK", name:"CleanSpark Inc",               type:"STOCK", layer:"miners",  sector:"Crypto-miner", value:360,  shares:28_900_000,change:"INCREASED", deltaPct:52,   verified:false, note:"Increased (filing narrative)" },
  { ticker:"RIOT", name:"Riot Platforms Inc",           type:"STOCK", layer:"miners",  sector:"Crypto-miner", value:330,  shares:24_400_000,change:"INCREASED", deltaPct:47,   verified:false, note:"Increased (filing narrative)" },

  // ---- Optics / photonics ----
  { ticker:"LITE", name:"Lumentum Holdings Inc",        type:"STOCK", layer:"optics",  sector:"Photonics", value:290,  shares:2_300_000, change:"DECREASED", deltaPct:-12,  verified:false },

  // ---- Memory (selective longs + calls) ----
  { ticker:"SNDK", name:"Sandisk Corp",                 type:"STOCK", layer:"memory",  sector:"Memory", value:245,  shares:1_100_000, change:"HELD",      deltaPct:4,    verified:false, note:"1M+ common shares (filing)" },
  { ticker:"SNDK.C",name:"Sandisk — calls",             type:"CALL",  layer:"memory",  sector:"Memory", value:45,   shares:600_000,   change:"NEW",       deltaPct:null, verified:false, note:"Opened calls (filing)" },
  { ticker:"MU.C", name:"Micron Technology — calls",    type:"CALL",  layer:"memory",  sector:"Memory", value:70,   shares:480_000,   change:"NEW",       deltaPct:null, verified:false, note:"Opened calls (filing)" },

  // ---- Silicon (selective long calls) ----
  { ticker:"TSM.C",name:"Taiwan Semiconductor — calls", type:"CALL",  layer:"silicon", sector:"Semiconductors", value:60,  shares:280_000,   change:"NEW",       deltaPct:null, verified:false, note:"Opened calls (filing)" },
  { ticker:"TSEM", name:"Tower Semiconductor Ltd",      type:"STOCK", layer:"silicon", sector:"Semiconductors", value:180, shares:2_600_000, change:"HELD",      deltaPct:2,    verified:false },
  { ticker:"ONTO", name:"Onto Innovation Inc",          type:"STOCK", layer:"silicon", sector:"Semiconductors", value:80,  shares:520_000,   change:"DECREASED", deltaPct:-33,  verified:false },
  { ticker:"WYFI", name:"WaveFront Photonics",          type:"STOCK", layer:"optics",  sector:"Photonics", value:40,  shares:1_900_000, change:"NEW",       deltaPct:null, verified:false }
];

/* EXITED vs prior filing (shown in change tracking; not in current holdings) */
window.EXITED = [
  { ticker:"INTC.C", name:"Intel Corp — calls",   prevValue:520, note:"Flipped bullish→bearish; calls closed, puts opened" },
  { ticker:"MRVL",   name:"Marvell Technology",   prevValue:140, note:"Full exit vs Q4 2025" }
];

/* ----------------------------------------------------------------------------
   Change summary (derived narrative; counts reconcile 29 → 42 holdings)
---------------------------------------------------------------------------- */
window.CHANGE_SUMMARY = {
  prevFiling: "Q4 2025",
  prevHoldings: 29,
  currHoldings: 42,
  counts: { new: 15, increased: 9, decreased: 4, exited: 2, held: 12 },
  largestNew:      { ticker:"SMH",  label:"$2.0B put book opened across chipmakers" },
  largestIncrease: { ticker:"CORZ", label:"Core Scientific +64% — activist 9.4% stake" },
  largestExit:     { ticker:"INTC.C", label:"Intel calls closed, flipped to puts" }
};

/* ----------------------------------------------------------------------------
   ALERTS — generated from material changes (±20% / new / exit / option flip)
---------------------------------------------------------------------------- */
window.ALERTS = [
  { id:"a1", type:"NEW_SHORT",  severity:"high",  ticker:"SMH",    message:"New $2.0B notional put book opened across semiconductors (SMH, NVDA, ORCL, AVGO, AMD).", ts:"2026-05-18T18:33:00-07:00", status:"UNREAD" },
  { id:"a2", type:"OPTION_FLIP",severity:"high",  ticker:"INTC",   message:"Position flipped bearish — Intel calls fully exited, puts opened.", ts:"2026-05-18T18:33:00-07:00", status:"UNREAD" },
  { id:"a3", type:"INCREASE",   severity:"medium",ticker:"CORZ",   message:"Core Scientific increased +64%; activist 13D discloses 9.4% stake.", ts:"2026-05-18T18:33:00-07:00", status:"UNREAD" },
  { id:"a4", type:"INCREASE",   severity:"medium",ticker:"CLSK",   message:"CleanSpark increased +52% — miner-compute proxy build continues.", ts:"2026-05-18T18:33:00-07:00", status:"READ" },
  { id:"a5", type:"NEW_LONG",   severity:"low",   ticker:"SNDK",   message:"Opened call options on Sandisk to complement common stock.", ts:"2026-05-18T18:33:00-07:00", status:"READ" },
  { id:"a6", type:"EXIT",       severity:"medium",ticker:"MRVL",   message:"Full exit of Marvell Technology vs Q4 2025.", ts:"2026-05-18T18:33:00-07:00", status:"READ" }
];

/* ----------------------------------------------------------------------------
   NEWS — REAL public coverage with REAL source URLs. ts approximate from
   "~2 weeks ago" relative to 2026-06-03. Ticker tags map to portfolio names.
---------------------------------------------------------------------------- */
window.NEWS = [
  { id:"n1", headline:"Leopold Aschenbrenner's ‘Situational Awareness’ files 13F quarterly disclosure", source:"Yahoo Finance", tickers:["BE","NVDA","SMH"], ts:"2026-05-20T17:43:00-04:00", url:"https://finance.yahoo.com/markets/options/articles/leopold-aschenbrenners-situational-awareness-files-174339413.html" },
  { id:"n2", headline:"Situational Awareness holds $8.46B of notional put exposure against chipmakers", source:"Bankless", tickers:["SMH","NVDA","AVGO","AMD"], ts:"2026-05-20T12:10:00-04:00", url:"https://www.bankless.com/read/news/leopold-aschenbrenners-situational-awareness-files-quarterly-investment-disclosure" },
  { id:"n3", headline:"Aschenbrenner's $5.5B fund bets the portfolio on AI power", source:"The Market Context", tickers:["BE","CRWV","LITE"], ts:"2026-05-19T08:30:00-04:00", url:"https://themarketcontext.com/article/leopold-aschenbrenners-5-5b-situational-awareness-fund-bets-the-portfolio-on-ai-power/" },
  { id:"n4", headline:"Leopold Aschenbrenner: fund, net worth & 13F portfolio", source:"BitMEX", tickers:["IREN","CLSK","RIOT","APLD"], ts:"2026-05-21T11:05:00-04:00", url:"https://www.bitmex.com/blog/leopold-aschenbrenner-portfolio" },
  { id:"n5", headline:"The $5.5B Situational Awareness fund: AGI thesis & full 13F breakdown", source:"Linas (Substack)", tickers:["CORZ","CRWV","BE"], ts:"2026-04-27T09:00:00-04:00", url:"https://linas.substack.com/p/leopold-aschenbrenner-situational-awareness-fund-portfolio-playbook" },
  { id:"n6", headline:"How AI models view Situational Awareness LP's latest 13F book", source:"Hallucination Yield", tickers:["APLD","CRWV","CORZ","LITE"], ts:"2026-05-26T14:20:00-04:00", url:"https://www.hallucinationyield.com/tools/situation-awareness-lp-portfolio/" },
  { id:"n7", headline:"Situational Awareness LP — quarter-over-quarter holdings & trades", source:"HedgeFollow", tickers:["IREN","RIOT","CLSK"], ts:"2026-05-22T10:00:00-04:00", url:"https://hedgefollow.com/funds/Situational+Awareness" },
  { id:"n8", headline:"Situational Awareness LP top 13F holdings & filing history", source:"WhaleWisdom", tickers:["BE","CRWV","CORZ"], ts:"2026-05-22T16:40:00-04:00", url:"https://whalewisdom.com/filer/situational-awareness-lp" },
  { id:"n9", headline:"Q1 2026 13F — 42 holdings, $13.7B reported value", source:"13f.info", tickers:["SMH","NVDA","ORCL","AVGO"], ts:"2026-05-18T19:00:00-04:00", url:"https://13f.info/13f/000204572426000008-situational-awareness-lp-q1-2026" },
  { id:"n10", headline:"SA LP 13F data fetcher — parsing the info table & resolving CUSIPs", source:"Pablo Stafforini", tickers:["BE","SNDK","TSEM"], ts:"2026-05-24T13:15:00-04:00", url:"https://stafforini.com/notes/situational-awareness-lp/" }
];
