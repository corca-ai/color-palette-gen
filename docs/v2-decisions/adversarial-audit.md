# Adversarial audit

Last reviewed against `v2-policy-model-12`.

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
- 148 inputs trigger deterministic independent quality-review signals;
- 186 mode-specific source-fidelity checks fail;
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
- affected modes: 25 Light-only, 19 Dark-only, and 71 both modes;
- actual Light movement: 89 darker and 7 lighter; 82 lower-chroma and 14
  higher-chroma;
- actual Dark movement: 64 darker and 26 lighter; 72 lower-chroma and 18
  higher-chroma.

For each affected mode, the report also reads the constraint failures already
recorded on the producer's best-ranked rejected Primary candidate (the legacy
trace field is named `nearestRejected`). `primary.mode-range`
appears on all 96 Light and all 90 Dark shifted cases. `primary.calm-chroma`
appears on 52 Light and 45 Dark cases; shared-label and complete-family failures
appear less often. These are rejection records, not exclusive causal labels:
one candidate can fail several constraints, and the generator may select a
different candidate that satisfies all of them.

The report therefore records exact failed-constraint combinations as sorted
constraint IDs joined by `+`, as well as individual counts.
`primary.mode-range` is the only failed constraint for 25
Light and 33 Dark cases. The other 128 mode-specific cases combine it with
calm-chroma, shared-label, or complete-family failures, so the repeated range
signal must not be read as a sole-cause diagnosis. None of these shifted sources
start inside the nominal producer-recorded role-lightness bounds: Light has 89
above and 7 below; Dark has 64 above and 26 below. Each case retains the source
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
Named signal deltas retain producer check/declaration IDs. Expected infeasible
state candidates and exact pair samples are separately counted; unexpected
generation errors still abort the experiment.
`meanModeSourceDistance` is the arithmetic mean of the producer's Oklab
source-distance values across both modes (432 values for this corpus);
`maximumModeSourceDistance` is the largest single mode value.

Against `v2-policy-model-12`, the fixed 216-input run shows:

- widening every endpoint by 0.04 increases shifted inputs from 115 to 116 and
  mean mode source distance from 0.1804 to 0.1844; it introduces 15
  lightness-gap eligibility misses without generated-contract failure;
- widening only the outward endpoints leaves shifted inputs unchanged at 115,
  reduces affected mode cases by 3 and mean mode source distance from 0.1804
  to 0.1796, but introduces 1 lightness-gap eligibility miss;
- extending both ranges to include each source reduces shifted inputs to 49 and
  mean mode source distance to 0.1191, but produces 1 generated-contract
  failure, 1 semantic finding, and 35 inputs with paired-quality misses.

None of the three range probes is a policy candidate as tested. Symmetric
widening now worsens mean source distance under the v12 eligibility gate;
outward-only widening does not resolve any shifted input; source inclusion
reduces source distance but introduces contract, semantic, and pair-eligibility
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

The v2 report also decomposes repeated candidate occurrences through the same
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
inputs / 186 shifted modes, and zero semantic-model findings. No named contract,
semantic-model, or source-shift transition is introduced. One provisional Light
Primary↔Destructive hue-review finding (`#663300`) resolves, with no named
quality finding introduced. Within the 82 applicable mode cases, mean recorded
Primary↔Destructive distance decreases from 0.11748 to 0.09764, while the
minimum passing separation margin decreases slightly from 0.000425 to 0.000414;
the minimum Destructive label result remains 61.40 Lc.

This describes the deterministic incremental effect of the alternate objective
target under the current engine and coarse corpus. It does not establish that
the source-red band is semantically or perceptually unnecessary, that the
Primary-distance constraint captures the same intent, or that the default
anchor should replace production policy.

## Primary chroma restraint counterfactual

`npm run diagnose:primary-chroma` compares production v12 with one diagnostic
Primary-only intervention. At every existing Primary lightness sample it asks
for source C, 90% source C, 75% source C, and the current effective cap; it
deduplicates after sRGB rendering while retaining all requested origins. The
matching `primary.calm-chroma` maximum is relaxed only for this diagnostic to
the source C. Foundations, Selection, ranges, state search, pair eligibility,
pair ranking, downstream formulas, production cache, and policy v12 remain
unchanged. Requested C is not treated as realized C after gamut mapping.

In the reviewed 216-input run, 160 inputs and 265 evaluated mode selections
change. Among the 215 inputs that still generate a complete result, mean
selected realized C moves from 0.12471 to 0.14726 and mean mode source distance
moves from 0.18065 to 0.16610. Large source-shift observations move from 115
inputs / 186 modes to 108 inputs / 177 modes; nine exact input×mode shifts are
resolved and none introduced. The maximum source distance remains 0.57951.

The intervention is not a production candidate as tested. `#FF6666` cannot
generate a Dark Destructive role after the changed Primary is selected, and
`#3300FF` newly misses the provisional cross-mode Primary chroma-difference
eligibility check. The 36,684 requested ladder occurrences render to 27,899
unique ladder candidate occurrences, with 8,785 recorded request convergences.
These are per-mode candidate occurrences, not unique colors across the corpus.

The v2 report also derives an `above-current-cap` transactional fallback from
the same current/adaptive results. Raw source C must exceed the current 0.15 cap
before an already-generated adaptive result is considered. Of 216 inputs, 92
are outside this adoption scope, 124 are considered, 122 are adopted, and two
retain the complete current result:
`#FF6666` for generation infeasibility and `#3300FF` for the introduced
`pair.primary-chroma-difference` eligibility miss. The transactional fallback
arm therefore
has all 216 inputs / 432 modes, zero generation or contract failures, and zero
selected pair-eligibility misses. Relative to current v12, mean realized C is
0.14864 instead of 0.12483, mean mode source distance is 0.16654 instead of
0.18042, and large source shifts move from 115 inputs / 186 modes to 109 / 178.
No contract, semantic-model, or other named quality failure is introduced.

This is conditional selection between two complete engine results, not a
homogeneous chroma policy or candidate-level solution for the two rejected
inputs. Its preserved generation/eligibility boundaries are guaranteed by the
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
