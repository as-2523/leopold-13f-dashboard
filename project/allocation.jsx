/* Allocation visualization: squarified treemap + sector bar + donut.
   Color modes: by thesis layer, by long/short, by change type. */

/* ---- squarified treemap layout (Bruls/Huizing/van Wijk) ---- */
function _worst(row, side) {
  let sum = 0, max = -Infinity, min = Infinity;
  for (const r of row) { sum += r._a; if (r._a > max) max = r._a; if (r._a < min) min = r._a; }
  const s2 = sum * sum, side2 = side * side;
  return Math.max((side2 * max) / s2, s2 / (side2 * min));
}
function squarify(items, X, Y, W, H) {
  const total = items.reduce((s, it) => s + it.value, 0) || 1;
  const nodes = items.map(it => ({ ...it, _a: (it.value / total) * W * H }));
  const out = [];
  let x = X, y = Y, w = W, h = H, i = 0;
  while (i < nodes.length) {
    const side = Math.min(w, h);
    let row = [nodes[i]];
    let best = _worst(row, side);
    let j = i + 1;
    while (j < nodes.length) {
      const cand = row.concat(nodes[j]);
      const wr = _worst(cand, side);
      if (wr > best) break;
      row = cand; best = wr; j++;
    }
    const sum = row.reduce((s, r) => s + r._a, 0);
    if (w <= h) {
      const stripH = sum / w; let cx = x;
      for (const r of row) { const cw = r._a / stripH; out.push({ ...r, x: cx, y, w: cw, h: stripH }); cx += cw; }
      y += stripH; h -= stripH;
    } else {
      const stripW = sum / h; let cy = y;
      for (const r of row) { const ch = r._a / stripW; out.push({ ...r, x, y: cy, w: stripW, h: ch }); cy += ch; }
      x += stripW; w -= stripW;
    }
    i = j;
  }
  return out;
}

function colorFor(h, mode) {
  if (mode === "longshort") {
    return h.type === "PUT" ? "var(--down)" : (h.type === "CALL" ? "var(--up)" : "var(--accent)");
  }
  if (mode === "change") {
    const m = { NEW: "var(--accent)", INCREASED: "var(--up)", DECREASED: "var(--down)", HELD: "var(--text-faint)" };
    return m[h.change] || "var(--text-faint)";
  }
  return window.LAYERS[h.layer] ? window.LAYERS[h.layer].color : "var(--text-faint)";
}

