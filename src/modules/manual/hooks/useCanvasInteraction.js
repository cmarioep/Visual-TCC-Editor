import { useState, useRef, useCallback } from 'react';

/**
 * Manages all canvas mouse interaction: box selection, point drag, pan, zoom.
 *
 * Owns: canvasRef, containerRef, stateRef (canvas render state), and all
 * transient interaction state (dragging, dragBox, panning, hoveredPt, draggingPt).
 *
 * Callers must pass refs (selectionsRef, rawPtsRef) for synchronous reads of
 * state that also lives outside this hook, avoiding nested-setState anti-patterns.
 */
export function useCanvasInteraction({
  rawPts,
  setRawPts,
  selectionsRef,
  setSelections,
  xRange,
  yRange,
  setXRange,
  setYRange,
  historyPush,
  nextId,
  setNextId,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  // Stores the last renderToCanvas() result — used for hit-testing in handlers.
  const stateRef = useRef(null);

  const [dragging, setDragging] = useState(null);  // anchor {x,y} for box select
  const [dragBox, setDragBox] = useState(null);    // live box rect
  const [panning, setPanning] = useState(null);    // pan origin
  const [hoveredPt, setHoveredPt] = useState(null);
  const [draggingPt, setDraggingPt] = useState(null); // { id } of grabbed raw point

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const getScreenCoords = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / rect.width;
    return {
      mx: (e.clientX - rect.left) * dpr,
      my: (e.clientY - rect.top) * dpr,
      dpr,
      rect,
    };
  }, []);

  const getDataCoords = useCallback((e) => {
    const s = stateRef.current;
    if (!s) return null;
    const sc = getScreenCoords(e);
    if (!sc) return null;
    const { mx, my } = sc;
    const { PAD, PW, PH } = s;
    if (mx < PAD.left || mx > PAD.left + PW || my < PAD.top || my > PAD.top + PH) return null;
    return { x: s.fromX(mx), y: s.fromY(my) };
  }, [getScreenCoords]);

  const findNearestRawPt = useCallback((e) => {
    const s = stateRef.current;
    if (!s || !rawPts) return null;
    const sc = getScreenCoords(e);
    if (!sc) return null;
    const { mx, my, dpr } = sc;
    const HIT = 16 * dpr;
    let bestId = null, bestDist = Infinity;
    rawPts.forEach((p) => {
      if (p.x <= 0 || p.y <= 0) return;
      const dist = Math.hypot(mx - s.toX(p.x), my - s.toY(p.y));
      if (dist < bestDist) { bestDist = dist; bestId = p._id; }
    });
    return bestId !== null && bestDist < HIT ? { id: bestId, dist: bestDist } : null;
  }, [rawPts, getScreenCoords]);

  // ── cancelAll: called from ManualModule.jsx on Escape ────────────────────────

  const cancelAll = useCallback((restoredRawPts) => {
    setDragging(null);
    setDragBox(null);
    if (draggingPt && restoredRawPts) setRawPts(restoredRawPts);
    setDraggingPt(null);
    setHoveredPt(null);
  }, [draggingPt, setRawPts]);

  // ── Mouse handlers ────────────────────────────────────────────────────────────

  const handleMouseDown = useCallback((e) => {
    // Middle button → start pan
    if (e.button === 1) {
      e.preventDefault();
      if (!rawPts) return;
      const allX = rawPts.map(p => p.x), allY = rawPts.map(p => p.y);
      const curXRange = xRange || [Math.min(...allX) * 0.5, Math.max(...allX) * 2];
      const curYRange = yRange || [Math.min(...allY) * 0.3, Math.max(...allY) * 3];
      setPanning({ startX: e.clientX, startY: e.clientY, startXRange: curXRange, startYRange: curYRange });
      return;
    }
    if (e.button !== 0) return;
    e.preventDefault();

    // Grabbed point: 2nd click → place it
    if (draggingPt) {
      const coords = getDataCoords(e);
      if (coords) {
        const newX = Math.max(coords.x, 0.01);
        const newY = Math.max(coords.y, 1e-6);
        const updated = rawPts.map(p => p._id === draggingPt.id ? { ...p, x: newX, y: newY } : p);
        const sorted = [...updated].sort((a, b) => a.x - b.x);
        setRawPts(sorted);
        historyPush({ rawPts: sorted, selections: selectionsRef.current });
      }
      setDraggingPt(null);
      setHoveredPt(null);
      return;
    }

    // Click near raw point → grab it
    const nearest = findNearestRawPt(e);
    if (nearest) {
      setDraggingPt({ id: nearest.id });
      setHoveredPt(null);
      return;
    }

    // Empty space
    const coords = getDataCoords(e);
    if (!coords) return;

    if (dragging) {
      // 2nd click → confirm selection box
      const box = {
        xMin: Math.min(dragging.x, coords.x),
        xMax: Math.max(dragging.x, coords.x),
        yMin: Math.min(dragging.y, coords.y),
        yMax: Math.max(dragging.y, coords.y),
      };
      const s = stateRef.current;
      if (s) {
        const pxW = Math.abs(s.toX(box.xMax) - s.toX(box.xMin));
        const pxH = Math.abs(s.toY(box.yMin) - s.toY(box.yMax));
        if (pxW > 10 && pxH > 10) {
          const inside = rawPts?.filter(
            p => p.x >= box.xMin && p.x <= box.xMax && p.y >= box.yMin && p.y <= box.yMax
          );
          if (inside?.length >= 2) {
            const id = nextId;
            setNextId(n => n + 1);
            const newSel = { ...box, lambda: 0.05, id };
            const nextSelections = [...selectionsRef.current, newSel];
            setSelections(nextSelections);
            historyPush({ selections: nextSelections, rawPts });
          }
        }
      }
      setDragging(null);
      setDragBox(null);
    } else {
      // 1st click → set anchor
      setDragging(coords);
      setDragBox({ xMin: coords.x, xMax: coords.x, yMin: coords.y, yMax: coords.y });
    }
  }, [
    draggingPt, dragging, rawPts, selectionsRef, xRange, yRange,
    nextId, setNextId, setRawPts, setSelections, historyPush,
    getDataCoords, findNearestRawPt,
  ]);

  const handleMouseMove = useCallback((e) => {
    const s = stateRef.current, canvas = canvasRef.current;
    if (!s || !canvas) return;
    const sc = getScreenCoords(e);
    if (!sc) return;
    const { mx, my, dpr, rect } = sc;
    const { PAD, PW, PH } = s;
    const inPlot = mx >= PAD.left && mx <= PAD.left + PW && my >= PAD.top && my <= PAD.top + PH;

    // Grabbed point follows cursor
    if (draggingPt) {
      const coords = getDataCoords(e);
      if (coords) {
        const newX = Math.max(coords.x, 0.01);
        const newY = Math.max(coords.y, 1e-6);
        setRawPts(prev => prev.map(p => p._id === draggingPt.id ? { ...p, x: newX, y: newY } : p));
        setHoveredPt({
          id: draggingPt.id,
          x: +newX.toFixed(3),
          y: +newY.toFixed(6),
          screenX: e.clientX - rect.left,
          screenY: e.clientY - rect.top - 44,
        });
      }
      return;
    }

    // Hover: highlight nearest raw point
    if (!dragging && !panning && inPlot && rawPts) {
      let bestIdx = null, bestDist = Infinity;
      rawPts.forEach((p, i) => {
        if (p.x <= 0 || p.y <= 0) return;
        const dist = Math.hypot(mx - s.toX(p.x), my - s.toY(p.y));
        if (dist < bestDist) { bestDist = dist; bestIdx = i; }
      });
      if (bestIdx !== null && bestDist < 18 * dpr) {
        const p = rawPts[bestIdx];
        setHoveredPt({
          id: p._id, idx: bestIdx, x: p.x, y: p.y,
          screenX: s.toX(p.x) / dpr,
          screenY: s.toY(p.y) / dpr,
        });
      } else {
        setHoveredPt(null);
      }
    }

    // Pan with middle button
    if (panning) {
      const dxPx = (e.clientX - panning.startX) * dpr;
      const dyPx = (e.clientY - panning.startY) * dpr;
      const { lxMin, lxMax, lyMin, lyMax, PW: pw, PH: ph } = s;
      const dLogX = dxPx / pw * (lxMax - lxMin);
      const dLogY = dyPx / ph * (lyMax - lyMin);
      const [x0, x1] = panning.startXRange;
      const [y0, y1] = panning.startYRange;
      setXRange([Math.pow(10, Math.log10(x0) - dLogX), Math.pow(10, Math.log10(x1) - dLogX)]);
      setYRange([Math.pow(10, Math.log10(y0) + dLogY), Math.pow(10, Math.log10(y1) + dLogY)]);
      return;
    }

    // Update live drag box
    if (!dragging) return;
    const coords = getDataCoords(e);
    if (!coords) return;
    setDragBox({
      xMin: Math.min(dragging.x, coords.x),
      xMax: Math.max(dragging.x, coords.x),
      yMin: Math.min(dragging.y, coords.y),
      yMax: Math.max(dragging.y, coords.y),
    });
  }, [dragging, panning, draggingPt, rawPts, setRawPts, setXRange, setYRange, getDataCoords, getScreenCoords]);

  const handleMouseUp = useCallback((e) => {
    if (e.button === 1) setPanning(null);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (dragging) { setDragging(null); setDragBox(null); }
    if (panning) setPanning(null);
    if (!draggingPt) setHoveredPt(null);
  }, [dragging, panning, draggingPt]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const s = stateRef.current;
    if (!s || !rawPts) return;
    const sc = getScreenCoords(e);
    if (!sc) return;
    const { mx, my } = sc;
    const lxM = s.lxMin + (mx - s.PAD.left) / s.PW * (s.lxMax - s.lxMin);
    const lyM = s.lyMin + (s.PH - (my - s.PAD.top)) / s.PH * (s.lyMax - s.lyMin);
    const f = e.deltaY > 0 ? 1.25 : 0.8;

    const X_MIN = 1e-4, X_MAX = 1e5, Y_MIN = 1e-6, Y_MAX = 1e5;
    const MIN_SPAN_X = 1, MIN_SPAN_Y = 0.001;

    const newXMin = Math.max(Math.pow(10, lxM - (lxM - s.lxMin) * f), X_MIN);
    const newXMax = Math.min(Math.pow(10, lxM + (s.lxMax - lxM) * f), X_MAX);
    const newYMin = Math.max(Math.pow(10, lyM - (lyM - s.lyMin) * f), Y_MIN);
    const newYMax = Math.min(Math.pow(10, lyM + (s.lyMax - lyM) * f), Y_MAX);

    if (newXMax - newXMin >= MIN_SPAN_X) setXRange([newXMin, newXMax]);
    if (newYMax - newYMin >= MIN_SPAN_Y) setYRange([newYMin, newYMax]);
  }, [rawPts, setXRange, setYRange, getScreenCoords]);

  return {
    canvasRef,
    containerRef,
    stateRef,
    dragging,
    dragBox,
    panning,
    hoveredPt,
    draggingPt,
    cancelAll,
    handlers: {
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onMouseLeave: handleMouseLeave,
      onWheel: handleWheel,
    },
  };
}
