import { ADVERSARIAL_CHANNELS } from "./adversarial-diagnostics.js";
import { PAIR_RANKING_STRATEGIES } from "./pair-selection.js";
import { generatePaletteV2PairRankingCounterfactual } from "./palette.js";

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

function identity(result) {
  return {
    resultVersion: result.version,
    policyVersion: result.policyVersion,
    semanticModel: result.semanticEvaluation.model,
  };
}

function assertSame(value, expected, message) {
  if (JSON.stringify(value) !== JSON.stringify(expected)) {
    throw new TypeError(message);
  }
}

export function pairRankingObservation(input, result) {
  const downstreamQualityFindings = [
    ...result.quality.sourceChecks,
    ...result.quality.semanticChecks,
  ]
    .filter(({ pass }) => !pass)
    .map(({ id }) => id);
  const semanticFindings = result.semanticEvaluation.evaluations
    .filter(({ status }) => status !== "satisfied")
    .map(({ id, status }) => `${id}:${status}`);
  const selected = result.pairDecision.selected;
  const failedPairedQualityChecks = selected.failedPairedQualityChecks;
  if (
    !Array.isArray(failedPairedQualityChecks) ||
    failedPairedQualityChecks.some(
      (id) => typeof id !== "string" || id.length === 0,
    ) ||
    new Set(failedPairedQualityChecks).size !==
      failedPairedQualityChecks.length ||
    failedPairedQualityChecks.length !== selected.qualityMisses
  ) {
    throw new TypeError(
      "pair-ranking results must expose unique failed paired-quality IDs matching the selected miss count.",
    );
  }
  return {
    input,
    candidateSetIdentity: result.pairDecision.candidateSetIdentity,
    droppedSamples: result.pairDecision.droppedSamples ?? [],
    minimumAvailablePairQualityMissCount:
      result.pairDecision.minimumAvailablePairQualityMissCount,
    selectedPair: {
      light: selected.light,
      dark: selected.dark,
      maximumSourceDistance: selected.maximumSourceDistance,
      totalSourceDistance: selected.totalSourceDistance,
    },
    failedPairChecks: failedPairedQualityChecks,
    failedContractChecks: ["light", "dark"]
      .flatMap((mode) =>
        result.modes[mode].checks
          .filter(({ pass }) => !pass)
          .map(({ id, role }) => `${mode}:${id ?? role}`),
      )
      .sort(),
    downstreamQualityFindings,
    semanticFindings,
    contractFailure: !result.passed,
    shiftedModes: ["light", "dark"].filter(
      (mode) => result.modes[mode].adaptations.largeBrandShift,
    ),
  };
}

function countIds(items, field) {
  const counts = {};
  for (const item of items) {
    for (const id of new Set(item[field])) counts[id] = (counts[id] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([first], [second]) =>
      first.localeCompare(second),
    ),
  );
}

function summarize(items) {
  const maximumDistances = items.map(
    ({ selectedPair }) => selectedPair.maximumSourceDistance,
  );
  const totalDistances = items.map(
    ({ selectedPair }) => selectedPair.totalSourceDistance,
  );
  return {
    inputCount: items.length,
    pairQualityMissInputCount: items.filter(
      ({ failedPairChecks }) => failedPairChecks.length > 0,
    ).length,
    pairQualityMissOccurrenceCount: items.reduce(
      (total, item) => total + item.failedPairChecks.length,
      0,
    ),
    avoidablePairQualityMissInputCount: items.filter(
      (item) =>
        item.failedPairChecks.length >
        item.minimumAvailablePairQualityMissCount,
    ).length,
    contractFailureInputCount: items.filter(
      ({ contractFailure }) => contractFailure,
    ).length,
    downstreamQualityFindingInputCount: items.filter(
      ({ downstreamQualityFindings }) => downstreamQualityFindings.length > 0,
    ).length,
    semanticFindingInputCount: items.filter(
      ({ semanticFindings }) => semanticFindings.length > 0,
    ).length,
    largeSourceShiftInputCount: items.filter(
      ({ shiftedModes }) => shiftedModes.length > 0,
    ).length,
    largeSourceShiftModeCount: items.reduce(
      (total, { shiftedModes }) => total + shiftedModes.length,
      0,
    ),
    droppedPairSampleCount: items.reduce(
      (total, item) => total + item.droppedSamples.length,
      0,
    ),
    meanMaximumSourceDistance:
      maximumDistances.reduce((total, value) => total + value, 0) /
      items.length,
    maximumSourceDistance: Math.max(...maximumDistances),
    meanTotalSourceDistance:
      totalDistances.reduce((total, value) => total + value, 0) / items.length,
    maximumTotalSourceDistance: Math.max(...totalDistances),
    pairCheckFailureInputCounts: countIds(items, "failedPairChecks"),
    contractCheckFailureInputCounts: countIds(items, "failedContractChecks"),
    downstreamQualityFindingInputCounts: countIds(
      items,
      "downstreamQualityFindings",
    ),
    semanticFindingInputCounts: countIds(items, "semanticFindings"),
  };
}

