import { useNavigate } from 'react-router-dom';

// ── Module config ─────────────────────────────────────────────────────────────
const MODULES = [
  {
    id: 'manual',
    name: 'Manual Curve Fit',
    desc: 'Define custom coordinates and fit curves to specific protection data points for proprietary equipment.',
    color: '#f59e0b',
    available: true,
  },
  {
    id: 'mcb',
    name: 'IEC 60898-1 MCB Curve',
    desc: 'Standard tripping characteristics for Miniature Circuit Breakers (B, C, D curves) per IEC standards.',
    color: '#3b82f6',
    available: true,
  },
  {
    id: 'mccb',
    name: 'MCCB Curve',
    desc: 'Molded Case Circuit Breaker analysis with adjustable thermal-magnetic and electronic trip settings.',
    color: '#10b981',
    available: false,
  },
  {
    id: 'relay',
    name: 'Relay Curve',
    desc: 'Sophisticated IDMT and definite time protection relay settings for complex industrial networks.',
    color: '#ef4444',
    available: false,
  },
];

// ── Log entries ───────────────────────────────────────────────────────────────
const LOG_ENTRIES = [
  '[06:24:12] INITIALIZING WAVEFORM RECONSTRUCTION...',
  'SUCCESS: LOADING TRANSFORMER_SET_01: IDMT...',
  '[06:24:12] MONITORING CHANNEL 94 ACTIVE',
  '[06:24:15] CURVE FIT ENGINE READY',
  'SUCCESS: IEC 60898-1 SOLVER INITIALIZED',
  '[06:24:18] PROTECTION COORDINATION SYSTEM ONLINE',
  '[06:24:21] LOADING MCB CURVE PARAMETERS: B/C/D',
  'SUCCESS: SPLINE INTERPOLATION MODULE LOADED',
  '[06:24:24] AWAITING USER INPUT...',
];

// ── Shared log-log grid ───────────────────────────────────────────────────────
function PreviewGrid() {
  return (
    <>
      <line x1="80" y1="0" x2="80" y2="88" stroke="#253447" strokeWidth="0.7" />
      <line x1="0" y1="44" x2="160" y2="44" stroke="#253447" strokeWidth="0.7" />
      <line x1="24" y1="0" x2="24" y2="88" stroke="#1e2d3d" strokeWidth="0.5" />
      <line x1="56" y1="0" x2="56" y2="88" stroke="#1e2d3d" strokeWidth="0.5" />
      <line x1="104" y1="0" x2="104" y2="88" stroke="#1e2d3d" strokeWidth="0.5" />
      <line x1="136" y1="0" x2="136" y2="88" stroke="#1e2d3d" strokeWidth="0.5" />
      <line x1="0" y1="13" x2="160" y2="13" stroke="#1e2d3d" strokeWidth="0.5" />
      <line x1="0" y1="31" x2="160" y2="31" stroke="#1e2d3d" strokeWidth="0.5" />
      <line x1="0" y1="57" x2="160" y2="57" stroke="#1e2d3d" strokeWidth="0.5" />
      <line x1="0" y1="75" x2="160" y2="75" stroke="#1e2d3d" strokeWidth="0.5" />
    </>
  );
}

