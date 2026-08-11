# Implementation status

Current policy version: `v2-policy-model-7`.

## Candidate search implemented

- primary default;
- primary hover;
- primary active;
- destructive;
- background, surface, raised surface, and muted surface;
- foreground, muted text, border, and input border;
- primary text and destructive text as explicit black/white searches;
- focus ring as an independent brand-related search.
- destructive hover and active states;
- warning default, hover, active, and text;
- selection background and text.

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
- gallery summaries are precomputed at build time; complete inspector results
  are calculated in a worker only when requested;
- Craken JSON export maps every supported semantic role to a stable consumer
  token.

Disabled and popover roles are explicit semantic aliases to foundation roles.
No semantic output role remains a policy anchor.

## Verification

- every semantic role must have a selected decision and provenance;
- searched roles must retain a counterfactual candidate;
- text and non-text contracts run across a 216-color RGB grid;
- v1 and v2 remain separate applications.
- Playwright verifies input handling, semantic specimens, graph-to-card
  synchronization, lazy gallery rendering, and persisted designer ratings in a
  real browser.
- fixed screenshots guard the paired palettes and Craken specimen against broad
  visual regression.

## Next migration

1. Validate foundation and focus search targets through designer ratings.
2. Decide from Craken use cases whether popover and disabled aliases need
   independent searches; accent and secondary remain intentionally unsupported.
3. Aggregate exported designer evaluations and analyze inter-rater agreement.
4. Promote thresholds from `heuristic` to `empirical` only with recorded data.
