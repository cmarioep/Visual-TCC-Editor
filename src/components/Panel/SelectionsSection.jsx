import { SegmentCard } from './SegmentCard';

export function SelectionsSection({ selections, rawPts, onRemove, onLambdaChange, nGap }) {
  const count = selections.length;

  return (
    <section className="panel__section panel__section--grow">
      <h2 className="panel__section-title">
        Selections
        {count > 0 && (
          <span className="panel__section-badge">
            {count} segmento{count !== 1 ? 's' : ''}
          </span>
        )}
      </h2>

      {count === 0 && (
        <p className="selections__empty">
          Arrastra un rectángulo<br />sobre la gráfica para<br />seleccionar un tramo
        </p>
      )}

      {selections.map((sel, si) => {
        const inside = rawPts?.filter(
          p => p.x >= sel.xMin && p.x <= sel.xMax && p.y >= sel.yMin && p.y <= sel.yMax
        ).length ?? 0;
        return (
          <SegmentCard
            key={sel.id}
            sel={sel}
            index={si}
            pointCount={inside}
            onRemove={onRemove}
            onLambdaChange={onLambdaChange}
          />
        );
      })}

      {nGap > 0 && (
        <div className="selections__gap-badge">
          <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true">
            <circle cx="4" cy="4" r="3" fill="none" stroke="#94a3b8" strokeWidth="1.5" />
          </svg>
          {nGap} gap pt{nGap !== 1 ? 's' : ''} → raw (sin suavizar)
        </div>
      )}
    </section>
  );
}
