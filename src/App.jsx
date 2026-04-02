import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ── SMOOTHING SPLINE ──────────────────────────────────────────────────────────
// pts: [{x,y}] in log-log space
// lambda 0 = interpolating, 1 = near-linear
function smoothingSpline(pts, lambda) {
  // 1. Deduplicate: merge points with identical x by averaging y (avoids h=0)
  const sorted = [...pts].sort((a, b) => a.x - b.x);
  const deduped = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    let sumY = 0;
    while (j < sorted.length && Math.abs(sorted[j].x - sorted[i].x) < 1e-10) {
      sumY += sorted[j].y; j++;
    }
    deduped.push({ x: sorted[i].x, y: sumY / (j - i) });
    i = j;
  }

  const n = deduped.length;
  if (n < 2) return deduped;
  if (n === 2) {
    const res = [];
    for (let k = 0; k <= 20; k++) {
      const t = k / 20;
      res.push({
        x: deduped[0].x + t * (deduped[1].x - deduped[0].x),
        y: deduped[0].y + t * (deduped[1].y - deduped[0].y)
      });
    }
    return res;
  }

  const x = deduped.map(p => p.x);
  const y = deduped.map(p => p.y);

  // h[i] = x[i+1] - x[i], guaranteed > 0 after dedup
  const h = [];
  for (let i = 0; i < n - 1; i++) h.push(Math.max(x[i + 1] - x[i], 1e-10));

  // alpha controls smoothing: 0=interpolate, large=smooth
  // Map slider [0,1] -> [0, 1e5] exponentially
  const lam = Math.max(0, Math.min(1 - 1e-9, lambda));
  const alpha = lam < 1e-9 ? 0 : Math.pow(10, lam * 7 - 2); // 0.01 .. 1e5

  const m = n - 2;
  if (m < 1) {
    // Only 2 unique points after dedup
    const res = [];
    const nO = 40;
    for (let k = 0; k <= nO; k++) {
      const t = k / nO;
      res.push({ x: x[0] + t * (x[1] - x[0]), y: y[0] + t * (y[1] - y[0]) });
    }
    return res;
  }

  // Build symmetric tridiagonal system for natural smoothing spline
  // diag[i]  = (h[i]+h[i+1])/3  + alpha*(1/h[i] + 1/h[i+1])
  // upper[i] = h[i+1]/6          - alpha/h[i+1]
  // rhs[i]   = second divided difference of y
  const diag = new Float64Array(m);
  const upper = new Float64Array(m);
  const rhs = new Float64Array(m);
  for (let i = 0; i < m; i++) {
    const hi = h[i], hi1 = h[i + 1];
    diag[i] = (hi + hi1) / 3 + alpha * (1 / hi + 1 / hi1);
    upper[i] = hi1 / 6 - alpha / hi1;
    rhs[i] = (y[i + 2] - y[i + 1]) / hi1 - (y[i + 1] - y[i]) / hi;
  }

  // Thomas algorithm (tridiagonal solver)
  const cp = new Float64Array(m), dp = new Float64Array(m);
  cp[0] = upper[0] / diag[0];
  dp[0] = rhs[0] / diag[0];
  for (let i = 1; i < m; i++) {
    const denom = diag[i] - upper[i - 1] * cp[i - 1];
    if (Math.abs(denom) < 1e-14) { cp[i] = 0; dp[i] = 0; continue; }
    cp[i] = i < m - 1 ? upper[i] / denom : 0;
    dp[i] = (rhs[i] - upper[i - 1] * dp[i - 1]) / denom;
  }

  // Back substitution -> second derivatives M (natural BC: M[0]=M[n-1]=0)
  const M = new Float64Array(n);
  M[m] = dp[m - 1];
  for (let i = m - 2; i >= 0; i--) M[i + 1] = dp[i] - cp[i] * M[i + 2];

  // Evaluate spline at dense uniform grid
  const nOut = Math.max(200, n * 12);
  const result = [];
  let seg = 0;
  for (let k = 0; k <= nOut; k++) {
    const xq = x[0] + (k / nOut) * (x[n - 1] - x[0]);
    // Advance segment pointer
    while (seg < n - 2 && xq > x[seg + 1] + 1e-12) seg++;
    const hi = h[seg];
    const a = (x[seg + 1] - xq) / hi;
    const b = (xq - x[seg]) / hi;
    const yq = a * y[seg] + b * y[seg + 1]
      + ((a * a * a - a) * M[seg] + (b * b * b - b) * M[seg + 1]) * hi * hi / 6;
    // Guard: clamp to finite (numerical blowup safety)
    if (isFinite(yq)) result.push({ x: xq, y: yq });
  }
  return result;
}

// ── PARSE ─────────────────────────────────────────────────────────────────────
function relaxJSON(text) {
  return text
    .replace(/\/\/.*$/gm, "")
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
}
function extractPoints(parsed) {
  const arr = Array.isArray(parsed) ? parsed
    : parsed.points || parsed.data || parsed.mm || parsed.tc
    || parsed.single || Object.values(parsed).find(v => Array.isArray(v));
  if (!arr) return null;
  if (arr[0]?.x !== undefined) return arr;
  if (Array.isArray(arr[0])) return arr.map(r => ({ x: r[0], y: r[1] }));
  return null;
}
function parseInput(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const pts = extractPoints(JSON.parse(trimmed));
      if (pts) return { ok: true, data: pts };
    } catch { }
    try {
      const pts = extractPoints(JSON.parse(relaxJSON(trimmed)));
      if (pts) return { ok: true, data: pts };
      return { ok: false, error: "Parseado pero sin array {x,y} reconocible." };
    } catch (e) {
      return { ok: false, error: "JSON/JS inválido: " + e.message };
    }
  }
  const lines = trimmed.split(/\n/).filter(l => l.trim() && !l.startsWith("#") && !l.match(/^[a-z]/i));
  const data = lines.map(l => {
    const p = l.split(/[,;\t\s]+/).map(Number).filter(n => !isNaN(n));
    return p.length >= 2 ? { x: p[0], y: p[1] } : null;
  }).filter(Boolean);
  if (data.length >= 2) return { ok: true, data };
  return { ok: false, error: "No se pudo parsear. Usa JSON [{x,y}] o CSV." };
}

// ── COLORS ────────────────────────────────────────────────────────────────────
const SEG_COLORS = ["#1d6fce", "#d85a30", "#0ea760", "#7c3aed", "#c77c00", "#be185d"];
const SEG_FILLS = ["rgba(29,111,206,0.08)", "rgba(216,90,48,0.08)", "rgba(14,167,96,0.08)",
  "rgba(124,58,237,0.08)", "rgba(199,124,0,0.08)", "rgba(190,24,93,0.08)"];
