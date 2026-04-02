export function ExportSection({ curveName, onNameChange, onCopyJSON, onExportTXT, copied, downloadMsg }) {
  return (
    <section className="panel__section">
      <h2 className="panel__section-title">Export</h2>
      <input
        className="export__name-input"
        value={curveName}
        onChange={e => onNameChange(e.target.value)}
        placeholder="nombre…"
      />
      <div className="export__actions">
        <button
          className={`export__btn${copied ? ' export__btn--success' : ''}`}
          onClick={onCopyJSON}
        >
          {copied ? '✓ Copiado!' : 'JSON flat'}
        </button>
        <button
          className={`export__btn export__btn--primary${downloadMsg ? ' export__btn--success' : ''}`}
          onClick={onExportTXT}
        >
          {downloadMsg ? '✓ ' + downloadMsg : '↓ TXT'}
        </button>
      </div>
      <p className="export__hint">
        Output = segmentos suavizados + gap points en orden de X.
      </p>
    </section>
  );
}
