# Adversarial audit

Last reviewed against `v2-policy-model-16`.

## What the engine can establish

- every application role is generated or explicitly identified as passthrough or
  alias;
- selected colors satisfy the declared hard generation contracts; sampled pair
  eligibility is guaranteed only when at least one eligible pair exists;
- the exact source is preserved separately from its filled-action adaptation;
- candidate ranking, best-ranked rejection, and next passing evidence are
  inspectable;
- deterministic quality-review signals can disagree with generated contract
  pass/fail.

## What the engine cannot establish

It does not prove that a palette is aesthetically good. `calm minimal` is a
versioned research policy—neutral-dominant foundations, bounded chroma, and one
brand hue—not a statistical model of designer preference. APCA and WCAG checks
establish specific contrast properties, not visual balance.

The primary lightness ranges, state Delta E thresholds, semantic separation,
cross-mode bands, and source-shift threshold remain provisional. They must not
be described as empirical without a separately authorized, documented dataset
and analysis.

## Grid evidence

Run `npm run diagnose:adversarial` to reproduce the machine-readable diagnostic
signal map for this grid. The command reports named contract, quality, semantic,
hover-structure, source-shift, pair-selection, and output-convergence signals.
It writes JSON to standard output and has no timestamp, so two runs against the
same policy and semantic-model versions can be compared directly. The report is
diagnostic: signal counts are not a palette score, and output convergence does
not by itself mean failure.

On the fixed 216-color RGB grid:

- local APCA results match official `apca-w3` 0.1.9 for all 46,656 ordered
  foreground/background pairs;
- every accessibility contract remains computable and passing;
- 115 inputs trigger at least one large filled-action source shift;
- 148 inputs trigger deterministic selected-result review signals;
- 177 mode-specific source-fidelity checks fail;
- 59 inputs trigger at least one provisional semantic hue review;
- no selected pair fails the seven policy-owned Primary pair eligibility checks.

The zero pair-eligibility misses are policy compliance, not independent evidence
that v12 is perceptually better. The remaining independent signals still show
that selection does not guarantee source fidelity or semantic hue separation,
and that the current action recipe often cannot preserve very bright, dark, or
saturated brand sources.

## Semantic-hue review map

The report separately validates and summarizes the four provisional producer
checks for Light/Dark Primary ↔ Destructive and Primary ↔ Warning hue
separation. Their observation units remain distinct: 216 inputs, 432
input-by-mode cases, and 864 input-by-mode-by-relationship check opportunities.
The reviewed grid contains 59 flagged inputs, 118 flagged mode cases, and 120
failed check occurrences.

- Primary ↔ Destructive accounts for 66 failed occurrences: 33 in Light and 33
  in Dark.
- Primary ↔ Warning accounts for 54 failed occurrences: 27 in Light and 27 in
  Dark.
- 32 inputs fail only the Destructive relationship in both modes, 26 fail only
  the Warning relationship in both modes, and one fails both relationships in
  both modes.
- 26 of the 59 flagged inputs also have a large source shift. No generated
  contract or selected pair-eligibility miss overlaps the flagged set in this
  policy/grid snapshot.

The source-cohort marginals include both the full fixed-grid cohort denominator
and the flagged numerator. They describe the input source color, not the selected
Primary colors used by the hue checks. In this coarse fixed grid, 32 flagged
inputs occupy the 0–60° source-hue sector, 26 occupy 60–120°, and one occupies
300–360°. These bins and overlaps do not establish a cause, semantic confusion,
perceived meaning, population prevalence, independence between checks, or an
empirical basis for the 30° threshold.

## Source-fidelity cohorts

The diagnostic report groups the 115 inputs with at least one large source
shift using descriptive source-OKLCH bins. These bins organize inspection; they
are coarse fixed intervals chosen for legibility, not learned categories, new
generation thresholds, or empirical regimes. Numeric upper bounds are exclusive
as recorded by `maximumExclusive` in the JSON report.

- input lightness: 5 very-dark, 21 dark, 16 light, and 73 very-light;
- input chroma: 4 achromatic, 10 low, 42 moderate, and 59 high;
- affected modes: 34 Light-only, 19 Dark-only, and 62 both modes;
- actual Light movement: 89 darker and 7 lighter; 82 lower-chroma and 14
  higher-chroma;
