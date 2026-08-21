# ADR-0008: Warning shared-label transaction

- Status: Accepted
- Primary migration kind: generation/eligibility
- Production identity after adoption: result schema `3`, policy
  `v2-policy-model-20`, semantic model `v2-declarative-design@5`

## Problem

Warning is presented as one state family with one label. The current producer
first chooses a provisional black-or-white label from Default, constrains Hover
and Active against it, and then lets the final `Warning Text` decision search
black and white again across the completed family. The reviewed production grid
and fixed diagnostic corpus happen to return the same label at both steps, but
the producer does not encode that identity as one transaction.

## Before and after law

- **Before:** Warning Default chooses a provisional label, Warning states must
  support it, and final Warning Text independently chooses from black and white
  across Default/Hover/Active.
- **After:** Warning Default chooses the family's only label; Hover, Active, and
  final Warning Text must validate and reuse that exact label.

## Current slice and rationale

This slice makes `warningFamilySelection()` adopt the label already recorded by
the selected Warning Default candidate, conditions Hover and Active on it, and
replaces final black-or-white reselection with an honest fixed-label validation.
It updates policy identity, decision evidence, tests, and current documentation.
The reviewed v19 role-value digest is the output-neutral baseline; policy ID and
the affected Warning Text trace are expected to change in v20.

Default owns polarity because it is the persistent, most exposed Warning state
and state eligibility needs a known label before Hover and Active can be built.
Transient-state failure does not reopen Default polarity or introduce a new
joint family-ranking policy. The family either completes under that label or
fails at the state search that cannot support it.

The executable owner is `warningFamilySelection()` in `v2/lib/palette.js`.
Focused acceptance belongs in the Warning label-policy tests, and current-policy
identity belongs in `v2/lib/policy.js`.

## Retired claims

- Final Warning Text owns an independent black-or-white selection.
- The label used to admit Warning states may differ from the exported Warning
  Text value.
- A final Warning Text decision with two candidates is evidence of the intended
  family contract.

## Capability contract

For each mode, successful Warning generation is a one-label, all-or-fail family
contract over `Default + Hover + Active + Text`. The family producer adopts the
black-or-white label recorded in the selected Default decision, every state fill
must satisfy the Warning-owned text eligibility rule against it, and the
exported `warning text` token must be byte-identical to it. A state that cannot
support the label exhausts at that state search. Final validation is a defensive
invariant recheck; it must not silently switch polarity or claim a new search.

This changes candidate authority, even when selected color values remain the
same on existing corpora. It therefore advances the policy identity to v20.
The result schema and semantic-model identity do not change because no public
field or declaration shape changes.

## Role × Mode × Context × State scan

| Role/family | Mode | Context | States | Disposition and owner |
| --- | --- | --- | --- | --- |
| Warning | Light | feedback alert and warning action | Default/Hover/Active/Text | one-label transaction; Warning producer owns selection and validation |
| Warning | Dark | feedback alert and warning action | Default/Hover/Active/Text | same transaction law; mode-specific fill recipe remains unchanged |
| Primary | Light/Dark | filled brand action | complete family | unchanged; existing fixed shared-label path is the sibling precedent |
| Destructive | Light/Dark | filled destructive action | complete family | unchanged; continues to reuse the filled-action foreground selected by Primary |
| Selection | Light/Dark | selected text region | fill/Text | unchanged independent family; no Hover/Active family transaction |
| Warning diagnostics | Light/Dark | production, APCA-only, WCAG-only, strict intersection | complete family | strategy may alter eligibility, never label identity within a successful family |
| Pair selection | Light × Dark | selected mode bundles | complete results | no new ranking objective; consumes completed Warning families |
| Review/semantic verdicts | Light/Dark | selected result | Warning evidence | remain separate authorities and consume final values only |
| Generator/export | Light/Dark | all specimens and serialized tokens | complete family | no presentation switch; consume the same exported token contract |

## Fixed decisions

1. `warningLabel` is read from the selected Warning Default decision's
   `feedback.label-contrast` evidence. The family producer must not call the
   text chooser a second time.
2. Hover and Active retain their existing state inventories, direction, minimum
   distances, and shared-label eligibility checks.
3. Final Warning Text uses a Warning-bounded fixed-candidate validation path so
   Primary production and diagnostic traces remain unchanged. Its trace says
   validation/reuse, contains one candidate, retains the required contrast
   constraint, and does not claim binary selection or contrast maximization.
