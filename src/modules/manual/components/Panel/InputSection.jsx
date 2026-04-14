import { useState } from 'react';
import { PointsTable } from './PointsTable';

export function InputSection({ inputText, onChange, onParse, parseError, rawPts, onApplyPoints, onClear }) {
  const [mode, setMode] = useState('text');
  const [tableKey, setTableKey] = useState(0);

  const switchToTable = () => {
    setTableKey(k => k + 1);
    setMode('table');
  };

  const handleClear = () => {
    setTableKey(k => k + 1);
    onClear();
  };

  return (
    <section className="panel__section">
      <h2 className="panel__section-title panel__section-title--row">
        <span className="input-block__title-label">
          Input data
          {mode === 'text' && (
            <span className="input-block__info">
              ⓘ
              <span className="input-block__tooltip">
                Separators: tab, comma, semicolon or space. Column headers are optional.
              </span>
            </span>
          )}
        </span>
        <span className="input-block__title-actions">
          <button
            className="input-block__clear"
            onClick={handleClear}
            title="Clear all data"
            disabled={mode === 'text' ? !inputText : false}
          >
            Clear
          </button>
        </span>
      </h2>
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
            <div className={`input-block__textarea-wrap${parseError ? ' input-block__textarea-wrap--error' : ''}`}>
              <textarea
                className="input-block__textarea"
                value={inputText}
                onChange={e => onChange(e.target.value)}
                placeholder={'X\tY\n12\t1000\n11\t966\n10\t600\n\n(pega desde Excel, headers opcionales)'}
                spellCheck={false}
              />
            </div>
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
