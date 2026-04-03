import { useState } from 'react';
import { PointsTable } from './PointsTable';

export function InputSection({ inputText, onChange, onParse, parseError, rawPts, onApplyPoints }) {
  const [mode, setMode] = useState('text');
  const [tableKey, setTableKey] = useState(0);

  const switchToTable = () => {
    setTableKey(k => k + 1);
    setMode('table');
  };

  return (
    <section className="panel__section">
      <h2 className="panel__section-title">Input data</h2>
      <div className="input-block__tabs">
        <button
          className={`input-block__tab${mode === 'text' ? ' input-block__tab--active' : ''}`}
          onClick={() => setMode('text')}
        >Text</button>
        <button
          className={`input-block__tab${mode === 'table' ? ' input-block__tab--active' : ''}`}
          onClick={switchToTable}
        >Table</button>
      </div>

      <div className="input-block__mode">
        {mode === 'text' ? (
          <>
            <textarea
              className={`input-block__textarea${parseError ? ' input-block__textarea--error' : ''}`}
              value={inputText}
              onChange={e => onChange(e.target.value)}
              placeholder={'X\tY\n12\t1000\n11\t966\n10\t600\n\n(pega desde Excel, headers opcionales)'}
              spellCheck={false}
            />
            {parseError && <p className="input-block__error">{parseError}</p>}
            <button className="input-block__submit" onClick={onParse}>
              Parse &amp; Process
            </button>
          </>
        ) : (
          <PointsTable
            key={tableKey}
            initialPts={rawPts}
            onApply={onApplyPoints}
          />
        )}
      </div>
    </section>
  );
}