4. Hover or Active infeasibility produces structured exhaustion at that state
   search. Final validation is a defensive invariant check and has no fallback
   candidate, nearest rejected opposite polarity, or next-passing polarity.
5. Production policy advances from v19 to v20; result schema `3` and semantic
   model `@5` stay unchanged.

## Probe questions

- Does any existing production-grid or fixed diagnostic-corpus result change?
  No role value changed: the fixed 216-input Light/Dark digest remains
  `6e944b5309801317a0614bde7c4f1ab550ad9e6ce507eb513befad6c658911da`.
  The focused production, APCA-only, and WCAG-only successful families also
  preserve label identity. This zero-diff is bounded regression evidence, not
  proof for all possible future policies.
- The candidate-count consumer scan is resolved: `ROLE_CLASSIFICATION.searched`
  and its palette test require multi-candidate search; `view.js` and the Warning
  appearance inspector present the trace. Pair selection, semantic evaluation,
  and reference exports consume final values rather than this count.
  Implementation must reclassify Warning Text as fixed validation and review its
  displayed explanation.

## Deferred decisions

- A generalized role-family transaction abstraction is deferred until another
  role exhibits the same unresolved ownership seam. Trigger: a second producer
  needs to choose one label and validate it across a generated state family.
- Expanding Warning labels beyond black/white is deferred. Trigger: an explicit
  palette schema and visual-policy decision introducing another on-fill source.

## Non-goals and nonclaims

- This does not change Warning hue, lightness, chroma, state direction, or
  separation recipes.
- This does not claim an aesthetic improvement or accessibility certification.
- The observed zero mismatches in bounded corpora do not prove that independent
  reselection can never diverge under a future policy or text strategy.
- This does not merge Warning with Primary/Destructive foreground ownership.

## Success criteria and acceptance checks

1. Every successful Warning family exports the exact label used by both state
   searches.
   - Verification type: `unit`; assert Default
     `feedback.label-contrast.metrics.text`, Hover/Active
     `state.shared-label.metrics.labelText`, final selected text, and exported
     text identity in Light and Dark, including successfully generated
     diagnostic strategies.
2. Final Warning Text has one fixed candidate and cannot change polarity.
   - Verification type: `unit`; assert candidate count, selected value,
     validation strategy/intent, and absence of opposite-polarity alternatives.
3. The v19 role-value output remains unchanged over the fixed 216-input grid.
   - Verification type: `integration`; run the Warning policy migration census
     and retain the complete Light/Dark token digest. `policyVersion` and the
     Warning Text decision trace are expected v20 changes, not digest failures.
4. Current policy identity and explanatory truth surfaces agree on v20 and the
   one-label transaction.
   - Verification type: `specdown`; use an exact current-version inventory over
     policy, normative docs, explanatory rules/ontology/status, UI labels, and
     exact-version tests. ADR-0007 and Warning appearance research retain
     “adopted in v19” history; the live comparison identifies that recipe as
     current under v20 rather than calling the page itself production v19.
5. The high-risk palette-policy gate remains green.
   - Verification type: `integration`; run `npm run check`, `npm run build`,
     `npm run check:e2e:smoke`, and `npm run check:full`.

## Deliberately not doing

Do not replace the explicit Warning producer with a generic role engine or DSL.
Do not treat output neutrality as grounds to keep the duplicated authority: the
policy change is about which decision owns the exported label.
Do not add a production fault-injection hook: identity, one-candidate evidence,
truthful validation strategy, and absent alternatives provide the bounded proof.

## Detection gap and sibling scan

The existing Warning tests checked readability and policy-threshold ownership,
but did not assert identity from Default evidence through both states and final
export. This was a **missing invariant**, not a missing color corpus; the new
focused seam assertion is the smallest gate that would have exposed drift.

- Same layer — Primary already fixes one selected family foreground through its
  dependent family paths: intentional existing boundary; production and
  diagnostic Primary traces remain unchanged in this slice.
- Abstraction up — Destructive explicitly aliases the filled-action foreground:
  intentional alias boundary, not the duplicated Warning shape.
- Specialization down — Selection chooses text for one fill and has no
  Hover/Active family transaction: intentional independent-search boundary.
- Mental-model sibling — `ROLE_CLASSIFICATION.searched` assumed every explicit
  decision was a multi-candidate search: same bug, fixed now by the
  `fixedValidation` class and its dedicated test.

Proof level is focused runtime generation plus the fixed 216-input exhaustive
grid. No external/provider seam exists.
