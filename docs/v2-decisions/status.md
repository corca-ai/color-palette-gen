# Implementation status

Current policy version: `v2-policy-model-4`.

## Candidate search implemented

- primary default;
- primary hover;
- primary active;
- destructive.

These roles retain selected, closest rejected, and next passing candidates when
available.

Their policies explicitly separate named constraints, ordered product
objectives, and deterministic tie-breakers. Constraint authority is classified
as normative, product, provisional, or technical. The trace records every layer
and the per-candidate result of each rule.

## Paired quality review

- a bounded joint search compares complete light/dark primary pairs;
- pair ranking minimizes quality misses before worst-mode and total source shift;
- cross-mode primary hue, chroma, and lightness relationships are evaluated;
- default, hover, and active interval pacing is evaluated for both modes;
- provisional quality objectives remain distinct from accessibility pass/fail;
- a fixed 12-input gallery exposes chromatic, achromatic, and large-shift cases;
- any gallery card can be loaded into the complete interactive inspector.
- large source shifts expose generated-fill, source-outline, and source-fill
  trade-offs with per-mode availability.
- selected, next-ranked, source-faithful, and quality-boundary pairs can be
  compared directly;
- gallery ratings and notes persist locally and support versioned JSON exchange.

## Policy anchors

- neutral foundations;
- foreground and muted text;
- decorative and input boundaries;
- primary and destructive text;
- focus-ring alias.

Anchors expose intent and provenance but do not claim that alternatives were
searched.

## Verification

- every semantic role must have a selected decision and provenance;
- searched roles must retain a counterfactual candidate;
- text and non-text contracts run across a 216-color RGB grid;
- v1 and v2 remain separate applications.

## Next migration

1. Move neutral hierarchy and tint into bounded candidate search.
2. Represent black/white text comparison as a complete search trace.
3. Search input boundary and focus independently instead of relying on anchors.
4. Resolve Craken token gaps: distinct popover, accent, secondary, warning,
   disabled, and destructive interaction states.
5. Aggregate exported designer evaluations and analyze inter-rater agreement.
6. Promote thresholds from `heuristic` to `empirical` only with recorded data.
