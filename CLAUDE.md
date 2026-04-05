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

Single-page React + Vite app. No TypeScript, no external chart library — all rendering is Canvas 2D. Styles use **SASS with BEM** (`src/styles/`). The entry point is `src/main.jsx` which imports `src/styles/main.scss`.

### Layer structure

```
src/
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
│   ├── Header/Header.jsx
│   ├── Panel/              # Panel lateral (5 secciones)
│   │   ├── Panel.jsx
│   │   ├── InputSection.jsx   # Toggle Text/Table + Clear
│   │   ├── PointsTable.jsx    # Tabla editable de coordenadas
│   │   ├── StatsSection.jsx
│   │   ├── SelectionsSection.jsx
│   │   ├── SegmentCard.jsx
│   │   └── ExportSection.jsx
│   └── Chart/              # Chart + Toolbar + Tooltip
├── styles/                 # SASS + BEM
│   ├── _variables.scss     # Tokens de diseño
│   ├── _reset.scss
│   ├── _header.scss        # .header
│   ├── _panel.scss         # .panel (sin overflow-y; scroll solo en --grow)
│   ├── _sections.scss      # .input-block .points-table .stats .selections .export
│   ├── _seg-card.scss      # .seg-card
│   ├── _chart.scss         # .chart .toolbar .tooltip
│   └── main.scss           # Entry point de estilos
└── App.jsx                 # Orquestador delgado (sin lógica de renderizado)
```

### `src/lib/` — pure math and rendering

| File | Responsibility |
|---|---|
| `constants.js` | `SEG_COLORS`, `SEG_FILLS`, `SEG_BORDERS`, `SAMPLE` data (TSV con headers) |
| `spline.js` | `smoothingSpline(pts, lambda)` — natural cubic spline via Thomas algorithm, works in log-log space |
| `parser.js` | `parseInput(text)` — two-column numeric text; separators: tab, comma, semicolon, space; headers skipped automatically |
| `coords.js` | `toLogLog(pts)` / `toLinear(pts)` — log10 ↔ linear conversion |
| `buildOutput.js` | `buildOutput(rawPts, selections)` → `{ segRaw, smoothedSegs, gapPts, outputPts }` |
| `renderer.js` | `renderToCanvas(...)` — Canvas 2D renderer; also exports `fmtN()` for tick/label formatting |

### `src/hooks/` — state management

| Hook | Owns |
|---|---|
| `useHistory` | Undo stack via `stackRef`/`indexRef` (synchronous reads). `push(snap)`, `undo()` returns snapshot, `getCurrent()`, `canUndo` |
| `useViewport` | `xRange`, `yRange`, `setXRange`, `setYRange`, `reset()`, `hasZoom` |
| `useExport` | `copyJSON()`, `exportTXT()`, `copied`, `downloadMsg` — formats output as JS-object-literal text |
| `useCanvasInteraction` | All canvas mouse/wheel state: `canvasRef`, `containerRef`, `stateRef`, `dragging`, `dragBox`, `panning`, `hoveredPt`, `draggingPt`, `cancelAll()`, `handlers` |

### Data flow

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

### Key interaction design

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
| `.header` | `_header.scss` |
| `.panel`, `.panel__section` | `_panel.scss` |
| `.input-block`, `.points-table`, `.stats`, `.selections`, `.export` | `_sections.scss` |
| `.seg-card` | `_seg-card.scss` |
| `.chart`, `.toolbar`, `.tooltip` | `_chart.scss` |

### Panel layout note

`.panel` uses `overflow: hidden` (not `overflow-y: auto`) so it always fills the full height of `app__body`. Only `.panel__section--grow` (Selections) has `overflow-y: auto` to scroll its own content independently.
