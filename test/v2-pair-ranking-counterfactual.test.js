import assert from "node:assert/strict";
import test from "node:test";

import {
  comparePairMetrics,
  PAIR_RANKING_STRATEGIES,
} from "../v2/lib/pair-selection.js";
import {
  buildPairRankingCounterfactualReport,
  pairRankingObservation,
} from "../v2/lib/pair-ranking-counterfactual.js";
import {
  generatePaletteV2,
  generatePaletteV2PairRankingCounterfactual,
} from "../v2/lib/palette.js";
import { paletteCache } from "../v2/lib/runtime.js";

function pair(
  id,
  qualityMissCount,
  maximumSourceDistance,
  totalSourceDistance,
  eligibilityMissCount = qualityMissCount,
  qualityPenalty = qualityMissCount,
) {
  return {
    id,
    qualityMissCount,
    maximumSourceDistance,
    totalSourceDistance,
    qualityPenalty,
    eligibilityMissCount,
  };
}

function withoutDiagnosticMetadata(result) {
  const normalized = structuredClone(result);
  delete normalized.diagnosticOverride;
  delete normalized.pairDecision.rankingStrategy;
  delete normalized.pairDecision.minimumAvailablePairQualityMissCount;
  delete normalized.pairDecision.candidateSetIdentity;
  delete normalized.pairDecision.selected.failedPairedQualityChecks;
  return normalized;
}

test("pair ranking strategies change only their declared lexicographic priority", () => {
  const closerWithMiss = pair("a", 1, 0.1, 0.2);
  const fartherWithoutMiss = pair("b", 0, 0.3, 0.5);

  assert.ok(
    comparePairMetrics(
      closerWithMiss,
      fartherWithoutMiss,
      PAIR_RANKING_STRATEGIES.SOURCE_FIRST,
    ) < 0,
  );
  assert.ok(
    comparePairMetrics(
      closerWithMiss,
      fartherWithoutMiss,
      PAIR_RANKING_STRATEGIES.PAIRED_QUALITY_MISS_COUNT_FIRST,
    ) > 0,
  );
  assert.ok(
    comparePairMetrics(
      pair("a", 0, 0.2, 0.3),
      pair("b", 0, 0.2, 0.4),
      PAIR_RANKING_STRATEGIES.PAIRED_QUALITY_MISS_COUNT_FIRST,
    ) < 0,
  );
  assert.ok(
    comparePairMetrics(
      pair("a", 0, 0.2, 0.3),
      pair("b", 0, 0.2, 0.3),
      PAIR_RANKING_STRATEGIES.PAIRED_QUALITY_MISS_COUNT_FIRST,
    ) < 0,
  );
  assert.throws(
    () => comparePairMetrics(closerWithMiss, fartherWithoutMiss, "unknown"),
    /Unsupported pair ranking strategy/,
  );
});

test("current zero-miss-gated diagnostic preserves production output and cache", () => {
  const production = generatePaletteV2({ primary: "#507096" });
  const size = paletteCache.size;
  const diagnostic = generatePaletteV2PairRankingCounterfactual({
    primary: "#507096",
    strategy:
      PAIR_RANKING_STRATEGIES.ZERO_PRIMARY_PAIR_QUALITY_MISS_GATED_SOURCE_FIRST,
  });

  assert.deepEqual(withoutDiagnosticMetadata(diagnostic), production);
  assert.equal(paletteCache.size, size);
  assert.equal(generatePaletteV2({ primary: "#507096" }), production);
  assert.equal(diagnostic.diagnosticOverride.experiment, "pair-ranking");
  assert.equal(
    diagnostic.modes.light.adaptations
      .diagnosticInfeasiblePrimaryStateCandidateCount,
    undefined,
  );
  assert.ok(diagnostic.pairDecision.candidateSetIdentity.length > 0);
});

test("pair-ranking report preserves previous/current ordering evidence", () => {
  const first = buildPairRankingCounterfactualReport({ channels: [0] });
  const second = buildPairRankingCounterfactualReport({ channels: [0] });

  assert.deepEqual(first, second);
  assert.equal(first.schema, "color-palette-pair-ranking-counterfactual.v2");
  assert.equal(first.authority, "diagnostic");
  assert.match(first.interpretation, /does not establish perceived/);
  assert.deepEqual(first.strategies.previous.provenance, {
    originPolicyVersion: "v2-policy-model-11",
    evaluationPolicyVersion: "v2-policy-model-19",
    scope: "ranking-order-only-on-current-candidates",
  });
  assert.equal(first.summaries["previous-v11-source-first"].inputCount, 1);
  assert.equal(
    first.strategies.current.id,
    PAIR_RANKING_STRATEGIES.ZERO_PRIMARY_PAIR_QUALITY_MISS_GATED_SOURCE_FIRST,
  );
});

test("zero-miss gate prefers eligible pairs and preserves source-first fallback", () => {
  const closerMiss = pair("a", 1, 0.1, 0.2, 1);
  const fartherEligible = pair("b", 0, 0.3, 0.5, 0);
  const strategy =
    PAIR_RANKING_STRATEGIES.ZERO_PRIMARY_PAIR_QUALITY_MISS_GATED_SOURCE_FIRST;

  assert.ok(comparePairMetrics(closerMiss, fartherEligible, strategy) > 0);

  const fallbackCases = [
    [pair("a", 2, 0.1, 0.4, 1), pair("b", 1, 0.2, 0.3, 1)],
    [pair("a", 2, 0.2, 0.3, 1), pair("b", 1, 0.2, 0.4, 1)],
    [pair("a", 1, 0.2, 0.3, 1), pair("b", 2, 0.2, 0.3, 1)],
    [pair("a", 1, 0.2, 0.3, 1, 1), pair("b", 1, 0.2, 0.3, 1, 2)],
    [pair("a", 1, 0.2, 0.3, 1, 1), pair("b", 1, 0.2, 0.3, 1, 1)],
  ];

  for (const [first, second] of fallbackCases) {
    assert.equal(
      Math.sign(comparePairMetrics(first, second, strategy)),
      Math.sign(
        comparePairMetrics(first, second, PAIR_RANKING_STRATEGIES.SOURCE_FIRST),
      ),
    );
  }
});

test("pair-ranking public seams reject unsupported strategies and channels", () => {
  assert.throws(
    () =>
      generatePaletteV2PairRankingCounterfactual({
        primary: "#507096",
        strategy: "unknown",
      }),
    /Unsupported pair ranking strategy/,
  );
  assert.throws(
    () => buildPairRankingCounterfactualReport({ channels: [] }),
    /channels must contain integers/,
  );
  assert.throws(
    () => buildPairRankingCounterfactualReport({ channels: [256] }),
    /channels must contain integers/,
  );
});

test("pair-ranking report fails closed when paired-quality evidence is missing", () => {
  const result = structuredClone(
    generatePaletteV2PairRankingCounterfactual({
      primary: "#507096",
      strategy: PAIR_RANKING_STRATEGIES.SOURCE_FIRST,
    }),
  );
  delete result.pairDecision.selected.failedPairedQualityChecks;
  assert.throws(
    () => pairRankingObservation("#507096", result),
    /unique failed paired-quality IDs/,
  );
});
