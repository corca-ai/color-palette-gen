# Development

## Verification

- Run `npm run check` and `npm run build` for every change. `npm run check`
  intentionally uses the fast unit-test tier and the ESLint complexity gate.
- `npm run build` also scans the assembled public artifact for credential-like
  assignments, private-key material, local-only addresses, non-public source
  markers.
- Run `npm run check:e2e:smoke` locally when core browser behavior may change.
  Pull-request CI runs this three-test smoke tier only when v2 browser code,
  shared color math, browser tests, build/serve tooling, or their Node
  dependencies change. Documentation-only and unrelated v1 changes do not
  install Chromium.
- Run `npm run check:full` before high-risk palette-policy or broad UI changes.
  It adds a Node-reachable engine/runtime coverage floor, the 216-color
  exhaustive grid, and the complete Playwright suite including visual
  snapshots. DOM rendering remains covered by Playwright rather than the Node
  coverage percentage. GitHub Actions also runs it weekly and on demand.
- Run `npm run diagnose:adversarial > report.json` when comparing policy
  behavior across the fixed 216-input RGB grid. The standalone command is not
  a required gate. Weekly/manual exhaustive CI snapshots the same deterministic
  report behavior and reviewed counts; a changed count requires interpretation,
  not automatic design rejection. Named signals and convergence groups do not
  score palette quality or establish perception. The `semanticHueReview`
  section reports the four existing provisional Primary ↔ Destructive/Warning
  checks with separate input, input-by-mode, and check-opportunity denominators;
  its source cohorts and overlaps are descriptive rather than causal.
- Run `npm run diagnose:feedback-candidates > feedback-candidates.json` to
  inspect role-local default-fill alternatives for the 120 failed semantic-hue
  checks identified by adversarial diagnostics v3. Run
  `npm run test:feedback-candidates` when refreshing the reviewed census. Both
  are on-demand and excluded from CI. This probe does not establish complete
  state families, joint Destructive/Warning substitution, or perception.
- Run `npm run diagnose:mode-range > mode-range.json` for the heavier,
  on-demand counterfactual comparison of current, widened,
  gap-preserving-outward, and source-inclusive Primary lightness ranges. It is
  deliberately excluded from CI and does not change the production policy or
  identify an optimal range.
  Run `npm run test:counterfactual` when refreshing its published 216-input
  counts; this dedicated heavy snapshot is also excluded from CI.
- Run `npm run diagnose:pair-ranking > pair-ranking.json` to compare the
  previous v11 source-first pair ordering with the current v12 conditional
  zero-miss eligibility policy over identical sampled candidates.
  Run `npm run test:pair-ranking-counterfactual` when refreshing its published
  216-input observations. Both commands are on-demand and excluded from CI;
  eligibility compliance does not establish a perceived result.
- Run `npm run diagnose:primary-chroma > primary-chroma.json` to compare the
  current v12 Primary chroma cap with the diagnostic source-relative
  four-origin, up-to-four-distinct-rung inventory and matching Primary-only
  bound. The same report also derives an above-current-cap transactional
  fallback arm without another generation pass: inputs at or below the cap keep
  v12, and considered results fall back to v12 when generation is infeasible or
  a generated contract / policy-owned pair eligibility check regresses. Run
  `npm run test:primary-chroma-counterfactual` when refreshing its published
  216-input observations. Both are on-demand and excluded from CI. The manual
  run takes roughly 36 seconds on the reviewed local environment; it does not
  establish vividness, aesthetic quality, or a production policy.
- Install the Playwright browser once with `npx playwright install chromium`;
  CI/Linux provisioning uses `npx playwright install --with-deps chromium`.
- GitHub Actions are pinned to commit SHAs and updated through Dependabot.
- No repository hook is installed. Maintainers run `npm run check` explicitly;
  pull-request and deploy workflows remain the enforced shared boundary.
