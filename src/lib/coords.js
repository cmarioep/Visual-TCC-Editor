/** Convert linear {x,y} points to log10 space. Filters non-positive values. */
export function toLogLog(pts) {
  return pts
    .filter(p => p.x > 0 && p.y > 0)
    .map(p => ({ x: Math.log10(p.x), y: Math.log10(p.y) }));
}

/** Convert log10 {x,y} points back to linear space. */
export function toLinear(pts) {
  return pts.map(p => ({
    x: +Math.pow(10, p.x).toFixed(6),
    y: +Math.pow(10, p.y).toFixed(6),
  }));
}
