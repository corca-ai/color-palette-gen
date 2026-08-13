# Implementation status

Current policy version: `v2-policy-model-11`.

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
- primary action border, independently searched from the action fill;
- exact brand source as an input passthrough rather than a generated color.

These roles retain selected, best-ranked rejected, and next passing candidates when
available.

Their policies explicitly separate named constraints, ordered product
objectives, and deterministic tie-breakers. Constraint authority is classified
as normative, product, provisional, or technical. The trace records every layer
and the per-candidate result of each rule.

## Paired quality review

- a sampled cross-mode comparison evaluates baseline and three fixed lightness
  points per mode;
- pair ranking minimizes worst-mode and total source shift before structural
  review misses;
- cross-mode primary hue, chroma, and lightness relationships are evaluated;
- default, hover, and active interval pacing is evaluated for both modes;
- destructive and warning state pacing is reviewed alongside primary pacing;
- provisional quality objectives remain distinct from accessibility pass/fail;
- source fidelity and structural signals are evaluated after pair selection, so
  review status is not guaranteed by construction;
- primary/destructive and primary/warning hue ambiguity is reviewed separately
  from total perceptual distance;
- a fixed 14-input gallery exposes chromatic, achromatic convergence, and
  large-shift cases;
- gallery cards disclose when different sources converge to the same generated
  light/dark action pair;
- any gallery card can be loaded into the complete interactive inspector;
- large source shifts expose generated-fill, source-outline, and source-fill
  trade-offs with per-mode availability;
- selected, next-ranked, source-faithful, and quality-boundary pairs can be
  compared directly;
- gallery ratings and notes persist locally and support versioned JSON exchange.
- gallery summaries are precomputed at build time; complete inspector results
  are calculated in a worker only when requested;
- A public-reference JSON export maps every supported semantic role to a stable
  example consumer token.

Disabled and popover roles are explicit semantic aliases to foundation roles.
No semantic output role remains a policy anchor.

## Verification

- the local APCA runtime is cross-checked against pinned `apca-w3` 0.1.9 over
  every foreground/background pairing in the 216-color RGB grid;
- every semantic role must have a selected decision and provenance;
- searched roles must retain a counterfactual candidate;
- text and non-text contracts run across a 216-color RGB grid in the weekly or
  manually triggered exhaustive tier;
- v1 and v2 remain separate applications.
- Pull-request Playwright smoke checks verify generation, mode switching, and
  invalid input handling. The full weekly/manual tier verifies semantic
  specimens, graph-to-card synchronization, lazy gallery rendering, persisted
  designer ratings, and visual snapshots in a real browser.
- fixed screenshots guard the paired palettes and public-reference specimen
  against broad visual regression.

## Next migration

1. Validate foundation and focus search targets through designer ratings.
2. Decide from demonstrated consumer use cases whether popover and disabled
   aliases need independent searches; accent and secondary remain intentionally
   unsupported.
3. Aggregate exported designer evaluations and analyze inter-rater agreement.
4. Promote thresholds from `heuristic` to `empirical` only with recorded data.
5. Review upstream `apca-w3` releases before changing the pinned verification
   version; update the parity evidence and policy version together.
