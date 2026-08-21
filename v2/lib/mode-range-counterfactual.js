import {
  DIAGNOSTIC_RGB_CHANNELS,
  diagnosticInputGrid,
} from "./diagnostic-corpus.js";
import {
  generatePaletteV2,
  generatePaletteV2Counterfactual,
} from "./palette.js";
import { V2_POLICY } from "./policy.js";
import { NoCandidateError, noCandidateFailure } from "./decision.js";

const WIDENING = 0.04;

function bounded(value) {
  return Number(Math.min(1, Math.max(0, value)).toFixed(6));
}

function copyRanges(ranges) {
  return Object.fromEntries(
    Object.entries(ranges).map(([mode, range]) => [mode, [...range]]),
  );
}

function widenedRanges() {
  return Object.fromEntries(
    Object.entries(V2_POLICY.primary.lightnessRange).map(
      ([mode, [minimum, maximum]]) => [
        mode,
        [bounded(minimum - WIDENING), bounded(maximum + WIDENING)],
      ],
    ),
  );
}

function gapPreservingOutwardRanges() {
  const light = V2_POLICY.primary.lightnessRange.light;
  const dark = V2_POLICY.primary.lightnessRange.dark;
  return {
    light: [bounded(light[0] - WIDENING), light[1]],
    dark: [dark[0], bounded(dark[1] + WIDENING)],
  };
}

function sourceInclusiveRanges(sourceLightness) {
  return Object.fromEntries(
    Object.entries(V2_POLICY.primary.lightnessRange).map(
      ([mode, [minimum, maximum]]) => [
        mode,
        [
          bounded(Math.min(minimum, sourceLightness)),
          bounded(Math.max(maximum, sourceLightness)),
        ],
      ],
    ),
  );
}

function observation(input, result, ranges) {
  const shiftedModes = ["light", "dark"].filter(
    (mode) => result.modes[mode].adaptations.largeBrandShift,
  );
  const failedContractChecks = ["light", "dark"].flatMap((mode) =>
    result.modes[mode].checks
      .filter(({ pass }) => !pass)
      .map((check) => `${mode}:${check.id ?? check.role}`),
  );
  const failedQualityChecks = result.quality.checks
    .filter(({ pass }) => !pass)
    .map(({ id }) => id);
  const semanticFindings = result.semanticEvaluation.evaluations
    .filter(({ status }) => status !== "satisfied")
    .map(({ id, status }) => `${id}:${status}`);
  const pairQualityMissCount = result.pairDecision.selected.qualityMisses;
  const infeasiblePrimaryStateCandidateCount = ["light", "dark"].reduce(
    (total, mode) =>
      total +
      (result.modes[mode].adaptations
        .diagnosticInfeasiblePrimaryStateCandidateCount ?? 0),
    0,
  );
  const droppedPairSamples = result.pairDecision.droppedSamples ?? [];
  return {
    input,
    ranges,
    contractFailure: !result.passed,
    failedContractChecks,
    shiftedModes,
    qualityFinding: failedQualityChecks.length > 0,
    failedQualityChecks,
    semanticFinding: semanticFindings.length > 0,
    semanticFindings,
    pairQualityMiss: pairQualityMissCount > 0,
    pairQualityMissCount,
    infeasiblePrimaryStateCandidateCount,
    droppedPairSamples,
    sourceDistance: Object.fromEntries(
      ["light", "dark"].map((mode) => [
        mode,
        result.modes[mode].adaptations.primarySourceDistance,
      ]),
    ),
  };
}

function increment(counts, key, amount = 1) {
  counts[key] = (counts[key] ?? 0) + amount;
}

function signalCounts(observations) {
  const counts = {};
  for (const item of observations) {
    for (const id of item.failedContractChecks)
      increment(counts, `contract:${id}`);
    for (const id of item.failedQualityChecks)
      increment(counts, `quality:${id}`);
    for (const id of item.semanticFindings) increment(counts, `semantic:${id}`);
    if (item.pairQualityMissCount > 0) {
      increment(
        counts,
        "pair:selected-quality-miss",
        item.pairQualityMissCount,
      );
    }
    if (item.infeasiblePrimaryStateCandidateCount > 0) {
      increment(
        counts,
        "diagnostic:infeasible-primary-state-candidate",
        item.infeasiblePrimaryStateCandidateCount,
      );
    }
    if (item.droppedPairSamples.length > 0) {
      increment(
        counts,
        "diagnostic:dropped-pair-sample",
        item.droppedPairSamples.length,
      );
    }
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)),
  );
}

