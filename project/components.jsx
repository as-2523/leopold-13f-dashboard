/* Shared atoms, formatters, and tiny viz for the 13F dashboard.
   Exported to window at the bottom for cross-file use. */

/* ----------------------------- formatters ------------------------------ */
function fmtMillions(m) {
  if (m == null) return "—";
  if (m >= 1000) return "$" + (m / 1000).toFixed(2) + "B";
  if (m >= 1)    return "$" + Math.round(m) + "M";
  return "$" + (m * 1000).toFixed(0) + "K";
}
function fmtUSDFull(d) {
  return "$" + d.toLocaleString("en-US");
}
function fmtShares(n) {
  if (n == null) return "—";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(0) + "K";
  return String(n);
}
function fmtPct(p, digits) {
  if (p == null) return "—";
  const d = digits == null ? 1 : digits;
  return (p > 0 ? "+" : "") + p.toFixed(d) + "%";
}
function timeAgo(ts) {
  const now = new Date("2026-06-03T12:00:00-04:00").getTime();
  const t = new Date(ts).getTime();
  const mins = Math.round((now - t) / 60000);
  if (mins < 60) return mins + "m ago";
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  const days = Math.round(hrs / 24);
  if (days < 14) return days + "d ago";
  const wks = Math.round(days / 7);
  return wks + "w ago";
}
function fmtDate(s) {
  const d = new Date(s + (s.length === 10 ? "T00:00:00" : ""));
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/* ----------------------------- atoms ----------------------------------- */
function TypeTag({ type }) {
  const map = {
    STOCK: { t: "STK", c: "var(--text-dim)", b: "var(--border)" },
    CALL:  { t: "CALL", c: "var(--up)", b: "color-mix(in oklab, var(--up) 40%, transparent)" },
    PUT:   { t: "PUT",  c: "var(--down)", b: "color-mix(in oklab, var(--down) 40%, transparent)" }
  };
  const s = map[type] || map.STOCK;
  return (
    <span style={{
      fontFamily: "var(--mono)", fontSize: 10, fontWeight: 600, letterSpacing: ".06em",
      color: s.c, border: "1px solid " + s.b, borderRadius: 4, padding: "1px 5px",
      lineHeight: 1.4, whiteSpace: "nowrap"
    }}>{s.t}</span>
  );
}

function ChangeBadge({ change, deltaPct, compact }) {
  const map = {
    NEW:       { label: "NEW",  glyph: "✦", color: "var(--accent)" },
    INCREASED: { label: "ADD",  glyph: "▲", color: "var(--up)" },
    DECREASED: { label: "TRIM", glyph: "▼", color: "var(--down)" },
    EXITED:    { label: "EXIT", glyph: "✕", color: "var(--down)" },
    HELD:      { label: "HOLD", glyph: "—", color: "var(--text-faint)" }
  };
  const s = map[change] || map.HELD;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: s.color,
      fontFamily: "var(--mono)", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
      <span style={{ fontSize: 9 }}>{s.glyph}</span>
      <span>{s.label}</span>
      {!compact && deltaPct != null && change !== "HELD" && (
        <span style={{ color: "var(--text-dim)", fontWeight: 500 }}>{fmtPct(deltaPct, 0)}</span>
      )}
    </span>
  );
}

function VerifiedDot({ note }) {
  return (
    <span title={note || "Figure from the filing"} style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: 14, height: 14, borderRadius: "50%",
      background: "color-mix(in oklab, var(--accent) 18%, transparent)",
      color: "var(--accent)", fontSize: 9, fontWeight: 700, cursor: "help", flexShrink: 0
    }}>✓</span>
  );
}

function LayerDot({ layer }) {
  const L = window.LAYERS[layer];
  if (!L) return null;
  return <span title={L.label} style={{ width: 8, height: 8, borderRadius: 2, background: L.color, display: "inline-block", flexShrink: 0 }} />;
}

function Chip({ active, onClick, children, accent }) {
  return (
    <button onClick={onClick} style={{
      fontFamily: "var(--mono)", fontSize: 11, fontWeight: 500, letterSpacing: ".02em",
      padding: "5px 10px", borderRadius: 6, cursor: "pointer", whiteSpace: "nowrap",
      border: "1px solid " + (active ? "var(--accent)" : "var(--border)"),
      background: active ? "color-mix(in oklab, var(--accent) 15%, transparent)" : "transparent",
      color: active ? "var(--accent)" : "var(--text-dim)",
      transition: "all .12s ease"
    }}>{children}</button>
  );
}

/* ----------------------------- sparkline ------------------------------- */
function Sparkline({ data, width, height, color, fill }) {
  const w = width || 120, h = height || 28;
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (w - 2) + 1;
    const y = h - 2 - ((v - min) / range) * (h - 4);
    return [x, y];
  });
  const line = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = line + ` L${(w - 1).toFixed(1)} ${h - 1} L1 ${h - 1} Z`;
  const c = color || "var(--accent)";
  return (
    <svg width={w} height={h} style={{ display: "block", overflow: "visible" }}>
      {fill && <path d={area} fill={c} opacity="0.10" />}
      <path d={line} fill="none" stroke={c} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2" fill={c} />
    </svg>
  );
}

/* small section header used across panels */
function PanelHead({ kicker, title, right }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
      <div>
        {kicker && <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: ".14em", color: "var(--text-faint)", textTransform: "uppercase", marginBottom: 4 }}>{kicker}</div>}
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: "-.01em", color: "var(--text)" }}>{title}</h2>
      </div>
      {right}
    </div>
  );
}

Object.assign(window, {
  fmtMillions, fmtUSDFull, fmtShares, fmtPct, timeAgo, fmtDate,
  TypeTag, ChangeBadge, VerifiedDot, LayerDot, Chip, Sparkline, PanelHead
});