- actual Dark movement: 55 darker and 26 lighter; 64 lower-chroma and 17
  higher-chroma.

For each affected mode, the report also reads the constraint failures already
recorded on the producer's best-ranked rejected Primary candidate (the legacy
trace field is named `nearestRejected`). `primary.mode-range`
appears on all 96 Light and all 81 Dark shifted cases. `primary.calm-chroma`
appears on 52 Light and 43 Dark cases; shared-label and complete-family failures
appear less often. These are rejection records, not exclusive causal labels:
one candidate can fail several constraints, and the generator may select a
different candidate that satisfies all of them.

The report therefore records exact failed-constraint combinations as sorted
constraint IDs joined by `+`, as well as individual counts.
`primary.mode-range` is the only failed constraint for 43
Light and 26 Dark cases. The other 108 mode-specific cases combine it with
calm-chroma, shared-label, or complete-family failures, so the repeated range
signal must not be read as a sole-cause diagnosis. None of these shifted sources
start inside the nominal producer-recorded role-lightness bounds: Light has 89
above and 7 below; Dark has 55 above and 26 below. Each case retains the source
L and recorded minimum/maximum beside that classification. The producer's
constraint verdict separately owns its ±0.001 comparison tolerance. This
describes where the fixed corpus meets the current policy. It does not establish
that widening or moving a range would preserve the other contracts or improve
the resulting design.

## Known search limits

`npm run diagnose:mode-range` separately runs three counterfactual Primary-range
experiments over the same fixed grid. `widened` expands each current endpoint by
0.04. `gap-preserving-outward` lowers only the Light minimum and raises only the
Dark maximum by 0.04, leaving the inward-facing endpoints unchanged.
`source-inclusive` extends each mode range only far enough to contain that
input's source OKLCH lightness. The report compares source-shift, contract,
quality, semantic, pair-quality, and distance outcomes against the unchanged
policy baseline. These are deliberately strong probes, not candidate policy
recommendations; a source-fidelity gain accompanied by contract or structural
loss remains a tradeoff, not an improvement verdict.
Named signal deltas retain producer check/declaration IDs. Expected structured
candidate exhaustion, infeasible state candidates, and exact pair samples are
separately counted; unexpected generation errors still abort the experiment.
`meanModeSourceDistance` is the arithmetic mean of the producer's Oklab
source-distance values across both modes (432 values for this corpus);
`maximumModeSourceDistance` is the largest single mode value.

Against `v2-policy-model-16`, the fixed 216-input run shows:

- widening every endpoint by 0.04 increases shifted inputs from 115 to 116,
  leaves 186 affected mode cases, raises mean mode source distance from 0.18042
  to 0.18445, and introduces 15 pair-eligibility misses;
- widening only the outward endpoints leaves shifted inputs unchanged at 115,
  reduces affected mode cases from 186 to 183 and mean mode source distance to
  0.17961, but introduces 1 lightness-gap eligibility miss;
- extending both ranges to include each source generates 138 inputs and records
  78 explicit candidate-exhaustion cases. On the 138 successful inputs it
  records 23 shifted inputs / 25 shifted modes, mean mode source distance
  0.09215, 1 generated-contract failure, and 13 paired-quality-miss
  inputs. These values are not compared as if they had the full 216-input
  denominator.

None of the three range probes is a policy candidate as tested. The
source-inclusive arm especially demonstrates that admitting a much lighter
Primary can make semantic-red Destructive candidates incompatible with the
mode's already-selected action foreground and complete state-family constraints;
outward-only widening does not resolve any shifted input; source inclusion
reduces source distance but introduces contract and pair-eligibility
losses. Another undirected interval expansion is therefore not the next policy
move supported by this audit.

`npm run diagnose:pair-ranking` preserves the decision evidence that motivated
v12. It applies the previous v11 source-first order and the current v12
zero-Primary-pair-quality-miss gate to the same candidate-set identity. The gate
owns seven explicit check IDs; it does not turn every current or future quality
check into selection policy.

