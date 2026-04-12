import { useRef, useEffect, useCallback } from 'react'
import { thermalT } from './solver'

const XMIN_A = 1
const XMAX_A = 50000
const YMIN = 0.001
const YMAX = 50000
const MG = { top: 38, right: 28, bottom: 52, left: 68 }
const HIT_RADIUS = 12

// Dark mode is forced globally
const isDark = true

function fmtCurrent(I) {
  return I >= 1000 ? `${(I / 1000).toFixed(2)} kA` : `${I.toFixed(0)} A`
}

function drawTooltip(ctx, { cx, cy, label, I, t }, cw) {
  const line1 = label
  const tStr = t < 1 ? `${t} s` : `${Number.isInteger(t) ? t : t.toFixed(2)} s`
  const line2 = `${fmtCurrent(I)}  ·  ${tStr}`

  ctx.font = 'bold 11px sans-serif'
  const w1 = ctx.measureText(line1).width
  ctx.font = '10px sans-serif'
  const w2 = ctx.measureText(line2).width

  const pad = 12
  const tw = Math.max(w1, w2) + pad * 3
  const th = 44

  let tx = cx + 12
  let ty = cy - th - 10
  if (tx + tw > MG.left + cw) tx = cx - tw - 12
  if (ty < MG.top) ty = cy + 12

  ctx.save()
  ctx.fillStyle = 'rgba(10, 18, 36, 0.93)'
  ctx.beginPath()
  ctx.roundRect(tx, ty, tw, th, 5)
  ctx.fill()
  ctx.strokeStyle = '#1d9e75'
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.textAlign = 'left'
  ctx.fillStyle = '#f8fafc'
  ctx.font = 'bold 12.5px sans-serif'
  ctx.fillText(line1, tx + pad, ty + 20)
  ctx.fillStyle = '#94a3b8'
  ctx.font = '12px sans-serif'
  ctx.fillText(line2, tx + pad, ty + 36)
  ctx.restore()
}

