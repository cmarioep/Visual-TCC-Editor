export function Tooltip({ hoveredPt, containerRef }) {
  if (!hoveredPt) return null;

  const TOOLTIP_W = 130;
  const containerW = containerRef.current?.clientWidth || 800;
  const containerH = containerRef.current?.clientHeight || 600;
  const tx =
    hoveredPt.screenX + 14 + TOOLTIP_W > containerW
      ? hoveredPt.screenX - TOOLTIP_W - 10
      : hoveredPt.screenX + 14;
  const ty = Math.max(8, Math.min(hoveredPt.screenY - 28, containerH - 60));

  return (
    <div className="tooltip" style={{ left: tx, top: ty }}>
      <div className="tooltip__label">Raw point</div>
      <div className="tooltip__values">
        <span>
          <span className="tooltip__axis">I </span>
          <span className="tooltip__val">{hoveredPt.x} A</span>
        </span>
        <span>
          <span className="tooltip__axis">t </span>
          <span className="tooltip__val">{hoveredPt.y} s</span>
        </span>
      </div>
    </div>
  );
}
