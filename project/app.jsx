/* Main app: themes, header, filters, KPI hero, layout, tweaks. */
const { useState, useMemo } = React;

const THEMES = {
  carbon:   { "--bg":"#0a0e14","--panel":"#11161f","--panel-2":"#161d28","--border":"#222b38","--text":"#e6edf3","--text-dim":"#8a97a6","--text-faint":"#5a6675" },
  midnight: { "--bg":"#080b1a","--panel":"#0f1430","--panel-2":"#151b3c","--border":"#252c52","--text":"#e7e9f7","--text-dim":"#9095bb","--text-faint":"#5e6390" },
  slate:    { "--bg":"#14181d","--panel":"#1b2028","--panel-2":"#222933","--border":"#2f3947","--text":"#e8edf2","--text-dim":"#9aa5b2","--text-faint":"#6b7785" },
  paper:    { "--bg":"#f3f5f9","--panel":"#ffffff","--panel-2":"#eef2f7","--border":"#e0e6ee","--text":"#111722","--text-dim":"#586472","--text-faint":"#95a0ad" }
};
const ACCENTS = { blue:"#2f6df6", green:"#1ec46a", gold:"#c9a227", violet:"#7c5cff" };

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "carbon",
  "accent": "#2f6df6",
  "density": "regular",
  "defaultNews": "marquee",
  "defaultAlloc": "treemap"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const F = window.FUND;
  const H = window.HOLDINGS;

  const [search, setSearch] = useState("");
  const [sector, setSector] = useState(null);
  const [typeF, setTypeF] = useState("ALL");
  const [sort, setSort] = useState("value");
  const [allocMode, setAllocMode] = useState(t.defaultAlloc);
  const [colorMode, setColorMode] = useState("layer");
  const [newsMode, setNewsMode] = useState(t.defaultNews);
  const [picked, setPicked] = useState(null);

  const sectors = useMemo(() => Array.from(new Set(H.map(h => h.sector))), []);
  const totalAll = useMemo(() => H.reduce((s, h) => s + h.value, 0), []);
  const longVal = useMemo(() => H.filter(h => h.type !== "PUT").reduce((s, h) => s + h.value, 0), []);
  const shortVal = totalAll - longVal;

  const filtered = useMemo(() => {
    let r = H.filter(h => {
      if (typeF !== "ALL" && h.type !== typeF) return false;
      if (sector && h.sector !== sector) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!h.ticker.toLowerCase().includes(q) && !h.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
    r = r.slice().sort((a, b) => {
      if (sort === "name") return a.ticker.localeCompare(b.ticker);
      if (sort === "shares") return (b.shares || 0) - (a.shares || 0);
      if (sort === "pct") return b.value - a.value;
      return b.value - a.value;
    });
    return r;
  }, [search, sector, typeF, sort]);

  const themeVars = { ...THEMES[t.theme], "--accent": t.accent, "--up": "#1ec46a", "--down": "#e2554f", "--warn": "#f6a92f" };

  const fundSeries = window.FILINGS.map(f => f.value000 / 1000).reverse(); // oldest→newest, in $M

  return (
    <div className="app" style={{ ...themeVars, color: "var(--text)", background: "var(--bg)", minHeight: "100vh" }}>
      <div className={t.density === "compact" ? "dense" : ""}>

        {/* ---------- header ---------- */}
        <header className="topbar">
          <div className="wrap">
            <div className="brandrow">
              <div className="mark"><span>SA</span></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: "-.01em" }}>{F.name}</h1>
                  <span className="pill" style={{ color: "var(--accent)", borderColor: "color-mix(in oklab, var(--accent) 40%, transparent)" }}>13F-HR · {F.periodOfReport}</span>
                </div>
                <div style={{ fontSize: 12.5, color: "var(--text-dim)", marginTop: 2 }}>{F.manager} · {F.location} · CIK {F.cik}</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <span className="metachip"><span className="dot" style={{ background: "var(--up)" }} />Holdings <b>fresh</b><span style={{ color: "var(--text-faint)" }}>· filed {fmtDate(F.dateFiled)}</span></span>
                <span className="pill" style={{ color: "var(--warn)", borderColor: "color-mix(in oklab, var(--warn) 35%, transparent)" }}>Research, not investment advice</span>
              </div>
            </div>

            {/* ---------- controls ---------- */}
            <div className="controls">
              <div className="selwrap">
                <select value="Q1 2026" onChange={() => {}} title="Filing period (line items loaded for latest filing)">
                  {window.FILINGS.map(f => <option key={f.q}>{f.q}</option>)}
                </select>
              </div>
              <div className="seg">
                {["ALL", "STOCK", "CALL", "PUT"].map(x => (
                  <button key={x} className={typeF === x ? "on" : ""} onClick={() => setTypeF(x)}>{x === "STOCK" ? "STK" : x}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
                {sectors.map(s => <Chip key={s} active={sector === s} onClick={() => setSector(sector === s ? null : s)}>{s}</Chip>)}
              </div>
              <div className="search">
                <span style={{ color: "var(--text-faint)", fontFamily: "var(--mono)", fontSize: 12 }}>⌕</span>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ticker / name" />
              </div>
            </div>
          </div>
        </header>

        <main className="wrap">

          {/* ---------- KPI hero ---------- */}
          <div className="hero">
            <div className="herocell">
              <div className="herolabel">Reported 13F value · Q1 2026</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 14, flexWrap: "wrap" }}>
                <div className="herobig" style={{ fontSize: 34 }}>$13.68B</div>
                <div style={{ marginBottom: 2 }}>
                  <Sparkline data={fundSeries} width={130} height={34} color="var(--accent)" fill />
                  <div style={{ fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--text-faint)", marginTop: 2 }}>Q4'24 → Q1'26 · ~22× </div>
                </div>
              </div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--text-faint)", marginTop: 8 }}>Whole-dollar units (post-2023). Gross book incl. listed options.</div>
            </div>
            <div className="herocell">
              <div className="herolabel">Holdings</div>
              <div className="herobig" style={{ fontSize: 34 }}>42</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--up)", marginTop: 8 }}>▲ +13 vs Q4 2025 (29)</div>
            </div>
            <div className="herocell">
              <div className="herolabel">Long vs short</div>
              <div style={{ display: "flex", height: 14, borderRadius: 4, overflow: "hidden", marginTop: 4, marginBottom: 8 }}>
                <div style={{ width: (longVal / totalAll * 100) + "%", background: "var(--accent)" }} />
                <div style={{ width: (shortVal / totalAll * 100) + "%", background: "color-mix(in oklab, var(--down) 60%, transparent)" }} />
              </div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-dim)" }}>
                <span style={{ color: "var(--accent)" }}>{fmtMillions(longVal)} long</span> · <span style={{ color: "var(--down)" }}>{fmtMillions(shortVal)} puts</span>
              </div>
            </div>
            <div className="herocell">
              <div className="herolabel">Filing cadence</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--text)", lineHeight: 1.6 }}>
                <div>Filed <b>{fmtDate(F.dateFiled)}</b></div>
                <div style={{ color: "var(--text-dim)" }}>Next due <b style={{ color: "var(--warn)" }}>{fmtDate(F.nextFilingDue)}</b></div>
              </div>
              <a href={F.indexUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "var(--mono)", fontSize: 10.5, color: "var(--accent)", marginTop: 8, display: "inline-block" }}>SEC filing index ↗</a>
            </div>
          </div>

          {/* ---------- allocation + changes/alerts ---------- */}
          <div className="grid2">
            <div className="panel">
              <PanelHead kicker="Portfolio allocation" title="Where the book sits"
                right={
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {allocMode === "treemap" && (
                      <div className="seg">
                        {[["layer","Layer"],["longshort","L/S"],["change","Δ"]].map(([k,l]) => (
                          <button key={k} className={colorMode === k ? "on" : ""} onClick={() => setColorMode(k)}>{l}</button>
                        ))}
                      </div>
                    )}
                    <div className="seg">
                      {[["treemap","Map"],["sector","Bars"],["donut","Donut"]].map(([k,l]) => (
                        <button key={k} className={allocMode === k ? "on" : ""} onClick={() => setAllocMode(k)}>{l}</button>
                      ))}
                    </div>
                  </div>
                } />
              {allocMode === "treemap" && <Treemap holdings={H} colorMode={colorMode} active={picked} onPick={(c) => { setPicked(c.ticker); setSearch(c.ticker.replace(".C","")); }} />}
              {allocMode === "sector" && <SectorBar holdings={H} />}
              {allocMode === "donut" && <Donut holdings={H} />}
              <Legend mode={allocMode === "treemap" ? colorMode : "layer"} />
            </div>

            <div className="stack">
              <div className="panel">
                <PanelHead kicker={"vs " + window.CHANGE_SUMMARY.prevFiling} title="Position changes" />
                <ChangeCards />
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 7 }}>
                  {[window.CHANGE_SUMMARY.largestNew, window.CHANGE_SUMMARY.largestIncrease, window.CHANGE_SUMMARY.largestExit].map((m, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "baseline", fontSize: 12, color: "var(--text-dim)" }}>
                      <span style={{ fontFamily: "var(--mono)", fontWeight: 700, color: "var(--text)", minWidth: 52 }}>{m.ticker}</span>
                      <span style={{ lineHeight: 1.4 }}>{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <AlertsFeed />
            </div>
          </div>

          {/* ---------- holdings ---------- */}
          <div className="panel" style={{ marginTop: 16 }}>
            <PanelHead kicker={filtered.length + " of " + H.length + " positions · click a row to drill in"} title="Holdings"
              right={<span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-faint)" }}>✓ = figure from filing · ≈ rows reconstructed</span>} />
            <HoldingsTable holdings={filtered} total={totalAll} sort={sort} setSort={setSort} />
          </div>

          {/* ---------- news ---------- */}
          <div style={{ marginTop: 16 }}>
            <NewsModule mode={newsMode} setMode={setNewsMode} />
          </div>

          {/* ---------- footer ---------- */}
          <footer className="footer">
            <div className="discl">
              <div style={{ color: "var(--text-dim)", marginBottom: 8 }}>Data provenance</div>
              Holdings sourced from SEC EDGAR 13F-HR, accession <b style={{ color: "var(--text-dim)" }}>{F.accession}</b> (period {F.periodOfReport}, filed {fmtDate(F.dateFiled)}). Filing metadata, totals, holding counts, the put/call thesis and anchor figures (✓) are from the real filing; per-line share/value figures marked ≈ are a representative reconstruction pending the live INFORMATION TABLE parse.<br />
              13Fs disclose only long U.S. equity and listed options — <b style={{ color: "var(--text-dim)" }}>not</b> short stock, bonds, cash, FX, or private holdings, so this is not the fund's full economic exposure. Notional option exposure ≠ reported 13F value. Prices/news date-stamped {fmtDate(F.dataAsOf.news.slice(0,10))}.<br />
              <span style={{ color: "var(--text)", fontWeight: 600 }}>This is research, not investment advice.</span>
            </div>
          </footer>
        </main>

        <TweaksPanel>
          <TweakSection label="Aesthetic theme" />
          <TweakSelect label="Theme" value={t.theme} options={["carbon","midnight","slate","paper"]} onChange={v => setTweak("theme", v)} />
          <TweakColor label="Accent" value={t.accent} options={Object.values(ACCENTS)} onChange={v => setTweak("accent", v)} />
          <TweakRadio label="Density" value={t.density} options={["regular","compact"]} onChange={v => setTweak("density", v)} />
          <TweakSection label="Defaults" />
          <TweakRadio label="News view" value={t.defaultNews} options={["marquee","feed"]} onChange={v => { setTweak("defaultNews", v); setNewsMode(v); }} />
          <TweakRadio label="Allocation" value={t.defaultAlloc} options={["treemap","sector","donut"]} onChange={v => { setTweak("defaultAlloc", v); setAllocMode(v); }} />
        </TweaksPanel>
      </div>
    </div>
  );
}

function Legend({ mode }) {
  let items;
  if (mode === "longshort") items = [["var(--accent)","Long stock"],["var(--up)","Call options"],["var(--down)","Put options"]];
  else if (mode === "change") items = [["var(--accent)","New"],["var(--up)","Increased"],["var(--down)","Decreased"],["var(--text-faint)","Held"]];
  else items = Object.values(window.LAYERS).map(l => [l.color, l.label]);
  return (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 14, paddingTop: 12, borderTop: "1px solid color-mix(in oklab, var(--border) 55%, transparent)" }}>
      {items.map(([c, l]) => (
        <span key={l} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text-dim)" }}>
          <span style={{ width: 9, height: 9, borderRadius: 2, background: c }} />{l}
        </span>
      ))}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