export function useCanvasDraw(state, sol, anc) {
  const canvasRef = useRef(null)
  const anchorsRef = useRef([])
  const tooltipRef = useRef(null)

  const getMetrics = useCallback((cssW, cssH) => {
    const cw = cssW - MG.left - MG.right
    const ch = cssH - MG.top - MG.bottom
    const px = (I) =>
      MG.left + (Math.log10(Math.max(I, XMIN_A)) - Math.log10(XMIN_A)) /
      (Math.log10(XMAX_A) - Math.log10(XMIN_A)) * cw
    const py = (t) =>
      MG.top + (Math.log10(YMAX) - Math.log10(t)) /
      (Math.log10(YMAX) - Math.log10(YMIN)) * ch
    return { cw, ch, px, py }
  }, [])

  const drawCurve = useCallback((ctx, { px, py }, kFactor, tminMs, color, lw, dash, kneeM = anc.knee.m) => {
    const T_INST = anc.mag.t
    const tPiso = kFactor === 1 ? T_INST : tminMs / 1000
    const tKnee = thermalT(kneeM, sol, kFactor) ?? T_INST
    const kneeI = kneeM * state.In
    const xKnee = px(kneeI)
    const xRight = px(10000)

    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = lw
    ctx.setLineDash(dash || [])
    ctx.beginPath()

    let started = false
    const logStart = Math.log10(Math.max(sol.A + 0.005, anc.p1.m * 0.75))
    const logEnd = Math.log10(kneeM)

    for (let i = 0; i <= 300; i++) {
      const M = Math.pow(10, logStart + (logEnd - logStart) * i / 300)
      const d = M - sol.A
      if (d <= 0) continue
      const t = (sol.k * kFactor) / Math.pow(d, sol.alpha)
      if (!t || t > 10000) continue
      const xi = px(M * state.In)
      const yi = py(t)
      if (!started) { ctx.moveTo(xi, yi); started = true }
      else { ctx.lineTo(xi, yi) }
    }

    if (started) {
      ctx.lineTo(xKnee, py(tKnee))
      ctx.lineTo(xKnee, py(T_INST))
      if (tPiso !== T_INST) {
        const xTransition = xKnee + (xRight - xKnee) * 0.25
        ctx.lineTo(xTransition, py(tPiso))
        ctx.lineTo(xRight, py(tPiso))
      } else {
        ctx.lineTo(xRight, py(T_INST))
      }
    }

    ctx.stroke()
    ctx.setLineDash([])
    ctx.restore()
  }, [sol, state.In, anc])

  const drawAll = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const cssW = canvas.parentElement.offsetWidth
    const cssH = canvas.parentElement.offsetHeight || Math.round(cssW * 0.65)
    canvas.width = Math.round(cssW * dpr)
    canvas.height = Math.round(cssH * dpr)
    canvas.style.width = cssW + 'px'
    canvas.style.height = cssH + 'px'
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    const metrics = getMetrics(cssW, cssH)
    const { px, py, cw, ch } = metrics

    const gc = '#1e293b'
    const tc = '#64748b'
    const bgC = '#020617'

    ctx.fillStyle = bgC
    ctx.fillRect(MG.left, MG.top, cw, ch)

    // ---- Zones ----
    if (state.show.zones) {
      const p3I = anc.knee.m * state.In
      const p3x2I = anc.magUpper * state.In
      ctx.save()
      ctx.beginPath(); ctx.rect(MG.left, MG.top, cw, ch); ctx.clip()

      const zones = [
        { x0: XMIN_A, x1: p3I,   c: 'rgba(186,117,23,0.08)',  lbl: 'zona térmica'    },
        { x0: p3I,    x1: p3x2I, c: 'rgba(53,107,189,0.13)',  lbl: 'zona magnética'  },
        { x0: p3x2I,  x1: XMAX_A, c: 'rgba(30,130,80,0.08)', lbl: 't mín.'          },
      ]
      zones.forEach(z => {
        const x0 = Math.max(px(z.x0), MG.left)
        const x1 = Math.min(px(z.x1), MG.left + cw)
        if (x1 <= x0) return
        ctx.fillStyle = z.c; ctx.fillRect(x0, MG.top, x1 - x0, ch)
        ctx.fillStyle = tc; ctx.font = '10px sans-serif'; ctx.textAlign = 'center'
        ctx.fillText(z.lbl, (x0 + x1) / 2, MG.top + 14)
      })

      ctx.strokeStyle = 'rgba(255,255,255,0.15)'
      ctx.lineWidth = 1; ctx.setLineDash([4, 3])
      ctx.beginPath(); ctx.moveTo(px(p3I), MG.top); ctx.lineTo(px(p3I), MG.top + ch); ctx.stroke()
      ctx.setLineDash([])

      const x113 = px(anc.p2.m * state.In)
      if (x113 >= MG.left && x113 <= MG.left + cw) {
        ctx.strokeStyle = 'rgba(255,200,50,0.3)'
        ctx.setLineDash([3, 4])
        ctx.beginPath(); ctx.moveTo(x113, MG.top); ctx.lineTo(x113, MG.top + ch); ctx.stroke()
        ctx.setLineDash([])
      }
      ctx.restore()
    }

    // ---- Grid ----
    const xAs = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000]
    const yTs = [0.002, 0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000]

    ctx.strokeStyle = gc; ctx.lineWidth = 0.5; ctx.fillStyle = tc; ctx.font = '10px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('0', MG.left, MG.top + ch + 16)
    xAs.forEach(a => {
      const xi = px(a)
      if (xi < MG.left || xi > MG.left + cw) return
      ctx.beginPath(); ctx.moveTo(xi, MG.top); ctx.lineTo(xi, MG.top + ch); ctx.stroke()
      ctx.textAlign = 'center'
      const lbl = a >= 1000 ? `${a / 1000}k` : `${a}`
      ctx.fillText(lbl + 'A', xi, MG.top + ch + 16)
    })
    yTs.forEach(t => {
      const yi = py(t)
      if (yi < MG.top || yi > MG.top + ch) return
      ctx.beginPath(); ctx.moveTo(MG.left, yi); ctx.lineTo(MG.left + cw, yi); ctx.stroke()
      ctx.textAlign = 'right'
      const lbl = t >= 1000 ? `${t / 1000}k` : t < 0.01 ? t.toFixed(3) : t < 1 ? t.toFixed(2) : t
      ctx.fillText(lbl + 's', MG.left - 5, yi + 4)
    })

    ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(MG.left, MG.top); ctx.lineTo(MG.left, MG.top + ch); ctx.lineTo(MG.left + cw, MG.top + ch); ctx.stroke()
    ctx.fillStyle = tc; ctx.font = '11px sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('Corriente (A)', MG.left + cw / 2, MG.top + ch + 40)
    ctx.save(); ctx.translate(13, MG.top + ch / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('Tiempo (s)', 0, 0); ctx.restore()

    // ---- Curves (clipped) ----
    ctx.save(); ctx.beginPath(); ctx.rect(MG.left, MG.top, cw, ch); ctx.clip()

    const tAt145 = thermalT(1.45, sol)
    const kFactorSup = tAt145 ? 3600 / tAt145 : state.band.uk

    if (state.show.upper)
      drawCurve(ctx, metrics, kFactorSup, state.band.utmin,
        'rgba(216,90,48,0.75)', 1.5, [5, 4],
        state.band.umag)
    drawCurve(ctx, metrics, 1, state.mag.tminNom, '#1a6bbd', 2.5, [])

    // ---- Anchors ----
    const anchorColor = '#1d9e75'
    const tKneeNom = thermalT(anc.knee.m, sol)

    const anchorPoints = [
      { label: `${anc.p1.m} In`, I: anc.p1.m * state.In, t: anc.p1.t, color: '#94a3b8', r: 5 },
      { label: `${anc.p2.m} In`, I: anc.p2.m * state.In, t: anc.p2.t, color: anchorColor, r: 6 },
      { label: '1.45 In', I: 1.45 * state.In, t: 3600, color: anchorColor, r: 6 },
      { label: `${anc.p3.m} In`, I: anc.p3.m * state.In, t: anc.p3.t, color: anchorColor, r: 6 },
      ...(tKneeNom ? [{ label: `${anc.knee.m} In`, I: anc.knee.m * state.In, t: tKneeNom, color: anchorColor, r: 6 }] : []),
      { label: `${anc.mag.m} In`, I: anc.mag.m * state.In, t: anc.mag.t, color: anchorColor, r: 6 },
    ]

    if (state.show.anc) {
      anchorPoints.forEach(a => {
        a.cx = px(a.I)
        a.cy = py(a.t)
        ctx.fillStyle = a.color
        ctx.beginPath(); ctx.arc(a.cx, a.cy, a.r, 0, Math.PI * 2); ctx.fill()
      })
    }

    anchorsRef.current = state.show.anc ? anchorPoints.map(a => ({
      ...a,
      cx: px(a.I),
      cy: py(a.t),
    })) : []

    if (tooltipRef.current) {
      drawTooltip(ctx, tooltipRef.current, cw)
    }

    ctx.restore()
  }, [state, sol, anc, getMetrics, drawCurve])

  useEffect(() => {
    drawAll()

    const canvas = canvasRef.current
    if (!canvas) return

    const handleResize = () => { tooltipRef.current = null; drawAll() }

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const hit = anchorsRef.current.find(a =>
        Math.hypot(a.cx - mx, a.cy - my) <= HIT_RADIUS
      )
      if (hit) {
        canvas.style.cursor = 'crosshair'
        tooltipRef.current = hit
      } else {
        canvas.style.cursor = ''
        tooltipRef.current = null
      }
      drawAll()
    }

    const handleMouseLeave = () => {
      canvas.style.cursor = ''
      tooltipRef.current = null
      drawAll()
    }

    window.addEventListener('resize', handleResize)
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      window.removeEventListener('resize', handleResize)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [drawAll])

  return canvasRef
}
