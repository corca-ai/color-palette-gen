import { V2_POLICY } from "./policy.js";
import { pairedQuality } from "./quality.js";
import { candidate, distance } from "./runtime.js";
import { NoCandidateError } from "./decision.js";

export const PAIR_RANKING_STRATEGIES = Object.freeze({
  SOURCE_FIRST: "source-first",
  PAIRED_QUALITY_MISS_COUNT_FIRST: "paired-quality-miss-count-first",
});

function exactModeCandidate(input, mode, lightness, buildMode) {
  try {
    return {
      candidate: buildMode(input, mode, {
        primaryRange: [lightness, lightness],
      }),
      dropped: null,
    };
  } catch (error) {
    if (!(error instanceof NoCandidateError)) throw error;
    return {
      candidate: null,
      dropped: { mode, lightness, reason: error.message },
    };
  }
}

function uniqueModeCandidates(input, mode, baseline, buildMode, primaryRanges) {
  const [start, end] = primaryRanges[mode];
  const lightnesses = [start, (start + end) / 2, end];
  const exact = lightnesses.map((lightness) =>
    exactModeCandidate(input, mode, lightness, buildMode),
  );
  const candidates = [
    baseline,
    ...exact.map(({ candidate }) => candidate),
  ].filter(Boolean);
  return {
    candidates: candidates.filter(
      (candidateMode, index) =>
        candidates.findIndex(
          (other) => other.values.primary === candidateMode.values.primary,
        ) === index,
    ),
    droppedSamples: exact.flatMap(({ dropped }) => (dropped ? [dropped] : [])),
  };
}

function qualityPenalty(quality) {
  return quality.checks.reduce((total, check) => {
    if (check.pass) return total;
    if (Array.isArray(check.target)) {
      return (
        total +
        Math.min(
          Math.abs(check.value - check.target[0]),
          Math.abs(check.value - check.target[1]),
        )
      );
    }
    return total + Math.abs(check.value - check.target);
  }, 0);
}

function ranking(pair, strategy) {
  if (strategy === PAIR_RANKING_STRATEGIES.SOURCE_FIRST) {
    return [
      pair.maximumSourceDistance,
      pair.totalSourceDistance,
      pair.qualityMissCount,
      pair.qualityPenalty,
    ];
  }
  if (strategy === PAIR_RANKING_STRATEGIES.PAIRED_QUALITY_MISS_COUNT_FIRST) {
    return [
      pair.qualityMissCount,
      pair.maximumSourceDistance,
      pair.totalSourceDistance,
      pair.qualityPenalty,
    ];
  }
  throw new TypeError(`Unsupported pair ranking strategy: ${strategy}.`);
}

function rankingLabels(strategy) {
  if (strategy === PAIR_RANKING_STRATEGIES.SOURCE_FIRST) {
    return [
      "smallest worst-mode source distance",
      "smallest total source distance",
      "fewest structural review misses",
      "smallest quality miss",
    ];
  }
  if (strategy === PAIR_RANKING_STRATEGIES.PAIRED_QUALITY_MISS_COUNT_FIRST) {
    return [
      "fewest paired-quality misses",
      "smallest worst-mode source distance",
      "smallest total source distance",
      "smallest paired-quality penalty",
    ];
  }
  throw new TypeError(`Unsupported pair ranking strategy: ${strategy}.`);
}

function comparePair(first, second, strategy) {
  const firstRank = ranking(first, strategy);
  const secondRank = ranking(second, strategy);
  for (let index = 0; index < firstRank.length; index += 1) {
    if (firstRank[index] !== secondRank[index]) {
      return firstRank[index] - secondRank[index];
    }
  }
  return first.id.localeCompare(second.id);
}

export function comparePairMetrics(first, second, strategy) {
  rankingLabels(strategy);
  return comparePair(first, second, strategy);
}