function summarize(observations) {
  const sourceDistances = observations.flatMap(({ sourceDistance }) =>
    Object.values(sourceDistance),
  );
  return {
    inputCount: observations.length,
    contractFailureInputCount: observations.filter(
      ({ contractFailure }) => contractFailure,
    ).length,
    largeSourceShiftInputCount: observations.filter(
      ({ shiftedModes }) => shiftedModes.length > 0,
    ).length,
    largeSourceShiftModeCount: observations.reduce(
      (total, { shiftedModes }) => total + shiftedModes.length,
      0,
    ),
    qualityFindingInputCount: observations.filter(
      ({ qualityFinding }) => qualityFinding,
    ).length,
    semanticFindingInputCount: observations.filter(
      ({ semanticFinding }) => semanticFinding,
    ).length,
    pairQualityMissInputCount: observations.filter(
      ({ pairQualityMiss }) => pairQualityMiss,
    ).length,
    infeasiblePrimaryStateCandidateCount: observations.reduce(
      (total, item) => total + item.infeasiblePrimaryStateCandidateCount,
      0,
    ),
    droppedPairSampleCount: observations.reduce(
      (total, item) => total + item.droppedPairSamples.length,
      0,
    ),
    meanModeSourceDistance:
      sourceDistances.reduce((total, value) => total + value, 0) /
      sourceDistances.length,
    maximumModeSourceDistance: Math.max(...sourceDistances),
    signalCounts: signalCounts(observations),
  };
}

function changedInputs(current, candidate, field, introduced = true) {
  return candidate
    .filter((item, index) =>
      introduced
        ? item[field] && !current[index][field]
        : !item[field] && current[index][field],
    )
    .map(({ input }) => input);
}

function shiftChangedInputs(current, candidate, introduced) {
  return candidate
    .filter((item, index) => {
      const candidateShift = item.shiftedModes.length > 0;
      const currentShift = current[index].shiftedModes.length > 0;
      return introduced
        ? candidateShift && !currentShift
        : !candidateShift && currentShift;
    })
    .map(({ input }) => input);
}

function comparison(current, candidate) {
  const currentByInput = new Map(current.map((item) => [item.input, item]));
  const alignedCurrent = candidate.map((item) =>
    currentByInput.get(item.input),
  );
  if (alignedCurrent.some((item) => !item)) {
    throw new TypeError(
      "counterfactual comparison inputs must exist in baseline.",
    );
  }
  const currentSummary = summarize(alignedCurrent);
  const candidateSummary = summarize(candidate);
  const delta = Object.fromEntries(
    Object.keys(currentSummary)
      .filter((key) => typeof currentSummary[key] === "number")
      .map((key) => [key, candidateSummary[key] - currentSummary[key]]),
  );
  delete delta.inputCount;
  return {
    commonSupportInputCount: candidate.length,
    excludedBaselineInputs: current
      .filter(({ input }) => !candidate.some((item) => item.input === input))
      .map(({ input }) => input),
    delta,
    namedSignalCountDelta: Object.fromEntries(
      [
        ...new Set([
          ...Object.keys(currentSummary.signalCounts),
          ...Object.keys(candidateSummary.signalCounts),
        ]),
      ]
        .sort()
        .map((id) => [
          id,
          (candidateSummary.signalCounts[id] ?? 0) -
            (currentSummary.signalCounts[id] ?? 0),
        ]),
    ),
    sourceShiftResolvedInputs: shiftChangedInputs(
      alignedCurrent,
      candidate,
      false,
    ),
    sourceShiftIntroducedInputs: shiftChangedInputs(
      alignedCurrent,
      candidate,
      true,
    ),
    contractFailureIntroducedInputs: changedInputs(
      alignedCurrent,
      candidate,
      "contractFailure",
    ),
    contractFailureResolvedInputs: changedInputs(
      alignedCurrent,
      candidate,
      "contractFailure",
      false,
    ),
    qualityFindingIntroducedInputs: changedInputs(
      alignedCurrent,
      candidate,
      "qualityFinding",
    ),
    qualityFindingResolvedInputs: changedInputs(
      alignedCurrent,
      candidate,
      "qualityFinding",
      false,
    ),
    semanticFindingIntroducedInputs: changedInputs(
      alignedCurrent,
      candidate,
      "semanticFinding",
    ),
    semanticFindingResolvedInputs: changedInputs(
      alignedCurrent,
      candidate,
      "semanticFinding",
      false,
    ),
    pairQualityMissIntroducedInputs: changedInputs(
      alignedCurrent,
      candidate,
      "pairQualityMiss",
    ),
    pairQualityMissResolvedInputs: changedInputs(
      alignedCurrent,
      candidate,
      "pairQualityMiss",
      false,
    ),
  };
}