function transitions(current, candidate, field) {
  const ids = [
    ...new Set([...current, ...candidate].flatMap((item) => item[field])),
  ].sort();
  return Object.fromEntries(
    ids.map((id) => {
      const introduced = [];
      const resolved = [];
      candidate.forEach((item, index) => {
        const before = current[index][field].includes(id);
        const after = item[field].includes(id);
        if (!before && after) introduced.push(item.input);
        if (before && !after) resolved.push(item.input);
      });
      return [id, { introduced, resolved }];
    }),
  );
}

function booleanTransitions(current, candidate, read) {
  const introduced = [];
  const resolved = [];
  candidate.forEach((item, index) => {
    const before = read(current[index]);
    const after = read(item);
    if (!before && after) introduced.push(item.input);
    if (before && !after) resolved.push(item.input);
  });
  return { introduced, resolved };
}

export function buildPairRankingCounterfactualReport({
  channels = ADVERSARIAL_CHANNELS,
} = {}) {
  validateChannels(channels);
  const inputs = inputGrid([...new Set(channels)].sort((a, b) => a - b));
  const current = [];
  const missCountFirst = [];
  let baselineIdentity;

  for (const input of inputs) {
    const currentResult = generatePaletteV2PairRankingCounterfactual({
      primary: input,
      strategy: PAIR_RANKING_STRATEGIES.SOURCE_FIRST,
    });
    const candidateResult = generatePaletteV2PairRankingCounterfactual({
      primary: input,
      strategy: PAIR_RANKING_STRATEGIES.PAIRED_QUALITY_MISS_COUNT_FIRST,
    });
    baselineIdentity ??= identity(currentResult);
    assertSame(
      identity(currentResult),
      baselineIdentity,
      "pair-ranking results must share baseline identity.",
    );
    assertSame(
      identity(candidateResult),
      baselineIdentity,
      "pair-ranking results must share baseline identity.",
    );
    assertSame(
      currentResult.pairDecision.candidateSetIdentity,
      candidateResult.pairDecision.candidateSetIdentity,
      "pair-ranking strategies must consume the same candidate set.",
    );
    assertSame(
      currentResult.pairDecision.droppedSamples ?? [],
      candidateResult.pairDecision.droppedSamples ?? [],
      "pair-ranking strategies must share dropped-sample provenance.",
    );
    current.push(pairRankingObservation(input, currentResult));
    missCountFirst.push(pairRankingObservation(input, candidateResult));
  }

  const currentSummary = summarize(current);
  const candidateSummary = summarize(missCountFirst);
  const changedCases = missCountFirst
    .filter(
      (item, index) =>
        item.selectedPair.light !== current[index].selectedPair.light ||
        item.selectedPair.dark !== current[index].selectedPair.dark,
    )
    .map((item) => {
      const before = current.find(({ input }) => input === item.input);
      return {
        input: item.input,
        candidateSetIdentity: item.candidateSetIdentity,
        minimumAvailablePairQualityMissCount:
          item.minimumAvailablePairQualityMissCount,
        current: {
          selectedPair: before.selectedPair,
          failedPairChecks: before.failedPairChecks,
        },
        "paired-quality-miss-count-first": {
          selectedPair: item.selectedPair,
          failedPairChecks: item.failedPairChecks,
        },
      };
    });

  return {
    schema: "color-palette-pair-ranking-counterfactual.v1",
    authority: "diagnostic",
    ...baselineIdentity,
    interpretation:
      "Compares two fixed lexicographic rankings over identical sampled pair candidates. Fewer recorded paired-quality misses does not establish a better policy or perceived palette quality.",
    corpus: {
      kind: "rgb-channel-grid",
      channels: [...new Set(channels)].sort((a, b) => a - b),
    },
    strategies: {
      current: {
        id: PAIR_RANKING_STRATEGIES.SOURCE_FIRST,
        order: [
          "maximumSourceDistance",
          "totalSourceDistance",
          "pairQualityMissCount",
          "pairQualityPenalty",
          "stablePairId",
        ],
      },
      counterfactual: {
        id: PAIR_RANKING_STRATEGIES.PAIRED_QUALITY_MISS_COUNT_FIRST,
        order: [
          "pairQualityMissCount",
          "maximumSourceDistance",
          "totalSourceDistance",
          "pairQualityPenalty",
          "stablePairId",
        ],
      },
    },
    summaries: {
      current: currentSummary,
      "paired-quality-miss-count-first": candidateSummary,
    },
    comparisonToCurrent: {
      selectedPairChangedInputCount: changedCases.length,
      contractFailureTransitions: booleanTransitions(
        current,
        missCountFirst,
        ({ contractFailure }) => contractFailure,
      ),
      sourceShiftTransitions: booleanTransitions(
        current,
        missCountFirst,
        ({ shiftedModes }) => shiftedModes.length > 0,
      ),
      sourceShiftModeTransitions: transitions(
        current,
        missCountFirst,
        "shiftedModes",
      ),
      pairCheckTransitions: transitions(
        current,
        missCountFirst,
        "failedPairChecks",
      ),
      contractCheckTransitions: transitions(
        current,
        missCountFirst,
        "failedContractChecks",
      ),
      downstreamQualityTransitions: transitions(
        current,
        missCountFirst,
        "downstreamQualityFindings",
      ),
      semanticTransitions: transitions(
        current,
        missCountFirst,
        "semanticFindings",
      ),
    },
    changedCases,
  };
}
