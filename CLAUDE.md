# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server with HMR
npm run build     # Production build
npm run lint      # Run ESLint
npm run preview   # Preview production build locally
```

No test suite is configured.

## Architecture

Multi-module React + Vite app. No TypeScript, no external chart library — all rendering is Canvas 2D. Styles use **SASS with BEM** (`src/styles/`). The entry point is `src/main.jsx` which mounts `Root.jsx`.

Dark mode is forced globally.

### Routing / module shell

`Root.jsx` manages `activeModule` state and renders one of three views:

- `null` → `<Home>` — module selector landing page
- `'manual'` → `<App>` — Manual Curve Fit module
- `'mcb'` → `<MCBModule>` — MCB IEC 60898-1 module

`'mccb'` and `'relay'` are registered in `Home.jsx` with `available: false` (coming soon).

Each module receives `onHome` to navigate back. `BackButton` (shared component) triggers it.

### Layer structure

```
src/
├── Root.jsx                # Module router (replaces direct App mount)
├── App.jsx                 # Manual Curve Fit — orchestrator (sin lógica de renderizado)
├── lib/                    # Funciones puras, sin React
│   ├── constants.js        # Colores, datos SAMPLE (formato TSV)
│   ├── spline.js           # Algoritmo de spline cúbico natural
│   ├── parser.js           # parseInput — TSV / CSV (tab, coma, punto y coma, espacio)
│   ├── coords.js           # toLogLog / toLinear
│   ├── buildOutput.js      # Pipeline de suavizado por segmento
│   └── renderer.js         # renderToCanvas + fmtN
├── hooks/
│   ├── useHistory.js       # Pila undo con refs síncronos
│   ├── useViewport.js      # xRange / yRange / reset / hasZoom
│   ├── useExport.js        # copyJSON / exportTXT
│   └── useCanvasInteraction.js  # Todos los eventos del canvas
├── components/
│   ├── BackButton.jsx      # Shared "← tcurves" back navigation button
│   ├── Home/Home.jsx       # Landing page — module selector cards
│   ├── Header/Header.jsx
│   ├── Panel/              # Panel lateral (5 secciones) — Manual module
│   │   ├── Panel.jsx
│   │   ├── InputSection.jsx   # Toggle Text/Table + Clear
│   │   ├── PointsTable.jsx    # Tabla editable de coordenadas
│   │   ├── StatsSection.jsx
│   │   ├── SelectionsSection.jsx
│   │   ├── SegmentCard.jsx
│   │   └── ExportSection.jsx
│   └── Chart/              # Chart + Toolbar + Tooltip — Manual module
├── modules/
│   └── mcb/                # MCB IEC 60898-1 module
│       ├── MCBModule.jsx           # Orchestrator — state + layout
│       ├── components/
│       │   ├── TCCCanvas.jsx       # Canvas wrapper (delegates to useCanvasDraw)
│       │   ├── ControlPanel.jsx    # In, curve type selector, tolerance band sliders
│       │   ├── AnchorCards.jsx     # Reference point cards (P1/P2/P3/knee)
│       │   ├── ParamsTable.jsx     # Solved model params (A, α, k)
│       │   └── NormCheck.jsx       # IEC 60898-1 compliance checker with pass/fail chips
│       └── utils/
│           ├── curveParams.js      # CURVE_PARAMS — B/C/D magnetic thresholds
│           ├── solver.js           # solveSystem + thermalT — IEC 60255 model
│           └── useCanvasDraw.js    # Canvas 2D renderer hook for MCB TCC chart
└── styles/                 # SASS + BEM
    ├── _variables.scss     # Tokens de diseño
    ├── _reset.scss
    ├── _home.scss          # .home .home__nav .home__grid .module-card .home__log
    ├── _header.scss        # .header
    ├── _panel.scss         # .panel (sin overflow-y; scroll solo en --grow)
    ├── _sections.scss      # .input-block .points-table .stats .selections .export
    ├── _seg-card.scss      # .seg-card
    ├── _chart.scss         # .chart .toolbar .tooltip
    ├── _mcb.scss           # .mcb-module .chart-col .panel-col .canvas-wrapper etc.
    └── main.scss           # Entry point de estilos
