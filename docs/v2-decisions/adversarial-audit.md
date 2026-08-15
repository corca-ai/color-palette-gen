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
