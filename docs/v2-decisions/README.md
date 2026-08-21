# Decision model

> Status: **Explanatory index.** Executable authority remains in `v2/lib/`,
> normative generation policy remains in `V2_POLICY`, and bounded observations
> remain research evidence rather than production rules.

Every generated color must answer two separate questions:

1. Why was this candidate selected instead of a nearby candidate?
2. Why does the rule that selected it exist?

The engine answers the first with candidate search and counterfactuals. It
answers the second with explicit provenance. Passing a contrast check alone is
not a complete justification.

## Required record

Each role records:

- intent and strategy;
- number of candidates considered;
- selected candidate and passing metrics;
- best-ranked rejected candidate, when one exists;
- next passing candidate, when one exists;
- rules that participated in the decision;
- provenance class and source for every rule.

An implementation constant without provenance is an undocumented decision and
must fail the decision-record test.

## Reading order

- To start from the concept system and follow it through pseudocode, the
  production dependency graph, and executable rule IDs, read
  [Ontology and decision algorithm](ontology.md).
- To understand how constraints, ranking, pair eligibility, reviews, and
  semantic declarations work, read [Color decision rules](rules.md), then
  follow its links to the owning policy and producer code.

### Policy

- [Evidence authority](policy/evidence.md)
- [Role policies](policy/roles.md)
- [Declarative semantic model](policy/semantic-model.md)
- [Utility role aliases](policy/utility-role-aliases.md)

These documents explain current rule intent and authority. They do not replace
the executable policy and producers named by the ontology.

### Implementation

- [Candidate search and counterfactual traces](implementation/candidate-search.md)
- [Runtime and performance](implementation/runtime.md)
- [Implementation status](implementation/status.md)

These documents explain how the current policy is executed and which portions
are implemented. They do not define new policy independently.

### Research

- [Adversarial audit](research/adversarial-audit.md)
- [Hover risk diagnostics](research/hover-diagnostics.md)
- [Filled-action state direction experiment](research/filled-action-state-direction.md)
- [Contextual Destructive separation](research/contextual-destructive-separation.md)
- [Text contrast policy counterfactual](research/text-contrast-policy.md)
- [Light Warning appearance diagnostic](research/warning-appearance.md)

Research documents contain bounded observations and explicit nonclaims. They
cannot promote a diagnostic threshold or counterfactual into production.

### Architecture decisions

- [ADR-0001: source-red collision-aware filled-action direction](adr/0001-source-red-collision-aware-filled-action-direction.md)
  — superseded before adoption
- [ADR-0002: red-band role collision presentation](adr/0002-red-band-role-collision-presentation.md)
- [ADR-0003: single-filled action hierarchy](adr/0003-single-filled-action-hierarchy.md)
  — accepted for component presentation
- [ADR-0004: mode-relative filled actions and contextual separation](adr/0004-mode-relative-filled-actions-and-contextual-separation.md)
  — accepted for production policy v16
- [ADR-0005: WCAG normal-text generation authority](adr/0005-wcag-normal-text-generation-authority.md)
  — accepted for production policy v17
- [ADR-0006: context-derived Secondary action states](adr/0006-context-derived-secondary-action-states.md)
  — accepted for production policy v18

`Proposed` ADR은 검토할 정책 후보를 고정하지만 current production truth가 아니다.
사람의 disposition과 production policy/version/test 동기화가 끝나기 전에는 ontology의
normative edge로 읽지 않는다.

### Reference

- [Public reference specimen](reference/public-specimen.md)

Reference documents explain the applied inspection surface and export boundary;
they are not upstream policy authority.
