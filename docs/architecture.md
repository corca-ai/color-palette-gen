# Architecture

## Technology stack

The stack inventory is maintained in [Technology stack](technology-stack.md);
this document owns component and runtime boundaries.

## Runtime boundaries

현재 색상 생성의 단계와 역할 간 의존성은
[Color decision flow](v2-decisions/color-decision-flow.md)의 Mermaid 다이어그램으로
관리한다. 역할 단계, pair 선택 권위 또는 production/diagnostic 경계가 바뀌면 해당
다이어그램도 같은 변경 단위에서 갱신한다.

- `v2/` is the default primary-only light/dark palette application. `app.js`
  connects DOM state and events, `lib/view.js` owns pure markup, and
  `lib/palette-runtime.js` owns worker execution and caching.
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
- `v2/lib/decision.js` owns candidate ranking and the structured
  `NO_CANDIDATE` failure contract. Candidate exhaustion carries stable
  `decisionId`, nullable `mode`, `role`, and fixed `candidate-selection` stage
  provenance; diagnostic consumers serialize that evidence while unexpected
  errors continue to abort.
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
  chroma inventory/bound against production v12 and owns a derived
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
