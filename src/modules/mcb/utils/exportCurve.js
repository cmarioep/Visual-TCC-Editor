import { thermalT } from './solver'
import { CURVE_PARAMS } from './curveParams'

const T_INST = 0.01   // magnetic instantaneous trip time (s)
const XMAX_A = 50000  // max current axis value

/**
 * Generates {x, y} data points (amps, seconds) for one TCC curve segment.
 * - Thermal segment: 40 points sampled in log space (the curve is non-linear)
 * - Magnetic knee and horizontal extension: 2–3 points each (straight lines)
 *
 * @param {object} sol       - { A, alpha, k } from solveSystem
 * @param {object} state     - { In, ... }
 * @param {object} anc       - anchor object (p1, knee, mag, ...)
 * @param {number} kFactor   - 1 for nominal, kFactorSup for upper band
 * @param {number} kneeM     - multiplier for the magnetic knee (e.g. cp.knee or band.umag)
 * @returns {{ x: number, y: number }[]}
 */
function generateCurvePoints(sol, state, anc, kFactor, kneeM) {
  const tKnee = thermalT(kneeM, sol, kFactor) ?? T_INST
  const pts = []

  const logStart = Math.log10(Math.max(sol.A + 0.005, anc.p1.m * 0.75))
  const logEnd   = Math.log10(kneeM)

  // ── Thermal segment: 40 points in log space ──────────────────────────────────
  for (let i = 0; i <= 40; i++) {
    const M = Math.pow(10, logStart + (logEnd - logStart) * i / 40)
    const t = thermalT(M, sol, kFactor)
    if (t === null || !isFinite(t) || t > 10000) continue
    pts.push({ x: round6(M * state.In), y: round6(t) })
  }

  // ── Magnetic knee: vertical drop (2 points) ───────────────────────────────────
  if (tKnee > T_INST) {
    pts.push({ x: round6(kneeM * state.In), y: round6(tKnee) })
  }
  pts.push({ x: round6(kneeM * state.In), y: T_INST })

  // ── Horizontal extension to axis max (1 extra point) ────────────────────────
  pts.push({ x: XMAX_A, y: T_INST })

  return pts
}

function round6(v) {
  return +v.toFixed(6)
}

/**
 * Builds the full export object for the current MCB state.
 *
 * @param {object} state  - MCBModule state
 * @param {object} sol    - solved model params
 * @param {object} anc    - anchor object
 * @returns {object}  e.g. { MCB_IEC_20A_C: { manufacturer, type, ... } }
 */
export function buildExportJSON(state, sol, anc) {
  const cp = CURVE_PARAMS[state.curveType]

  const tAt145      = thermalT(1.45, sol)
  const kFactorSup  = tAt145 ? 3600 / tAt145 : state.band.uk

  const mmPoints = generateCurvePoints(sol, state, anc, 1, anc.knee.m)
  const tcPoints = generateCurvePoints(sol, state, anc, kFactorSup, state.band.umag)

  const key = `MCB_IEC_${state.In}A_${state.curveType}`

  return {
    [key]: {
      manufacturer: 'IEC IEC_60898-1',
      type: 'MCB',
      curve_type: state.curveType,
      Icu: 10,
      In: state.In,
      curves: {
        mm: mmPoints,
        tc: tcPoints,
      },
    },
  }
}
