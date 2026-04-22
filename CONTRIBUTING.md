# Contributing

Thanks for your interest in contributing. This project is an interactive visualization of the UNDRR-ISC Hazard Information Profiles (HIPs) — a radial edge-bundling "Web" view and a bidirectional "Cascade" explorer, plus research tools (centrality, shortest paths, flow matrix, insights).

**[Live demo →](https://khawkins98.github.io/hips-multihazard/)**

Not sure if something is in scope, or want to discuss an approach before writing code? Open an issue — questions welcome.

## Scope

**In scope:**
- Bug fixes in rendering, interaction, or layout (edge bundling, cascade tree, search, detail panel, tool panels)
- Accessibility improvements (keyboard navigation, contrast, screen reader support)
- New analysis or insight features on top of the existing graph
- Performance improvements (canvas rendering, layout, data transforms)
- Documentation improvements
- Snapshot tooling (`scripts/snapshot.js`) — refresh cadence, resilience, format

**Out of scope here:**
- Changes to the HIP dataset itself — hazard definitions, codes, causal relationships, and descriptive text are maintained upstream by UNDRR/ISC. Issues about the content of a specific hazard should be raised with [PreventionWeb](https://www.preventionweb.net/) rather than in this repo. The snapshotted copy in `public/data/hips.json` is refreshed via `npm run snapshot`, not hand-edited.
- Features that require a server or login — this project is intentionally a static client.

A sibling project, [hips-multi-hazard-diagram](https://github.com/khawkins98/hips-multi-hazard-diagram), renders the single-hazard causal diagram. Contributions about the per-hazard view belong there.

## Development

```bash
npm install
npm run dev        # Vite dev server at http://localhost:5173/hips-multihazard/
npm run build      # production build -> dist/
npm run preview    # preview production build locally
npm test           # run Vitest unit tests
npm run snapshot   # refresh public/data/hips.json (optional — the app ships with a bundled copy; only needed for the latest data)
```

## Architecture orientation

See [CLAUDE.md](CLAUDE.md) for the full architecture overview, and [docs/hips_multihazard_architecture.md](docs/hips_multihazard_architecture.md) for deeper notes. Key shape:

- `src/main.js` — init order and event bus wiring
- `src/data/` — fetch + fallback chain, JSON-LD transforms, centrality, flow matrix, insights
- `src/views/edge-bundling/` — "The Web" (canvas edges + SVG overlay)
- `src/views/cascade/` — cascade tree view
- `src/ui/` — sidebar, detail panel, search, toolbar, legend, floating panels
- `scripts/snapshot.js` — build-time data fetch

The [declared vs inferred](docs/methodology-causal-asymmetry.md) distinction matters throughout — if your change touches edges, filters, or counts, consider both modes.

## Test-driven development

This project uses test-driven development. The expectation is:

1. **Write or update tests first.** Before implementing a fix or feature, add a test that describes the expected behaviour and confirm it fails.
2. **Make it pass.** Implement the minimum change needed to make the test green.
3. **Refactor.** Clean up with confidence — the tests will catch regressions.

Test files live alongside their source module as `*.test.js` (e.g. `src/utils/jsonld.test.js`). The test environment defaults to `node`; add `// @vitest-environment jsdom` at the top of any file that needs DOM APIs.

Run the suite at any time:

```bash
npm test
```

CI runs `npm test` on every PR and push to `main`. A PR with failing tests will not be merged.

If your change touches logic that isn't yet covered — data transforms, fetch fallback behaviour, utility helpers — add tests for it. Visual rendering code (Canvas, SVG layout) is exempt from the unit-test requirement. If you extract a pure function from rendering code, write a test for that function. If you're unsure whether your change needs tests, mention it in the PR.

### Pre-PR checklist

Before opening a PR, run `npm test` and verify your change against both views and the main interactive features:

- **The Web** view (default) — hover hazards, hover type arcs, adjust the tension slider, toggle edges, filter by type, toggle declared-only
- **Cascade** view — select a hazard, expand left (causes) and right (effects), verify cycles render as ghost nodes
- Search (by name, alternate label, identifier)
- Detail panel (k-hop expansion, centrality metrics)
- Floating tools (flow matrix, insights, path finder) — drag, resize, close
- URL state — confirm shareable links restore view, selected node, filters

Test at desktop width. Ultra-narrow layouts are not currently targeted.

## Releases

Releases are cut by the maintainer from `main`. See [RELEASING.md](RELEASING.md) for the versioning guide, step-by-step mechanics, and release notes style guide. If you think changes are ready for a release, mention it in the relevant PR or issue.

## Pull requests

1. Branch from `main`. Use a descriptive prefix: `fix/…`, `feat/…`, `chore/…`, `docs/…`.
2. Keep PRs focused. Unrelated cleanup in a separate PR is easier to review.
3. Describe **what** and **why** in the PR body. Screenshots or short recordings are very helpful for any visual change — include before/after when applicable.
4. Don't commit build artifacts (`dist/`) unless the change is specifically about the build output.
5. If your change affects the data snapshot format, call it out explicitly and include a fresh `npm run snapshot` result in the diff.

## Licensing of contributions

The viewer source is licensed under Apache 2.0 (see [LICENSE](LICENSE)). By submitting a contribution, you agree that your contribution is licensed under the same terms.

The **hazard data** in this repo (bundled snapshot and anything fetched from PreventionWeb at runtime) is under CC BY-NC 4.0 and is the copyrighted work of UNDRR/ISC — see [NOTICE](NOTICE). Please do **not**:

- Hand-edit `public/data/hips.json` to change hazard content
- Strip attribution or citation text from the UI, README, or NOTICE
- Add the UNDRR logo or wording that implies UNDRR/ISC endorsement

## Reporting issues

Use GitHub Issues. Helpful things to include:

- View and feature (The Web / Cascade / flow matrix / etc.)
- Hazard code or shareable URL that reproduces the issue
- Browser + viewport size
- Screenshot or short recording for visual issues
- Console errors, if any

For suspected data issues (wrong causal relationship, outdated description), please link to the corresponding hazard at `https://www.undrr.org/hip/{CODE}` (substituting the actual hazard code) — and note that the fix almost certainly needs to happen upstream.
