/* Unified news: scrolling marquee tape + feed view, with ticker filter. */

function NewsItemInline({ n }) {
  return (
    <a href={n.url} target="_blank" rel="noopener noreferrer" className="tickitem">
      <span style={{ display: "inline-flex", gap: 4 }}>
        {n.tickers.slice(0, 2).map(t => <span key={t} className="ticktag">{t}</span>)}
      </span>
      <span style={{ color: "var(--text)", fontSize: 12.5 }}>{n.headline}</span>
      <span style={{ color: "var(--text-faint)", fontSize: 11, fontFamily: "var(--mono)" }}>· {n.source}</span>
      <span style={{ color: "var(--text-faint)", fontSize: 16, margin: "0 6px" }}>•</span>
    </a>
  );
}

function Marquee({ news }) {
  const doubled = news.concat(news);
  return (
    <div className="marquee">
      <div className="marquee-track">
        {doubled.map((n, i) => <NewsItemInline key={n.id + "-" + i} n={n} />)}
      </div>
    </div>
  );
}

function NewsFeed({ news, filter, setFilter, allTickers }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        <Chip active={!filter} onClick={() => setFilter(null)}>ALL</Chip>
        {allTickers.map(t => <Chip key={t} active={filter === t} onClick={() => setFilter(t)}>{t}</Chip>)}
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {news.map(n => (
          <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer" className="feeditem">
            <div style={{ display: "flex", gap: 5, flexShrink: 0, paddingTop: 2 }}>
              {n.tickers.slice(0, 3).map(t => <span key={t} className="ticktag">{t}</span>)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.4, marginBottom: 3 }}>{n.headline}</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text-faint)" }}>
                {n.source} · {timeAgo(n.ts)}
                <span style={{ marginLeft: 8, color: "var(--accent)" }}>open ↗</span>
              </div>
            </div>
          </a>
        ))}
        {news.length === 0 && <div style={{ padding: "24px 0", textAlign: "center", color: "var(--text-faint)", fontSize: 13 }}>No coverage for this ticker yet.</div>}
      </div>
    </div>
  );
}

function NewsModule({ mode, setMode }) {
  const [filter, setFilter] = React.useState(null);
  const all = window.NEWS;
  const allTickers = Array.from(new Set(all.flatMap(n => n.tickers))).sort();
  const filtered = (filter ? all.filter(n => n.tickers.includes(filter)) : all)
    .slice().sort((a, b) => new Date(b.ts) - new Date(a.ts));
  return (
    <div className="panel">
      <PanelHead kicker="Across all portfolio tickers" title="Unified news"
        right={
          <div style={{ display: "flex", gap: 0, border: "1px solid var(--border)", borderRadius: 7, overflow: "hidden" }}>
            {["marquee", "feed"].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".04em", textTransform: "uppercase",
                padding: "5px 12px", border: "none", cursor: "pointer",
                background: mode === m ? "var(--accent)" : "transparent",
                color: mode === m ? "#06080c" : "var(--text-dim)", fontWeight: 600
              }}>{m}</button>
            ))}
          </div>
        } />
      {mode === "marquee"
        ? <div>
            <Marquee news={all} />
            <div style={{ marginTop: 10, fontSize: 11, color: "var(--text-faint)", fontFamily: "var(--mono)" }}>
              ↔ live tape · hover to pause · {all.length} sources · switch to Feed to filter by ticker
            </div>
          </div>
        : <NewsFeed news={filtered} filter={filter} setFilter={setFilter} allTickers={allTickers} />}
    </div>
  );
}

Object.assign(window, { NewsModule });
