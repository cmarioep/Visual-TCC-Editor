/**
 * Natural cubic smoothing spline via Thomas algorithm.
 * pts: [{x, y}] in log-log space.
 * lambda: 0 = interpolating, ~1 = near-linear.
 */
export function smoothingSpline(pts, lambda) {
  const sorted = [...pts].sort((a, b) => a.x - b.x);

  // Deduplicate: merge points with identical x by averaging y (avoids h=0)
  const deduped = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i, sumY = 0;
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
        y: deduped[0].y + t * (deduped[1].y - deduped[0].y),
      });
    }
    return res;
  }

  const x = deduped.map(p => p.x);
  const y = deduped.map(p => p.y);

  // h[i] = x[i+1] - x[i], guaranteed > 0 after dedup
  const h = [];
  for (let i = 0; i < n - 1; i++) h.push(Math.max(x[i + 1] - x[i], 1e-10));

  // Map slider [0,1] -> [0, 1e5] exponentially
  const lam = Math.max(0, Math.min(1 - 1e-9, lambda));
  const alpha = lam < 1e-9 ? 0 : Math.pow(10, lam * 7 - 2); // 0.01 .. 1e5

  const m = n - 2;
  if (m < 1) {
    const res = [];
    const nO = 40;
    for (let k = 0; k <= nO; k++) {
      const t = k / nO;
      res.push({ x: x[0] + t * (x[1] - x[0]), y: y[0] + t * (y[1] - y[0]) });
    }
    return res;
  }

  // Build symmetric tridiagonal system for natural smoothing spline
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
    while (seg < n - 2 && xq > x[seg + 1] + 1e-12) seg++;
    const hi = h[seg];
    const a = (x[seg + 1] - xq) / hi;
    const b = (xq - x[seg]) / hi;
    const yq = a * y[seg] + b * y[seg + 1]
      + ((a * a * a - a) * M[seg] + (b * b * b - b) * M[seg + 1]) * hi * hi / 6;
    if (isFinite(yq)) result.push({ x: xq, y: yq });
  }
  return result;
}
