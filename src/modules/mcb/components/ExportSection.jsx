import { useState, useCallback } from 'react'
import { buildExportJSON } from '../utils/exportCurve'

export default function ExportSection({ state, sol, anc }) {
  const [copied, setCopied] = useState(false)

  const handleCopyJSON = useCallback(() => {
    const data = buildExportJSON(state, sol, anc)
    const json = JSON.stringify(data, null, 2)
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    })
  }, [state, sol, anc])

  return (
    <div className="export-section">
      <div className="section-label">Exportar curva</div>
      <div className="export-buttons">
        <button
          className={`export-btn export-btn--primary${copied ? ' export-btn--success' : ''}`}
          onClick={handleCopyJSON}
          title="Copiar coordenadas de la curva al portapapeles (JSON)"
        >
          {copied ? '✓ Copiado' : 'Copy JSON'}
        </button>
        <button
          className="export-btn export-btn--disabled"
          disabled
          title="Próximamente"
        >
          — —
        </button>
      </div>
    </div>
  )
}
