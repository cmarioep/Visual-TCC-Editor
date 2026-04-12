export function BackButton({ onClick }) {
  return (
    <button className="back-btn" onClick={onClick} aria-label="Volver al inicio">
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <path d="M 8 2 L 4 6 L 8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      tcurves
    </button>
  );
}
