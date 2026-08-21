# Warning shared-label v20 critique
Date: 2026-08-21

## Decision Under Review

Adopt policy v20 so one Warning label selected with Default is reused and
validated across Hover, Active, final decision evidence, and export without a
second polarity choice. Token aesthetics, Warning recipes, and a generic role
engine are outside this slice.

## Execution

- Target: pre-implementation spec critique.
- Angles: Barbara Minto structure, Michael Jackson problem framing, Gerald
  Weinberg diagnostic and boundary ownership.
- Counterweight: separate skeptical triage over findings F1–F10.
- Packet consumed: n/a (no adapter sections).
- Reviewer boundary fingerprints: all four reviewer windows returned `clean`
  with no drift.

## Failure Angles

- The first draft called the sequential process atomic and omitted why Default
  owns polarity.
- It would have recomputed a label already recorded by the selected Default
  decision, leaving the duplicated-owner seam intact.
- Generic `sharedTextSearch({ fixedText })` still described a one-candidate
  validation as binary selection and maximization.
- The role classification and a palette test required every searched role,
  including Warning Text, to have at least two candidates.
- Current v19 identity and historical “adopted in v19” statements were not
  explicitly separated.

## Counterweight Pass

- Act before ship: adopt the Default decision's recorded label, emit truthful
  fixed-validation evidence, reclassify Warning Text, distinguish state
  exhaustion from invariant validation, and keep Primary trace behavior outside
  this bounded change.
- Bundle anyway: use “one-label, all-or-fail family contract,” record Default's
  persistent-state rationale, distinguish unchanged role values from changed
  v20 evidence, and update current identity surfaces while preserving history.
- Over-worry: do not add a production fault-injection hook; identity, one
  candidate, no opposite alternatives, and truthful strategy are sufficient.
- Valid but defer: none beyond the ADR's already-triggered generic abstraction
  and expanded-label deferrals.

## Fixed/Probe/Defer Coherence Result

- Fixed decisions: pass after tightening the ADR's owner, trace, failure, and
  Primary-boundary laws.
- Probe questions: candidate-count consumers are resolved and moved into the
  implementation impact; exhaustive role-value neutrality remains a measured
  closeout probe.
- Deferred decisions: pass; each has a concrete reopening trigger.

## Acceptance Check Coverage Result

- Seam identity: focused unit checks cover Default, Hover, Active, final
  decision, and exported token.
- Fixed-validation evidence: focused unit checks cover count, value, strategy,
  intent, and absent alternatives.
- Output neutrality: the Warning migration exhaustive digest covers all 216
  inputs without claiming full evidence identity.
- Truth surfaces: an exact version/reference inventory distinguishes current
  v20 identity from v19 history.
- Repository confidence: focused migration test plus check, build, smoke, and
  full gates cover the high-risk policy boundary.

## Structured Findings

- F1 | bin: act-before-ship | evidence: strong | ref: v2/lib/feedback-search.js and v2/lib/palette.js | action: fix | note: adopt the label already recorded by selected Warning Default evidence
- F2 | bin: act-before-ship | evidence: strong | ref: v2/lib/palette.js sharedTextSearch | action: fix | note: fixed validation must not claim binary choice or comparative maximization
- F3 | bin: bundle-anyway | evidence: strong | ref: docs/v2-decisions/adr/0008-warning-shared-label-transaction.md | action: fix | note: describe sequential conditioned generation as a one-label all-or-fail family contract
- F4 | bin: bundle-anyway | evidence: moderate | ref: ADR-0008 fixed decisions | action: fix | note: state why persistent Default owns polarity and transient states do not reopen it
- F5 | bin: act-before-ship | evidence: strong | ref: v2/lib/roles.js and test/v2-palette.test.js | action: fix | note: move Warning Text out of the multi-candidate searched-role invariant
- F6 | bin: act-before-ship | evidence: strong | ref: v2/lib/palette.js warningFamilySelection | action: fix | note: state search exhaustion and defensive final validation have different failure meanings
- F7 | bin: bundle-anyway | evidence: strong | ref: ADR-0008 success criteria | action: fix | note: v19 is the role-value baseline while v20 owns active evidence and authority
- F8 | bin: act-before-ship | evidence: strong | ref: v2/lib/palette.js sharedTextSearch callers | action: fix | note: use a Warning-bounded validation path so Primary traces remain unchanged
- F9 | bin: over-worry | evidence: moderate | ref: ADR-0008 acceptance checks | action: document | note: invariant assertions make a production fault-injection seam unnecessary
- F10 | bin: bundle-anyway | evidence: strong | ref: current v19 reference inventory | action: fix | note: update active surfaces and preserve historical ADR and research statements

## Reviewer Tier Evidence

- Requested tier: high-leverage.
- Requested spawn fields: n/a; no adapter mapping was configured.
- Host exposure state: host-defaulted
- Application state: n/a; host did not expose applied reviewer metadata.
- Delivery state: findings-received

## Fresh-Eye Satisfaction

parent-delegated

## Reviewed Input Identity

No prepared packet was consumed because the repository has no critique adapter
sections. Reviewers read ADR-0008 and the bounded owning code, tests, and docs.

## Boundary Ownership

- Producer: `warningFamilySelection()` adopts the label recorded by the selected
  Warning Default decision.
- Consumer: Warning states, final validation, exported token, result evidence,
  semantic checks, presentation, and reference exports.
- Owning surface: Warning-family producer in `v2/lib/palette.js`.
- Verdict: moved-to-owner

## Deliberately Not Doing

- No generic role-family transaction abstraction.
- No expanded Warning label palette.
- No production fault-injection hook.
- No generic shared-text trace change that would alter Primary diagnostics.

## Pre-Impl Action

The caller updated ADR-0008 with the owner, one-label contract, trace semantics,
failure distinction, consumer scan, version narrative, and executable acceptance
checks. Implementation may proceed against that tightened contract.