export function selectModePair(
  input,
  baselineModes,
  buildMode,
  primaryRanges = V2_POLICY.primary.lightnessRange,
  {
    rankingStrategy = PAIR_RANKING_STRATEGIES.SOURCE_FIRST,
    includeCandidateSetIdentity = false,
  } = {},
) {
  rankingLabels(rankingStrategy);
  const source = candidate(input.hex);
  const lightSearch = uniqueModeCandidates(
    input,
    "light",
    baselineModes.light,
    buildMode,
    primaryRanges,
  );
  const darkSearch = uniqueModeCandidates(
    input,
    "dark",
    baselineModes.dark,
    buildMode,
    primaryRanges,
  );
  const pairs = lightSearch.candidates
    .flatMap((light) =>
      darkSearch.candidates.map((dark) => {
        const modes = { light, dark };
        const quality = pairedQuality(modes);
        const lightDistance = distance(source, candidate(light.values.primary));
        const darkDistance = distance(source, candidate(dark.values.primary));
        const qualityMissCount = quality.checks.filter(
          ({ pass }) => !pass,
        ).length;
        return {
          id: `${light.values.primary}/${dark.values.primary}`,
          modes,
          quality,
          lightDistance,
          darkDistance,
          maximumSourceDistance: Math.max(lightDistance, darkDistance),
          totalSourceDistance: lightDistance + darkDistance,
          qualityMissCount,
          qualityPenalty: qualityPenalty(quality),
        };
      }),
    )
    .sort((first, second) =>
      comparePairMetrics(first, second, rankingStrategy),
    );
  const selected = pairs[0];
  const compactPair = (pair, includeDiagnosticEvidence = false) =>
    pair
      ? {
          light: pair.modes.light.values.primary,
          dark: pair.modes.dark.values.primary,
          qualityMisses: pair.qualityMissCount,
          maximumSourceDistance: pair.maximumSourceDistance,
          totalSourceDistance: pair.totalSourceDistance,
          hueDrift: pair.quality.crossMode.hueDrift,
          chromaDifference: pair.quality.crossMode.chromaDifference,
          lightnessGap: pair.quality.crossMode.lightnessGap,
          ...(includeDiagnosticEvidence
            ? {
                failedPairedQualityChecks: pair.quality.checks
                  .filter(({ pass }) => !pass)
                  .map(({ id }) => id)
                  .sort(),
              }
            : {}),
        }
      : null;
  const sourceFidelity = [...pairs].sort(
    (first, second) =>
      first.lightDistance +
        first.darkDistance -
        (second.lightDistance + second.darkDistance) ||
      first.id.localeCompare(second.id),
  )[0];
  const selectedMisses = selected.qualityMissCount;
  const qualityRejected = pairs.find(
    (pair) => pair.qualityMissCount > selectedMisses,
  );
  const droppedSamples = [
    ...lightSearch.droppedSamples,
    ...darkSearch.droppedSamples,
  ];
  return {
    modes: selected.modes,
    quality: selected.quality,
    decision: {
      strategy:
        rankingStrategy === PAIR_RANKING_STRATEGIES.SOURCE_FIRST
          ? "sampled cross-mode pair search"
          : "sampled cross-mode pair search (diagnostic ranking)",
      candidateCount: pairs.length,
      ranking: rankingLabels(rankingStrategy),
      selected: compactPair(selected, includeCandidateSetIdentity),
      alternatives: {
        nextRanked: compactPair(pairs[1]),
        sourceFidelity: compactPair(sourceFidelity),
        qualityRejected: compactPair(qualityRejected),
      },
      ...(includeCandidateSetIdentity
        ? {
            rankingStrategy,
            minimumAvailablePairQualityMissCount: Math.min(
              ...pairs.map(({ qualityMissCount }) => qualityMissCount),
            ),
            candidateSetIdentity: pairs
              .map(({ id }) => id)
              .sort()
              .join("|"),
          }
        : {}),
      ...(droppedSamples.length > 0 ? { droppedSamples } : {}),
    },
  };
}
