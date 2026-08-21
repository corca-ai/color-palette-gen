# Ontology-driven edge inspection spec critique

Date: 2026-08-21

## Decision Under Review

Add a sixth ontology-informed inspection board that aligns valid component
contexts so people can notice cross-role visual inconsistencies without turning
those comparisons into palette-generation authority.

## Failure Angles

- Raskin/Gawande: a board mixed into a `Sample situation` tablist could be read
  as a realistic product screen; wrapper-only markers and inconsistent state
  readouts would make the promised operator check largely cosmetic.
- Jackson/Weinberg: placing Primary, filled Destructive, Warning, and Secondary
  in one synthetic action group would violate the presentation contexts the
  ontology already distinguishes. Focus is also an independent indicator, not
  a fourth mutually exclusive fill state.
- Both reviews found that “complete coverage” was circular without a bounded
  derivation inventory and exact source IDs.

## Counterweight Pass

### Act Before Ship

- Define a small static obligation record and bind its roles to actual rendered
  selectors; do not build a runtime DSL.
- Align separately labelled native contexts: ordinary action, destructive
  confirmation, and Warning feedback.
- Represent fill state and focus as independent axes with uniform readouts.
- Correct Input Border adjacency to Surface and attach exact source IDs.
- Verify computed fill, label, focus outline, and host surface in both modes.
- Scope completeness to the checked-in bounded inventory and state explicit
  non-exhaustiveness.

### Bundle Anyway

- Reframe the page as five realistic situations plus one inspection board.
- Add one Light and one Dark full-board snapshot rather than a combinatorial
  screenshot suite.
- Assert that the board has no score, vote, persistence, or automatic pass/fail
  control.

### Over-Worry

- A sixth synthetic inspection tab is appropriate when its non-product identity
  is visible.
- A static inventory is not a generic role engine unless it starts expanding
  arbitrary families, generating contexts, or evaluating policy.
- Compared controls need equal geometry, not identical visual treatment.

### Valid but Defer

- Multi-input matrices reopen after a finding is shown to depend on the input.
- Observation persistence reopens only with a named disposition owner and
  authority contract.
- Generated pairwise co-occurrence reopens only if curated probes repeatedly
  miss a documented defect class.

## Structured Findings

- F1 | bin: act-before-ship | evidence: strong | ref: docs/interaction-design.md#ontology-driven-edge-case-inspection | action: fix | note: bind a static obligation record to actual role selectors and exact source IDs
- F2 | bin: act-before-ship | evidence: strong | ref: docs/v2-decisions/ontology.md#action-group-hierarchy와-role-collision | action: fix | note: preserve native action contexts while aligning them for comparison
- F3 | bin: act-before-ship | evidence: strong | ref: v2/lib/view.js | action: fix | note: use uniform fill-state readouts and an independent focus axis
- F4 | bin: act-before-ship | evidence: strong | ref: docs/v2-decisions/rules.md | action: fix | note: verify computed fills labels focus outline and actual host surfaces in both modes
- F5 | bin: bundle-anyway | evidence: moderate | ref: e2e/v2.spec.js | action: fix | note: add bounded Light and Dark Edge matrix snapshots
- F6 | bin: valid-but-defer | evidence: moderate | ref: docs/interaction-design.md#edge-matrix-screen-plan | action: document | note: defer multi-input matrices until a finding proves input dependence
- F7 | bin: over-worry | evidence: weak | ref: n/a | action: document | note: do not derive arbitrary co-occurrences or make the static inventory a generic role engine

## Reviewer Tier Evidence

- Requested tier: high-leverage
- Requested spawn fields: fork_turns=all; no model or reasoning override supplied by the missing adapter
- Host exposure state: host-defaulted
- Application state: n/a
- Delivery state: findings-received

## Fresh-Eye Satisfaction

`parent-delegated`

## Reviewed Input Identity

No prepared packet was consumed. Reviewers read the pending
`docs/interaction-design.md` change and named current code/test surfaces. All
three reviewer boundary verifications returned `clean`.

## Boundary Ownership

- Producer: palette policy, semantic declarations, alias provenance, and
  component-presentation policy produce the facts being inspected.
- Consumer: the applied-sample Edge matrix renders those facts for human visual
  comparison.
- Owning surface: `sample-inspection.js` owns presentation metadata;
  `interaction-design.md` owns screen meaning; upstream policy owners remain
  unchanged.
- Verdict: owned-correctly
