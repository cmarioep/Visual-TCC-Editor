import { fmtN } from '../../lib/renderer';
import { SEG_COLORS } from '../../lib/constants';

export function SegmentCard({ sel, index, pointCount, onRemove, onLambdaChange }) {
  const color = SEG_COLORS[index % SEG_COLORS.length];

  return (
    <article className="seg-card">
      <div className="seg-card__header">
        <span className="seg-card__dot" style={{ background: color }} aria-hidden="true" />
        <span className="seg-card__name">Seg {index + 1}</span>
        <span className="seg-card__count">{pointCount} pts</span>
        <button className="seg-card__remove" onClick={() => onRemove(sel.id)} aria-label="Eliminar segmento">
          ×
        </button>
      </div>
      <div className="seg-card__body">
        <p className="seg-card__range">
          x: [{fmtN(sel.xMin)} – {fmtN(sel.xMax)}] &nbsp;
          y: [{fmtN(sel.yMin)} – {fmtN(sel.yMax)}]
        </p>
        <div className="seg-card__lambda">
          <span className="seg-card__lambda-label">λ</span>
          <input
            className="seg-card__lambda-slider"
            type="range"
            style={{ accentColor: color }}
            min="0" max="0.1" step="0.002"
            value={sel.lambda}
            onChange={e => onLambdaChange(sel.id, +e.target.value)}
          />
          <span className="seg-card__lambda-value">{sel.lambda.toFixed(2)}</span>
        </div>
        <div className="seg-card__lambda-hints">
          <span>interpolate</span><span>smooth</span>
        </div>
      </div>
    </article>
  );
}
