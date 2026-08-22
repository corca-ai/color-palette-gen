# Human-inspection semantic-boundary critique

Date: 2026-08-22

## Decision Under Review

Keep `v2-declarative-design@5` and its 12 automated declarations unchanged,
while making the new screen inspection layer an explicit one-way projection
with no additional verdict authority.

## Failure Angles

- Jackson/Weinberg: upstream authority and screen co-occurrence are orthogonal.
  Treating them as mutually exclusive relationship kinds would misclassify
  semantic declarations that are displayed through aligned contexts.
- Raskin/Gawande: hidden `inspectionQuestion` strings do not help a person use
  the board, and a generic no-verdict field could be mistaken as removing the
  upstream declaration's existing verdict.
- Both reviews identified copy that exceeded its evidence: distinct exported
  sRGB colors do not prove human distinguishability, and Oklab separation does
  not prove feedback meaning.

## Counterweight Pass

### Act Before Ship

- Keep the executable semantic model at version 5 with exactly 12 declarations.
- Add a one-way ontology projection from upstream sources to inspection records,
  rendered contexts, and unrecorded human observations.
- Close the `sourceKind` vocabulary and resolve every source, including the
  local authored presentation question.
- Rewrite perceptual overclaims as open observation prompts and make the Edge
  matrix prompts visible.
- Prove the inspection module cannot produce or feed semantic verdicts.

### Bundle Anyway

- Inject `inspectionVerdictAuthority: "none"` in the record helper so the
  nonclaim is scoped to inspection rather than repeated as authored data.
- Keep flat source and composition fields; document them as independent axes
  instead of adding nested schema with no second consumer.
- Set Utility focus to false because its disabled control cannot own a focus
  observation.

### Over-Worry

- Do not bump semantic-model or result-schema versions for presentation-only
  metadata.
- Repeated role bindings across different questions are intentional coverage,
  not duplication.
- Do not add a generic human evaluator or nested inspection schema.

### Valid but Defer

- Add new semantic declarations only after perceptual claims have named evidence
  and evaluators.
- Persist observations only after a disposition owner and lifecycle exist.
- Reopen multi-input inspection after a finding proves input dependence.

## Structured Findings

- F1 | bin: act-before-ship | evidence: strong | ref: docs/v2-decisions/ontology.md | action: fix | note: add a one-way inspection projection without a reverse authority edge
- F2 | bin: act-before-ship | evidence: strong | ref: v2/lib/sample-inspection.js | action: fix | note: separate closed source provenance from native versus aligned screen composition
- F3 | bin: act-before-ship | evidence: strong | ref: docs/v2-decisions/policy/semantic-model.md | action: fix | note: scope no-verdict to inspection and retain upstream semantic statuses
- F4 | bin: act-before-ship | evidence: strong | ref: v2/lib/view.js | action: fix | note: render open observation prompts and remove claims of perceptual meaning
- F5 | bin: bundle-anyway | evidence: strong | ref: test/v2-applied-samples-ui.test.js | action: fix | note: lock @5 and 12 declarations and forbid inspection-to-evaluation coupling
- F6 | bin: valid-but-defer | evidence: moderate | ref: docs/interaction-design.md | action: document | note: defer persistence multi-input matrices and perceptual evaluators
- F7 | bin: over-worry | evidence: weak | ref: n/a | action: document | note: avoid nested schema and generic human-verdict machinery

## Reviewer Tier Evidence

- Requested tier: high-leverage
- Requested spawn fields: no adapter override; existing host-default reviewers reused
- Host exposure state: host-defaulted
- Application state: n/a
- Delivery state: findings-received

## Fresh-Eye Satisfaction

`parent-delegated`

## Reviewed Input Identity

No prepared packet was consumed because the repository has no critique adapter
sections. Reviewers read commit `96213ea` and the named ontology, semantic-model,
inspection, UI, and test surfaces. All three reviewer boundary verifications
returned `clean`.

## Boundary Ownership

- Producer: semantic declarations, policy rules, alias owners, presentation
  policy, and one explicitly local authored question.
- Projection: `sample-inspection.js` binds source identity to rendered context.
- Consumer: `view.js` exposes open questions for ephemeral human observation.
- Verdict: owned-correctly — upstream verdicts remain unchanged; inspection owns none.
