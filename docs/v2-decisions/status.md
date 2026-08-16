# Implementation status

Current policy version: `v2-policy-model-12`.

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
- an explicit seven-check Primary pair eligibility gate prefers zero-miss
  sampled pairs before source-first ranking, with exact v11 source-first fallback
  when no eligible pair exists;
- cross-mode primary hue, chroma, and lightness relationships are evaluated;
- default, hover, and active interval pacing is evaluated for both modes;
- destructive and warning state pacing is reviewed alongside primary pacing;
- provisional quality objectives remain distinct from accessibility pass/fail;
- source fidelity, semantic hue separation, and non-eligibility pacing signals
  remain independent post-selection review; only the seven named eligibility
  relations are guaranteed when an eligible sampled pair exists;
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
- gallery summaries are precomputed at build time; complete inspector results
  are calculated in a worker only when requested;
- A general-purpose reference JSON export maps every supported semantic role to
  a stable example token namespace.

## Declarative semantic evaluation

- the executable semantic model covers Primary action, Foundation hierarchy and
  text, Focus adjacent contrast and Oklab control separation, Feedback label
  APCA and pairwise Oklab relations, and Selection text APCA and Surface Oklab
  relations;
- constraint, invariant, relation, and generation strategy remain distinct
  concepts; experiential intent is explicitly unmodeled;
- every declaration names versioned evidence trace metadata and one registered
  evaluator;
- evaluation results retain declaration, evaluator, and evidence IDs so the
  reason for a status is inspectable;
- each declaration has executable positive, contradictory, and missing-evidence
  acceptance scenarios in the fast unit tier;
- aggregate satisfaction is scoped to 12 measurable declarations and does not
  establish overall palette quality or perceived hover discoverability;

Disabled and popover roles are explicit semantic aliases to foundation roles.
Their independent searches are intentionally deferred until a reproducible
public component case demonstrates a distinct duty under the documented
promotion contract. No semantic output role remains a policy anchor.

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
  specimens, graph-to-card synchronization, lazy diagnostic gallery rendering,
  interactive state trials, and visual snapshots in a real browser.
- fixed screenshots guard the paired palettes and public-reference specimen
  against broad visual regression.
- `npm run diagnose:adversarial` emits a deterministic 216-input diagnostic map
  grouped by named signals and convergent generated action families; it does
  not score visual quality or establish perception.
- the same report decomposes large source shifts by descriptive source-OKLCH
  cohorts, affected mode, actual L/C movement, and the existing constraint IDs
  recorded on the producer's best-ranked rejected Primary candidate.
- the adversarial report's `semanticHueReview` section validates the exact four
  provisional producer hue checks and keeps its 59 flagged inputs, 118
  input-by-mode cases, and 120 failed check occurrences distinct. Source cohorts
  and input-level overlaps remain descriptive and noncausal.
- `npm run diagnose:feedback-candidates` examines only those 120 failed checks.
  The reviewed v12 census finds role-local default-fill alternatives for 43:
  42 of 54 Warning cases but only 1 of 66 Destructive cases. It does not prove
  complete state-family or joint feedback substitution feasibility.
- `npm run diagnose:mode-range` compares three diagnostic-only range
  counterfactuals. In the reviewed 216-input run, symmetric, outward-only, and
  source-inclusive expansion are not policy candidates as tested: none resolves
  source fidelity without adding pair-quality or contract losses.
- `npm run diagnose:pair-ranking` compares the previous v11 source-first order
  with the current v12 conditional eligibility rule over identical sampled pair
  candidates. The reviewed migration changes exactly 4 pairs and produces a
  small mean source-distance increase without newly failing a named check,
  contract, semantic declaration, or large-shift threshold. This is a diagnostic
  ordering result, not a policy or perceptual verdict.
- `npm run diagnose:primary-chroma` tests a Primary-only source-relative
  four-origin, up-to-four-distinct-rung inventory and matching bound. The broad
  arm reduces the reviewed source-shift census from 115 inputs / 186 modes to
  108 / 177 and raises mean selected realized C, but one input becomes
  generation-infeasible and another newly misses pair chroma eligibility. A
  derived above-current-cap transactional fallback rejects those two results
  and retains 122, yielding 109 / 178 shifts, zero generated/eligibility
  regressions, mean realized C 0.14864, and mean source distance 0.16654 across
  all 216 inputs. This compliance is constructed by the guard and is not a
  production or perceptual verdict.

## Next migration

1. Test candidate-level alternatives for the two guarded Primary chroma
   rejections (`#FF6666` downstream feasibility and `#3300FF` cross-mode chroma)
   before considering the dual-generation transactional fallback as policy.
2. Use the role-local availability split to specify a narrow Destructive
   candidate-inventory hypothesis before changing hue thresholds or policy.
3. Review whether utility aliases need semantic declarations beyond their
   existing promotion contract.
4. Promote thresholds from `heuristic` to `empirical` only with a separately
   authorized dataset and analysis.
5. Review upstream `apca-w3` releases before changing the pinned verification
   version; update the parity evidence and policy version together.