Against the same candidate construction and 216-input grid, all 4 previous v11
`pair.primary-lightness-gap` misses have a zero-miss alternative in the sampled
candidate set. The v12 policy changes exactly those 4 selected pairs and
resolves the recorded misses without introducing another named pair check,
contract failure, semantic finding, downstream quality finding, or large-source
shift. Mean worst-mode source distance moves from 0.2109404 to 0.2111579 and
mean total source distance from 0.3604809 to 0.3608402; maxima remain unchanged.
Within this fixed grid and sampled candidate inventory, changing only the
eligibility/order rule selects zero-miss alternatives for these four cases. The
same checks now gate selection, so zero selected misses demonstrate policy
compliance rather than independent palette quality. Candidate search remains
bounded and perceived pair quality remains unmeasured.

## Feedback default-candidate availability

`npm run diagnose:feedback-candidates` follows the 59 inputs and 120 failed
semantic-hue check occurrences identified by adversarial diagnostics v3. It
regenerates the producer-owned Destructive or Warning default-fill inventory,
keeps the selected surrounding roles fixed, and asks whether any candidate
passes both its existing base constraints and the same provisional hue review.

The reviewed v12 census finds a role-local default-fill alternative in 43 of
120 failed-check cells. Of 54 failed Warning-check cases, 42 have such an
alternative; only 1 of 66 failed Destructive-check cases does (`#663300`,
Light, `#97000D`).
By mode, Light has 22 of 60 and Dark has 21 of 60 locally available cases.
Under this exact probe, the existing Warning inventory contains a qualifying
candidate in 42/54 scoped cases versus 1/66 for Destructive. The census does not
isolate ranking, inventory shape, constraints, or frozen-role dependencies as
the cause of that difference.

The v3 report retains the v2 decomposition of repeated candidate occurrences through the same
ordered probe for both relationships and for each Light/Dark subset. Across
the 66 failed Destructive-check cases, 2,838 candidate
occurrences comprise 1,026 rejected by at least one existing base constraint,
1,798 that pass the base constraints but fail the provisional hue review, and
14 that pass both. The base-rejected occurrences contain 861
`destructive.brand-separation` and 165 `destructive.label-contrast` failure
patterns; none fail both in this census. At case level, 65 reach base-passing
candidates but no hue-passing alternative, while one has an available local
default candidate. These are conditional candidate occurrences and ordered
pipeline exits, not unique colors, probabilities, causes, or evidence that a
constraint should change.

Report v3 adds one predeclared Destructive-only sensitivity probe over those 66
failed cells. It expands the fixed 27° inventory to 12°/27°/42° while retaining
the same Lightness grid, C=.19, base constraints, lightness objective, and
technical hex tie-break. The ±15° spacing mirrors the existing Warning
inventory; it is not an empirical semantic-red range. The expanded inventory
contains 8,514 requested and unique rendered candidate occurrences. It retains
the one currently available case and makes 19 additional cases locally
available, leaving 46 unavailable. By rung, 12° supplies 410 passing
occurrences, 27° supplies 14, and 42° supplies 405. This establishes only that
the bounded inventory contains more candidates satisfying the same constructed
checks. It does not establish complete states, Warning preservation, semantic
meaning, perceptual preference, or a production hue policy; the reported first
candidate under the unchanged technical rank still depends on a tie-break with
no semantic hue authority.

This is not a full-palette repair claim. Warning alternatives are conditional
on the selected Primary and Destructive. Destructive alternatives are
conditional on the selected Primary, and the current Warning is not
revalidated. The probe does not build hover/active states, select one shared
label, check state pacing, jointly replace Destructive and Warning, establish
semantic meaning, or recommend a production-policy change. Its denominator is
the 120 failed checks, not all 236 cells within the 59-input flagged scope or a
population sample.

## Destructive default-anchor counterfactual

`npm run diagnose:destructive-anchor` replaces only the alternate Destructive
preferred-lightness objective used for sources within 38° of the 27° red anchor
with the normal Light/Dark objective. The Destructive candidates, label and
Primary-distance constraints, objective shape, tie-breakers, state searches,
Warning generation, pair selection, and review checks are unchanged.

The reviewed 216-input grid contains 41 source-band inputs / 82 mode cases. All
41 inputs / 82 modes have changed objective decision evidence; the selected
Destructive family changes in 75 mode cases, while Warning and Warning states do
not change.
Both arms retain all 216 inputs, zero generated-contract failures, 115 shifted
inputs / 177 shifted modes, and zero semantic-model findings. No named contract,
semantic-model, or source-shift transition is introduced. One provisional Light
Primary↔Destructive hue-review finding (`#663300`) resolves, with no named
quality finding introduced. Within the 82 applicable mode cases, mean recorded
Primary↔Destructive distance decreases from 0.11698 to 0.09744, while the
minimum passing separation margin decreases from 0.000425 to 0.000058;
the minimum Destructive label result remains 61.40 Lc.

