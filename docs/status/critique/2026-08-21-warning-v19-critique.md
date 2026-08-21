# Light Warning v19 Critique

Date: 2026-08-21

## Execution

Post-implementation, pre-push audit of commit `f57afef`. The change under
review adopts the operator-selected brighter Light Warning Default recipe while
keeping Dark Warning unchanged. Broad Warning redesign was out of scope.

## Target

Code critique shaped by the Michael Jackson/Jef Raskin problem-framing and
interface lens, Gerald Weinberg boundary-ownership lens, and Barbara
Minto/Atul Gawande communication and operational lens. A separate counterweight
reviewer triaged the combined findings.

## Diff Scope

Policy v19 changes Light Warning preferred lightness, requested chroma, and
range; makes Warning chroma mode-scoped; and updates the accepted review UI,
ADR, ontology projections, tests, and generated examples.

## Capability at Stake

A maintainer must be able to prove that the brighter Amber is the current Light
Warning result, that Dark did not change, and that the evidence and user-facing
explanation do not claim more aesthetic approval than the operator provided.

## Findings and Counterweight Triage

### Act Before Ship

- Correct the stale strict-counterfactual attribution in implementation status.
- Make ADR-0007's 216-input three-hue versus fixed-85° result, published minima,
  and Dark-family baseline executable in a focused regression command.
- Replace the Warning page's copied metric-extreme/14-input contract with its
  actual six fixed tabs.
- Scope the human disposition to the brighter Default recipe direction; states
  and Text are generated, contract-passing consequences rather than separately
  accepted aesthetic choices.
- Clarify that historical arms do not enter production and that v19 Dark keeps
  numeric values equal to v18.

### Bundle Anyway

- Mark the first Warning experiment explicitly historical and distinguish its
  four arms from the current five-card record.
- Expand the narrowly named documentation synchronization test only across the
  truth surfaces touched by this migration.
- Record ranking as a coupled migration kind and name the producer-to-consumer
  authority path without introducing a generic policy abstraction.

### Over-Worry

- None. The findings do not justify revisiting the accepted Amber color.

### Valid but Defer

- Warning generation still reads Primary's APCA diagnostic threshold in some
  label stages even though Warning owns a typography context. Both are currently
  `60`, so this is a boundary-ownership cleanup rather than a v19 output defect.
- More direct explanatory links for notation remain useful, but they are not a
  policy blocker. The cheap Warning-review-to-About/Reference links are bundled;
  a broader documentation-navigation redesign remains out of scope.

## Structured Findings

- F1 | bin: act-before-ship | evidence: strong | ref: docs/v2-decisions/implementation/status.md; test/v2-text-contrast-counterfactual.test.js | action: fix | note: current strict-intersection exit attribution is stale
- F2 | bin: act-before-ship | evidence: strong | ref: docs/v2-decisions/adr/0007-light-warning-vivid-amber.md; test/exhaustive/v2-grid.test.js | action: fix | note: 216-input inventory equivalence and Dark baseline need executable proof
- F3 | bin: act-before-ship | evidence: strong | ref: docs/interaction-design.md; v2/warning-review.html | action: fix | note: owner document describes a gallery the page does not contain
- F4 | bin: act-before-ship | evidence: strong | ref: docs/v2-decisions/adr/0007-light-warning-vivid-amber.md; v2/warning-review.html | action: fix | note: operator disposition must not overclaim state-family aesthetic approval
- F5 | bin: bundle-anyway | evidence: moderate | ref: docs/v2-decisions/research/warning-appearance.md; test/v2-color-system-doc.test.js | action: fix | note: historical/current boundaries and named truth-surface checks need synchronization
- F6 | bin: valid-but-defer | evidence: strong | ref: v2/lib/policy.js; v2/lib/feedback-search.js; v2/lib/palette.js | action: defer | note: Warning label search should eventually consume the Warning-owned APCA threshold

## Reviewer Tier Evidence

- Requested tier: high-leverage.
- Requested spawn fields: none; no repo critique adapter supplied a concrete mapping.
- Host exposure state: host-defaulted
- Application state: provider application metadata was not exposed.
- Delivery state: findings-received — three angle reviewers and one separate counterweight reviewer.

## Fresh-Eye Satisfaction

parent-delegated — all four read-only reviews returned findings. Parent-side
boundary fingerprints verified `verdict: clean` with no Git drift for every
review window.

## Packet Consumed

n/a (no adapter sections)

## Reviewed Input Identity

Commit `f57afef795f8a020525867142d260c3ad0150191` versus its parent; no prepared
packet was consumed because no critique adapter declared packet sections.

## Boundary Ownership

- Producer: `V2_POLICY.feedback` and Warning family selection.
- Consumers: Generator/export, selected-result review, semantic verdicts,
  Warning decision UI, tests, and normative/explanatory documents.
- Verdict: owned-correctly after synchronizing stale consumer projections; the
  Warning APCA seam was subsequently moved to its role owner without changing
  generated output.

## Follow-up Resolution

F6 was implemented in the next local slice. `warningSearch` and the complete
Warning family now resolve their APCA diagnostic minimum from
`text.typographyContexts.warningLabel`. A focused test temporarily separates the
Primary and Warning values (`91` versus `41`) and verifies Default, Hover,
Active, and final Text traces all record `41`. The exhaustive 216-input check
also pins the pre-refactor complete Light/Dark token digest, so this ownership
move must remain output-neutral.

## Deliberately Not Doing

- Do not change the accepted Amber or redesign Warning states in this cleanup.
- Do not treat a fixed-corpus equivalence test as universal aesthetic evidence.
- Do not couple historical diagnostic arms to production exports.

## Next Move

Apply the Act-Before-Ship and Bundle-Anyway corrections, run the focused
216-input check plus the repository's full policy/UI verification, and commit
the critique-driven cleanup before any push.
