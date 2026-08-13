import { V2_POLICY } from "./policy.js";
import { pairedQuality } from "./quality.js";
import { candidate, distance } from "./runtime.js";

function exactModeCandidate(input, mode, lightness, buildMode) {
  try {
    return buildMode(input, mode, { primaryRange: [lightness, lightness] });
  } catch {
    return null;
  }
}

function uniqueModeCandidates(input, mode, baseline, buildMode) {
  const [start, end] = V2_POLICY.primary.lightnessRange[mode];
  const lightnesses = [start, (start + end) / 2, end];
  const candidates = [
    baseline,
    ...lightnesses.map((lightness) =>
      exactModeCandidate(input, mode, lightness, buildMode),
    ),
  ].filter(Boolean);
  return candidates.filter(
    (candidateMode, index) =>
      candidates.findIndex(
        (other) => other.values.primary === candidateMode.values.primary,
      ) === index,
  );
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

export function selectModePair(input, baselineModes, buildMode) {
  const source = candidate(input.hex);
  const lightCandidates = uniqueModeCandidates(
    input,
    "light",
    baselineModes.light,
    buildMode,
  );
  const darkCandidates = uniqueModeCandidates(
    input,
    "dark",
    baselineModes.dark,
    buildMode,
  );
  const pairs = lightCandidates
    .flatMap((light) =>
      darkCandidates.map((dark) => {
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
    },
  };
}