This describes the deterministic incremental effect of the alternate objective
target under the current engine and coarse corpus. It does not establish that
the source-red band is semantically or perceptually unnecessary, that the
Primary-distance constraint captures the same intent, or that the default
anchor should replace production policy.

## Primary chroma restraint counterfactual

`npm run diagnose:primary-chroma` compares production v16 with one diagnostic
Primary-only intervention. At every existing Primary lightness sample it asks
for source C, 90% source C, 75% source C, and the current effective cap; it
deduplicates after sRGB rendering while retaining all requested origins. The
matching `primary.calm-chroma` maximum is relaxed only for this diagnostic to
the source C. Foundations, Selection, ranges, state search, pair eligibility,
pair ranking, downstream formulas, production cache, and policy v16 remain
unchanged. Requested C is not treated as realized C after gamut mapping.

In the reviewed 216-input run, all 216 inputs generate a complete result and
160 inputs / 267 mode selections change. Mean selected realized C moves from
0.12483 to 0.14744 and mean mode source distance moves from 0.18042 to 0.16591.
Large source-shift observations move from 115 inputs / 186 modes to 108 inputs /
177 modes. The maximum source distance remains 0.57951.

The intervention is not a production candidate as tested. Under v16,
`#FF6666` no longer becomes generation-infeasible because Primary–Destructive
separation is retained as selected-result review evidence instead of excluding
candidates during generation. `#3300FF` still newly misses the provisional
cross-mode Primary chroma-difference eligibility check. The 36,884 requested
ladder occurrences render to 28,098 unique ladder candidate occurrences, with
8,786 recorded request convergences.
These are per-mode candidate occurrences, not unique colors across the corpus.

The v2 report also derives an `above-current-cap` transactional fallback from
the same current/adaptive results. Raw source C must exceed the current 0.15 cap
before an already-generated adaptive result is considered. Of 216 inputs, 92
are outside this adoption scope, 124 are considered, 123 are adopted, and only
`#3300FF` retains the complete current result for the introduced
`pair.primary-chroma-difference` eligibility miss. The transactional fallback
arm therefore
has all 216 inputs / 432 modes, zero generation or contract failures, and zero
selected pair-eligibility misses. Relative to current v16, mean realized C is
0.14881 instead of 0.12483, mean mode source distance is 0.16652 instead of
0.18042, and large source shifts move from 115 inputs / 186 modes to 109 / 178.
No contract failure is introduced. Selected-result evidence records one
semantic finding introduced for `#CC3366` and one resolved for `#FF0066`; the
guard does not convert either finding into a pass.

This is conditional selection between two complete engine results, not a
homogeneous chroma policy or a candidate-level solution for the rejected input.
Its preserved generation/eligibility boundaries are guaranteed by the
guard and are not independent evidence of perceived quality or production
suitability. A production design would still need to address dual-generation
cost and test candidate-level alternatives for the rejected inputs.

This experiment changes both the Primary candidate inventory and its matching
calm-chroma bound; it does not isolate either mechanism as a sole cause.
Downstream roles respond to the selected Primary, so the result describes the
coupled engine. Higher realized OKLCH C does not establish perceived vividness,
aesthetic improvement, optimal chroma, population prevalence, or a policy
recommendation.

- cross-mode comparison samples the baseline and three fixed lightness points
  per mode; it is not exhaustive;
- warning search uses a research-policy amber family rather than learning a
  warning color from the input;
- the 30-degree semantic hue review threshold remains provisional;
- black and white are the only filled-control text candidates;
- the primary border is evaluated against application foundations, not as an
  aesthetic border/fill pair;
- visual search maps retain complete warning and selection candidate spaces,
  but other roles still expose only selected and counterfactual summaries.

## Promotion gate

A provisional rule can become empirical only through a separately authorized,
documented dataset and analysis bound to its policy version and input set.
Passing automated checks is not sufficient evidence for promotion.
