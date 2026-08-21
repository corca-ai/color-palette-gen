# Repository agent guide

This file routes work; it does not replace product, policy, implementation, or
verification sources of truth. Start with [docs/README.md](docs/README.md) and
read the owner document for the affected surface. In a conflict, executable
policy and its named owner document win over this guide.

## Policy-change front door

Treat a change as a **policy migration** when it changes generated output,
candidate eligibility, ranking/pair selection, role/family obligations,
evidence or verdict authority, presentation context, or a versioned schema. A
mechanical refactor is not a migration only when output and evidence contracts
are proved unchanged.

Before implementing a migration:

1. Name its primary kind: generation/eligibility, ranking, authority,
   presentation/context, or schema/version.
2. State the before and after law in one sentence each.
3. List **retired claims**: earlier exceptions, tests, UI behavior, and
   normative document statements that must no longer be true.
4. Scan the affected `Role × Mode × Context × State` cells. Include sibling
   roles in the same family and the path from producer through pair selection,
   review/semantic verdict, presentation, and normative docs. Name the owner
   of every intentional difference.

This is a review matrix, not authority to add a generic role engine, runtime
DSL, or new policy abstraction. Keep generated contracts, selected-result
review, semantic evidence, and human presentation judgment as separate scopes.
Research or diagnostic results do not become production eligibility or a
quality claim without an explicit policy decision and recorded human
disposition.

## Verification routing

Follow [docs/development.md](docs/development.md) for the authoritative command
details. At minimum run `npm run check` and `npm run build`. Run
`npm run check:e2e:smoke` for browser behavior, and `npm run check:full` for a
high-risk palette-policy or broad UI change.

When a policy or diagnostic changes, run its exact focused test/report named in
`package.json` and the development guide. Interpret changed counts; do not
present them as perceptual quality. For interaction grammar or presentation
changes, inspect every affected mode/context/state in a real browser and review
the relevant Playwright snapshots. Automated results do not replace that human
judgment.

## Skill Routing

At session start, a pickup follows docs/handoff.md `## Workflow Trigger`; otherwise choose the durable workflow directly from installed skill metadata and model judgment. If hidden support/integration availability is unclear, run the read-only `charness-hak catalog list --repo-root <repo> --summary` inventory. Treat its facts only as inventory; if the command returns nonzero, report the command failure. When a request names an external URL or source, use `gather` before deciding; validation closeout or operator-reading tests go through `quality`.

The SessionStart hook may inject this context when installed; this block is the fallback when it is absent.

For the concrete task, use the minimum applicable workflow: `debug` for
unexpected behavior, `spec` for a policy contract, `critique` before a
non-trivial design lock-in, `semantic-model` for cross-surface concept drift,
`narrative` for truth-surface alignment, and `impl` then `prove` for
implementation.

## Fresh-eye and dynamic review

The repository already grants bounded fresh-eye review for task-completing
`setup`, `quality`, `critique`, `release`, and GitHub `issue` closeout work;
see `.agents/subagent-delegation.json`. Respect higher-priority host limits.
Reviewers are read-only and the parent must receive their findings; do not use a
same-agent substitute when a required review cannot run.

Use multi-agent work only when independent perspectives or parallel coverage
genuinely improve the result. Before and after shared-tree reviews, preserve and
verify Git state. Do not use a reviewer to mutate, stage, restore, or reset the
shared tree.

## Truth and repository state

Keep policy, code, tests, and the owner documents synchronized in one change.
Distinguish committed/HEAD facts from the dirty working tree in all reports.
Meaningful `docs/status/` evidence is repository state and should be committed
with the work it supports; local `.git/charness-hak-artifacts/` records are not
published truth. Do not create or update a durable record when canonical
content has not changed.

Commit meaningful slices as they finish and keep commits scoped. Do not report a
task-completing slice as done while its meaningful implementation, workflow, or
durable evidence remains uncommitted unless that deferral is explicit.
