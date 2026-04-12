/**
 * Triple-anchor TCC solver — IEC 60255 model with variable asymptote
 * t = k / (M - A)^alpha
 * where M = I/In
 */
export function solveSystem(p1, p2, p3) {
  let bestA = 1.0
  let minErr = Infinity

  for (let a = 0.5; a < p1.m - 0.001; a += 0.0005) {
    const d1 = p1.m - a
    const d2 = p2.m - a
    const d3 = p3.m - a
    if (d1 <= 0 || d2 <= 0 || d3 <= 0) continue
    const a12 = (Math.log(p1.t) - Math.log(p2.t)) / (Math.log(d2) - Math.log(d1))
    const a23 = (Math.log(p2.t) - Math.log(p3.t)) / (Math.log(d3) - Math.log(d2))
    const err = Math.abs(a12 - a23)
    if (err < minErr) { minErr = err; bestA = a }
  }

  const d1f = p1.m - bestA
  const d2f = p2.m - bestA
  const alpha = (Math.log(p1.t) - Math.log(p2.t)) / (Math.log(d2f) - Math.log(d1f))
  const k = p1.t * Math.pow(d1f, alpha)

  return { A: bestA, alpha, k }
}

export function thermalT(M, sol, kFactor = 1) {
  const d = M - sol.A
  if (d <= 0) return null
  const t = (sol.k * kFactor) / Math.pow(d, sol.alpha)
  return t > 0 && isFinite(t) ? t : null
}
