import { useState, useCallback } from 'react'
import { buildExportJSON } from '../utils/exportCurve'

export default function ExportSection({ state, sol, anc }) {
  const [copied, setCopied] = useState(false)

  const handleCopyJSON = useCallback(() => {
    const text = buildExportJSON(state, sol, anc)
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    })
  }, [state, sol, anc])

  return (
    <div className="export-section">
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
