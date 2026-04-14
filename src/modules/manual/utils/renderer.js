import { SEG_COLORS, SEG_FILLS, SEG_BORDERS } from './constants';

function logTicks(mn, mx) {
  const t = [];
  let v = Math.pow(10, Math.floor(Math.log10(mn)));
  while (v <= mx * 1.01) {
    for (const m of [1, 2, 5]) {
      const r = v * m;
      if (r >= mn * 0.99 && r <= mx * 1.01) t.push(r);
    }
    v *= 10;
  }
  return [...new Set(t)].sort((a, b) => a - b);
}

export function fmtN(v) {
  if (v >= 1000) return (v / 1000).toFixed(0) + 'k';
  if (v >= 1) return v % 1 === 0 ? String(v) : parseFloat(v.toFixed(2));
  return parseFloat(v.toFixed(4));
}

/**
 * Renders the TCC chart onto a canvas.
 * Returns coordinate transform helpers { toX, toY, fromX, fromY, PAD, PW, PH,
 * xMin, xMax, yMin, yMax, lxMin, lxMax, lyMin, lyMax } used by interaction handlers.
 */
export function renderToCanvas(canvas, rawPts, selections, output, opts = {}) {
  const {
    dpr = 1,
    forExport = false,
    xRange = null,
    yRange = null,
    dragBox = null,
    hoveredPtIdx = null,
    isDraggingPt = false,
  } = opts;

  if (!canvas || !rawPts?.length) return null;

  const W = canvas.width, H = canvas.height, s = dpr;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, W, H);

  const PAD = { top: 28 * s, right: 24 * s, bottom: 52 * s, left: 72 * s };
  const PW = W - PAD.left - PAD.right;
  const PH = H - PAD.top - PAD.bottom;

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

  // Background
  ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#050e1d'; ctx.fillRect(PAD.left, PAD.top, PW, PH);

  // Minor grid
  ctx.save(); ctx.strokeStyle = '#1a2d3f'; ctx.lineWidth = 0.75 * s;
  for (const v of logTicks(xMin, xMax)) {
    const x = toX(v); ctx.beginPath(); ctx.moveTo(x, PAD.top); ctx.lineTo(x, H - PAD.bottom); ctx.stroke();
  }
  for (const v of logTicks(yMin, yMax)) {
    const y = toY(v); ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(W - PAD.right, y); ctx.stroke();
  }
  ctx.restore();

  // Major grid (decade lines)
  ctx.save(); ctx.strokeStyle = '#253447'; ctx.lineWidth = 1 * s;
  for (let e = Math.floor(lxMin); e <= Math.ceil(lxMax); e++) {
    const x = toX(Math.pow(10, e));
    if (x < PAD.left || x > W - PAD.right) continue;
    ctx.beginPath(); ctx.moveTo(x, PAD.top); ctx.lineTo(x, H - PAD.bottom); ctx.stroke();
  }
  for (let e = Math.floor(lyMin); e <= Math.ceil(lyMax); e++) {
    const y = toY(Math.pow(10, e));
    if (y < PAD.top || y > H - PAD.bottom) continue;
    ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(W - PAD.right, y); ctx.stroke();
  }
  ctx.restore();
  ctx.save(); ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.5 * s;
  ctx.strokeRect(PAD.left, PAD.top, PW, PH);
  ctx.restore();

  // Tick labels
  ctx.save();
  ctx.fillStyle = '#64748b';
  ctx.font = `${10 * s}px 'DM Mono',monospace`;
  ctx.textAlign = 'center';
  for (const v of logTicks(xMin, xMax)) {
    const x = toX(v);
    if (x < PAD.left + 2 || x > W - PAD.right - 2) continue;
    ctx.fillText(fmtN(v), x, H - PAD.bottom + 14 * s);
  }
  ctx.textAlign = 'right';
  for (const v of logTicks(yMin, yMax)) {
    const y = toY(v);
    if (y < PAD.top + 2 || y > H - PAD.bottom - 2) continue;
    ctx.fillText(fmtN(v), PAD.left - 6 * s, y + 3.5 * s);
  }
  ctx.fillStyle = '#94a3b8';
  ctx.font = `600 ${11 * s}px 'DM Sans',system-ui`;
  ctx.textAlign = 'center';
  ctx.fillText('Current (A)', PAD.left + PW / 2, H - 8 * s);
  ctx.translate(15 * s, PAD.top + PH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Time (s)', 0, 0);
  ctx.restore();

  // Clip to plot area
  ctx.save(); ctx.beginPath(); ctx.rect(PAD.left, PAD.top, PW, PH); ctx.clip();

  // Raw points + dashed line
  ctx.save();
  ctx.setLineDash([4 * s, 3 * s]);
  ctx.strokeStyle = 'rgba(148,163,184,0.2)';
  ctx.lineWidth = 1.2 * s;
  let rawFirst = true;
  for (const p of rawPts) {
    if (!isFinite(p.x) || !isFinite(p.y) || p.x <= 0 || p.y <= 0) continue;
    const x = toX(p.x), y = toY(p.y);
    if (rawFirst) { ctx.beginPath(); ctx.moveTo(x, y); rawFirst = false; }
    else ctx.lineTo(x, y);
  }
  ctx.stroke(); ctx.setLineDash([]);
  for (const p of rawPts) {
    if (!isFinite(p.x) || !isFinite(p.y) || p.x <= 0 || p.y <= 0) continue;
    ctx.beginPath(); ctx.arc(toX(p.x), toY(p.y), 3.5 * s, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(148,163,184,0.35)'; ctx.fill();
  }
  ctx.restore();

  // Selection boxes + smoothed curves
  if (selections.length) {
    selections.forEach((sel, si) => {
      const color = SEG_COLORS[si % SEG_COLORS.length];
      const fill = SEG_FILLS[si % SEG_FILLS.length];
      const border = SEG_BORDERS[si % SEG_BORDERS.length];

      const bx1 = toX(sel.xMin), bx2 = toX(sel.xMax);
      const by1 = toY(sel.yMax), by2 = toY(sel.yMin);
      ctx.save();
      ctx.fillStyle = fill; ctx.fillRect(bx1, by1, bx2 - bx1, by2 - by1);
      ctx.strokeStyle = border; ctx.lineWidth = 1.5 * s; ctx.setLineDash([5 * s, 3 * s]);
      ctx.strokeRect(bx1, by1, bx2 - bx1, by2 - by1); ctx.setLineDash([]);
      ctx.fillStyle = color; ctx.font = `700 ${11 * s}px 'DM Sans',system-ui`; ctx.textAlign = 'left';
      ctx.fillText(`Seg ${si + 1}`, bx1 + 5 * s, by1 + 14 * s);
      ctx.restore();

      const seg = output?.smoothedSegs?.[si];
      if (seg?.length) {
        ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2.2 * s;
        let started = false;
        for (const p of seg) {
          if (!isFinite(p.x) || !isFinite(p.y) || p.x <= 0 || p.y <= 0) continue;
          const sx = toX(p.x), sy = toY(p.y);
          if (!started) { ctx.moveTo(sx, sy); started = true; }
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      }
    });
  }

  // Gap points
  if (output?.gapPts?.length) {
    output.gapPts.forEach(p => {
      ctx.beginPath(); ctx.arc(toX(p.x), toY(p.y), 5 * s, 0, Math.PI * 2);
      ctx.strokeStyle = '#475569'; ctx.lineWidth = 1.5 * s; ctx.stroke();
    });
  }

  // Hovered / dragged point highlight
  if (hoveredPtIdx !== null && rawPts[hoveredPtIdx]) {
    const p = rawPts[hoveredPtIdx];
    if (p.x > 0 && p.y > 0) {
      ctx.beginPath();
      ctx.arc(toX(p.x), toY(p.y), isDraggingPt ? 8 * s : 6 * s, 0, Math.PI * 2);
      ctx.fillStyle = isDraggingPt ? 'rgba(26,107,189,0.15)' : 'rgba(26,107,189,0.2)'; ctx.fill();
      ctx.strokeStyle = '#1a6bbd'; ctx.lineWidth = isDraggingPt ? 2 * s : 1.5 * s; ctx.stroke();
      if (isDraggingPt) {
        ctx.save();
        ctx.strokeStyle = 'rgba(26,107,189,0.3)'; ctx.lineWidth = 0.75 * s; ctx.setLineDash([4 * s, 3 * s]);
        ctx.beginPath(); ctx.moveTo(toX(p.x), PAD.top); ctx.lineTo(toX(p.x), H - PAD.bottom); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(PAD.left, toY(p.y)); ctx.lineTo(W - PAD.right, toY(p.y)); ctx.stroke();
        ctx.restore();
      }
    }
  }

  // In-progress drag box
  if (dragBox) {
    const dx1 = toX(dragBox.xMin), dx2 = toX(dragBox.xMax);
    const dy1 = toY(dragBox.yMax), dy2 = toY(dragBox.yMin);
    ctx.save();
    ctx.fillStyle = 'rgba(26,107,189,0.06)'; ctx.fillRect(dx1, dy1, dx2 - dx1, dy2 - dy1);
    ctx.strokeStyle = 'rgba(26,107,189,0.7)'; ctx.lineWidth = 1.5 * s; ctx.setLineDash([5 * s, 3 * s]);
    ctx.strokeRect(dx1, dy1, dx2 - dx1, dy2 - dy1);
    ctx.restore();
  }

  ctx.restore(); // end clip

  // Export legend
  if (forExport && selections.length) {
    const lx = PAD.left + 12 * s, ly = PAD.top + 16 * s;
    ctx.save(); ctx.font = `${12 * s}px 'DM Sans',system-ui`;
    selections.forEach((_, si) => {
      const color = SEG_COLORS[si % SEG_COLORS.length];
      ctx.fillStyle = color; ctx.fillRect(lx, ly + si * 20 * s, 20 * s, 3 * s);
      ctx.fillStyle = '#94a3b8'; ctx.fillText(`Segment ${si + 1}`, lx + 26 * s, ly + si * 20 * s + 4 * s);
    });
    ctx.restore();
  }

  return { toX, toY, fromX, fromY, PAD, PW, PH, xMin, xMax, yMin, yMax, lxMin, lxMax, lyMin, lyMax };
}
