# Architecture

> Status: **Normative architecture boundary.** This document owns runtime,
> component, and technology boundaries; exact dependency versions remain owned
> by `package.json` and `package-lock.json`.

## Technology stack

- Runtime: browser-native JavaScript ES modules, HTML, CSS, and a module Web
  Worker; no backend or application bundler.
- Tooling: Node.js from `.node-version`, Node's test runner, ESLint, Prettier,
  and Playwright.
- Delivery: repository-owned static build scripts and GitHub Actions deployment
  to GitHub Pages.

## Runtime boundaries

현재 색상 시스템의 개념과 역할 의존성은
[Ontology](v2-decisions/ontology.md)가 관리한다. Constraint, ranking, pair authority,
review와 semantic declaration의 실행 설명은
[Color decision rules](v2-decisions/rules.md)가 관리한다. 역할 단계나 규칙 경계가
바뀌면 해당 소유 문서를 같은 변경 단위에서 갱신한다.

- `v2/` is the default primary-only light/dark palette application. `app.js`
  connects DOM state and events, `lib/view.js` owns pure markup, and
  `lib/palette-runtime.js` owns worker execution and caching.
- The Generator's applied-sample surface is a presentation-only tab set over
  one generated result. `app.js` owns tab state and keyboard behavior;
  `view.js` owns the five situation templates. Switching a sample never starts
  palette generation or changes semantic token ownership. Research previews
  remain report/test surfaces rather than parallel controls in Generator.
  `SAMPLE_ROLE_COVERAGE` keeps every generated role bound to at least one
  applied specimen; `brand source` is the sole explicit provenance-only role.
- `v2/lib/palette.js` orchestrates generation. Role-family producers own their
  candidate searches: `feedback-search.js` owns Destructive and Warning,
  `pair-selection.js` owns cross-mode pair ranking, and `quality.js` owns
  selected-result review and state-progression evidence. This keeps role-specific
  recipes explicit without accumulating every search implementation in the
  orchestrator.
- `v2/lib/destructive-anchor.js` owns the production source-red-band
  classification and preferred-lightness strategy. Diagnostic reports may
  select its fixed default strategy, but do not own or rewrite the production
  predicate.
- `v2/lib/action-presentation.js` owns the browser-safe component-presentation
  resolver. It permits one filled action per action group: Primary filled plus
  Destructive outline when they coexist, or dedicated Destructive filled plus
  secondary Cancel in destructive confirmation. The same module derives that
  context's Secondary Default/Hover/Active fills from Muted Surface, validates
  final-sRGB label contrast and mode direction, and does not add those
  context-dependent values to the palette export. `red-band-presentation.js`
  retains the visually close red-role comparison for reproducible research,
  but it is no longer a live Generator panel and does not choose a strategy.
  Neither presentation module aliases semantic roles. Focus generation remains
  in `palette.js`; its adjacency constraint includes every Foundation context
  used by the specimen, including Muted Surface.
- `v2/lib/decision.js` owns candidate ranking and the structured
  `NO_CANDIDATE` failure contract. Candidate exhaustion carries stable
  `decisionId`, nullable `mode`, `role`, and fixed `candidate-selection` stage
  provenance; diagnostic consumers serialize that evidence while unexpected
  errors continue to abort.
- `v2/lib/runtime.js` and shared color math own the canonical rendered sRGB
  identity used by gamut mapping, contrast, candidate deduplication, stable
  ranking, and evidence. `serializeModeCss()` emits that final hex as a fallback
  and then an equivalent measured `oklch()` declaration for capable browsers;
  the browser does not own palette gamut or validation decisions.
- `v2/lib/semantic-model.js` owns declarative design declarations, evidence
  contracts, evaluator registration, and evaluation-instance traceability.
  Test-owned acceptance scenarios prove coverage without becoming runtime
  generation policy.
- `v2/lib/adversarial-diagnostics.js` and
  `mode-range-counterfactual.js` own on-demand, non-normative analysis over
  generated results. `pair-ranking-counterfactual.js` isolates one fixed
  pair-selection ordering probe over the unchanged sampled candidate set.
  `feedback-candidate-availability.js` orchestrates a separate role-local
  default-fill feasibility census while `feedback-search.js` owns the
  Destructive/Warning base-fill inventories, constraints, and objectives;
  its v3 bounded Destructive hue-ladder probe remains role-local and diagnostic;
  `quality.js` retains ownership of hue and selected-result review checks;
  only its source-fidelity, semantic-hue, and non-eligibility pacing subset is
  independent of pair selection.
  `primary-chroma-counterfactual.js` compares one Primary-only source-relative
  chroma inventory/bound against the current production policy and owns a derived
  above-current-cap transactional fallback arm while all non-Primary input
  chroma consumers remain unchanged.
  `destructive-anchor-counterfactual.js` compares the production source-red-band
  Destructive objective target with the normal mode target while reusing the
  same Feedback search and complete downstream engine.
  Counterfactual overrides bypass the production palette cache and are not
  exposed through the site UI.
- `v2/lib/diagnostic-corpus.js` owns the shared deterministic RGB sampling
  corpus used by diagnostics. `result-evidence.js` owns the shared fail-closed
  diagnostic precondition check and intentionally reconciles the current
  policy/result schema. Individual reports continue to own their own
  observations, comparisons, schemas, and interpretation; these shared
  modules are not a generalized experiment or policy engine.
- `v2/lib/text-contrast-strategy.js` owns production WCAG normal-text
  eligibility with APCA ranking plus the closed APCA-only, WCAG-only, and strict
  intersection diagnostic vocabulary. `text-contrast-counterfactual.js` owns
  the fixed-input four-arm comparison; non-production strategies reach role
  producers only through an explicit diagnostic override.
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

### Ontology-to-code alignment

The code follows the same broad lifecycle as the ontology: policy and role
recipes declare the rules, role producers construct candidates, `decision.js`
applies constraints and ordered ranking, `pair-selection.js` chooses the
Light/Dark pair, and `quality.js` plus `semantic-model.js` attach separately
scoped result evidence.

This alignment is not yet a one-module-per-ontology-concept architecture.
`palette.js` remains the orchestration owner and still contains cohesive
Foundation, Primary family/state, Selection, Focus, and mode-assembly searches.
That is accepted while those searches share substantial state and dependency
context. Move another role family out only when it has a stable producer
boundary comparable to `feedback-search.js`; file length alone is not
authorization for a generic role engine or rule DSL.

- Keep the v1 and v2 input/output contracts independent.
- Keep palette math free of DOM and browser-storage dependencies.
- Keep markup generation in view modules and interaction wiring in `app.js`.
- `npm run check` enforces a complexity ceiling of 20 for v2, shared libraries,
  and scripts. The maintenance-only v1 surface has a temporary ceiling of 25.
