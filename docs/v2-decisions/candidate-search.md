# Candidate search and counterfactuals

Searched roles use this sequence:

```text
source color
→ generate a bounded OKLCH candidate space
→ reject candidates that violate constraints
→ select the passing candidate with the lowest objective cost
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
  candidateCount: 80,
  selected: { hex: "#...", objectiveCost: 0.036, reasons: [] },
  alternatives: {
    nearestRejected: { hex: "#...", reasons: ["Delta E below target"] },
    nextPassing: { hex: "#...", reasons: ["Passes but changes more"] }
  },
  evidence: []
}
```

Policy anchors have one candidate and no counterfactuals. The UI must identify
them as anchors rather than implying that a search occurred.
