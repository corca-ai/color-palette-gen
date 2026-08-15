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
  score palette quality or establish perception.
- Install the Playwright browser once with `npx playwright install chromium`;
  CI/Linux provisioning uses `npx playwright install --with-deps chromium`.
- GitHub Actions are pinned to commit SHAs and updated through Dependabot.
- No repository hook is installed. Maintainers run `npm run check` explicitly;
  pull-request and deploy workflows remain the enforced shared boundary.
