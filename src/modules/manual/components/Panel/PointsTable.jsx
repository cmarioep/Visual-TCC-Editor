import { useState, useRef, useEffect } from 'react';

export function PointsTable({ initialPts, onApply }) {
  const EMPTY_ROWS = 5;
  const [rows, setRows] = useState(() =>
    initialPts?.length
      ? initialPts.map(p => ({ x: String(p.x), y: String(p.y) }))
      : Array.from({ length: EMPTY_ROWS }, () => ({ x: '', y: '' }))
  );
  const [error, setError] = useState(null);
  const [shouldFocusLast, setShouldFocusLast] = useState(false);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (shouldFocusLast && bodyRef.current) {
      const inputs = bodyRef.current.querySelectorAll('.points-table__cell');
      inputs[inputs.length - 2]?.focus();
      setShouldFocusLast(false);
    }
  }, [rows.length, shouldFocusLast]);

  const addRow = () => {
    setRows(r => [...r, { x: '', y: '' }]);
    setShouldFocusLast(true);
  };

  const removeRow = (i) =>
    setRows(r => r.length > 1 ? r.filter((_, idx) => idx !== i) : r);

  const updateRow = (i, field, val) =>
    setRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: val } : row));

  const handleKeyDown = (e, rowIndex) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const isLastRow = rowIndex === rows.length - 1;
      if (isLastRow) {
        addRow();
      } else {
        const inputs = bodyRef.current.querySelectorAll('.points-table__cell');
        inputs[(rowIndex + 1) * 2]?.focus();
      }
    }
  };

  const handleApply = () => {
    const pts = [];
    for (let i = 0; i < rows.length; i++) {
      const x = parseFloat(rows[i].x);
      const y = parseFloat(rows[i].y);
      if (isNaN(x) || isNaN(y)) {
        setError(`Row ${i + 1}: enter valid numbers for both fields`);
        return;
      }
      if (x <= 0 || y <= 0) {
        setError(`Row ${i + 1}: values must be positive (log scale)`);
        return;
      }
      pts.push({ x, y });
    }
    if (!pts.length) { setError('Add at least one point'); return; }
    setError(null);
    onApply(pts);
  };

  return (
    <div className="points-table">
      <div className="points-table__header">
        <span>X (time)</span>
        <span>Y (current)</span>
        <span />
      </div>
      <div className="points-table__body" ref={bodyRef}>
        {rows.map((row, i) => (
          <div key={i} className="points-table__row">
            <input
              className="points-table__cell"
              type="number"
              value={row.x}
              placeholder="x"
              onChange={e => updateRow(i, 'x', e.target.value)}
              onKeyDown={e => handleKeyDown(e, i)}
            />
            <input
              className="points-table__cell"
              type="number"
              value={row.y}
              placeholder="y"
              onChange={e => updateRow(i, 'y', e.target.value)}
              onKeyDown={e => handleKeyDown(e, i)}
            />
            <button
              className="points-table__remove"
              onClick={() => removeRow(i)}
              disabled={rows.length === 1}
              title="Remove row"
            >×</button>
          </div>
        ))}
      </div>
      {error && <p className="input-block__error">{error}</p>}
      <button className="points-table__add" onClick={addRow}>+ Add row</button>
      <button className="input-block__submit" onClick={handleApply}>Apply</button>
    </div>
  );
}