function Treemap({ holdings, colorMode, onPick, active }) {
  const W = 760, H = 360;
  const items = [...holdings].sort((a, b) => b.value - a.value);
  const cells = squarify(items, 0, 0, W, H);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      {cells.map((c) => {
        const col = colorFor(c, colorMode);
        const big = c.w > 56 && c.h > 30;
        const med = c.w > 38 && c.h > 18;
        const isActive = active === c.ticker;
        return (
          <g key={c.ticker} onClick={() => onPick && onPick(c)} style={{ cursor: "pointer" }}>
            <rect x={c.x + 1} y={c.y + 1} width={Math.max(0, c.w - 2)} height={Math.max(0, c.h - 2)}
              rx="3" fill={col} fillOpacity={c.type === "PUT" ? 0.30 : 0.85}
              stroke={isActive ? "var(--text)" : col} strokeOpacity={isActive ? 1 : 0.5}
              strokeWidth={isActive ? 2 : 1} />
            {med && (
              <text x={c.x + 7} y={c.y + 16} fill={c.type === "PUT" ? col : "#0a0e14"}
                style={{ fontFamily: "var(--mono)", fontSize: big ? 13 : 11, fontWeight: 700 }}>
                {c.ticker.replace(".C", "")}{c.type !== "STOCK" ? "·" + (c.type === "PUT" ? "P" : "C") : ""}
              </text>
            )}
            {big && (
              <text x={c.x + 7} y={c.y + 31} fill={c.type === "PUT" ? "var(--text-dim)" : "rgba(10,14,20,.7)"}
                style={{ fontFamily: "var(--mono)", fontSize: 10, fontWeight: 600 }}>
                {window.fmtMillions(c.value)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function SectorBar({ holdings, onPick }) {
  const bySector = {};
  holdings.forEach(h => {
    if (!bySector[h.sector]) bySector[h.sector] = { sector: h.sector, value: 0, items: [] };
    bySector[h.sector].value += h.value;
    bySector[h.sector].items.push(h);
  });
  const rows = Object.values(bySector).sort((a, b) => b.value - a.value);
  const max = Math.max(...rows.map(r => r.value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      {rows.map(r => {
        const isShort = r.sector.startsWith("Hedge");
        const col = isShort ? "var(--down)" : "var(--accent)";
        return (
          <div key={r.sector} style={{ display: "grid", gridTemplateColumns: "150px 1fr 78px", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 12, color: "var(--text-dim)", textAlign: "right", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.sector}</div>
            <div style={{ height: 22, background: "var(--panel-2)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: (r.value / max * 100) + "%", height: "100%", background: col, opacity: isShort ? 0.45 : 0.85, borderRadius: 4, transition: "width .4s ease" }} />
            </div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--text)", textAlign: "right" }}>{window.fmtMillions(r.value)}</div>
          </div>
        );
      })}
    </div>
  );
}

function Donut({ holdings }) {
  const byLayer = {};
  holdings.forEach(h => {
    const k = h.layer;
    if (!byLayer[k]) byLayer[k] = 0;
    byLayer[k] += h.value;
  });
  const total = Object.values(byLayer).reduce((s, v) => s + v, 0);
  const entries = Object.entries(byLayer).sort((a, b) => b[1] - a[1]);
  let acc = 0;
  const R = 120, r = 74, cx = 140, cy = 140;
  const segs = entries.map(([layer, val]) => {
    const frac = val / total;
    const a0 = acc * 2 * Math.PI - Math.PI / 2;
    acc += frac;
    const a1 = acc * 2 * Math.PI - Math.PI / 2;
    const large = frac > 0.5 ? 1 : 0;
    const p = (ang, rad) => [cx + rad * Math.cos(ang), cy + rad * Math.sin(ang)];
    const [x0, y0] = p(a0, R), [x1, y1] = p(a1, R), [x2, y2] = p(a1, r), [x3, y3] = p(a0, r);
    return { layer, val, frac, d: `M${x0} ${y0} A${R} ${R} 0 ${large} 1 ${x1} ${y1} L${x2} ${y2} A${r} ${r} 0 ${large} 0 ${x3} ${y3} Z`, color: window.LAYERS[layer].color };
  });
  return (
    <div style={{ display: "flex", gap: 22, alignItems: "center", flexWrap: "wrap" }}>
      <svg viewBox="0 0 280 280" style={{ width: 220, height: 220, flexShrink: 0 }}>
        {segs.map(s => <path key={s.layer} d={s.d} fill={s.color} fillOpacity={s.layer === "shorts" ? 0.4 : 0.85} stroke="var(--panel)" strokeWidth="1.5" />)}
        <text x="140" y="132" textAnchor="middle" style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 700, fill: "var(--text)" }}>{window.fmtMillions(total)}</text>
        <text x="140" y="152" textAnchor="middle" style={{ fontFamily: "var(--mono)", fontSize: 10, fill: "var(--text-faint)", letterSpacing: ".1em" }}>GROSS BOOK</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, minWidth: 180 }}>
        {segs.map(s => (
          <div key={s.layer} style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color, opacity: s.layer === "shorts" ? 0.5 : 1, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "var(--text-dim)", flex: 1 }}>{window.LAYERS[s.layer].label}</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--text)" }}>{(s.frac * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { Treemap, SectorBar, Donut });
