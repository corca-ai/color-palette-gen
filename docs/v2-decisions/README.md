# Decision model

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

- To understand a source label such as `heuristic`, read [Evidence](evidence.md).
- To understand why the engine shows three candidates, read
  [Candidate search](candidate-search.md).
- To understand a particular palette role, go directly to
  [Role policies](role-policies.md).
- To understand why disabled and popover roles currently reuse foundation
  colors, read [Utility role aliases](utility-role-aliases.md).
- To distinguish implemented search from future work, read
  [Implementation status](status.md).
- To understand why only the sample adopts a public reference structure, read
  [Public reference specimen](craken-integration.md).
- To understand how design intent stays separate from formulas, read the
  [Declarative design semantic model](semantic-model.md).
- To understand non-normative signals that prioritize hover review, read
  [Hover risk diagnostics](hover-diagnostics.md).
- To understand worker generation, caching, and the precomputed gallery, read
  [Runtime and performance](runtime.md).
- To understand what the engine still cannot justify, read the
  [Adversarial audit](adversarial-audit.md).