// ── Curve preview SVGs ────────────────────────────────────────────────────────
function ManualPreview() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 160 88" fill="none" preserveAspectRatio="xMidYMid meet">
      <PreviewGrid />
      <path
        d="M 8 7 C 14 14, 26 40, 46 60 C 62 72, 100 80, 152 83"
        stroke="#f59e0b"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function MCBPreview() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 160 88" fill="none" preserveAspectRatio="xMidYMid meet">
      <PreviewGrid />
      {/* Trip band fill */}
      <path
        d="M 8 8 C 16 14, 30 46, 50 63 C 68 74, 110 78, 150 79
           L 150 84 C 110 83, 72 79, 52 70 C 32 57, 18 24, 8 18 Z"
        fill="rgba(59,130,246,0.1)"
      />
      {/* Upper boundary */}
      <path
        d="M 8 8 C 16 14, 30 46, 50 63 C 68 74, 110 78, 150 79"
        stroke="#3b82f6"
        strokeWidth="1.75"
        strokeLinecap="round"
        fill="none"
      />
      {/* Lower boundary */}
      <path
        d="M 8 18 C 18 26, 32 56, 52 70 C 72 79, 112 83, 150 84"
        stroke="#3b82f6"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeDasharray="5 2.5"
        fill="none"
      />
      {/* Magnetic vertical line */}
      <line x1="118" y1="5" x2="118" y2="79" stroke="#3b82f6" strokeWidth="0.75" strokeDasharray="3 2" />
    </svg>
  );
}

function MCCBPreview() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 160 88" fill="none" preserveAspectRatio="xMidYMid meet">
      <PreviewGrid />
      <rect x="64" y="5" width="90" height="77" fill="rgba(16,185,129,0.06)" />
      <line x1="64" y1="5" x2="64" y2="82" stroke="#10b981" strokeWidth="0.75" strokeDasharray="3 2" />
      <path
        d="M 8 6 C 14 12, 36 58, 64 74 L 64 82 L 152 82"
        stroke="#10b981"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function RelayPreview() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 160 88" fill="none" preserveAspectRatio="xMidYMid meet">
      <PreviewGrid />
      {/* IDMT curve */}
      <path
        d="M 8 5 C 12 12, 22 34, 36 54 C 50 68, 80 78, 152 82"
        stroke="#ef4444"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      {/* SI curve (second relay) */}
      <path
        d="M 8 12 C 12 18, 20 40, 34 60 C 50 72, 85 80, 152 83"
        stroke="#ef4444"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeDasharray="5 3"
        fill="none"
        opacity="0.5"
      />
    </svg>
  );
}

const CURVE_PREVIEWS = {
  manual: ManualPreview,
  mcb: MCBPreview,
  mccb: MCCBPreview,
  relay: RelayPreview,
};

// ── Card header icons (16px) ──────────────────────────────────────────────────
function IconManual() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M1 13 C3 9, 6 5, 9 4 C11 3, 13 3, 13 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <circle cx="3.5" cy="10.5" r="1.2" fill="currentColor" opacity="0.7" />
      <circle cx="9" cy="4.5" r="1.2" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

function IconMCB() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <line x1="2" y1="4" x2="12" y2="4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="2" y1="10" x2="8" y2="10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="11" cy="10" r="1.5" fill="currentColor" />
    </svg>
  );
}

function IconMCCB() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="1" y="7" width="3" height="6" rx="1" fill="currentColor" />
      <rect x="5" y="5" width="3" height="8" rx="1" fill="currentColor" />
      <rect x="9" y="3" width="3" height="10" rx="1" fill="currentColor" opacity="0.6" />
      <circle cx="2.5" cy="5" r="1.5" fill="currentColor" />
      <circle cx="6.5" cy="3" r="1.5" fill="currentColor" />
      <circle cx="10.5" cy="1.5" r="1.5" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

function IconRelay() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <line x1="7" y1="13" x2="7" y2="8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="7" y1="8" x2="3" y2="4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="7" y1="8" x2="11" y2="4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="7" y1="8" x2="7" y2="3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="7" cy="2" r="1.4" fill="currentColor" />
    </svg>
  );
}

// ── Corner decorative icons (large, faded) ────────────────────────────────────
function CornerManual() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true" className="module-card__corner-icon">
      <path d="M4 52 C12 36, 24 20, 36 14 C44 10, 52 10, 52 4" stroke="currentColor" strokeWidth="4" strokeLinecap="round" fill="none" />
      <circle cx="14" cy="42" r="5" fill="currentColor" opacity="0.6" />
      <circle cx="36" cy="16" r="5" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

