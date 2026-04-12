export function Header({ onHome }) {
  return (
    <header className="header">
      <div className="header__left">
        {onHome && (
          <button className="header__back" onClick={onHome} aria-label="Back to home">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M 8 2 L 4 6 L 8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            tcurves
          </button>
        )}
        <div className="header__brand">
          <div className="header__logo" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 10 Q5 4 7 7 Q9 10 12 3" stroke="white" strokeWidth="1.75" strokeLinecap="round" fill="none" />
            </svg>
          </div>
          <span className="header__title">Visual TCC Editor</span>
        </div>
      </div>
      <span className="header__subtitle">box select · λ per segment · log-log spline</span>
    </header>
  );
}
