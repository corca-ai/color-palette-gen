# Candidate search and counterfactuals

Searched roles use this sequence:

```text
source color
→ generate a bounded OKLCH candidate space
→ reject candidates that violate named constraints
→ compare passing candidates by ordered product objectives
→ use a deterministic tie-breaker only when objective scores are equal
→ retain the closest rejected and next passing candidates
```

The selected candidate explains why the color works. The two alternatives
explain why the engine did not change less or more.

## Example: hover

The hover objective is to minimize Oklab distance from primary while moving in
the mode's required direction. A candidate must preserve hue and chroma, remain
in gamut, and reach the provisional state-separation threshold.

- **Closest rejected:** changed less, but did not reach the threshold.
- **Selected:** first candidate that reaches the threshold.
- **Next passing:** also passes, but changes more and therefore loses the
  minimum-change objective.

## Trace shape

```js
{
  id: "dark.primary.hover",
  intent: "Create the smallest lighter state change.",
  strategy: "minimum-change candidate search",
  policy: {
    constraints: [{ id: "state.minimum-separation", kind: "hard-constraint" }],
    objectives: [{ id: "state.minimum-change", direction: "minimize" }],
    tieBreakers: [{ id: "stable.hex-order", direction: "ascending" }]
  },
  candidateCount: 80,
  selected: { hex: "#...", objectiveCost: 0.036, reasons: [] },
  alternatives: {
    nearestRejected: { hex: "#...", reasons: ["Delta E below target"] },
    nextPassing: { hex: "#...", reasons: ["Passes but changes more"] }
  },
  evidence: []
}
```

## Why the layers are separate

Normative, product, provisional, and technical constraints define the feasible
set; their authority remains visible rather than being flattened into one kind
of truth. They do not claim that the first passing color is aesthetically best. Product objectives
rank only candidates inside that set. Rules are compared lexicographically in
their declared order rather than blended into an opaque weighted score. The
final hexadecimal ordering exists only to keep exact ties reproducible.

Each rule has a stable ID in `v2/lib/policy.js`. Its evaluator remains ordinary
code because contrast and family-level checks need computed context. A branch
that represents a real product exception must therefore become a named rule,
not an anonymous `if` hidden inside a score.

Policy anchors have one candidate and no counterfactuals. The UI must identify
them as anchors rather than implying that a search occurred.
