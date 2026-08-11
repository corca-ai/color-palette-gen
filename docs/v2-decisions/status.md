# Implementation status

Current policy version: `v2-policy-model-6`.

## Candidate search implemented

- primary default;
- primary hover;
- primary active;
- destructive;
- background, surface, raised surface, and muted surface;
- foreground, muted text, border, and input border;
- primary text and destructive text as explicit black/white searches;
- focus ring as an independent brand-related search.

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
- any gallery card can be loaded into the complete interactive inspector;
- large source shifts expose generated-fill, source-outline, and source-fill
  trade-offs with per-mode availability;
- selected, next-ranked, source-faithful, and quality-boundary pairs can be
  compared directly;
- gallery ratings and notes persist locally and support versioned JSON exchange.

No semantic output role remains a policy anchor.

## Verification

- every semantic role must have a selected decision and provenance;
- searched roles must retain a counterfactual candidate;
- text and non-text contracts run across a 216-color RGB grid;
- v1 and v2 remain separate applications.

## Next migration

1. Validate foundation and focus search targets through designer ratings.
2. Resolve Craken token gaps: distinct popover, accent, secondary, warning,
   disabled, and destructive interaction states.
3. Aggregate exported designer evaluations and analyze inter-rater agreement.
4. Promote thresholds from `heuristic` to `empirical` only with recorded data.
