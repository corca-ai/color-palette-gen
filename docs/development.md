# Development

> Status: **Normative maintainer guide.** This document owns verification,
> collaboration, acceptance, and deployment operations. Palette behavior remains
> owned by [the v2 specification](v2-spec.md).

## Working agreement

- Collaborate through GitHub branches and pull requests.
- Keep public documentation and code general-purpose. Never expose internal
  sensitive information or identifiers.
- Distinguish public-source evidence from private/internal resources without
  reproducing private content.

## Baseline acceptance

Use the Node version declared by `.node-version`, then run:

```sh
npm ci
npx playwright install chromium
npm run check
npm run build
npm run check:e2e:smoke
```

The check, build, and browser smoke commands are the baseline acceptance path.
For palette-policy changes, broad UI changes, or release confidence, also run
`npm run check:full`. Linux CI provisions system browser dependencies with
`npx playwright install --with-deps chromium`.

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
  checks identified by adversarial diagnostics v3. Report v2 adds relationship
  candidate-occurrence funnels by relationship and mode, plus exact
  base-constraint failure patterns;
  treat these as descriptive pipeline exits rather than causes. Run
  `npm run test:feedback-candidates` when refreshing the reviewed census. Both
  are on-demand and excluded from CI. Report v3 also compares the current 27°
  Destructive inventory with the fixed 12°/27°/42° diagnostic ladder in the 66
  failed Destructive cells. This probe does not establish complete state
  families, joint Destructive/Warning substitution, perception, or a hue policy.
- Run `npm run diagnose:destructive-anchor > destructive-anchor.json` to
  compare the production source-red-band Destructive lightness objective with
  the normal per-mode objective over the same search and downstream engine.
  Report v2 serializes any expected candidate exhaustion with the shared
  structured failure contract.
  Run `npm run test:destructive-anchor-counterfactual` when refreshing its
  reviewed 216-input census. Both are on-demand and excluded from CI; this
  objective-target comparison does not establish semantic or perceptual
  equivalence.
- Run `npm run diagnose:mode-range > mode-range.json` for the heavier,
  on-demand counterfactual comparison of current, widened,
  gap-preserving-outward, and source-inclusive Primary lightness ranges. It is
  deliberately excluded from CI and does not change the production policy or
  identify an optimal range. Schema v3 records structured per-variant candidate
  exhaustion and compares each variant only on its successful common support.
  Run `npm run test:counterfactual` when refreshing its published 216-input
  counts; this dedicated heavy snapshot is also excluded from CI.
- Run `npm run diagnose:pair-ranking > pair-ranking.json` to compare the
  previous v11 source-first pair ordering with the current v12 conditional
  zero-miss eligibility policy over identical sampled candidates.
  Run `npm run test:pair-ranking-counterfactual` when refreshing its published
  216-input observations. Both commands are on-demand and excluded from CI;
  eligibility compliance does not establish a perceived result.
- Run `npm run diagnose:primary-chroma > primary-chroma.json` to compare the
  current v17 Primary chroma cap with the diagnostic source-relative
  four-origin, up-to-four-distinct-rung inventory and matching Primary-only
  bound. The same report also derives an above-current-cap transactional
  fallback arm without another generation pass: inputs at or below the cap keep
  v16, and considered results fall back to v16 when generation is infeasible or
  a generated contract / policy-owned pair eligibility check regresses. Run
  `npm run test:primary-chroma-counterfactual` when refreshing its published
  216-input observations. Both are on-demand and excluded from CI. The manual
  run takes roughly 36 seconds on the reviewed local environment; it does not
  establish vividness, aesthetic quality, or a production policy.
  Report v3 emits expected generation infeasibility as structured `NO_CANDIDATE`
  evidence with `decisionId`, `mode`, `role`, and `stage`; consumers must not
  parse the human-readable message to identify the failed producer stage.
- Run `npm run diagnose:filled-action-direction > filled-action-direction.json`
  for the diagnostic-only Light-darker / Dark-lighter complete-family census.
  It preserves typed candidate exhaustion without fallback and leaves policy
  v15, production cache, and UI output unchanged. The report establishes
  generation feasibility under the current search envelope, not resting-state
  preference or a replacement policy.
  A direction-only run produced zero complete candidates. The current
  transactional arm selects Dark Destructive defaults only when they can also
  complete lighter hover/active states; it generates 201 of 216 inputs and
  retains 15 structured `dark.destructive` failures. Refresh this census with
  `npm run test:filled-action-direction-counterfactual`; it remains outside
  routine CI.