```

### `src/lib/` — pure math and rendering (Manual module)

| File | Responsibility |
|---|---|
| `constants.js` | `SEG_COLORS`, `SEG_FILLS`, `SEG_BORDERS`, `SAMPLE` data (TSV con headers) |
| `spline.js` | `smoothingSpline(pts, lambda)` — natural cubic spline via Thomas algorithm, works in log-log space |
| `parser.js` | `parseInput(text)` — two-column numeric text; separators: tab, comma, semicolon, space; headers skipped automatically |
| `coords.js` | `toLogLog(pts)` / `toLinear(pts)` — log10 ↔ linear conversion |
| `buildOutput.js` | `buildOutput(rawPts, selections)` → `{ segRaw, smoothedSegs, gapPts, outputPts }` |
| `renderer.js` | `renderToCanvas(...)` — Canvas 2D renderer; also exports `fmtN()` for tick/label formatting |

### `src/hooks/` — state management (Manual module)

| Hook | Owns |
|---|---|
| `useHistory` | Undo stack via `stackRef`/`indexRef` (synchronous reads). `push(snap)`, `undo()` returns snapshot, `getCurrent()`, `canUndo` |
| `useViewport` | `xRange`, `yRange`, `setXRange`, `setYRange`, `reset()`, `hasZoom` |
| `useExport` | `copyJSON()`, `exportTXT()`, `copied`, `downloadMsg` — formats output as JS-object-literal text |
| `useCanvasInteraction` | All canvas mouse/wheel state: `canvasRef`, `containerRef`, `stateRef`, `dragging`, `dragBox`, `panning`, `hoveredPt`, `draggingPt`, `cancelAll()`, `handlers` |

### MCB module — `src/modules/mcb/`

#### State (MCBModule.jsx)

```js
{
  In:        number,          // Nominal current (A)
  curveType: 'B' | 'C' | 'D',
  mag:  { tminNom: number },  // Nominal instantaneous trip time (ms)
  band: { uk: number, umag: number }, // Tolerance band params
  show: { upper, anc, zones } // Display toggles
}
```

`update(path, value)` uses dot-path notation for nested updates (`'band.umag'`). `setCurveType` also resets `band.umag` to the new curve's `magDefault`.

#### Solver — `utils/solver.js`

IEC 60255 model: `t = k / (M − A)^α`, where `M = I / In`.

- `solveSystem(p1, p2, p3)` — fits the three thermal anchor points (1.0×In/10000s, 1.13×In/3600s, 2.55×In/60s) via numerical search over `A`, then solves for `α` and `k`. Returns `{ A, alpha, k }`.
- `thermalT(M, sol, kFactor?)` — evaluates the model at multiplier `M`. Returns `null` when below the asymptote.

#### Curve params — `utils/curveParams.js`

| Type | knee | magUpper | magDefault | Desc |
|---|---|---|---|---|
| B | 3× | 5× | 4× | Resistive loads |
| C | 5× | 10× | 7× | Mixed loads |
| D | 10× | 20× | 14× | Inductive loads |

#### Canvas renderer — `utils/useCanvasDraw.js`

Hook returning `canvasRef`. Draws on every state/sol/anc change and on window resize. Renders: log-log grid, colored zones (thermal / magnetic / t-min), nominal TCC curve (solid blue), tolerance band upper curve (dashed red), IEC reference anchor points with hover tooltip. DPR-aware sizing.

### Manual module — data flow

```
inputText → parseInput → rawPts          (Text mode)
tablePts  → handleApplyPoints → rawPts   (Table mode)
rawPts + selections → buildOutput → output (memoized in App.jsx)
rawPts + selections + output → renderToCanvas → canvas pixels
                                              → stateRef.current (coordinate transforms for hit-testing)
