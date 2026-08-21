# Session Retro
Date: 2026-08-20

## Context

This review examined a reported Red-primary inconsistency: Dark Routine Primary
became lighter through hover/pressed while Destructive confirmation became
darker. The current v16 working-tree policy unifies filled Primary and
Destructive state direction by mode.

## Evidence Summary

- `51262ff` introduced the label-polarity override for feedback state search;
  it let Destructive direction diverge from the mode policy.
- The current `test/v2-palette.test.js` asserts Light darker / Dark lighter for
  both Primary and Destructive across representative inputs.
- `npm run check`, `npm run build`, and `npm run check:full` passed in the
  current dirty worktree; the full run includes coverage, exhaustive, and
  browser tiers.
- Three read-only broad scans and four bounded critique reviews returned with
  clean shared-tree boundary fingerprints. No host-derived efficiency metrics
  were available; closeout telemetry contained zero records.

## Waste

The original rule mixed two concerns in one local search decision: the
accessibility-motivated shared label and the product interaction direction.
Because direction was inferred from an already-selected label, monotonic tests
could prove local order without proving the cross-role policy. The issue only
became obvious when two presentation contexts were visually compared.

## Critical Decisions

- Treat filled-action direction as a mode-level interaction grammar, not an
  incidental consequence of label polarity, source hue, or presentation context.
- Keep component emphasis (filled versus outline) in presentation ownership;
  it must not rewrite palette generation policy.
- Preserve diagnostics and human visual review as evidence/disposition rather
  than silently promoting them into generation eligibility.

## North Star Alignment

`docs/product.md` frames the product as a small declarative design model whose
automated evidence is reproducible and contestable, while visual suitability
remains human judgment. The v16 split supports that goal. The earlier workflow
mis-applied it by declaring a policy dimension indirectly rather than making
the role × mode × state invariant executable.

## Expert Counterfactuals

- Gerald Weinberg: begin with the cross-context symptom, then ask which owner
  produced the divergent direction. This would have identified label polarity
  as a constraint input rather than a direction authority.
- Douglas Engelbart: improve the working language and the tool together: add a
  small policy matrix that generates tests/docs review prompts, so the same
  distinction is not rediscovered through visual comparison.

## Sibling Search

- same layer: Warning default/hover/active direction and final label selection | decision: valid follow-up outside the slice | proof: current direction is inferred from generated sign and label is derived twice | follow-up: deferred warning-state-invariant
- abstraction up: policy-to-documentation authority projection | decision: valid follow-up outside the slice | proof: `roles.md` retained v15 generation-constraint wording after v16 policy changed scope | follow-up: deferred policy-projection-manifest
- specialization down: applied routine outline feedback | decision: intentional separate contract | proof: `color-mix()` overlay is outline feedback, not the filled-action family | follow-up: deferred outline-state-contract

## Next Improvements

- workflow: before approving a semantic-policy change, review a compact Role × Mode × Context × State matrix and name the owner of each differing axis.
- capability: add a declarative policy matrix/manifest that cross-checks policy, producer, evaluator, acceptance test, and normative-document claims; automate IDs and direction/scope values only.
- memory: retain this retro, the critique record, and the red-primary counterexample as the next policy-change review seed.

## Persisted

Persisted: yes: docs/retro/2026-08-20-session-retro.md
