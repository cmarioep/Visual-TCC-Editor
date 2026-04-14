import { SEG_COLORS } from '../../utils/constants';

export function Toolbar({ selections, nGap, canUndo, hasZoom, onUndo, onResetZoom }) {
  return (
    <div className="toolbar">
      <span className="toolbar__label">PREVIEW</span>

      <div className="toolbar__legend">
        {selections.map((_, si) => (
          <div key={si} className="toolbar__legend-item">
            <span className="toolbar__legend-swatch" style={{ background: SEG_COLORS[si % SEG_COLORS.length] }} />
            <span>Seg {si + 1}</span>
          </div>
        ))}
        {nGap > 0 && (
          <div className="toolbar__legend-item">
            <span className="toolbar__legend-swatch toolbar__legend-swatch--gap" />
            <span>Gap</span>
          </div>
        )}
        <div className="toolbar__legend-item">
          <span className="toolbar__legend-swatch toolbar__legend-swatch--raw" />
          <span>Raw</span>
        </div>
      </div>

      <div className="toolbar__actions">
        <button
          className={`toolbar__btn${!canUndo ? ' toolbar__btn--disabled' : ''}`}
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          ↩ Undo
        </button>
        {hasZoom && (
          <button className="toolbar__btn" onClick={onResetZoom}>
            Reset zoom
          </button>
        )}
      </div>
    </div>
  );
}
