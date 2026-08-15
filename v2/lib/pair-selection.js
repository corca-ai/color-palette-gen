import { V2_POLICY } from "./policy.js";
import { pairedQuality } from "./quality.js";
import { candidate, distance } from "./runtime.js";
import { NoCandidateError } from "./decision.js";

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

function comparePair(first, second) {
  const firstRank = first.rank;
  const secondRank = second.rank;
  for (let index = 0; index < firstRank.length; index += 1) {
    if (firstRank[index] !== secondRank[index]) {
      return firstRank[index] - secondRank[index];
    }
  }
  return first.id.localeCompare(second.id);
}

export function selectModePair(
  input,
  baselineModes,
  buildMode,
  primaryRanges = V2_POLICY.primary.lightnessRange,
) {
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
        return {
          id: `${light.values.primary}/${dark.values.primary}`,
          modes,
          quality,
          lightDistance,
          darkDistance,
          rank: [
            Math.max(lightDistance, darkDistance),
            lightDistance + darkDistance,
            quality.checks.filter(({ pass }) => !pass).length,
            qualityPenalty(quality),
          ],
        };
      }),
    )
    .sort(comparePair);
  const selected = pairs[0];
  const compactPair = (pair) =>
    pair
      ? {
          light: pair.modes.light.values.primary,
          dark: pair.modes.dark.values.primary,
          qualityMisses: pair.quality.checks.filter(({ pass }) => !pass).length,
          maximumSourceDistance: pair.rank[0],
          totalSourceDistance: pair.rank[1],
          hueDrift: pair.quality.crossMode.hueDrift,
          chromaDifference: pair.quality.crossMode.chromaDifference,
          lightnessGap: pair.quality.crossMode.lightnessGap,
        }
      : null;
  const sourceFidelity = [...pairs].sort(
    (first, second) =>
      first.lightDistance +
        first.darkDistance -
        (second.lightDistance + second.darkDistance) ||
      first.id.localeCompare(second.id),
  )[0];
  const selectedMisses = selected.quality.checks.filter(
    ({ pass }) => !pass,
  ).length;
  const qualityRejected = pairs.find(
    (pair) =>
      pair.quality.checks.filter(({ pass }) => !pass).length > selectedMisses,
  );
  return {
    modes: selected.modes,
    quality: selected.quality,
    decision: {
      strategy: "sampled cross-mode pair search",
      candidateCount: pairs.length,
      ranking: [
        "smallest worst-mode source distance",
        "smallest total source distance",
        "fewest structural review misses",
        "smallest quality miss",
      ],
      selected: compactPair(selected),
      alternatives: {
        nextRanked: compactPair(pairs[1]),
        sourceFidelity: compactPair(sourceFidelity),
        qualityRejected: compactPair(qualityRejected),
      },
      ...([...lightSearch.droppedSamples, ...darkSearch.droppedSamples].length >
      0
        ? {
            droppedSamples: [
              ...lightSearch.droppedSamples,
              ...darkSearch.droppedSamples,
            ],
          }
        : {}),
    },
  };
}
