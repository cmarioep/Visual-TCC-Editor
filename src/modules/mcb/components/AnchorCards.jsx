export default function AnchorCards({ In, anc, sol, thermalT }) {
  const tKnee = thermalT(anc.knee.m, sol)

  const cards = [
    {
      label: 'P1 · 1.0×In',
      color: '#94a3b8',
      current: `${(anc.p1.m * In).toFixed(0)} A`,
      time:    `${anc.p1.t} s`,
      hint:    'asíntota',
    },
    {
      label: 'P2 · 1.13×In',
      color: '#38bdf8',
      current: `${(anc.p2.m * In).toFixed(0)} A`,
      time:    `${anc.p2.t} s`,
      hint:    'IEC: 1 h (frío)',
    },
    {
      label: 'P3 · 2.55×In',
      color: '#f59e0b',
      current: `${(anc.p3.m * In).toFixed(0)} A`,
      time:    `${anc.p3.t} s`,
      hint:    'IEC: 60 s',
    },
    {
      label: `Rodilla · ${anc.knee.m}×In`,
      color: '#22c55e',
      current: `${(anc.knee.m * In).toFixed(0)} A`,
      time:    tKnee ? `${tKnee.toFixed(2)} s` : '—',
      hint:    'intersección térmica',
    },
  ]

  return (
    <div className="section">
      <div className="section-label">Puntos de anclaje — calculados desde In</div>
      <div className="anchor-grid">
        {cards.map(c => (
          <div key={c.label} className="anchor-card" style={{ borderTop: `2px solid ${c.color}` }}>
            <div className="anchor-card-label">{c.label}</div>
            <div className="anchor-card-val">{c.current}</div>
            <div className="anchor-card-val">{c.time}</div>
            <div style={{ fontSize: '9px', color: 'var(--text3)', marginTop: '2px' }}>{c.hint}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