- Run
  `npm run diagnose:contextual-destructive-separation > contextual-separation.json`
  to keep the same mode-relative diagnostic while moving only
  `destructive.brand-separation` from candidate eligibility to retained review
  evidence. The reviewed 216-input census generated 216/216 with zero new
  generated-contract or pair-eligibility failure, while preserving 22 false
  separation relations and exposing nine new Dark source-fidelity findings.
  Refresh it with
  `npm run test:contextual-destructive-separation-counterfactual`; this remains
  manual/on-demand and is now the evidence source for production v16.
  Open `/contextual-review.html` on the local built site to inspect the exact
  22 separation findings and nine Dark source-fidelity findings as historical
  v15 versus adopted v16 interactive Dark button families. Light is omitted except
  for the five inputs with a newly introduced Light separation finding. The
  page remains a decision record and exports no alternate token.
- Run `npm run diagnose:text-contrast > text-contrast.json` to compare the
  production `wcag-eligible-apca-ranked` baseline with historical `apca-only`,
  `wcag-only`, and strict `intersection` over the fixed 14 inputs. Production
  and WCAG-only generate 14/14; APCA-only generates but fails the current WCAG
  contract; strict intersection exhausts at 0/14. The command does not add a UI
  toggle, certify accessibility, or score visual quality.
- Open `/warning-review.html` for the accepted Light Warning appearance record.
  It shows production v19 beside the superseded v18 family and three rejected
  arms over six representative inputs. Historical arms recompute only Light
  Warning and never enter exports. Requested and rendered chroma remain separate
  because a `C .18–.24` request sweep converged at the same sRGB gamut boundary.
  The comparison explains a bounded human disposition; it is not an aesthetic
  score or accessibility certification. The evidence contract lives in
  [Light Warning appearance diagnostic](v2-decisions/research/warning-appearance.md).
- Run `npm run test:warning-policy-migration` to reproduce ADR-0007's fixed
  216-input comparison. The exhaustive test asserts production versus fixed-85°
  Light-family equality, the published minimum contrast/separation metrics, and
  the unchanged Dark-family and complete Light/Dark token digests. The complete
  digest proves behavior-neutral ownership refactors stay output-neutral. These
  are contract and regression facts, not perceptual-quality scores.
- Install the Playwright browser once with `npx playwright install chromium`;
  CI/Linux provisioning uses `npx playwright install --with-deps chromium`.
- GitHub Actions are pinned to commit SHAs and updated through Dependabot.
- No repository hook is installed. Maintainers run `npm run check` explicitly;
  pull-request and deploy workflows remain the enforced shared boundary.

## Deployment and operations

- GitHub Actions deploys the static build to public GitHub Pages from `main`.
- Pull requests always run the fast check/build workflow. Browser smoke runs
  only for paths that can affect the v2 browser surface; the full browser suite
  remains weekly or manually triggered.
- Keep the path-filtered Browser Smoke workflow optional in branch protection;
  use the always-running Check workflow as the required pull-request gate.

Before merging, review the built `dist/` artifact and Git diff for secrets,
internal URLs, private identifiers, private screenshots, and claims whose
evidence cannot be published. After merge, confirm the GitHub Pages workflow and
smoke-test the public v2 and v1 URLs linked from the README.

## Remaining human judgment

- Confirm palette quality in representative UI states; automated contrast and
  gamut checks do not establish production suitability.
- Confirm that any internally informed decision is expressed generically and
  that its public rationale stands without private material.
  The superseded [mode-relative tonal offset sweep](./v2-decisions/research/tonal-offset-sweep.md) remains reproducible research evidence and is not a live Generator control.
  The [Destructive-first grammar calibration](./v2-decisions/research/destructive-grammar-calibration.md) likewise remains a research record and producer-level test surface. Generator now shows only the accepted palette through situation tabs; further grammar work must return through a named diagnostic/report rather than another parallel live control.
