import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackButton } from '../../components/BackButton'
import TCCCanvas from './components/TCCCanvas'
import ControlPanel from './components/ControlPanel'
import AnchorCards from './components/AnchorCards'
import ParamsTable from './components/ParamsTable'
import NormCheck from './components/NormCheck'
import { solveSystem, thermalT } from './utils/solver'
import { CURVE_PARAMS } from './utils/curveParams'

// Anclas térmicas — fijas para todos los tipos de curva
const ANC_THERMAL = {
  p1: { m: 1.0,  t: 10000 },
  p2: { m: 1.13, t: 3600  },
  p3: { m: 2.55, t: 60    },
}

const DEFAULT_CURVE = 'C'

const DEFAULT_STATE = {
  In:        20,
  curveType: DEFAULT_CURVE,
  mag:  { tminNom: 3 },
  band: { uk: 2, umag: CURVE_PARAMS[DEFAULT_CURVE].magDefault },
  show: { upper: true, anc: true, zones: true },
}

const SHOW_LABELS = {
  upper: 'Banda de tolerancia',
  anc:   'Puntos de Ref. IEC',
  zones: 'Zonas',
}

export default function MCBModule() {
  const navigate = useNavigate()
  const [state, setState] = useState(() => structuredClone(DEFAULT_STATE))

  const update = useCallback((path, value) => {
    setState(prev => {
      const next = structuredClone(prev)
      const keys = path.split('.')
      let obj = next
      for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]]
      obj[keys[keys.length - 1]] = value
      return next
    })
  }, [])

  const setCurveType = useCallback((type) => {
    setState(prev => {
      const next = structuredClone(prev)
      next.curveType = type
      next.band.umag = CURVE_PARAMS[type].magDefault
      return next
    })
  }, [])

  const reset = useCallback(() => setState(structuredClone(DEFAULT_STATE)), [])

  const cp  = CURVE_PARAMS[state.curveType]
  const anc = useMemo(() => ({
    ...ANC_THERMAL,
    knee:     { m: cp.knee          },
    mag:      { m: cp.knee, t: 0.01 },
    magUpper: cp.magUpper,
  }), [cp])

  const sol = useMemo(() => solveSystem(anc.p1, anc.p2, anc.p3), [anc])

  return (
    <div className="mcb-module">
      <BackButton onClick={() => navigate('/')} />
      <div className="mcb-module__body">

        <div className="chart-col">
          <div className="chart-header">
            <div className="subtitle">MCB · IEC 60898-1 · {cp.label}</div>
            <div className="title">Curva TCC</div>
            <div className="checkboxes">
              {Object.entries(state.show).map(([key, val]) => (
                <label key={key}>
                  <input
                    type="checkbox"
                    checked={val}
                    onChange={e => update(`show.${key}`, e.target.checked)}
                  />
                  {SHOW_LABELS[key]}
                </label>
              ))}
            </div>
            <div className="legend">
              <span><span className="leg-line solid" />Nominal</span>
              <span><span className="leg-line dashed-red" />Banda de tolerancia</span>
              <span><span className="leg-dot green" />Puntos de Ref. IEC</span>
            </div>
          </div>
          <TCCCanvas state={state} sol={sol} anc={anc} />
        </div>

        <div className="panel-col">
          <ControlPanel
            state={state}
            update={update}
            reset={reset}
            setCurveType={setCurveType}
            onChangeIn={v => setState(prev => {
              const next = structuredClone(prev)
              next.In = v
              return next
            })}
          />
          <AnchorCards In={state.In} anc={anc} sol={sol} thermalT={thermalT} />
          <ParamsTable sol={sol} anc={anc} thermalT={thermalT} />
          <NormCheck sol={sol} anc={anc} thermalT={thermalT} curveLabel={cp.label} />
        </div>

      </div>
    </div>
  )
}