const SEG_BORDERS = ["rgba(29,111,206,0.5)", "rgba(216,90,48,0.5)", "rgba(14,167,96,0.5)",
  "rgba(124,58,237,0.5)", "rgba(199,124,0,0.5)", "rgba(190,24,93,0.5)"];

// ── LOG-LOG HELPERS ───────────────────────────────────────────────────────────
function toLogLog(pts) {
  return pts.filter(p => p.x > 0 && p.y > 0)
    .map(p => ({ x: Math.log10(p.x), y: Math.log10(p.y) }));
}
function toLinear(pts) {
  return pts.map(p => ({ x: +Math.pow(10, p.x).toFixed(6), y: +Math.pow(10, p.y).toFixed(6) }));
}

// ── BUILD OUTPUT ──────────────────────────────────────────────────────────────
// selections: [{xMin,xMax,yMin,yMax,lambda}]
// rawPts sorted by x
// Returns: { segments, gapPts, outputPts }
function buildOutput(rawPts, selections) {
  if (!rawPts?.length || !selections.length) return null;

  const sorted = [...rawPts].sort((a, b) => a.x - b.x);

  // For each selection, gather raw points inside the box
  const segRaw = selections.map(sel =>
    sorted.filter(p => p.x >= sel.xMin && p.x <= sel.xMax && p.y >= sel.yMin && p.y <= sel.yMax)
  );

  // Determine which raw points are NOT in any selection → gap points
  const inAnySelection = new Set();
  segRaw.forEach((seg, si) => {
    const sel = selections[si];
    sorted.forEach((p, pi) => {
      if (p.x >= sel.xMin && p.x <= sel.xMax && p.y >= sel.yMin && p.y <= sel.yMax)
        inAnySelection.add(pi);
    });
  });
  const gapPts = sorted.filter((_, pi) => !inAnySelection.has(pi));

  // Smooth each segment in log-log
  const smoothedSegs = segRaw.map((seg, si) => {
    if (seg.length < 2) return seg;
    const ll = toLogLog(seg);
    const smoothed = smoothingSpline(ll, selections[si].lambda);
    return toLinear(smoothed);
  });

  // Merge: all smoothed segments + gap pts, sorted by x
  const allOutput = [
    ...smoothedSegs.flat(),
    ...gapPts,
  ].sort((a, b) => a.x - b.x);

  return { segRaw, smoothedSegs, gapPts, outputPts: allOutput };
}

// ── RENDERER ──────────────────────────────────────────────────────────────────
function logTicks(mn, mx) {
  const t = []; let v = Math.pow(10, Math.floor(Math.log10(mn)));
  while (v <= mx * 1.01) { for (const m of [1, 2, 5]) { const r = v * m; if (r >= mn * .99 && r <= mx * 1.01) t.push(r); } v *= 10; }
  return [...new Set(t)].sort((a, b) => a - b);
}
function fmtN(v) {
  if (v >= 1000) return (v / 1000).toFixed(0) + "k";
  if (v >= 1) return v % 1 === 0 ? String(v) : parseFloat(v.toFixed(2));
  return parseFloat(v.toFixed(4));
}

