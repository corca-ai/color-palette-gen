# Architecture

## Technology stack

- Static browser application written in JavaScript, with Node.js tooling; Node's test runner, Prettier, Playwright, and GitHub Actions.

## Runtime boundaries

- `v2/` is the default primary-only light/dark palette application. `app.js`
  connects DOM state and events, `lib/view.js` owns pure markup, and
  `lib/palette-runtime.js` owns worker execution and caching.
- `v2/lib/palette.js` orchestrates generation, `pair-selection.js` owns
  cross-mode pair ranking, and `quality.js` owns independent quality and
  state-progression review. `evaluation-store.js` isolates local browser
  persistence.
- `v2/styles/` separates base, specimen, decision-graph, review, and responsive
  CSS. Each file owns complete declaration blocks; `v2/style.css` remains a
  compatibility aggregator.
- `v1/` preserves the earlier multi-color and vibe experiment in
  maintenance-only mode. Security, compatibility, and clear defect fixes are
  accepted; new palette capability belongs in v2.
- `lib/` contains the low-level color and v1 palette engine modules shared by
  the static build where applicable.
- `scripts/build-site.mjs` assembles v2 at the artifact root, v1 under
  `dist/v1/`, and shared browser modules under `dist/lib/`.
- There is no backend, account system, database, analytics, cookie, or browser
  persistence for palette inputs. Designer evaluation persistence is local to
  the browser and can be exported explicitly.

## Change boundaries

- Keep the v1 and v2 input/output contracts independent.
- Keep palette math free of DOM and browser-storage dependencies.
- Keep markup generation in view modules and interaction wiring in `app.js`.
- `npm run check` enforces a complexity ceiling of 20 for v2, shared libraries,
  and scripts. The maintenance-only v1 surface has a temporary ceiling of 25.
