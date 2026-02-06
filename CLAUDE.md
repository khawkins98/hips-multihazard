# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

HIPs Multi-Hazard Explorer — an interactive graph visualization of the UNDRR Hazard Information Profiles (HIPs) taxonomy. Displays 281 hazard nodes with ~1,648 causal edges across 8 hazard types and 38 clusters, using Cytoscape.js for rendering.

## Commands

```bash
npm run dev          # Start Vite dev server (http://localhost:5173/hips-multihazard/)
npm run build        # Production build → dist/
npm run preview      # Preview production build locally
npm run snapshot     # Fetch latest data from PreventionWeb API → public/data/hips.json
```

No test framework is configured.

## Architecture

**Stack:** Vite + vanilla JS (ES modules), Cytoscape.js with fcose/dagre layouts, plain CSS with custom properties.

**Data pipeline:** Build-time snapshot (`scripts/snapshot.js`) fetches PreventionWeb's JSON-LD API, normalizes it, and writes `public/data/hips.json` (~1.1 MB). At runtime, `src/data/fetch-hips.js` loads the snapshot (falling back to live API), and `src/data/transform.js` converts it to Cytoscape elements with three grouping modes (type/cluster/flat).

**Module communication:** A simple event bus (pub/sub) created in `src/main.js` decouples modules. Key events: `filter:types`, `grouping:request`, `grouping:change`, `edges:toggle`, `layout:change`, `node:selected`, `node:deselected`, `node:focus`.

**Source layout:**
- `src/data/` — data fetching, JSON-LD→Cytoscape transform, hazard type definitions (colors/icons)
- `src/graph/` — Cytoscape init, interaction handlers (click/hover/highlight), layout configs, stylesheet
- `src/ui/` — sidebar (filters/grouping/layout controls), detail panel, typeahead search, toolbar (zoom/about), legend
- `src/styles/` — CSS organized by component (main, sidebar, detail-panel, toolbar)

## Key Data Format Notes

The source data is JSON-LD using SKOS/XKOS vocabularies. Values are not plain strings:
- `skos:prefLabel` is `{@language: "en", @value: "..."}` — use `str()` helper
- `dct:type` on broader nodes is `"type"` or `"cluster"` (not `"hazard_type"`)
- References are `{@id: "..."}` objects — use `refId()` helper
- Fields can be single values or arrays — use `toArray()` helper

These helpers are defined in `scripts/snapshot.js`.

## Deployment

GitHub Pages via `.github/workflows/deploy.yml`. Triggers on push to `main`. Base path is `/hips-multihazard/` (set in `vite.config.js`).

## Conventions

- All modules export init functions (e.g., `initGraph`, `initSidebar`) called from `src/main.js`
- XSS prevention: use the `esc()` function in `src/ui/detail-panel.js` when inserting user-facing data into HTML
- Cytoscape batch updates (`cy.batch()`) for bulk element changes to avoid layout thrashing
- Dark theme using CSS custom properties (`--bg`, `--text`, `--accent`, etc.) defined in `src/styles/main.css`
