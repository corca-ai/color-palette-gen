# Adversarial audit

Last reviewed against `v2-policy-model-11`.

## What the engine can establish

- every application role is generated or explicitly identified as passthrough or
  alias;
- selected colors satisfy the declared accessibility and product constraints;
- the exact source is preserved separately from its filled-action adaptation;
- candidate ranking, best-ranked rejection, and next passing evidence are
  inspectable;
- independent review can disagree with accessibility pass/fail.

## What the engine cannot establish

It does not prove that a palette is aesthetically good. `calm minimal` is a
versioned product policy—neutral-dominant foundations, bounded chroma, and one
brand hue—not a statistical model of designer preference. APCA and WCAG checks
establish specific contrast properties, not visual balance.

The primary lightness ranges, state Delta E thresholds, semantic separation,
cross-mode bands, and source-shift threshold remain provisional. They must not
be described as empirical until exported designer evaluations support them.

## Grid evidence

On the fixed 216-color RGB grid:

- local APCA results match official `apca-w3` 0.1.9 for all 46,656 ordered
  foreground/background pairs;
- every accessibility contract remains computable and passing;
- 115 inputs trigger at least one large filled-action source shift;
- 151 inputs trigger independent review;
- 186 mode-specific source-fidelity checks fail;
- 59 inputs trigger at least one provisional semantic hue review;
- 4 structural cross-mode or pacing signals fail.

This distribution is intentional evidence that review is no longer guaranteed
by the selection procedure. It also shows that the current action recipe often
cannot preserve very bright, dark, or saturated brand sources.

## Known search limits

- cross-mode comparison samples the baseline and three fixed lightness points
  per mode; it is not exhaustive;
- warning search uses a product-defined amber family rather than learning a
  warning color from the input;
- the 30-degree semantic hue review threshold remains provisional;
- black and white are the only filled-control text candidates;
- the primary border is evaluated against application foundations, not as an
  aesthetic border/fill pair;
- visual search maps retain complete warning and selection candidate spaces,
  but other roles still expose only selected and counterfactual summaries.

## Promotion gate

A provisional rule can become empirical only when its policy version, input
set, designer ratings, and analysis are recorded. Passing automated checks is
not sufficient evidence for promotion.
