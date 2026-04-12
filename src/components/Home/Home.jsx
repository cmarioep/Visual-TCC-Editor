const MODULES = [
  {
    id: 'manual',
    name: 'Manual Curve Fit',
    desc: 'Segmented spline · per-segment λ · log-log',
    color: '#1d6fce',
    available: true,
  },
  {
    id: 'mcb',
    name: 'MCB IEC 60898-1',
    desc: 'Class B / C / D trip bands',
    color: '#1d9e75',
    available: true,
  },
  {
    id: 'mccb',
    name: 'MCCB',
    desc: 'Thermal-magnetic characteristic',
    color: '#f59e0b',
    available: false,
  },
];

// ── Shared log-log grid for card curve areas ──────────────────────────────────
function CardGrid() {
  return (
    <>
      {/* Decade lines */}
      <line x1="80"  y1="0"  x2="80"  y2="88" stroke="#253447" strokeWidth="0.7" />
      <line x1="0"   y1="44" x2="160" y2="44" stroke="#253447" strokeWidth="0.7" />
      {/* Subdivision lines */}
      <line x1="24"  y1="0"  x2="24"  y2="88" stroke="#1e293b" strokeWidth="0.4" />
      <line x1="56"  y1="0"  x2="56"  y2="88" stroke="#1e293b" strokeWidth="0.4" />
      <line x1="104" y1="0"  x2="104" y2="88" stroke="#1e293b" strokeWidth="0.4" />
      <line x1="136" y1="0"  x2="136" y2="88" stroke="#1e293b" strokeWidth="0.4" />
      <line x1="0"   y1="13" x2="160" y2="13" stroke="#1e293b" strokeWidth="0.4" />
      <line x1="0"   y1="31" x2="160" y2="31" stroke="#1e293b" strokeWidth="0.4" />
      <line x1="0"   y1="57" x2="160" y2="57" stroke="#1e293b" strokeWidth="0.4" />
      <line x1="0"   y1="75" x2="160" y2="75" stroke="#1e293b" strokeWidth="0.4" />
    </>
  );
}

// ── Brand symbol — inverse-time TCC curve on log-log axes ────────────────────
function TCCSymbol() {
  return (
    <svg width="52" height="52" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      {/* Axes */}
      <line x1="7" y1="4"  x2="7"  y2="60" stroke="#334155" strokeWidth="1" />
      <line x1="7" y1="60" x2="62" y2="60" stroke="#334155" strokeWidth="1" />
      {/* Decade grid */}
      <line x1="7"  y1="32" x2="62" y2="32" stroke="#253447" strokeWidth="0.6" />
      <line x1="35" y1="4"  x2="35" y2="60" stroke="#253447" strokeWidth="0.6" />
      {/* Subdivision grid */}
      <line x1="7"  y1="19" x2="62" y2="19" stroke="#1e293b" strokeWidth="0.4" />
      <line x1="7"  y1="46" x2="62" y2="46" stroke="#1e293b" strokeWidth="0.4" />
      <line x1="20" y1="4"  x2="20" y2="60" stroke="#1e293b" strokeWidth="0.4" />
      <line x1="49" y1="4"  x2="49" y2="60" stroke="#1e293b" strokeWidth="0.4" />
      {/* Inverse-time TCC curve */}
      <path
        d="M 7 5 C 10 14, 22 42, 30 52 C 38 59, 52 60, 62 60"
        stroke="#1d6fce"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

// ── Module curve fingerprints ─────────────────────────────────────────────────
function ManualCurveIcon() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 160 88" fill="none" preserveAspectRatio="xMidYMid meet">
      <CardGrid />
      <path
        d="M 10 8 C 18 15, 28 50, 46 67 C 62 78, 106 82, 150 83"
        stroke="#1d6fce"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function MCBCurveIcon() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 160 88" fill="none" preserveAspectRatio="xMidYMid meet">
      <CardGrid />
      {/* Trip band fill */}
      <path
        d="M 10 6 C 18 11, 30 48, 50 65 C 68 76, 112 80, 150 81
           L 150 85 C 112 84, 72 80, 54 73 C 34 62, 22 26, 10 18 Z"
        fill="rgba(14,167,96,0.1)"
      />
      {/* Upper boundary */}
      <path
        d="M 10 6 C 18 11, 30 48, 50 65 C 68 76, 112 80, 150 81"
        stroke="#0ea760"
        strokeWidth="1.75"
        strokeLinecap="round"
        fill="none"
      />
      {/* Lower boundary */}
      <path
        d="M 10 18 C 20 24, 34 60, 54 73 C 72 80, 112 84, 150 85"
        stroke="#0ea760"
        strokeWidth="1.25"
        strokeLinecap="round"
        fill="none"
        strokeDasharray="5 2.5"
      />
    </svg>
  );
}

function MCCBCurveIcon() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 160 88" fill="none" preserveAspectRatio="xMidYMid meet">
      <CardGrid />
      {/* Instantaneous zone */}
      <rect x="65" y="5" width="90" height="77" fill="rgba(245,158,11,0.06)" />
      <line x1="65" y1="5" x2="65" y2="82" stroke="#f59e0b" strokeWidth="0.75" strokeDasharray="3 2" />
      {/* Overload + instantaneous curve */}
      <path
        d="M 10 6 C 14 12, 38 62, 65 76 L 65 82 L 150 82"
        stroke="#f59e0b"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

const CURVE_ICONS = {
  manual: ManualCurveIcon,
  mcb:    MCBCurveIcon,
  mccb:   MCCBCurveIcon,
};

// ── Home ──────────────────────────────────────────────────────────────────────
export default function Home({ onSelectModule }) {
  return (
    <div className="home">

      <div className="home__brand">
        <div className="home__wordmark">
          <TCCSymbol />
          <span className="home__name">tcurves</span>
        </div>
        <p className="home__tagline">Protection Coordination Toolkit</p>
      </div>

      <div className="home__modules">
        {MODULES.map((mod) => {
          const CurveIcon = CURVE_ICONS[mod.id];
          return (
            <div
              key={mod.id}
              className={`module-card ${mod.available ? 'module-card--available' : 'module-card--disabled'}`}
              style={{ '--module-color': mod.color }}
              onClick={mod.available ? () => onSelectModule(mod.id) : undefined}
              role={mod.available ? 'button' : undefined}
              tabIndex={mod.available ? 0 : undefined}
              onKeyDown={mod.available ? (e) => e.key === 'Enter' && onSelectModule(mod.id) : undefined}
            >
              <div className="module-card__curve">
                <CurveIcon />
              </div>
              <div className="module-card__info">
                <span className="module-card__name">{mod.name}</span>
                <span className="module-card__desc">{mod.desc}</span>
              </div>
              <div className="module-card__footer">
                {mod.available ? (
                  <span className="module-card__action">
                    Open
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path d="M 2 6 L 10 6 M 6.5 2.5 L 10 6 L 6.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                ) : (
                  <span className="module-card__badge">coming soon</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <span className="home__version">v0.1.0</span>
    </div>
  );
}