function CornerMCB() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true" className="module-card__corner-icon">
      <line x1="8" y1="16" x2="48" y2="16" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <line x1="8" y1="28" x2="48" y2="28" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <line x1="8" y1="40" x2="30" y2="40" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <circle cx="43" cy="40" r="6" fill="currentColor" />
    </svg>
  );
}

function CornerMCCB() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true" className="module-card__corner-icon">
      <rect x="2" y="28" width="12" height="24" rx="3" fill="currentColor" />
      <rect x="20" y="20" width="12" height="32" rx="3" fill="currentColor" />
      <rect x="38" y="12" width="12" height="40" rx="3" fill="currentColor" opacity="0.6" />
      <circle cx="8" cy="20" r="6" fill="currentColor" />
      <circle cx="26" cy="12" r="6" fill="currentColor" />
      <circle cx="44" cy="5" r="6" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

function CornerRelay() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true" className="module-card__corner-icon">
      <line x1="28" y1="52" x2="28" y2="34" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <line x1="28" y1="34" x2="10" y2="16" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <line x1="28" y1="34" x2="46" y2="16" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <line x1="28" y1="34" x2="28" y2="10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      <circle cx="28" cy="6" r="6" fill="currentColor" />
    </svg>
  );
}

const HEADER_ICONS = { manual: IconManual, mcb: IconMCB, mccb: IconMCCB, relay: IconRelay };
const CORNER_ICONS = { manual: CornerManual, mcb: CornerMCB, mccb: CornerMCCB, relay: CornerRelay };

// ── Nav icons ─────────────────────────────────────────────────────────────────
function HelpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.5 6C5.5 4.6 6.6 3.5 8 3.5 9.4 3.5 10.5 4.6 10.5 6 10.5 7.4 8 8.5 8 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="11.5" r="0.8" fill="currentColor" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2a5 5 0 0 0-5 5v3l-1 1.5h12L13 10V7a5 5 0 0 0-5-5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M6.5 13.5a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// ── Home ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="home">

      {/* ── Navbar ────────────────────────────────────────────────────────── */}
      <nav className="home__nav">
        <div className="home__nav-actions">
          <button className="home__nav-link">DOCUMENTATION</button>
          <button className="home__nav-link">SETTINGS</button>
          <button className="home__icon-btn" aria-label="Help"><HelpIcon /></button>
          <button className="home__icon-btn" aria-label="Notifications"><BellIcon /></button>
        </div>
      </nav>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <main className="home__main">
        <div className="home__hero">
          <h1 className="home__title">PROTECTION COORDINATION</h1>
          <p className="home__subtitle">SYSTEM ANALYTICS HUB / MODULE SELECTION</p>
        </div>

        <div className="home__grid">
          {MODULES.map((mod) => {
            const HeaderIcon = HEADER_ICONS[mod.id];
            const CornerIcon = CORNER_ICONS[mod.id];
            const CurvePreview = CURVE_PREVIEWS[mod.id];
            return (
              <div
                key={mod.id}
                className={`module-card ${mod.available ? 'module-card--available' : 'module-card--disabled'}`}
                style={{ '--module-color': mod.color }}
                onClick={mod.available ? () => navigate(`/${mod.id}`) : undefined}
                role={mod.available ? 'button' : undefined}
                tabIndex={mod.available ? 0 : undefined}
                onKeyDown={mod.available ? (e) => e.key === 'Enter' && navigate(`/${mod.id}`) : undefined}
              >
                <div className="module-card__header">
                  <div className="module-card__header-left">
                    <span className="module-card__icon"><HeaderIcon /></span>
                    <span className="module-card__name">{mod.name}</span>
                  </div>
                  <CornerIcon />
                </div>

                <p className="module-card__desc">{mod.desc}</p>

                <div className="module-card__preview">
                  <CurvePreview />
                </div>

                <div className="module-card__footer">
                  <span className="module-card__btn">
                    OPEN MODULE
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </main>

    </div>
  );
}
