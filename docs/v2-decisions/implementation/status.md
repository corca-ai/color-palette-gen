# Implementation status

Current policy version: `v2-policy-model-18`.

> The five applied-sample tabs exercise every generated component role:
> Primary, Destructive, and Warning state families are interactive; Form & focus
> renders Focus, Disabled, and Popover roles. `brand source` remains the sole
> provenance-only role and is shown in the palette inspector rather than applied
> as a component color.

> Accepted interaction disposition: Primary and Destructive use one shared
> foreground per mode. Light states get progressively darker and Dark states
> get progressively lighter. Dark Destructive selection is transactional: only
> defaults that complete hover and active with that foreground enter selection.
> The rule is hue-independent. See
> [ADR-0004](../adr/0004-mode-relative-filled-actions-and-contextual-separation.md).

> Historical v15 failure decomposition showed that the implementation was
> honoring its then-current policy rather than
> missing candidates: 1,052 Destructive defaults pass label and Primary
> separation across the 12 remaining inputs, but zero can also complete the
> lighter Active state. An executable producer probe removes only
> `destructive.brand-separation` and reveals 13 complete Destructive families;
> all 12 inputs still stay below `0.08` against their eligible Primary families.
> This empty intersection is conditioned on the frozen v15 ranges, steps, sRGB
> mapping/deduplication, white `Lc 60`, and 80-candidate state search—not every
> possible inventory. Ontology now distinguishes
> semantic role identity, context-free palette separation, and contextual
> component presentation. ADR-0004 subsequently moved separation from
> generation eligibility to retained selected-result review in production v16;
> this paragraph remains the causal record for the rejected v15 boundary.

> The contextual-separation diagnostic generated all 216 fixed inputs
> with zero generated-contract or pair-eligibility regression when
> `destructive.brand-separation` moves from candidate eligibility to retained
> review evidence. The evidence remains truthful: 22 inputs are semantically
> unsatisfied on the recorded separation relation, and nine Dark
> source-fidelity findings are newly introduced. This is an implementable
> authority split. The operator reviewed the exact warning queue and accepted
> it for production v16 without relabeling any warning as pass. See
> [Contextual Destructive separation](../research/contextual-destructive-separation.md).

> Component presentation now follows the hue-independent single-filled action
> hierarchy. Coexisting actions use Primary filled + Destructive outline;
> destructive confirmation uses dedicated Destructive filled + secondary
> Cancel. Red-band remains diagnostic only, and the superseded visual-family
> reuse experiment remains history under ADR-0002. Current authority is
> [ADR-0003](../adr/0003-single-filled-action-hierarchy.md).

> Production v18 completes that hierarchy's Secondary interaction boundary.
> Destructive-confirmation Cancel now derives a context-local opaque family from
> Muted Surface, follows Light-darker / Dark-lighter with provisional
> `Delta E 0.015/0.030`, and validates its actual `11px/650` Foreground label at
> WCAG `4.5:1`. Focus candidate eligibility and final checks now include Muted
> Surface; the fixed 216-input scan changed 14 Dark Focus selections, changed no
> Light selection, and exhausted no candidate set. See
> [ADR-0006](../adr/0006-context-derived-secondary-action-states.md).
> Because Focus is part of complete mode-bundle identity, the refreshed current
> diagnostic arm records 115 large-shift inputs / 177 mode occurrences and 215
> dropped duplicate pair samples. Generated contract failures remain zero; these
> count movements are structural evidence, not a perceptual-quality claim.

## Candidate search implemented

- primary default;
- primary hover;
- primary active;
- destructive;
- background, surface, raised surface, and muted surface;
- foreground, muted text, border, and input border;
- one Primary-owned black/white filled-action foreground search, reused by and
  enforced during Destructive default/hover/active selection;
- focus ring as an independent brand-related search against Background,
  Surface, and Muted Surface.
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
- Primary and Destructive filled actions share the mode-relative direction
  (Light darker, Dark lighter) and one foreground per mode across both complete
  state families;
- component action groups use `single-filled-action-hierarchy-v2`: ordinary
  coexistence renders Primary filled plus Destructive outline, while destructive
  confirmation renders dedicated Destructive filled plus a context-derived
  secondary Cancel whose state direction and text contrast are checked;
  red-band is diagnostic only and does not change this hierarchy;
- Generator presents the accepted result through five situation tabs—Workspace,
  Routine actions, Destructive confirmation, Feedback & selection, and Form &
  focus—without exposing superseded counterfactual controls;
- provisional quality objectives remain distinct from accessibility pass/fail;
- source fidelity, semantic hue separation, and non-eligibility pacing signals
  remain independent post-selection review; only the seven named eligibility
  relations are guaranteed when an eligible sampled pair exists;
- the combined `quality` result is named selected-result review because it also
  retains those seven selection-authoritative eligibility checks;
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

- the executable semantic model `v2-declarative-design@5` covers Primary action, Foundation hierarchy and
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

- generated results expose separate contract, selected-result review, and
  semantic-model verdicts; legacy `result.passed` remains only an alias of the
  explicit `contractsPassed` contract verdict;
