# Critique Review
Date: 2026-08-20

## Decision Under Review

The uncommitted v16 policy makes Primary and filled Destructive action families
mode-relative: Light states darken and Dark states lighten. Dark Destructive is
selected as a complete family, while Primary–Destructive separation becomes
selected-result review evidence rather than a generation constraint.

## Failure Angles

- Michael Jackson / problem framing: the affected user-visible contexts now
  share a generation rule; their filled versus outline hierarchy remains a
  presentation concern.
- Gerald Weinberg / ownership: policy, renderer, and documentation must not
  independently reinterpret whether separation is an eligibility constraint.
- Atul Gawande / operations: unit evidence protects the engine contract;
  broad census and browser smoke serve different, explicitly limited purposes.

## Counterweight Pass

- Act before ship: correct the stale policy prose that still says Destructive
  separation gates candidate generation.
- Keep the routine outline's `color-mix()` feedback separate from the filled
  family unless a product decision explicitly gives outline controls the same
  state-token contract.
- Do not expand the required pull-request gate to every 216-input diagnostic;
  the documented weekly/manual full-check boundary is intentional.

## Structured Findings

- F1 | bin: act-before-ship | evidence: strong | ref: docs/v2-decisions/policy/roles.md:204-214; docs/v2-decisions/adr/0004-mode-relative-filled-actions-and-contextual-separation.md:41-48 | action: fix | note: policy prose still says separation is generation-enforced although v16 moves it to selected-result review
- F2 | bin: valid-but-defer | evidence: moderate | ref: v2/lib/palette.js:412-418; v2/lib/quality.js:83-91 | action: defer | note: Warning direction and final label identity lack the same explicit invariant as filled Primary/Destructive
- F3 | bin: over-worry | evidence: moderate | ref: v2/styles/specimens.css:131-145,488-501 | action: document | note: outline feedback is a distinct presentation treatment, not evidence that filled-action direction is inconsistent
- F4 | bin: over-worry | evidence: strong | ref: docs/development.md:106-127; .github/workflows/full-check.yml:3-6 | action: defer | note: making all heavy diagnostics required PR CI would violate the intentionally documented execution boundary

## Reviewer Tier Evidence

- Requested tier: high-leverage.
- Requested spawn fields: `model: gpt-5.6-luna`, `reasoning_effort: medium` (explicit user request).
- Host exposure state: requested_fields_sent
- Application state: host did not return provider-application metadata.
- Delivery state: findings-received

## Fresh-Eye Satisfaction

parent-delegated — three distinct angle reviews and a separate counterweight
review returned findings; shared-tree boundary fingerprint verified clean after
each completed reviewer.

## Reviewed Input Identity

n/a (no critique-adapter packet sections); the generated prepare packet recorded
the changed-scope identity but was not a reviewer-consumed packet.

## Boundary Ownership

- Producer: `V2_POLICY` and `palette.js` produce the separation scope and filled-action state family.
- Consumer: the generated specimens, semantic evaluation, tests, and policy documentation.
- Owning surface: the production policy plus `docs/v2-decisions/policy/roles.md` as its normative explanation.
- Verdict: owned-correctly — the production owner is correct; the documentation projection must be synchronized before merge.
