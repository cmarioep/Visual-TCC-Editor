import { CURVE_PARAMS } from '../utils/curveParams'

function SliderBlock({ label, hint, id, min, max, value, step, fmt, onChange }) {
  return (
    <div className="sl-block">
      <div className="sl-desc">{label}</div>
      <div className="sl-row">
        <input
          type="range" id={id}
          min={min} max={max} value={value} step={step}
          onChange={e => onChange(parseFloat(e.target.value))}
        />
        <span className="sl-val">{fmt(value)}</span>
      </div>
      {hint && <div className="sl-hint">{hint}</div>}
    </div>
  )
}

export default function ControlPanel({ state, update, reset, setCurveType, onChangeIn }) {
  return (
    <div className="control-panel">
      <div className="section-title">— Ajustes de la Curva —</div>

      <div className="in-box">
        <label>Corriente nominal</label>
        <input
          type="number" min="1" max="125" step="1"
          value={state.In}
          onChange={e => {
            const v = parseFloat(e.target.value)
            if (!isNaN(v) && v > 0) onChangeIn(v)
          }}
        />
        <span>A</span>
      </div>

      <div className="curve-type-row">
        <span className="curve-type-label">Tipo Curva</span>
        <div className="curve-type-selector">
          {Object.entries(CURVE_PARAMS).map(([key, p]) => (
            <button
              key={key}
              className={`curve-type-btn${state.curveType === key ? ' active' : ''}`}
              onClick={() => setCurveType(key)}
              title={p.desc}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      <div className="panel-card">
        <div className="card-title">
          <span className="leg-line dashed-red inline" />
          Banda de tolerancia
          <button className="reset-icon-btn" onClick={reset} title="Restablecer valores">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
          </button>
        </div>
        <div className="hint-text" style={{ marginBottom: 10 }}>
          Ancla fija IEC: 1.45·In → 3 600 s
        </div>
        <SliderBlock
          label="Límite magnético superior (×In)"
          hint={`Línea vertical en ${state.band.umag.toFixed(1)}·In = ${(state.band.umag * state.In).toFixed(0)} A`}
          min={CURVE_PARAMS[state.curveType].knee}
          max={CURVE_PARAMS[state.curveType].magUpper}
          step={0.5}
          value={state.band.umag} fmt={v => `${v.toFixed(1)}×In`}
          onChange={v => update('band.umag', v)}
        />
      </div>
    </div>
  )
}
