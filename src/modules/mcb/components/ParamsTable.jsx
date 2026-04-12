export default function ParamsTable({ sol, anc, thermalT }) {
  const tKnee = thermalT(anc.knee.m, sol)

  const rows = [
    { label: 'Asíntota A',      val: `${sol.A.toFixed(4)} ×In` },
    { label: 'Exponente α',     val: sol.alpha.toFixed(4) },
    { label: 'Constante k',     val: sol.k.toFixed(3) },
    { label: 'Rodilla (5·In)',  val: tKnee ? `${tKnee.toFixed(3)} s` : '—' },
  ]

  return (
    <div className="section">
      <div className="section-label">Parámetros — modelo t = k / (M − A)^α</div>
      <div className="param-table">
        {rows.map(r => (
          <div key={r.label} className="param-row">
            <span className="param-lbl">{r.label}</span>
            <span className="param-val">{r.val}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