- candidate exhaustion uses a structured `NO_CANDIDATE` producer contract with
  stable decision, mode, role, and stage provenance; diagnostic reports retain
  the message only as human-readable context;
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
- `npm run diagnose:text-contrast` compares production WCAG eligibility with
  APCA ranking, historical APCA-only, WCAG-only, and strict APCA∩WCAG candidate
  eligibility over the fixed 14 inputs. Production and WCAG-only both generate
  14/14; the strict intersection generates 0/14 under the current
  inventory, stopping at Dark Primary for 13 inputs and Light Warning for one.
  The failed viability gate prevents the planned 216-input expansion and does
  does not expose a Generator toggle.
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
  complete state-family or joint feedback substitution feasibility. Report v2
  further decomposes the 66 Destructive cases' 2,838 repeated candidate
  occurrences into 1,026 base-constraint exits, 1,798 base-passing hue-review
  exits, and 14 passing both; these are pipeline counts, not causes or rates.
  Report v3 adds the fixed 12°/27°/42° Destructive sensitivity ladder. It
  retains the current available case, exposes 19 newly available local defaults,
  and leaves 46 unavailable. This is inventory evidence only, not a semantic,
  perceptual, state-family, downstream, or production-policy result.
- `npm run diagnose:destructive-anchor` changes only the source-red-band
  Destructive preferred-lightness target. Across 41 applicable inputs / 82 mode
  cases, objective decision evidence changes in all 82 and 75 selected
  Destructive families change. No contract, semantic-model, Warning-family,
  source-shift, or named quality finding is introduced, and one provisional
  Light hue-review finding resolves. This is recorded objective-target evidence,
  not semantic or perceptual equivalence.
- `npm run diagnose:mode-range` compares three diagnostic-only range
  counterfactuals. In the reviewed 216-input run, symmetric, outward-only, and
  source-inclusive expansion are not policy candidates as tested. The
  source-inclusive arm now records 48 structured Light Destructive exhaustion
  cases because the widened Primary, shared action foreground, and semantic-red
  constraints cannot all be satisfied; successful arms retain matched-support
  comparisons rather than hiding those exclusions.
- `npm run diagnose:pair-ranking` compares the previous v11 source-first order
  with the current v12 conditional eligibility rule over identical sampled pair
  candidates. The reviewed migration changes exactly 4 pairs and produces a
  small mean source-distance increase without newly failing a named check,
  contract, semantic declaration, or large-shift threshold. This is a diagnostic
  ordering result, not a policy or perceptual verdict.
- `npm run diagnose:primary-chroma` tests a Primary-only source-relative
  four-origin, up-to-four-distinct-rung inventory and matching bound. The broad
  arm reduces the reviewed source-shift census from 115 inputs / 186 modes to
  108 / 177 and raises mean selected realized C. All 216 v16 inputs generate;
  `#3300FF` alone newly misses pair chroma eligibility. A derived
  above-current-cap transactional fallback rejects that result and adopts 123,
  yielding 109 / 178 shifts, zero generated/eligibility regressions, mean
  realized C 0.14881, and mean source distance 0.16652 across all 216 inputs.
  This compliance is constructed by the guard and is not a production or
  perceptual verdict.

## Next migration

1. Preserve the completed operator disposition for all 22 separation misses and
   nine new Dark source-fidelity findings under ADR-0004. Production v16 keeps
   each automated warning truthful; future evidence may reopen the decision.
2. Post-check the accepted one-filled-action hierarchy in both modes. Ordinary
   coexistence keeps Primary filled and Destructive outline; destructive
   confirmation keeps dedicated Destructive filled beside secondary Cancel.
   Red-band remains a review signal and does not select either strategy.
3. Keep the Destructive source-band anchor unchanged until the fixed-default
   result receives a separate policy/perceptual disposition; current automated
   evidence alone does not establish equivalent semantic intent.
4. Test candidate-level alternatives for the guarded Primary chroma rejection
   (`#3300FF` cross-mode chroma) before considering the dual-generation
   transactional fallback as policy. Retain the former v15 `#FF6666`
   downstream infeasibility as historical evidence of the old generation
   boundary, not as a current v17 failure.
5. Use the role-local availability split to specify a narrow Destructive
   candidate-inventory hypothesis before changing hue thresholds or policy.
6. Review whether utility aliases need semantic declarations beyond their
   existing promotion contract.
7. Promote thresholds from `heuristic` to `empirical` only with a separately
   authorized dataset and analysis.
8. Review upstream `apca-w3` releases before changing the pinned verification
   version; update the parity evidence and policy version together.
   The superseded [mode-relative tonal offset sweep](../research/tonal-offset-sweep.md) remains as research evidence. Its first `δ 0.005` step retained 216/216 generated contracts but conflicted with the existing Primary pair lightness-gap review for 16 inputs; it is no longer exposed as the live calibration order.
   The [Destructive-first grammar calibration](../research/destructive-grammar-calibration.md) remains reproducible research evidence and producer-level test coverage, but its live controls have been retired from Generator after the component hierarchy decision. Generator now presents the accepted palette through Workspace, Routine actions, Destructive confirmation, Feedback & selection, and Form & focus tabs.
