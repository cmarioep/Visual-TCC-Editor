import { useEffect, useCallback } from 'react';
import { renderToCanvas } from '../../lib/renderer';
import { Toolbar } from './Toolbar';
import { Tooltip } from './Tooltip';

export function Chart({
  // refs owned by useCanvasInteraction
  canvasRef,
  containerRef,
  stateRef,
  // data
  rawPts,
  selections,
  output,
  // viewport
  xRange,
  yRange,
  // interaction state
  dragBox,
  hoveredPt,
  draggingPt,
  panning,
  dragging,
  // event handlers
  handlers,
  // toolbar
  canUndo,
  hasZoom,
  onUndo,
  onResetZoom,
}) {
  const nGap = output?.gapPts?.length ?? 0;

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const cont = containerRef.current;
    if (!canvas || !cont) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = cont.clientWidth * dpr;
    canvas.height = cont.clientHeight * dpr;
    canvas.style.width = cont.clientWidth + 'px';
    canvas.style.height = cont.clientHeight + 'px';
    stateRef.current = renderToCanvas(canvas, rawPts, selections, output, {
      dpr,
      xRange,
      yRange,
      dragBox,
      hoveredPtIdx: hoveredPt?.idx ?? null,
      isDraggingPt: !!draggingPt,
    });
  }, [rawPts, selections, output, xRange, yRange, dragBox, hoveredPt, draggingPt,
    canvasRef, containerRef, stateRef]);

  useEffect(() => {
    redraw();
    const ro = new ResizeObserver(redraw);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [redraw, containerRef]);

  const cursor = draggingPt
    ? 'grabbing'
    : hoveredPt && !dragging
      ? 'grab'
      : panning
        ? 'grabbing'
        : 'crosshair';

  const hintText = draggingPt
    ? 'punto activo — click para fijar · Esc cancela'
    : panning
      ? 'arrastrando vista…'
      : dragging
        ? 'click en esquina opuesta para confirmar selección · Esc cancela'
        : 'click en punto → moverlo · click en vacío → iniciar selección · medio → pan · scroll → zoom';

  return (
    <div className="chart">
      <Toolbar
        selections={selections}
        nGap={nGap}
        canUndo={canUndo}
        hasZoom={hasZoom}
        onUndo={onUndo}
        onResetZoom={onResetZoom}
      />
      <div
        className="chart__canvas-wrapper"
        ref={containerRef}
        style={{ cursor }}
        onMouseDown={handlers.onMouseDown}
        onMouseMove={handlers.onMouseMove}
        onMouseUp={handlers.onMouseUp}
        onMouseLeave={handlers.onMouseLeave}
        onWheel={handlers.onWheel}
        onContextMenu={e => e.preventDefault()}
      >
        <canvas ref={canvasRef} className="chart__canvas" />
        <p className="chart__hint">{hintText}</p>
        {hoveredPt && !dragging && !panning && (
          <Tooltip hoveredPt={hoveredPt} containerRef={containerRef} />
        )}
      </div>
    </div>
  );
}
