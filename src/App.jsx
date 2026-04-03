import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

import { SAMPLE } from './lib/constants';
import { parseInput } from './lib/parser';
import { buildOutput } from './lib/buildOutput';

import { useHistory } from './hooks/useHistory';
import { useViewport } from './hooks/useViewport';
import { useExport } from './hooks/useExport';
import { useCanvasInteraction } from './hooks/useCanvasInteraction';

import { Header } from './components/Header/Header';
import { Panel } from './components/Panel/Panel';
import { Chart } from './components/Chart/Chart';

export default function App() {
  const [inputText, setInputText]     = useState(SAMPLE);
  const [parseError, setParseError]   = useState(null);
  const [rawPts, setRawPts]           = useState(null);
  const [selections, setSelections]   = useState([]);
  const [curveName, setCurveName]     = useState('curve_mm');
  const [nextId, setNextId]           = useState(1);

  // Refs for synchronous reads inside interaction handlers (avoids nested setters)
  const selectionsRef = useRef(selections);
  selectionsRef.current = selections;
  const rawPtsRef = useRef(rawPts);
  rawPtsRef.current = rawPts;

  const history  = useHistory({ selections: [], rawPts: null });
  const viewport = useViewport();
  const output   = useMemo(() => buildOutput(rawPts, selections), [rawPts, selections]);

  const interaction = useCanvasInteraction({
    rawPts,
    setRawPts,
    selectionsRef,
    setSelections,
    xRange:       viewport.xRange,
    yRange:       viewport.yRange,
    setXRange:    viewport.setXRange,
    setYRange:    viewport.setYRange,
    historyPush:  history.push,
    nextId,
    setNextId,
  });

  const exportHook = useExport(output, curveName);

  // ── Parsing ───────────────────────────────────────────────────────────────────
  const handleParse = useCallback(() => {
    const res = parseInput(inputText);
    if (res.ok) {
      const sorted = res.data
        .sort((a, b) => a.x - b.x)
        .map((p, i) => ({ ...p, _id: i }));
      setRawPts(sorted);
      setSelections([]);
      setParseError(null);
      viewport.reset();
      history.push({ selections: [], rawPts: sorted });
    } else {
      setParseError(res.error);
    }
  }, [inputText, viewport, history]);

  // Parse on mount with sample data
  useEffect(() => { handleParse(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Direct point injection (Table mode) ──────────────────────────────────────
  const handleApplyPoints = useCallback((pts) => {
    const sorted = [...pts]
      .sort((a, b) => a.x - b.x)
      .map((p, i) => ({ ...p, _id: i }));
    setRawPts(sorted);
    setSelections([]);
    setParseError(null);
    viewport.reset();
    history.push({ selections: [], rawPts: sorted });
  }, [viewport, history]);

  // ── Selection management ──────────────────────────────────────────────────────
  const handleUpdateLambda = useCallback((id, lambda) => {
    setSelections(prev => prev.map(s => s.id === id ? { ...s, lambda } : s));
  }, []);

  const handleRemoveSelection = useCallback((id) => {
    const next = selectionsRef.current.filter(s => s.id !== id);
    setSelections(next);
    history.push({ selections: next, rawPts: rawPtsRef.current });
  }, [history]);

  // ── Undo ──────────────────────────────────────────────────────────────────────
  const applySnapshot = useCallback((snap) => {
    if (snap.rawPts) setRawPts(snap.rawPts);
    setSelections(snap.selections ?? []);
  }, []);

  const handleUndo = useCallback(() => {
    applySnapshot(history.undo());
  }, [history, applySnapshot]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        interaction.cancelAll(history.getCurrent().rawPts);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        applySnapshot(history.undo());
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [interaction, history, applySnapshot]);

  // ── Derived counts ────────────────────────────────────────────────────────────
  const nRaw = rawPts?.length ?? 0;
  const nOut = output?.outputPts?.length ?? 0;
  const nGap = output?.gapPts?.length ?? 0;

  return (
    <div className="app">
      <Header />
      <div className="app__body">
        <Panel
          // input
          inputText={inputText}
          parseError={parseError}
          onInputChange={setInputText}
          onParse={handleParse}
          onApplyPoints={handleApplyPoints}
          // stats
          nRaw={nRaw}
          nOut={nOut}
          nGap={nGap}
          // selections
          selections={selections}
          rawPts={rawPts}
          onRemoveSelection={handleRemoveSelection}
          onLambdaChange={handleUpdateLambda}
          // export
          curveName={curveName}
          onCurveNameChange={setCurveName}
          onCopyJSON={exportHook.copyJSON}
          onExportTXT={exportHook.exportTXT}
          copied={exportHook.copied}
          downloadMsg={exportHook.downloadMsg}
        />
        <Chart
          canvasRef={interaction.canvasRef}
          containerRef={interaction.containerRef}
          stateRef={interaction.stateRef}
          rawPts={rawPts}
          selections={selections}
          output={output}
          xRange={viewport.xRange}
          yRange={viewport.yRange}
          dragBox={interaction.dragBox}
          hoveredPt={interaction.hoveredPt}
          draggingPt={interaction.draggingPt}
          panning={interaction.panning}
          dragging={interaction.dragging}
          handlers={interaction.handlers}
          canUndo={history.canUndo}
          hasZoom={viewport.hasZoom}
          onUndo={handleUndo}
          onResetZoom={viewport.reset}
        />
      </div>
    </div>
  );
}