function resultIdentity(result) {
  return {
    resultVersion: result.version,
    policyVersion: result.policyVersion,
    semanticModel: result.semanticEvaluation.model,
  };
}

function assertIdentity(result, expected) {
  if (JSON.stringify(resultIdentity(result)) !== JSON.stringify(expected)) {
    throw new TypeError("counterfactual results must share baseline identity.");
  }
}

export function buildModeRangeCounterfactualReport({
  channels = DIAGNOSTIC_RGB_CHANNELS,
} = {}) {
  const inputs = diagnosticInputGrid(channels);
  const variants = {
    current: [],
    widened: [],
    "gap-preserving-outward": [],
    "source-inclusive": [],
  };
  const infeasible = {
    widened: [],
    "gap-preserving-outward": [],
    "source-inclusive": [],
  };
  let baselineIdentity;

  for (const input of inputs) {
    const currentResult = generatePaletteV2({ primary: input });
    const currentIdentity = resultIdentity(currentResult);
    baselineIdentity ??= currentIdentity;
    assertIdentity(currentResult, baselineIdentity);
    const currentRanges = copyRanges(V2_POLICY.primary.lightnessRange);
    const wideRanges = widenedRanges();
    const outwardRanges = gapPreservingOutwardRanges();
    const inclusiveRanges = sourceInclusiveRanges(currentResult.source.oklch.l);
    variants.current.push(observation(input, currentResult, currentRanges));
    for (const [id, ranges] of [
      ["widened", wideRanges],
      ["gap-preserving-outward", outwardRanges],
      ["source-inclusive", inclusiveRanges],
    ]) {
      try {
        const result = generatePaletteV2Counterfactual({
          primary: input,
          primaryLightnessRanges: ranges,
        });
        assertIdentity(result, baselineIdentity);
        variants[id].push(observation(input, result, ranges));
      } catch (error) {
        if (!(error instanceof NoCandidateError)) throw error;
        infeasible[id].push({ input, failure: noCandidateFailure(error) });
      }
    }
  }

  return {
    schema: "color-palette-mode-range-counterfactual.v3",
    authority: "diagnostic",
    ...baselineIdentity,
    interpretation:
      "Compares fixed counterfactual Primary lightness ranges on successful common support and keeps structured generation infeasibility separate. Deltas expose tradeoffs; they do not identify an optimal range or establish perceived quality.",
    corpus: {
      kind: "rgb-channel-grid",
      channels: [...new Set(channels)].sort((a, b) => a - b),
    },
    experiments: {
      current: {
        kind: "policy-baseline",
        ranges: copyRanges(V2_POLICY.primary.lightnessRange),
      },
      widened: {
        kind: "fixed-endpoint-expansion",
        wideningPerEndpoint: WIDENING,
        ranges: widenedRanges(),
      },
      "gap-preserving-outward": {
        kind: "fixed-outward-endpoint-expansion",
        wideningPerOuterEndpoint: WIDENING,
        rule: "Lower only the Light minimum and raise only the Dark maximum, preserving the current inward-facing endpoints.",
        ranges: gapPreservingOutwardRanges(),
      },
      "source-inclusive": {
        kind: "per-input-range-extension",
        rule: "Extend each current mode range only far enough to include the source OKLCH lightness.",
      },
    },
    generationInfeasibleByVariant: infeasible,
    summaries: Object.fromEntries(
      Object.entries(variants).map(([id, items]) => [id, summarize(items)]),
    ),
    comparisonsToCurrent: {
      widened: comparison(variants.current, variants.widened),
      "gap-preserving-outward": comparison(
        variants.current,
        variants["gap-preserving-outward"],
      ),
      "source-inclusive": comparison(
        variants.current,
        variants["source-inclusive"],
      ),
    },
  };
}