function renderToCanvas(canvas, rawPts, selections, output, opts = {}) {
  const { dpr = 1, forExport = false, xRange = null, yRange = null, dragBox = null, hoveredPtIdx = null } = opts;
  if (!canvas || !rawPts?.length) return null;

  const W = canvas.width, H = canvas.height, s = dpr;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, W, H);

  const PAD = { top: 28 * s, right: 24 * s, bottom: 52 * s, left: 72 * s };
  const PW = W - PAD.left - PAD.right, PH = H - PAD.top - PAD.bottom;

  const allX = rawPts.map(p => p.x), allY = rawPts.map(p => p.y);
  const xMin = xRange ? xRange[0] : Math.min(...allX) * 0.5;
  const xMax = xRange ? xRange[1] : Math.max(...allX) * 2;
  const yMin = yRange ? yRange[0] : Math.min(...allY) * 0.3;
  const yMax = yRange ? yRange[1] : Math.max(...allY) * 3;
  const lxMin = Math.log10(xMin), lxMax = Math.log10(xMax);
  const lyMin = Math.log10(yMin), lyMax = Math.log10(yMax);

  const toX = v => PAD.left + (Math.log10(Math.max(v, xMin)) - lxMin) / (lxMax - lxMin) * PW;
  const toY = v => PAD.top + PH - (Math.log10(Math.max(v, yMin)) - lyMin) / (lyMax - lyMin) * PH;
  const fromX = sx => Math.pow(10, lxMin + (sx - PAD.left) / PW * (lxMax - lxMin));
  const fromY = sy => Math.pow(10, lyMin + (PH - (sy - PAD.top)) / PH * (lyMax - lyMin));

  // BG
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#fafbfc"; ctx.fillRect(PAD.left, PAD.top, PW, PH);

  // Grid
  ctx.save(); ctx.strokeStyle = "#e8ecf0"; ctx.lineWidth = 0.75 * s;
  for (const v of logTicks(xMin, xMax)) { const x = toX(v); ctx.beginPath(); ctx.moveTo(x, PAD.top); ctx.lineTo(x, H - PAD.bottom); ctx.stroke(); }
  for (const v of logTicks(yMin, yMax)) { const y = toY(v); ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(W - PAD.right, y); ctx.stroke(); }
  ctx.restore();
  ctx.save(); ctx.strokeStyle = "#d0d7de"; ctx.lineWidth = 1 * s;
  for (let e = Math.floor(lxMin); e <= Math.ceil(lxMax); e++) { const x = toX(Math.pow(10, e)); if (x < PAD.left || x > W - PAD.right) continue; ctx.beginPath(); ctx.moveTo(x, PAD.top); ctx.lineTo(x, H - PAD.bottom); ctx.stroke(); }
  for (let e = Math.floor(lyMin); e <= Math.ceil(lyMax); e++) { const y = toY(Math.pow(10, e)); if (y < PAD.top || y > H - PAD.bottom) continue; ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(W - PAD.right, y); ctx.stroke(); }
  ctx.restore();
  ctx.save(); ctx.strokeStyle = "#b0bac6"; ctx.lineWidth = 1.5 * s; ctx.strokeRect(PAD.left, PAD.top, PW, PH); ctx.restore();

  // Tick labels
  ctx.save(); ctx.fillStyle = "#7a8899"; ctx.font = `${10 * s}px 'DM Mono',monospace`;
  ctx.textAlign = "center";
  for (const v of logTicks(xMin, xMax)) { const x = toX(v); if (x < PAD.left + 2 || x > W - PAD.right - 2) continue; ctx.fillText(fmtN(v), x, H - PAD.bottom + 14 * s); }
  ctx.textAlign = "right";
  for (const v of logTicks(yMin, yMax)) { const y = toY(v); if (y < PAD.top + 2 || y > H - PAD.bottom - 2) continue; ctx.fillText(fmtN(v), PAD.left - 6 * s, y + 3.5 * s); }
  ctx.fillStyle = "#4a5568"; ctx.font = `600 ${11 * s}px 'DM Sans',system-ui`; ctx.textAlign = "center";
  ctx.fillText("Current (A)", PAD.left + PW / 2, H - 8 * s);
  ctx.translate(15 * s, PAD.top + PH / 2); ctx.rotate(-Math.PI / 2); ctx.fillText("Time (s)", 0, 0);
  ctx.restore();

  // Clip
  ctx.save(); ctx.beginPath(); ctx.rect(PAD.left, PAD.top, PW, PH); ctx.clip();

  // Raw points + line
  ctx.save();
  ctx.setLineDash([4 * s, 3 * s]); ctx.strokeStyle = "rgba(100,116,139,0.25)"; ctx.lineWidth = 1.2 * s;
  let rawFirst = true;
  for (const p of rawPts) {
    if (!isFinite(p.x) || !isFinite(p.y) || p.x <= 0 || p.y <= 0) continue;
    const x = toX(p.x), y = toY(p.y);
    if (rawFirst) { ctx.beginPath(); ctx.moveTo(x, y); rawFirst = false; } else ctx.lineTo(x, y);
  }
  ctx.stroke(); ctx.setLineDash([]);
  for (const p of rawPts) {
    if (!isFinite(p.x) || !isFinite(p.y) || p.x <= 0 || p.y <= 0) continue;
    ctx.beginPath(); ctx.arc(toX(p.x), toY(p.y), 3.5 * s, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(100,116,139,0.4)"; ctx.fill();
  }
  ctx.restore();

  // Selection boxes + smoothed curves
  if (selections.length) {
    selections.forEach((sel, si) => {
      const color = SEG_COLORS[si % SEG_COLORS.length];
      const fill = SEG_FILLS[si % SEG_FILLS.length];
      const border = SEG_BORDERS[si % SEG_BORDERS.length];

      // Box
      const bx1 = toX(sel.xMin), bx2 = toX(sel.xMax);
      const by1 = toY(sel.yMax), by2 = toY(sel.yMin); // note: y is flipped
      ctx.save();
      ctx.fillStyle = fill;
      ctx.fillRect(bx1, by1, bx2 - bx1, by2 - by1);
      ctx.strokeStyle = border; ctx.lineWidth = 1.5 * s; ctx.setLineDash([5 * s, 3 * s]);
      ctx.strokeRect(bx1, by1, bx2 - bx1, by2 - by1);
      ctx.setLineDash([]);
      // Label
      ctx.fillStyle = color; ctx.font = `700 ${11 * s}px 'DM Sans',system-ui`; ctx.textAlign = "left";
      ctx.fillText(`Seg ${si + 1}`, bx1 + 5 * s, by1 + 14 * s);
      ctx.restore();

      // Smoothed curve — draw ALL points (clip rect handles viewport cutoff)
      const seg = output?.smoothedSegs?.[si];
      if (seg?.length) {
        ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2.2 * s;
        let started = false;
        for (const p of seg) {
          // Skip NaN/Inf/negative (can't take log)
          if (!isFinite(p.x) || !isFinite(p.y) || p.x <= 0 || p.y <= 0) continue;
          const sx = toX(p.x), sy = toY(p.y);
          if (!started) { ctx.moveTo(sx, sy); started = true; }
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      }
    });
  }

  // Gap points highlight
  if (output?.gapPts?.length) {
    output.gapPts.forEach(p => {
      ctx.beginPath(); ctx.arc(toX(p.x), toY(p.y), 5 * s, 0, Math.PI * 2);
      ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 1.5 * s; ctx.stroke();
    });
  }

  // Hovered / dragging raw point highlight
  if (hoveredPtIdx !== null && rawPts[hoveredPtIdx]) {
    const p = rawPts[hoveredPtIdx];
    if (p.x > 0 && p.y > 0) {
      const isDragging = opts.isDraggingPt;
      ctx.beginPath();
      ctx.arc(toX(p.x), toY(p.y), isDragging ? 8 * s : 6 * s, 0, Math.PI * 2);
      ctx.fillStyle = isDragging ? "rgba(29,111,206,0.15)" : "rgba(29,111,206,0.2)";
      ctx.fill();
      ctx.strokeStyle = "#1d6fce";
      ctx.lineWidth = isDragging ? 2 * s : 1.5 * s;
      ctx.stroke();
      // Crosshair lines while dragging
      if (isDragging) {
        ctx.save();
        ctx.strokeStyle = "rgba(29,111,206,0.3)"; ctx.lineWidth = 0.75 * s; ctx.setLineDash([4 * s, 3 * s]);
        ctx.beginPath(); ctx.moveTo(toX(p.x), PAD.top); ctx.lineTo(toX(p.x), H - PAD.bottom); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(PAD.left, toY(p.y)); ctx.lineTo(W - PAD.right, toY(p.y)); ctx.stroke();
        ctx.restore();
      }
    }
  }

  // Drag box (in progress)
  if (dragBox) {
    const dx1 = toX(dragBox.xMin), dx2 = toX(dragBox.xMax);
    const dy1 = toY(dragBox.yMax), dy2 = toY(dragBox.yMin);
    ctx.save();
    ctx.fillStyle = "rgba(29,111,206,0.06)";
    ctx.fillRect(dx1, dy1, dx2 - dx1, dy2 - dy1);
    ctx.strokeStyle = "rgba(29,111,206,0.7)"; ctx.lineWidth = 1.5 * s; ctx.setLineDash([5 * s, 3 * s]);
    ctx.strokeRect(dx1, dy1, dx2 - dx1, dy2 - dy1);
    ctx.restore();
  }

  ctx.restore();

  // Export legend
  if (forExport && selections.length) {
    const lx = PAD.left + 12 * s, ly = PAD.top + 16 * s;
    ctx.save(); ctx.font = `${12 * s}px 'DM Sans',system-ui`;
    selections.forEach((_, si) => {
      const color = SEG_COLORS[si % SEG_COLORS.length];
      ctx.fillStyle = color; ctx.fillRect(lx, ly + si * 20 * s, 20 * s, 3 * s);
      ctx.fillStyle = "#4a5568"; ctx.fillText(`Segment ${si + 1}`, lx + 26 * s, ly + si * 20 * s + 4 * s);
    });
    ctx.restore();
  }

  return { toX, toY, fromX, fromY, PAD, PW, PH, xMin, xMax, yMin, yMax, lxMin, lxMax, lyMin, lyMax };
}

// ── SAMPLE ────────────────────────────────────────────────────────────────────
const SAMPLE = `{
  "name": "60A",
  "points": [
    { "x": 27, "y": 10000 },
    { "x": 28, "y": 5015 },
    { "x": 29, "y": 711 },
    { "x": 30, "y": 314 },
    { "x": 31, "y": 216 },
    { "x": 32, "y": 148 },
    { "x": 33, "y": 115 },
    { "x": 34, "y": 85 },
    { "x": 35, "y": 78 },
    { "x": 36, "y": 65 },
    { "x": 37, "y": 53 },
    { "x": 38, "y": 47 },
    { "x": 39, "y": 42 },
    { "x": 40, "y": 37 },
    { "x": 41, "y": 32 },
    { "x": 42, "y": 29 },
    { "x": 43, "y": 24 },
    { "x": 46, "y": 19 },
    { "x": 47, "y": 17 },
    { "x": 49, "y": 15 },
    { "x": 50, "y": 14 },
    { "x": 51, "y": 13 },
    { "x": 53, "y": 12 },
    { "x": 57, "y": 9.6 },
    { "x": 59, "y": 8.4 },
    { "x": 61, "y": 7.6 },
    { "x": 65, "y": 6.6 },
    { "x": 68, "y": 5.8 },
    { "x": 71, "y": 5 },
    { "x": 73, "y": 4.7 },
    { "x": 81, "y": 3.7 },
    { "x": 88, "y": 3 },
    { "x": 94, "y": 2.7 },
    { "x": 98, "y": 2.4 },
    { "x": 100, "y": 2.3 },
    { "x": 101, "y": 0.015 },
    { "x": 105, "y": 0.011 },
    { "x": 108, "y": 0.0094 },
    { "x": 115, "y": 0.0079 },
    { "x": 120, "y": 0.0068 },
    { "x": 137, "y": 0.005 },
    { "x": 160, "y": 0.0041 },
    { "x": 200, "y": 0.0032 },
    { "x": 240, "y": 0.003 },
    { "x": 332, "y": 0.0029 },
    { "x": 1233, "y": 0.0026 },
    { "x": 9966, "y": 0.0021 }
  ]
}`;

// ── COMPONENT ─────────────────────────────────────────────────────────────────
export default function CurveSmoothingUtility() {
  const [inputText, setInputText] = useState(SAMPLE);
  const [parseError, setParseError] = useState(null);
  const [rawPts, setRawPts] = useState(null);
  const [selections, setSelections] = useState([]); // [{xMin,xMax,yMin,yMax,lambda,id}]
  const [history, setHistory] = useState([{ selections: [], rawPts: null }]); // stack of {selections, rawPts}
  const [historyIdx, setHistoryIdx] = useState(0);   // current position in history
  const [dragging, setDragging] = useState(null); // {startX,startY} in data coords
  const [dragBox, setDragBox] = useState(null); // live drag rect in data coords
  const [xRange, setXRange] = useState(null);
  const [yRange, setYRange] = useState(null);
  const [panning, setPanning] = useState(null); // {startX, startY, startXRange, startYRange}
  const [hoveredPt, setHoveredPt] = useState(null); // {idx, x, y, screenX, screenY}
  const [draggingPt, setDraggingPt] = useState(null); // {idx} — index into rawPts being dragged
  const [copied, setCopied] = useState(false);
  const [curveName, setCurveName] = useState("curve_mm");
  const [pngMsg, setPngMsg] = useState(null);
  const [nextId, setNextId] = useState(1);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const stateRef = useRef(null);



  const output = useMemo(() => buildOutput(rawPts, selections), [rawPts, selections]);

  const handleParse = useCallback(() => {
    const res = parseInput(inputText);
    if (res.ok) {
      const sorted = res.data.sort((a, b) => a.x - b.x).map((p, i) => ({ ...p, _id: i }));
      setRawPts(sorted);
      setParseError(null);
      setSelections([]);
      setHistory([{ selections: [], rawPts: sorted }]);
      setHistoryIdx(0);
      setXRange(null);
      setYRange(null);
    } else {
      setParseError(res.error);
    }
  }, [inputText]);

  useEffect(() => { handleParse(); }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current, cont = containerRef.current;
    if (!canvas || !cont) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = cont.clientWidth * dpr; canvas.height = cont.clientHeight * dpr;
    canvas.style.width = cont.clientWidth + "px"; canvas.style.height = cont.clientHeight + "px";
    stateRef.current = renderToCanvas(canvas, rawPts, selections, output,
      { dpr, xRange, yRange, dragBox, hoveredPtIdx: hoveredPt?.idx ?? null, isDraggingPt: !!draggingPt });
  }, [rawPts, selections, output, xRange, yRange, dragBox, hoveredPt, draggingPt]);

  useEffect(() => {
    redraw();
    const ro = new ResizeObserver(redraw);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [redraw]);

  // ── MOUSE: drag to select ──
  const getDataCoords = useCallback((e) => {
    const s = stateRef.current, canvas = canvasRef.current;
    if (!s || !canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / rect.width;
    const mx = (e.clientX - rect.left) * dpr;
    const my = (e.clientY - rect.top) * dpr;
    const { PAD, PW, PH } = s;
    if (mx < PAD.left || mx > PAD.left + PW || my < PAD.top || my > PAD.top + PH) return null;
    return { x: s.fromX(mx), y: s.fromY(my) };
  }, []);

  // Find nearest raw point to a mouse event (returns {id, dist} or null)
  const findNearestRawPt = useCallback((e) => {
    const s = stateRef.current, canvas = canvasRef.current;
    if (!s || !canvas || !rawPts) return null;
    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / rect.width;
    const mx = (e.clientX - rect.left) * dpr;
    const my = (e.clientY - rect.top) * dpr;
    const HIT = 16 * dpr;
    let bestId = null, bestDist = Infinity;
    rawPts.forEach((p) => {
      if (p.x <= 0 || p.y <= 0) return;
      const dist = Math.hypot(mx - s.toX(p.x), my - s.toY(p.y));
      if (dist < bestDist) { bestDist = dist; bestId = p._id; }
    });
    return bestId !== null && bestDist < HIT ? { id: bestId, dist: bestDist } : null;
  }, [rawPts]);

  const handleMouseDown = useCallback((e) => {
    // Middle button → pan (hold and drag)
    if (e.button === 1) {
      e.preventDefault();
      const s = stateRef.current;
      if (!s || !rawPts) return;
      const allX = rawPts.map(p => p.x), allY = rawPts.map(p => p.y);
      const curXRange = xRange || [Math.min(...allX) * 0.5, Math.max(...allX) * 2];
      const curYRange = yRange || [Math.min(...allY) * 0.3, Math.max(...allY) * 3];
      setPanning({ startX: e.clientX, startY: e.clientY, startXRange: curXRange, startYRange: curYRange });
      return;
    }
    if (e.button !== 0) return;
    e.preventDefault();

    // 1st click on grabbed point → FIX it at cursor position
    if (draggingPt) {
      const coords = getDataCoords(e);
      if (coords) {
        const newX = Math.max(coords.x, 0.01);
        const newY = Math.max(coords.y, 1e-6);
        setRawPts(prev => {
          const updated = prev.map(p => p._id === draggingPt.id ? { ...p, x: newX, y: newY } : p);
          const sorted = [...updated].sort((a, b) => a.x - b.x);
          // Commit to history
          setSelections(sels => {
            setHistory(h => {
              const trimmed = h.slice(0, historyIdxRef.current + 1);
              setHistoryIdx(trimmed.length);
              return [...trimmed, { selections: sels, rawPts: sorted }];
            });
            return sels;
          });
          return sorted;
        });
      }
      setDraggingPt(null);
      setHoveredPt(null);
      return;
    }

    // Click near a raw point → GRAB it
    const nearest = findNearestRawPt(e);
    if (nearest) {
      setDraggingPt({ id: nearest.id });
      setHoveredPt(null);
      return;
    }

    // Click in empty space:
    const coords = getDataCoords(e);
    if (!coords) return;

    if (dragging) {
      // 2nd click → CONFIRM selection with opposite corner
      const box = {
        xMin: Math.min(dragging.x, coords.x),
        xMax: Math.max(dragging.x, coords.x),
        yMin: Math.min(dragging.y, coords.y),
        yMax: Math.max(dragging.y, coords.y),
      };
      const s = stateRef.current;
      if (s) {
        const pxW = Math.abs(s.toX(box.xMax) - s.toX(box.xMin));
        const pxH = Math.abs(s.toY(box.yMin) - s.toY(box.yMax));
        if (pxW > 10 && pxH > 10) {
          const inside = rawPts?.filter(p =>
            p.x >= box.xMin && p.x <= box.xMax &&
            p.y >= box.yMin && p.y <= box.yMax
          );
          if (inside?.length >= 2) {
            const id = nextId;
            setNextId(n => n + 1);
            const newSel = { ...box, lambda: 0.05, id };
            setSelections(prev => {
              const next = [...prev, newSel];
              setRawPts(rp => {
                setHistory(h => {
                  const trimmed = h.slice(0, historyIdxRef.current + 1);
                  setHistoryIdx(trimmed.length);
                  return [...trimmed, { selections: next, rawPts: rp }];
                });
                return rp;
              });
              return next;
            });
          }
        }
      }
      setDragging(null);
      setDragBox(null);
    } else {
      // 1st click → start drawing the box
      setDragging(coords);
      setDragBox({ xMin: coords.x, xMax: coords.x, yMin: coords.y, yMax: coords.y });
    }
  }, [getDataCoords, findNearestRawPt, draggingPt, xRange, yRange, rawPts, dragging, nextId]);

  const handleMouseMove = useCallback((e) => {
    const s = stateRef.current, canvas = canvasRef.current;
    if (!s || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / rect.width;
    const mx = (e.clientX - rect.left) * dpr;
    const my = (e.clientY - rect.top) * dpr;
    const { PAD, PW, PH } = s;
    const inPlot = mx >= PAD.left && mx <= PAD.left + PW && my >= PAD.top && my <= PAD.top + PH;

    // Grabbed point follows cursor
    if (draggingPt) {
      const coords = getDataCoords(e);
      if (coords) {
        const newX = Math.max(coords.x, 0.01);
        const newY = Math.max(coords.y, 1e-6);
        setRawPts(prev => prev.map(p => p._id === draggingPt.id ? { ...p, x: newX, y: newY } : p));
        setHoveredPt({
          id: draggingPt.id,
          x: +newX.toFixed(3),
          y: +newY.toFixed(6),
          screenX: e.clientX - rect.left,
          screenY: e.clientY - rect.top - 44,
        });
      }
      return;
    }

    // Tooltip: highlight nearest raw point
    if (!dragging && !panning && inPlot && rawPts) {
      let bestIdx = null, bestDist = Infinity;
      rawPts.forEach((p, i) => {
        if (p.x <= 0 || p.y <= 0) return;
        const dist = Math.hypot(mx - s.toX(p.x), my - s.toY(p.y));
        if (dist < bestDist) { bestDist = dist; bestIdx = i; }
      });
      if (bestIdx !== null && bestDist < 18 * dpr) {
        const p = rawPts[bestIdx];
        setHoveredPt({
          id: p._id, idx: bestIdx, x: p.x, y: p.y,
          screenX: s.toX(p.x) / dpr, screenY: s.toY(p.y) / dpr
        });
      } else {
        setHoveredPt(null);
      }
    }

    // Pan with middle button
    if (panning) {
      const s = stateRef.current;
      if (!s) return;
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const dpr = canvas.width / rect.width;
      const dxPx = (e.clientX - panning.startX) * dpr;
      const dyPx = (e.clientY - panning.startY) * dpr;
      const { lxMin, lxMax, lyMin, lyMax, PW, PH } = s;
      const dLogX = dxPx / PW * (lxMax - lxMin);
      const dLogY = dyPx / PH * (lyMax - lyMin);
      const [x0, x1] = panning.startXRange;
      const [y0, y1] = panning.startYRange;
      setXRange([
        Math.pow(10, Math.log10(x0) - dLogX),
        Math.pow(10, Math.log10(x1) - dLogX),
      ]);
      setYRange([
        Math.pow(10, Math.log10(y0) + dLogY),
        Math.pow(10, Math.log10(y1) + dLogY),
      ]);
      return;
    }
    // Box select with left button
    if (!dragging) return;
    const coords = getDataCoords(e);
    if (!coords) return;
    setDragBox({
      xMin: Math.min(dragging.x, coords.x),
      xMax: Math.max(dragging.x, coords.x),
      yMin: Math.min(dragging.y, coords.y),
      yMax: Math.max(dragging.y, coords.y),
    });
  }, [dragging, panning, draggingPt, rawPts, getDataCoords]);


  const handleMouseUp = useCallback((e) => {
    if (e.button === 1) { setPanning(null); return; }
    // Box select is now click-to-start / click-to-confirm — nothing to do on mouseUp
  }, []);

  const handleMouseLeave = useCallback(() => {
    // Cancel box draw if user leaves canvas
    if (dragging) { setDragging(null); setDragBox(null); }
    if (panning) { setPanning(null); }
    // Don't cancel draggingPt — keep point grabbed if cursor leaves chart
    if (!draggingPt) setHoveredPt(null);
  }, [dragging, panning, draggingPt]);

  // Ref to access historyIdx inside keydown closure without stale closure
  const historyIdxRef = useRef(0);
  historyIdxRef.current = historyIdx; // update ref synchronously during render

  // Ctrl+Z undo
  useEffect(() => {
    const onKeyDown = (e) => {
      // Escape → cancel active point grab, restoring last committed rawPts
      if (e.key === 'Escape') {
        // Cancel box draw
        setDragging(null);
        setDragBox(null);
        // Cancel point grab, restore last committed rawPts
        setDraggingPt(prev => {
          if (prev) {
            setHistory(h => {
              const snap = h[historyIdxRef.current] || {};
              if (snap.rawPts) setRawPts(snap.rawPts);
              return h;
            });
            setHoveredPt(null);
          }
          return null;
        });
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        setHistory(h => {
          setHistoryIdx(idx => {
            const newIdx = Math.max(0, idx - 1);
            const snap = h[newIdx] || { selections: [], rawPts: null };
            setSelections(snap.selections || []);
            if (snap.rawPts) setRawPts(snap.rawPts);
            return newIdx;
          });
          return h;
        });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Wheel zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const s = stateRef.current; if (!s || !rawPts) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / rect.width;
    const mx = (e.clientX - rect.left) * dpr;
    const my = (e.clientY - rect.top) * dpr;
    const lxM = s.lxMin + (mx - s.PAD.left) / s.PW * (s.lxMax - s.lxMin);
    const lyM = s.lyMin + (s.PH - (my - s.PAD.top)) / s.PH * (s.lyMax - s.lyMin);
    const f = e.deltaY > 0 ? 1.25 : 0.8;

    // Hard limits: zoom out max = 1e-4 .. 1e5 (100k)
    const X_MIN = 1e-4, X_MAX = 1e5;
    const Y_MIN = 1e-6, Y_MAX = 1e5;

    const newXMin = Math.pow(10, lxM - (lxM - s.lxMin) * f);
    const newXMax = Math.pow(10, lxM + (s.lxMax - lxM) * f);
    const newYMin = Math.pow(10, lyM - (lyM - s.lyMin) * f);
    const newYMax = Math.pow(10, lyM + (s.lyMax - lyM) * f);

    // Also enforce minimum visible span (zoom in limit)
    const MIN_SPAN_X = 1;     // at least 1A visible window
    const MIN_SPAN_Y = 0.001; // at least 1ms visible window

    const clampedXMin = Math.max(newXMin, X_MIN);
    const clampedXMax = Math.min(newXMax, X_MAX);
    const clampedYMin = Math.max(newYMin, Y_MIN);
    const clampedYMax = Math.min(newYMax, Y_MAX);

    // If span is too small, keep current range (block zoom in further)
    const xSpan = clampedXMax - clampedXMin;
    const ySpan = clampedYMax - clampedYMin;
    if (xSpan >= MIN_SPAN_X) setXRange([clampedXMin, clampedXMax]);
    if (ySpan >= MIN_SPAN_Y) setYRange([clampedYMin, clampedYMax]);
  }, [rawPts]);

  // Update lambda for a selection
  const updateLambda = useCallback((id, lambda) => {
    setSelections(prev => prev.map(s => s.id === id ? { ...s, lambda } : s));
  }, []);

  const removeSelection = useCallback((id) => {
    setSelections(prev => {
      const next = prev.filter(s => s.id !== id);
      setRawPts(rp => {
        setHistory(h => {
          const trimmed = h.slice(0, historyIdxRef.current + 1);
          setHistoryIdx(trimmed.length);
          return [...trimmed, { selections: next, rawPts: rp }];
        });
        return rp;
      });
      return next;
    });
  }, []);

  const handleCopyJSON = useCallback(() => {
    if (!output) return;
    const pts = output.outputPts;
    const PER_ROW = 4;
    const indent = "            ";
    const rows = [];
    for (let i = 0; i < pts.length; i += PER_ROW) {
      const chunk = pts.slice(i, i + PER_ROW);
      const rowStr = chunk.map(p => "{ x: " + p.x + ", y: " + p.y + " }").join(", ");
      rows.push(indent + rowStr + ",");
    }
    if (rows.length) rows[rows.length - 1] = rows[rows.length - 1].replace(/,$/, "");
    const lines = [
      "{",
      '  name: "' + curveName + '",',
      "  points: [",
      ...rows,
      "  ]",
      "}"
    ];
    const json = lines.join("\n");
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2200);
    });
  }, [output, curveName]);

  const handleExportTXT = useCallback(() => {
    if (!output) return;
    const pts = output.outputPts;
    const PER_ROW = 4;
    const indent = "            ";
    const rows = [];
    for (let i = 0; i < pts.length; i += PER_ROW) {
      const chunk = pts.slice(i, i + PER_ROW);
      const rowStr = chunk.map(p => "{ x: " + p.x + ", y: " + p.y + " }").join(", ");
      rows.push(indent + rowStr + ",");
    }
    if (rows.length) rows[rows.length - 1] = rows[rows.length - 1].replace(/,$/, "");
    const lines = [
      "{",
      '  name: "' + (curveName || "curve") + '",',
      "  points: [",
      ...rows,
      "  ]",
      "}"
    ];
    const txt = lines.join("\n");
    const blob = new Blob([txt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = (curveName || "curve") + ".txt";
    a.click();
    URL.revokeObjectURL(url);
    setPngMsg("Descargado"); setTimeout(() => setPngMsg(null), 2200);
  }, [output, curveName]);

  const nRaw = rawPts?.length || 0;
  const nOut = output?.outputPts?.length || 0;
  const nGap = output?.gapPts?.length || 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        html,body{margin:0;padding:0;overflow:hidden;height:100%;}
        #root{height:100%;}
        .u*{box-sizing:border-box;margin:0;padding:0;}
        .u{font-family:'DM Sans',system-ui;background:#f1f5f9;display:flex;flex-direction:column;width:100%;height:100%;overflow:hidden;color:#1e293b;}
        .u-hdr{height:46px;background:#fff;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;padding:0 16px;flex-shrink:0;}
        .u-logo{width:28px;height:28px;border-radius:7px;background:linear-gradient(135deg,#0ea760,#1d6fce);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .u-title{font-size:13px;font-weight:700;color:#1a2535;letter-spacing:-.01em;}
        .u-sub{font-size:11px;color:#94a3b8;font-family:'DM Mono',monospace;}
        .u-body{display:flex;flex:1;overflow:hidden;min-height:0;}
        .u-panel{width:272px;min-width:272px;background:#fff;border-right:1px solid #e2e8f0;display:flex;flex-direction:column;overflow-y:auto;flex-shrink:0;}
        .u-panel::-webkit-scrollbar{width:4px;}
        .u-panel::-webkit-scrollbar-thumb{background:#e2e8f0;border-radius:2px;}
        .u-sec{padding:12px 14px;border-bottom:1px solid #f1f5f9;}
        .u-stitle{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;margin-bottom:8px;}
        .u-ta{width:100%;height:130px;resize:none;padding:8px 10px;border:1.5px solid #e2e8f0;border-radius:7px;font-family:'DM Mono',monospace;font-size:10px;color:#1e293b;background:#f8fafc;outline:none;line-height:1.5;}
        .u-ta:focus{border-color:#1d6fce;}
        .u-ta.err{border-color:#ef4444;}
        .u-err{color:#ef4444;font-size:10px;font-family:'DM Mono',monospace;margin-top:4px;}
        .u-pb{margin-top:6px;width:100%;padding:7px;border:none;border-radius:7px;background:#1d6fce;color:#fff;font-size:11px;font-weight:700;font-family:'DM Sans',system-ui;cursor:pointer;transition:opacity .15s;}
        .u-pb:hover{opacity:.88;}
        .u-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;}
        .u-stat{background:#f8fafc;border:1px solid #e8edf3;border-radius:7px;padding:7px 8px;}
        .u-stat-l{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;}
        .u-stat-v{font-size:18px;font-weight:700;color:#1e293b;font-family:'DM Mono',monospace;}
        .u-segcard{border-radius:8px;border:1.5px solid #e8edf3;overflow:hidden;margin-bottom:7px;}
        .u-segcard-head{display:flex;align-items:center;gap:8px;padding:8px 10px;background:#f8fafc;}
        .u-segcard-dot{width:10px;height:10px;border-radius:3px;flex-shrink:0;}
        .u-segcard-name{font-size:11px;font-weight:700;flex:1;color:#1e293b;}
        .u-segcard-info{font-size:10px;color:#94a3b8;font-family:'DM Mono',monospace;}
        .u-segcard-del{background:none;border:none;cursor:pointer;color:#cbd5e0;font-size:14px;line-height:1;padding:0 2px;transition:color .15s;}
        .u-segcard-del:hover{color:#ef4444;}
        .u-segcard-body{padding:8px 10px;border-top:1px solid #f1f5f9;}
        .u-lambda-row{display:flex;align-items:center;gap:8px;}
        .u-lambda-lbl{font-size:10px;color:#64748b;min-width:14px;}
        .u-lambda-val{font-size:10px;font-family:'DM Mono',monospace;color:#1e293b;font-weight:500;min-width:34px;text-align:right;}
        .u-seg-empty{font-size:10px;color:#94a3b8;text-align:center;padding:10px 0;line-height:1.6;}
        .u-ni{width:100%;padding:6px 9px;border:1.5px solid #e2e8f0;border-radius:6px;font-family:'DM Mono',monospace;font-size:11px;color:#1e293b;background:#f8fafc;outline:none;margin-bottom:8px;transition:border-color .15s;}
        .u-ni:focus{border-color:#1d6fce;}
        .u-btnrow{display:flex;gap:6px;}
        .u-btn{flex:1;padding:8px 4px;border-radius:7px;border:1.5px solid #e2e8f0;background:#fff;font-size:11px;font-weight:600;color:#475569;cursor:pointer;font-family:'DM Sans',system-ui;transition:all .15s;text-align:center;}
        .u-btn:hover{border-color:#1d6fce;color:#1d6fce;background:#eff6ff;}
        .u-btn.ok{border-color:#0ea760!important;color:#0ea760!important;background:#f0fdf4!important;}
        .u-btn.primary{background:#1d6fce;color:#fff;border-color:transparent;}
        .u-btn.primary:hover{background:#1558a8;}
        .u-hint{font-size:10px;color:#94a3b8;line-height:1.5;margin-top:5px;}
        .u-right{flex:1;display:flex;flex-direction:column;min-width:0;}
        .u-toolbar{height:36px;background:#fff;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;padding:0 12px;gap:10px;flex-shrink:0;}
        .u-tb-lbl{font-size:10px;color:#94a3b8;font-family:'DM Mono',monospace;}
        .u-legend{display:flex;align-items:center;gap:10px;flex:1;overflow:hidden;}
        .u-leg{display:flex;align-items:center;gap:5px;font-size:10px;color:#64748b;white-space:nowrap;}
        .u-leg-dot{width:10px;height:3px;border-radius:1px;flex-shrink:0;}
        .u-cw{flex:1;position:relative;min-height:0;overflow:hidden;cursor:crosshair;}
        .u-hint2{position:absolute;bottom:10px;right:12px;font-size:10px;color:#94a3b8;font-family:'DM Mono',monospace;pointer-events:none;background:rgba(255,255,255,.85);padding:3px 8px;border-radius:4px;border:1px solid #e2e8f0;}
        .u-gap-badge{display:inline-flex;align-items:center;gap:4px;font-size:10px;color:#64748b;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:4px;padding:2px 7px;font-family:'DM Mono',monospace;}
      `}</style>

      <div className="u">
        <div className="u-hdr">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="u-logo">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 10 Q5 4 7 7 Q9 10 12 3" stroke="white" strokeWidth="1.75" strokeLinecap="round" fill="none" />
              </svg>
            </div>
            <span className="u-title">Visual TCC Editor</span>
          </div>
          <span className="u-sub">box select · λ per segment · log-log spline</span>
        </div>

        <div className="u-body">
          <div className="u-panel">

            {/* Input */}
            <div className="u-sec">
              <div className="u-stitle">Input data</div>
              <textarea
                className={`u-ta${parseError ? " err" : ""}`}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder={"JSON: [{x,y}, ...]\nCSV:  x,y por línea"}
                spellCheck={false}
              />
              {parseError && <div className="u-err">{parseError}</div>}
              <button className="u-pb" onClick={handleParse}>Parse &amp; Process</button>
            </div>

            {/* Stats */}
            <div className="u-sec">
              <div className="u-stitle">Statistics</div>
              <div className="u-stats">
                <div className="u-stat"><div className="u-stat-l">Raw</div><div className="u-stat-v">{nRaw}</div></div>
                <div className="u-stat"><div className="u-stat-l">Output</div><div className="u-stat-v">{nOut}</div></div>
                <div className="u-stat"><div className="u-stat-l">Gap</div><div className="u-stat-v">{nGap}</div></div>
              </div>
            </div>

            {/* Selections */}
            <div className="u-sec" style={{ flex: "1 1 auto" }}>
              <div className="u-stitle" style={{ marginBottom: 6 }}>
                Selections
                {selections.length > 0 &&
                  <span style={{ color: "#94a3b8", fontWeight: 400, textTransform: "none", fontSize: 9, marginLeft: 6 }}>
                    {selections.length} segmento{selections.length !== 1 ? "s" : ""}
                  </span>
                }
              </div>

              {selections.length === 0 && (
                <div className="u-seg-empty">
                  Arrastra un rectángulo<br />sobre la gráfica para<br />seleccionar un tramo
                </div>
              )}

              {selections.map((sel, si) => {
                const color = SEG_COLORS[si % SEG_COLORS.length];
                const inside = rawPts?.filter(p =>
                  p.x >= sel.xMin && p.x <= sel.xMax && p.y >= sel.yMin && p.y <= sel.yMax
                ).length || 0;
                return (
                  <div key={sel.id} className="u-segcard">
                    <div className="u-segcard-head">
                      <div className="u-segcard-dot" style={{ background: color }} />
                      <span className="u-segcard-name">Seg {si + 1}</span>
                      <span className="u-segcard-info">{inside} pts</span>
                      <button className="u-segcard-del" onClick={() => removeSelection(sel.id)}>×</button>
                    </div>
                    <div className="u-segcard-body">
                      <div style={{ fontSize: 10, color: "#94a3b8", fontFamily: "'DM Mono',monospace", marginBottom: 6 }}>
                        x: [{fmtN(sel.xMin)} – {fmtN(sel.xMax)}] &nbsp;
                        y: [{fmtN(sel.yMin)} – {fmtN(sel.yMax)}]
                      </div>
                      <div className="u-lambda-row">
                        <span className="u-lambda-lbl">λ</span>
                        <input type="range"
                          style={{ flex: 1, accentColor: SEG_COLORS[si % SEG_COLORS.length] }}
                          min="0" max="0.1" step="0.002"
                          value={sel.lambda}
                          onChange={e => updateLambda(sel.id, +e.target.value)} />
                        <span className="u-lambda-val">{sel.lambda.toFixed(2)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#94a3b8", fontFamily: "'DM Mono',monospace", marginTop: 3 }}>
                        <span>interpolate</span><span>smooth</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {nGap > 0 && (
                <div style={{ marginTop: 4 }}>
                  <span className="u-gap-badge">
                    <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" fill="none" stroke="#94a3b8" strokeWidth="1.5" /></svg>
                    {nGap} gap pt{nGap !== 1 ? "s" : ""} → raw (sin suavizar)
                  </span>
                </div>
              )}
            </div>

            {/* Export */}
            <div className="u-sec">
              <div className="u-stitle">Export</div>
              <input className="u-ni" value={curveName} onChange={e => setCurveName(e.target.value)} placeholder="nombre…" />
              <div className="u-btnrow">
                <button className={`u-btn${copied ? " ok" : ""}`} onClick={handleCopyJSON}>
                  {copied ? "✓ Copiado!" : "JSON flat"}
                </button>
                <button className={`u-btn primary${pngMsg ? " ok" : ""}`} onClick={handleExportTXT}>
                  {pngMsg ? "✓ " + pngMsg : "↓ TXT"}
                </button>
              </div>
              <div className="u-hint">
                Output = segmentos suavizados + gap points en orden de X.
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="u-right">
            <div className="u-toolbar">
              <span className="u-tb-lbl">PREVIEW</span>
              <div className="u-legend">
                {selections.map((_, si) => (
                  <div key={si} className="u-leg">
                    <div className="u-leg-dot" style={{ background: SEG_COLORS[si % SEG_COLORS.length] }} />
                    <span>Seg {si + 1}</span>
                  </div>
                ))}
                {nGap > 0 && (
                  <div className="u-leg">
                    <div className="u-leg-dot" style={{ background: "rgba(100,116,139,0.4)", borderRadius: "50%", width: 8, height: 8 }} />
                    <span>Gap</span>
                  </div>
                )}
                <div className="u-leg">
                  <div className="u-leg-dot" style={{ background: "rgba(100,116,139,0.3)" }} />
                  <span>Raw</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
                <button
                  onClick={() => {
                    setHistory(h => {
                      setHistoryIdx(idx => {
                        const newIdx = Math.max(0, idx - 1);
                        const snap = h[newIdx] || { selections: [], rawPts: null };
                        setSelections(snap.selections || []);
                        if (snap.rawPts) setRawPts(snap.rawPts);
                        return newIdx;
                      });
                      return h;
                    });
                  }}
                  disabled={historyIdx <= 0}
                  title="Undo (Ctrl+Z)"
                  style={{
                    padding: "3px 10px", border: "1px solid #e2e8f0", borderRadius: 5,
                    background: historyIdx > 0 ? "#fff" : "#f8fafc",
                    fontSize: 10, color: historyIdx > 0 ? "#475569" : "#cbd5e0",
                    cursor: historyIdx > 0 ? "pointer" : "default",
                    fontFamily: "'DM Sans',system-ui", whiteSpace: "nowrap"
                  }}>
                  ↩ Undo
                </button>
                {(xRange || yRange) && (
                  <button onClick={() => { setXRange(null); setYRange(null); }}
                    style={{
                      padding: "3px 10px", border: "1px solid #e2e8f0", borderRadius: 5, background: "#fff",
                      fontSize: 10, color: "#475569", cursor: "pointer", fontFamily: "'DM Sans',system-ui",
                      whiteSpace: "nowrap"
                    }}>
                    Reset zoom
                  </button>
                )}
              </div>
            </div>
            <div className="u-cw" ref={containerRef}
              style={{ cursor: draggingPt ? 'grabbing' : (hoveredPt && !dragging) ? 'grab' : panning ? 'grabbing' : 'crosshair' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
              onWheel={handleWheel}
              onContextMenu={e => e.preventDefault()}
            >
              <canvas ref={canvasRef} />
              <div className="u-hint2">
                {draggingPt ? `punto activo — click para fijar · Esc cancela` : panning ? "arrastrando vista…" : dragging ? "click en esquina opuesta para confirmar selección · Esc cancela" : "click en punto → moverlo · click en vacío → iniciar selección · medio → pan · scroll → zoom"}
              </div>

              {/* Raw point tooltip */}
              {hoveredPt && !dragging && !panning && (() => {
                const TOOLTIP_W = 130;
                const containerW = containerRef.current?.clientWidth || 800;
                const containerH = containerRef.current?.clientHeight || 600;
                const tx = hoveredPt.screenX + 14 + TOOLTIP_W > containerW
                  ? hoveredPt.screenX - TOOLTIP_W - 10
                  : hoveredPt.screenX + 14;
                const ty = Math.max(8, Math.min(hoveredPt.screenY - 28, containerH - 60));
                return (
                  <div style={{
                    position: "absolute", left: tx, top: ty,
                    background: "#fff", border: "1.5px solid #e2e8f0",
                    borderRadius: 7, padding: "6px 10px", pointerEvents: "none",
                    fontFamily: "'DM Mono',monospace", fontSize: 11,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 20,
                    whiteSpace: "nowrap",
                  }}>
                    <div style={{ color: "#94a3b8", fontSize: 9, marginBottom: 3, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>Raw point</div>
                    <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                      <span><span style={{ color: "#94a3b8" }}>I </span><span style={{ color: "#1e293b", fontWeight: 500 }}>{hoveredPt.x} A</span></span>
                      <span><span style={{ color: "#94a3b8" }}>t </span><span style={{ color: "#1e293b", fontWeight: 500 }}>{hoveredPt.y} s</span></span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}