export function InputSection({ inputText, onChange, onParse, parseError }) {
  return (
    <section className="panel__section">
      <h2 className="panel__section-title">Input data</h2>
      <textarea
        className={`input-block__textarea${parseError ? ' input-block__textarea--error' : ''}`}
        value={inputText}
        onChange={e => onChange(e.target.value)}
        placeholder={'JSON: [{x,y}, ...]\nCSV:  x,y por línea'}
        spellCheck={false}
      />
      {parseError && <p className="input-block__error">{parseError}</p>}
      <button className="input-block__submit" onClick={onParse}>
        Parse &amp; Process
      </button>
    </section>
  );
}
