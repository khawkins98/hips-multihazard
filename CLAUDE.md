# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HIPs Multi-Hazard Explorer — an interactive visualization of the UNDRR Hazard Information Profiles (HIPs) taxonomy. Displays 281 hazard nodes with ~1,648 causal edges across 8 hazard types and 38 clusters, using D3.js for rendering (radial hierarchical edge bundling + cascade tree explorer).

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server (http://localhost:5173/hips-multihazard/)
npm run build        # Production build → dist/
npm run preview      # Preview production build locally
npm run snapshot     # Fetch latest data from PreventionWeb API → public/data/hips.json
```

No test framework or linter is configured.

## Architecture

**Stack:** Vite + vanilla JS (ES modules), D3.js (d3-hierarchy, d3-shape, d3-selection, d3-zoom, d3-transition, d3-interpolate) for visualization, Cytoscape.js headless-only for graph algorithms (centrality, pathfinding), plain CSS with custom properties.

**Data pipeline:** Build-time snapshot (`scripts/snapshot.js`) fetches PreventionWeb's JSON-LD API, normalizes it, and writes `public/data/hips.json` (~1.1 MB). At runtime, `src/data/fetch-hips.js` loads data with a multi-tier fallback: localStorage cache (1-hour TTL) → live API (8s timeout) → static snapshot → stale cache. This handles CORS/firewall blocks gracefully. Two transform paths exist: `src/data/transform.js` for headless Cytoscape elements (algorithms only), and `src/views/edge-bundling/transform.js` for the D3 hierarchy tree.

**Views:** Two coordinated views managed by `src/views/view-manager.js`:
- **"The Web"** (default) — Radial hierarchical edge bundling. Hazards on circumference grouped by Type → Cluster. 1,648 edges as bundled Bezier curves. Canvas (edges) + SVG (nodes/arcs/labels).
- **"Cascade"** — Bidirectional causal chain tree. Selected hazard at center; causes expand left, effects expand right. Progressive disclosure with expand/collapse.

**Module communication:** A simple event bus (pub/sub) decouples modules. Created in `src/main.js`, passed to all init functions. Key events: `filter:types`, `edges:toggle`, `node:selected`, `node:deselected`, `node:focus`, `khop:change`, `centrality:computed`, `pathfinder:mode`, `pathfinder:select`, `pathfinder:result`, `pathfinder:clear`, `flow:highlight`, `insight:highlight`, `cascade:open`. Full event catalog with payloads is documented in `src/utils/bus.js`.

**URL state:** `src/utils/url-state.js` syncs app state (view, selected node, type filters, k-hop depth, declared-only mode) to URL query parameters for shareable links. State is parsed before UI init and applied after all modules are wired up.

**Initialization order** (in `src/main.js`): fetch data → parse URL → build headless Cytoscape → init UI (sidebar, detail panel, search, legend) → compute insights → create view manager → init toolbar/insights/pathfinder/centrality/flow matrix → start URL sync → compute centrality → apply URL state. The order matters: UI listeners must be registered before the view manager emits events, and URL state must be applied last.

**Source layout:**
- `src/data/` — data fetching, JSON-LD→Cytoscape transform (headless), hazard type definitions (colors/icons), centrality computation, flow matrix computation, network insights
- `src/views/` — view manager, edge-bundling view (transform, layout, canvas-edges, svg-overlay, interactions), cascade view (data, render, orchestrator)
- `src/ui/` — sidebar (view switcher/filters/tension/centrality ranking), detail panel (with k-hop controls and centrality metrics), typeahead search, toolbar (zoom/about), legend, path finder, flow matrix panel, insights panel
- `src/styles/` — CSS organized by component (main, sidebar, detail-panel, toolbar, insights, path-finder, flow-matrix, edge-bundling, cascade)

## Domain Concepts

**Declared vs inferred edges:** The HIPs dataset stores causal links via `xkos:causes` and `xkos:causedBy` but does not enforce symmetry. A "declared" edge is reciprocated by both endpoints; an "inferred" edge is attested by only one side. The `edges:toggle` event carries a `declaredOnly` flag, and edge objects have an `isDeclared` property. This distinction affects edge counts, filtering, and several insight metrics.

## Key Data Format Notes

The source data is JSON-LD using SKOS/XKOS vocabularies. Values are not plain strings:
- `skos:prefLabel` is `{@language: "en", @value: "..."}` — use `str()` helper
- `dct:type` on broader nodes is `"type"` or `"cluster"` (not `"hazard_type"`)
- References are `{@id: "..."}` objects — use `refId()` helper
- Fields can be single values or arrays — use `toArray()` helper

These helpers are defined in `src/utils/jsonld.js` (shared by both `scripts/snapshot.js` and runtime code).

## Deployment

GitHub Pages via `.github/workflows/deploy.yml`. Triggers on push to `main`. Base path is `/hips-multihazard/` (set in `vite.config.js`).

## Conventions

- All modules export init/create functions (e.g., `createViewManager`, `initSidebar`) called from `src/main.js`
- View modules export `create*View()` factories that return an API object with `activate`, `deactivate`, `destroy`, and view-specific methods
- XSS prevention: use the `esc()` function from `src/utils/dom.js` when inserting user-facing data into HTML
- Edge bundling uses Canvas (edges) + SVG (nodes/labels) layered rendering for performance
- Dark theme using CSS custom properties (`--bg`, `--text`, `--accent`, etc.) defined in `src/styles/main.css`
- Floating panels (flow matrix, insights) use a draggable title bar pattern with `setupDrag()`, CSS `resize: both`, and `.hidden` class toggle — not modal overlays
