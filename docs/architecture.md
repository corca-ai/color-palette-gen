# Architecture

## Technology stack

The stack inventory is maintained in [Technology stack](technology-stack.md);
this document owns component and runtime boundaries.

## Runtime boundaries

- `v2/` is the default primary-only light/dark palette application. `app.js`
  connects DOM state and events, `lib/view.js` owns pure markup, and
  `lib/palette-runtime.js` owns worker execution and caching.
- `v2/lib/palette.js` orchestrates generation, `pair-selection.js` owns
  cross-mode pair ranking, and `quality.js` owns independent quality and
  state-progression review.
- `v2/lib/semantic-model.js` owns declarative design declarations, evidence
  contracts, evaluator registration, and evaluation-instance traceability.
  Test-owned acceptance scenarios prove coverage without becoming runtime
  generation policy.
- `v2/lib/adversarial-diagnostics.js` and
  `mode-range-counterfactual.js` own on-demand, non-normative analysis over
  generated results. `pair-ranking-counterfactual.js` isolates one fixed
  pair-selection ordering probe over the unchanged sampled candidate set.
  `feedback-candidate-availability.js` orchestrates a separate role-local
  default-fill feasibility census while `palette.js` and `quality.js` retain
  ownership of candidate inventories, constraints, objectives, and hue checks.
  Counterfactual overrides bypass the production palette cache and are not
  exposed through the site UI.
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
- There is no backend, account system, database, analytics, or cookie. The
  runtime does not persist the primary, score, judgment, note, or observation;
  only the selected result-view mode is stored locally. Legacy evaluation keys
  from earlier versions are no longer read or transmitted.

## Change boundaries

- Keep the v1 and v2 input/output contracts independent.
- Keep palette math free of DOM and browser-storage dependencies.
- Keep markup generation in view modules and interaction wiring in `app.js`.
- `npm run check` enforces a complexity ceiling of 20 for v2, shared libraries,
  and scripts. The maintenance-only v1 surface has a temporary ceiling of 25.
