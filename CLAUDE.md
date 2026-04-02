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
│   ├── constants.js        # Colores, datos SAMPLE
│   ├── spline.js           # Algoritmo de spline cúbico natural
│   ├── parser.js           # parseInput — JSON / CSV
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
│   └── Chart/              # Chart + Toolbar + Tooltip
├── styles/                 # SASS + BEM
│   ├── _variables.scss     # Tokens de diseño
│   ├── _reset.scss
│   ├── _header.scss        # .header
│   ├── _panel.scss         # .panel
│   ├── _sections.scss      # .input-block .stats .selections .export
│   ├── _seg-card.scss      # .seg-card
│   ├── _chart.scss         # .chart .toolbar .tooltip
│   └── main.scss           # Entry point de estilos
└── App.jsx                 # Orquestador delgado (sin lógica de renderizado)

```

### `src/lib/` — pure math and rendering

| File | Responsibility |
|---|---|
| `constants.js` | `SEG_COLORS`, `SEG_FILLS`, `SEG_BORDERS`, `SAMPLE` data |
| `spline.js` | `smoothingSpline(pts, lambda)` — natural cubic spline via Thomas algorithm, works in log-log space |
| `parser.js` | `parseInput(text)` — accepts JSON `[{x,y}]`, wrapped objects, or CSV |
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
inputText → parseInput → rawPts
rawPts + selections → buildOutput → output (memoized in App.jsx)
rawPts + selections + output → renderToCanvas → canvas pixels
                                              → stateRef.current (coordinate transforms for hit-testing)
```

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
| `.input-block`, `.stats`, `.selections`, `.export` | `_sections.scss` |
| `.seg-card` | `_seg-card.scss` |
| `.chart`, `.toolbar`, `.tooltip` | `_chart.scss` |
