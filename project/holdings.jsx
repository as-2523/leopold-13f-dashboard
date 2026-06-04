/* Holdings table with inline drill-down, change-summary cards, alerts feed. */

function genHistory(h) {
  // representative position-value trajectory across the 6 filings (oldest→newest)
  const v = h.value;
  switch (h.change) {
    case "NEW":       return [0, 0, 0, 0, 0, v];
    case "INCREASED": return [0, v*0.18, v*0.34, v*0.52, v*0.74, v];
    case "DECREASED": return [v*1.7, v*1.55, v*1.42, v*1.3, v*1.18, v];
    default:          return [v*0.92, v*0.97, v*1.05, v*0.99, v*1.02, v];
  }
}

function HoldingRow({ h, pct, expanded, onToggle }) {
  const hist = genHistory(h);
  const histColor = h.type === "PUT" ? "var(--down)" : (h.change === "DECREASED" ? "var(--down)" : "var(--up)");
  return (
    <>
      <tr onClick={onToggle} className={"hrow" + (expanded ? " hrow-open" : "")}>
        <td style={{ paddingLeft: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <LayerDot layer={h.layer} />
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontFamily: "var(--mono)", fontWeight: 700, fontSize: 13, color: "var(--text)" }}>{h.ticker.replace(".C", "")}</span>
                {h.verified && <VerifiedDot note={h.note} />}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>{h.name}</div>
            </div>
          </div>
        </td>
        <td><TypeTag type={h.type} /></td>
        <td className="num">{fmtShares(h.shares)}</td>
        <td className="num" style={{ fontWeight: 600, color: "var(--text)" }}>{fmtMillions(h.value)}</td>
        <td className="num">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
            <div style={{ width: 42, height: 5, background: "var(--panel-2)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: Math.min(100, pct / 16 * 100) + "%", height: "100%", background: h.type === "PUT" ? "var(--down)" : "var(--accent)", opacity: h.type === "PUT" ? .5 : .85 }} />
            </div>
            <span style={{ minWidth: 38, textAlign: "right" }}>{pct.toFixed(1)}%</span>
          </div>
        </td>
        <td style={{ paddingRight: 16 }}><ChangeBadge change={h.change} deltaPct={h.deltaPct} /></td>
      </tr>
      {expanded && (
        <tr className="hdetail">
          <td colSpan={6} style={{ padding: 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 22, padding: "16px 16px 20px 38px" }}>
              <div>
                <div className="dlabel">Position history · value across filings</div>
                <Sparkline data={hist} width={240} height={46} color={histColor} fill />
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--mono)", fontSize: 9.5, color: "var(--text-faint)", marginTop: 4, width: 240 }}>
                  <span>Q4'24</span><span>Q2'25</span><span>Q4'25</span><span>Q1'26</span>
                </div>
              </div>
              <div>
                <div className="dlabel">Thesis layer</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <LayerDot layer={h.layer} />
                  <span style={{ fontSize: 13, color: "var(--text)" }}>{window.LAYERS[h.layer].label}</span>
                </div>
                <div className="dlabel">Change vs Q4 2025</div>
                <div style={{ fontSize: 12.5, color: "var(--text-dim)", lineHeight: 1.5 }}>
                  <ChangeBadge change={h.change} deltaPct={h.deltaPct} />
                  {h.note && <div style={{ marginTop: 6 }}>{h.note}</div>}
                </div>
              </div>
              <div>
                <div className="dlabel">Reported in filing</div>
                <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text-dim)", lineHeight: 1.8 }}>
                  <div>Value&nbsp;&nbsp;<span style={{ color: "var(--text)" }}>{fmtMillions(h.value)}</span></div>
                  <div>Shares&nbsp;<span style={{ color: "var(--text)" }}>{fmtShares(h.shares)}</span></div>
                  <div>Type&nbsp;&nbsp;&nbsp;<span style={{ color: "var(--text)" }}>{h.type === "PUT" ? "Put option" : h.type === "CALL" ? "Call option" : "Common stock"}</span></div>
                </div>
                {h.type !== "STOCK" && <div style={{ marginTop: 8, fontSize: 10.5, color: "var(--warn)", lineHeight: 1.4 }}>⚠ Notional option exposure — not the same as reported 13F value. Strike & expiry are not disclosed in 13F.</div>}
                {!h.verified && <div style={{ marginTop: 8, fontSize: 10.5, color: "var(--text-faint)", lineHeight: 1.4 }}>≈ Line-level value is a representative reconstruction.</div>}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function HoldingsTable({ holdings, total, sort, setSort }) {
  const [open, setOpen] = React.useState(null);
  const cols = [
    { k: "name", label: "Holding", align: "left" },
    { k: "type", label: "Type", align: "left" },
    { k: "shares", label: "Shares", align: "right" },
    { k: "value", label: "Value", align: "right" },
    { k: "pct", label: "% Port", align: "right" },
    { k: "change", label: "Δ vs prior", align: "left" }
  ];
  return (
    <div className="tablewrap">
      <table className="htable">
        <thead>
          <tr>
            {cols.map(c => (
              <th key={c.k} onClick={() => c.k !== "type" && c.k !== "change" && setSort(c.k)}
                style={{ textAlign: c.align, cursor: (c.k !== "type" && c.k !== "change") ? "pointer" : "default", paddingLeft: c.k === "name" ? 16 : undefined, paddingRight: c.k === "change" ? 16 : undefined }}>
                {c.label}{sort === c.k ? " ↓" : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {holdings.map(h => (
            <HoldingRow key={h.ticker} h={h} pct={h.value / total * 100}
              expanded={open === h.ticker} onToggle={() => setOpen(open === h.ticker ? null : h.ticker)} />
          ))}
        </tbody>
      </table>
      {holdings.length === 0 && <div style={{ padding: "40px 16px", textAlign: "center", color: "var(--text-faint)", fontSize: 13 }}>No holdings match the current filters.</div>}
    </div>
  );
}

/* ---- change-summary cards ---- */
function ChangeCards() {
  const s = window.CHANGE_SUMMARY;
  const cards = [
    { k: "new", label: "New positions", n: s.counts.new, color: "var(--accent)", glyph: "✦" },
    { k: "inc", label: "Increased", n: s.counts.increased, color: "var(--up)", glyph: "▲" },
    { k: "dec", label: "Decreased", n: s.counts.decreased, color: "var(--down)", glyph: "▼" },
    { k: "exit", label: "Exited", n: s.counts.exited, color: "var(--down)", glyph: "✕" }
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
      {cards.map(c => (
        <div key={c.k} className="kcard">
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: c.color, fontSize: 11, fontFamily: "var(--mono)", fontWeight: 600 }}>
            <span style={{ fontSize: 9 }}>{c.glyph}</span>{c.label}
          </div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 30, fontWeight: 700, color: "var(--text)", marginTop: 4, lineHeight: 1 }}>{c.n}</div>
        </div>
      ))}
    </div>
  );
}

/* ---- alerts feed ---- */
function AlertsFeed() {
  const [alerts, setAlerts] = React.useState(window.ALERTS);
  const unread = alerts.filter(a => a.status === "UNREAD").length;
  const sevColor = { high: "var(--down)", medium: "var(--warn)", low: "var(--text-dim)" };
  const markRead = (id) => setAlerts(alerts.map(a => a.id === id ? { ...a, status: "READ" } : a));
  return (
    <div className="panel">
      <PanelHead kicker="Material changes" title="Alerts"
        right={<span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--accent)", background: "color-mix(in oklab, var(--accent) 14%, transparent)", padding: "3px 8px", borderRadius: 20 }}>{unread} unread</span>} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {alerts.map(a => (
          <div key={a.id} onClick={() => markRead(a.id)} className="alert" style={{ opacity: a.status === "READ" ? 0.55 : 1 }}>
            <div style={{ width: 3, alignSelf: "stretch", borderRadius: 3, background: sevColor[a.severity], flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <span style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700, color: "var(--text)" }}>{a.ticker}</span>
                <span style={{ fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: ".06em", color: sevColor[a.severity], border: "1px solid " + sevColor[a.severity], borderRadius: 3, padding: "0 5px" }}>{a.type.replace("_", " ")}</span>
                {a.status === "UNREAD" && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />}
                <span style={{ marginLeft: "auto", fontFamily: "var(--mono)", fontSize: 10, color: "var(--text-faint)" }}>{timeAgo(a.ts)}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.45 }}>{a.message}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { HoldingsTable, ChangeCards, AlertsFeed });
