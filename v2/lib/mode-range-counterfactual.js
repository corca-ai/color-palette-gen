import { ADVERSARIAL_CHANNELS } from "./adversarial-diagnostics.js";
import {
  generatePaletteV2,
  generatePaletteV2Counterfactual,
} from "./palette.js";
import { V2_POLICY } from "./policy.js";

const WIDENING = 0.04;

function bounded(value) {
  return Number(Math.min(1, Math.max(0, value)).toFixed(6));
}

function inputGrid(channels) {
  return channels.flatMap((red) =>
    channels.flatMap((green) =>
      channels.map((blue) =>
        `#${[red, green, blue]
          .map((channel) => channel.toString(16).padStart(2, "0"))
          .join("")}`.toUpperCase(),
      ),
    ),
  );
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
  const currentSummary = summarize(current);
  const candidateSummary = summarize(candidate);
  const delta = Object.fromEntries(
    Object.keys(currentSummary)
      .filter((key) => typeof currentSummary[key] === "number")
      .map((key) => [key, candidateSummary[key] - currentSummary[key]]),
  );
  delete delta.inputCount;
  return {
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
    sourceShiftResolvedInputs: shiftChangedInputs(current, candidate, false),
    sourceShiftIntroducedInputs: shiftChangedInputs(current, candidate, true),
    contractFailureIntroducedInputs: changedInputs(
      current,
      candidate,
      "contractFailure",
    ),
    contractFailureResolvedInputs: changedInputs(
      current,
      candidate,
      "contractFailure",
      false,
    ),
    qualityFindingIntroducedInputs: changedInputs(
      current,
      candidate,
      "qualityFinding",
    ),
    qualityFindingResolvedInputs: changedInputs(
      current,
      candidate,
      "qualityFinding",
      false,
    ),
    semanticFindingIntroducedInputs: changedInputs(
      current,
      candidate,
      "semanticFinding",
    ),
    semanticFindingResolvedInputs: changedInputs(
      current,
      candidate,
      "semanticFinding",
      false,
    ),
    pairQualityMissIntroducedInputs: changedInputs(
      current,
      candidate,
      "pairQualityMiss",
    ),
    pairQualityMissResolvedInputs: changedInputs(
      current,
      candidate,
      "pairQualityMiss",
      false,
    ),
  };
}

function validateChannels(channels) {
  if (
    !Array.isArray(channels) ||
    channels.length === 0 ||
    channels.some(
      (channel) => !Number.isInteger(channel) || channel < 0 || channel > 255,
    )
  ) {
    throw new TypeError("channels must contain integers from 0 through 255.");
  }
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
  channels = ADVERSARIAL_CHANNELS,
} = {}) {
  validateChannels(channels);
  const inputs = inputGrid([...new Set(channels)].sort((a, b) => a - b));
  const variants = { current: [], widened: [], "source-inclusive": [] };
  let baselineIdentity;

  for (const input of inputs) {
    const currentResult = generatePaletteV2({ primary: input });
    const currentIdentity = resultIdentity(currentResult);
    baselineIdentity ??= currentIdentity;
    assertIdentity(currentResult, baselineIdentity);
    const currentRanges = copyRanges(V2_POLICY.primary.lightnessRange);
    const wideRanges = widenedRanges();
    const inclusiveRanges = sourceInclusiveRanges(currentResult.source.oklch.l);
    const widenedResult = generatePaletteV2Counterfactual({
      primary: input,
      primaryLightnessRanges: wideRanges,
    });
    const sourceInclusiveResult = generatePaletteV2Counterfactual({
      primary: input,
      primaryLightnessRanges: inclusiveRanges,
    });
    assertIdentity(widenedResult, baselineIdentity);
    assertIdentity(sourceInclusiveResult, baselineIdentity);
    variants.current.push(observation(input, currentResult, currentRanges));
    variants.widened.push(observation(input, widenedResult, wideRanges));
    variants["source-inclusive"].push(
      observation(input, sourceInclusiveResult, inclusiveRanges),
    );
  }

  return {
    schema: "color-palette-mode-range-counterfactual.v1",
    authority: "diagnostic",
    ...baselineIdentity,
    interpretation:
      "Compares fixed counterfactual Primary lightness ranges. Deltas expose tradeoffs; they do not identify an optimal range or establish perceived quality.",
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
      "source-inclusive": {
        kind: "per-input-range-extension",
        rule: "Extend each current mode range only far enough to include the source OKLCH lightness.",
      },
    },
    summaries: Object.fromEntries(
      Object.entries(variants).map(([id, items]) => [id, summarize(items)]),
    ),
    comparisonsToCurrent: {
      widened: comparison(variants.current, variants.widened),
      "source-inclusive": comparison(
        variants.current,
        variants["source-inclusive"],
      ),
    },
  };
}
