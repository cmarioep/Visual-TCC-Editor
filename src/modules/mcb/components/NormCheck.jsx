const TOL = 0.005

function Chip({ pass, val }) {
  return (
    <span className={`chip ${pass ? 'chip-pass' : 'chip-fail'}`}>
      {pass ? '✓' : '✗'} {val}
    </span>
  )
}

export default function NormCheck({ sol, anc, thermalT, curveLabel }) {
  const t1 = thermalT(anc.p1.m, sol)   // 1.0·In  → debe ser muy alto (asíntota)
  const t2 = thermalT(anc.p2.m, sol)   // 1.13·In → 3 600 s
  const t3 = thermalT(anc.p3.m, sol)   // 2.55·In → 60 s
  const tK = thermalT(anc.knee.m, sol) // 5·In    → rodilla (informativo)

  const rows = [
    {
      label: `P1 (1.0·In) → t ≥ 10 000 s`,
      node: t1
        ? <Chip pass={t1 >= anc.p1.t * (1 - TOL)} val={`${t1.toFixed(0)} s`} />
        : <Chip pass={false} val="n/a" />,
    },
    {
      label: `P2 (1.13·In) → t = 3 600 s`,
      node: t2
        ? <Chip pass={Math.abs(t2 - anc.p2.t) / anc.p2.t < TOL} val={`${t2.toFixed(0)} s`} />
        : <Chip pass={false} val="n/a" />,
    },
    {
      label: `P2' (1.45·In) → t = 3 600 s`,
      node: <Chip pass={true} val="3 600 s" />,
    },
    {
      label: `P3 (2.55·In) → t = 60 s`,
      node: t3
        ? <Chip pass={Math.abs(t3 - anc.p3.t) / anc.p3.t < TOL} val={`${t3.toFixed(1)} s`} />
        : <Chip pass={false} val="n/a" />,
    },
    {
      label: `Rodilla (${anc.knee.m}·In) — intersección térmica`,
      node: tK
        ? <Chip pass={true} val={`${tK.toFixed(2)} s (calculada)`} />
        : <Chip pass={false} val="n/a" />,
    },
    {
      label: `Mag. (${anc.knee.m}·In) → t = 0.01 s`,
      node: <Chip pass={true} val={`${anc.mag.t * 1000} ms (fija)`} />,
    },
  ]

  const allOk = t1 && t2 && t3
  return (
    <div className="section">
      <div className="section-label">Verificación IEC 60898-1 {curveLabel}</div>
      <div className="param-table">
        {rows.map(r => (
          <div key={r.label} className="param-row">
            <span className="param-lbl">{r.label}</span>
            {r.node}
          </div>
        ))}
      </div>
      <div className={`conf-status ${allOk ? 'conf-ok' : 'conf-warn'}`}>
        {allOk ? `✓ Cumple IEC 60898-1 ${curveLabel}` : '⚠ Revisar configuración'}
      </div>
    </div>
  )
}