```

### Input modes (InputSection)

`InputSection` has two modes toggled by a Text/Table tab control:

- **Text mode**: textarea accepting TSV/CSV pasted directly from Excel. Headers are optional — any row that doesn't produce two valid numbers is skipped. A `ⓘ` tooltip next to the title shows separator info.
- **Table mode**: `PointsTable` — editable rows with X/Y inputs. Enter moves focus to the next row; Enter on the last row adds a new one. Apply validates all rows and injects points directly into `rawPts` via `handleApplyPoints` in `App.jsx`.
- **Clear button**: in the title row, disabled when there is no data. Resets `inputText`, `rawPts`, `selections`, and re-mounts `PointsTable` via `tableKey`.
- Both modes share a fixed `height: 215px` container (`input-block__mode`) so switching tabs causes no layout shift.

### Key interaction design (Manual module)

- `stateRef.current` stores the last `renderToCanvas()` return value (`toX`, `toY`, `fromX`, `fromY`, `PAD`, `PW`, `PH`, log bounds). Mouse handlers in `useCanvasInteraction` read it synchronously for hit-testing — it is written by `Chart.jsx` after each render.
- `selectionsRef` and `rawPtsRef` are kept in sync in `App.jsx` (`ref.current = state`) to give interaction handlers synchronous reads without nested setState callbacks.
- Box selection is two-click (anchor → confirm), not drag-and-release.
- Point editing is click-to-grab / click-to-place; Escape cancels and restores from history.
- `useHistory` uses refs for the stack so `undo()` can return the snapshot synchronously and callers can immediately apply it to `rawPts`/`selections`.

### SASS / BEM conventions

Variables are in `_variables.scss` (imported via `@use 'variables' as *`). BEM blocks map 1-to-1 to component files:

| Block | File |
|---|---|
| `.app`, `.app__body` | `main.scss` |
| `.home`, `.home__nav`, `.home__grid`, `.module-card`, `.home__log` | `_home.scss` |
| `.header` | `_header.scss` |
| `.panel`, `.panel__section` | `_panel.scss` |
| `.input-block`, `.points-table`, `.stats`, `.selections`, `.export` | `_sections.scss` |
| `.seg-card` | `_seg-card.scss` |
| `.chart`, `.toolbar`, `.tooltip` | `_chart.scss` |
| `.mcb-module`, `.chart-col`, `.panel-col`, `.canvas-wrapper` | `_mcb.scss` |

### Panel layout note (Manual module)

`.panel` uses `overflow: hidden` (not `overflow-y: auto`) so it always fills the full height of `app__body`. Only `.panel__section--grow` (Selections) has `overflow-y: auto` to scroll its own content independently.

### Home page — `src/components/Home/Home.jsx`

Full-page layout with three zones:

- **Navbar** (`.home__nav`) — `CURVELAB TCC` brand, DOCUMENTATION / SETTINGS links, help + bell icon buttons.
- **Main** (`.home__main`) — hero heading + 2×2 CSS grid of module cards (`.home__grid`).
- **Live log bar** (`.home__log`) — CSS marquee animation scrolling log entries.

Each `.module-card` has: 3px colored top border (`--module-color`), header row (small inline icon + name + ghosted corner decoration), description text, curve preview SVG, and an `OPEN MODULE` button.

Module colors: Manual → `#f59e0b`, MCB → `#3b82f6`, MCCB → `#10b981`, Relay → `#ef4444`.

`MODULES` array in `Home.jsx` is the single source of truth for the card registry. Each entry has `{ id, name, desc, color, available }`. SVG icons live in the same file split into `HEADER_ICONS`, `CORNER_ICONS`, and `CURVE_PREVIEWS` maps.

### Adding a new module

1. Create `src/modules/<name>/` with its own orchestrator, `components/`, and `utils/`.
2. Add a new `activeModule` branch in `Root.jsx`.
3. Register the module in `Home.jsx` `MODULES` array (set `available: true` when ready).
4. Add header icon, corner icon, and curve preview SVG components and register them in `HEADER_ICONS`, `CORNER_ICONS`, `CURVE_PREVIEWS` maps in `Home.jsx`.
5. Add a `_<name>.scss` file and import it in `main.scss`.
