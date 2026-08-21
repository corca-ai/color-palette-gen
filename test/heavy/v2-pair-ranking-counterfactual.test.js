import assert from "node:assert/strict";
import test from "node:test";

import { buildPairRankingCounterfactualReport } from "../../v2/lib/pair-ranking-counterfactual.js";
import { diagnosticInputGrid } from "../../v2/lib/diagnostic-corpus.js";
import { PAIR_RANKING_STRATEGIES } from "../../v2/lib/pair-selection.js";
import {
  generatePaletteV2,
  generatePaletteV2PairRankingCounterfactual,
} from "../../v2/lib/palette.js";

function withoutDiagnosticMetadata(result) {
  const normalized = structuredClone(result);
  delete normalized.diagnosticOverride;
  delete normalized.pairDecision.rankingStrategy;
  delete normalized.pairDecision.minimumAvailablePairQualityMissCount;
  delete normalized.pairDecision.candidateSetIdentity;
  delete normalized.pairDecision.selected.failedPairedQualityChecks;
  return normalized;
}

test("reviewed pair-ranking counterfactual remains reproducible", () => {
  const report = buildPairRankingCounterfactualReport();

  assert.equal(report.schema, "color-palette-pair-ranking-counterfactual.v2");
  assert.equal(report.policyVersion, "v2-policy-model-19");
  assert.equal(report.resultVersion, 3);
  assert.deepEqual(report.semanticModel, {
    id: "v2-declarative-design",
    version: 5,
    components: [
      { id: "primary-action-state-family", version: 1 },
      { id: "foundation-focus-family", version: 2 },
      { id: "feedback-family", version: 1 },
      { id: "selection-family", version: 1 },
    ],
  });
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(report.summaries).map(([id, summary]) => [
        id,
        {
          inputCount: summary.inputCount,
          pairMissInputs: summary.pairQualityMissInputCount,
          pairMisses: summary.pairQualityMissOccurrenceCount,
          avoidablePairMissInputs: summary.avoidablePairQualityMissInputCount,
          contractFailures: summary.contractFailureInputCount,
          downstreamQualityFindings: summary.downstreamQualityFindingInputCount,
          semanticFindings: summary.semanticFindingInputCount,
          shiftedInputs: summary.largeSourceShiftInputCount,
          shiftedModes: summary.largeSourceShiftModeCount,
          droppedSamples: summary.droppedPairSampleCount,
        },
      ]),
    ),
    {
      "previous-v11-source-first": {
        inputCount: 216,
        pairMissInputs: 4,
        pairMisses: 4,
        avoidablePairMissInputs: 4,
        contractFailures: 0,
        downstreamQualityFindings: 148,
        semanticFindings: 11,
        shiftedInputs: 115,
        shiftedModes: 177,
        droppedSamples: 215,
      },
      "current-v12-zero-miss-gated": {
        inputCount: 216,
        pairMissInputs: 0,
        pairMisses: 0,
        avoidablePairMissInputs: 0,
        contractFailures: 0,
        downstreamQualityFindings: 148,
        semanticFindings: 11,
        shiftedInputs: 115,
        shiftedModes: 177,
        droppedSamples: 215,
      },
    },
  );
  assert.deepEqual(
    report.comparisonToPrevious.pairCheckTransitions[
      "pair.primary-lightness-gap"
    ],
    {
      introduced: [],
      resolved: ["#6633FF", "#6666CC", "#9933CC", "#996633"],
    },
  );
  assert.equal(report.comparisonToPrevious.selectedPairChangedInputCount, 4);
  assert.deepEqual(report.comparisonToPrevious.contractFailureTransitions, {
    introduced: [],
    resolved: [],
  });
  assert.deepEqual(report.comparisonToPrevious.sourceShiftTransitions, {
    introduced: [],
    resolved: [],
  });
  assert.deepEqual(report.comparisonToPrevious.sourceShiftModeTransitions, {
    dark: { introduced: [], resolved: [] },
    light: { introduced: [], resolved: [] },
  });
  assert.deepEqual(report.comparisonToPrevious.contractCheckTransitions, {});
  assert.deepEqual(report.comparisonToPrevious.downstreamQualityTransitions, {
    "review.dark.primary-destructive-hue": {
      introduced: [],
      resolved: [],
    },
    "review.dark.primary-warning-hue": { introduced: [], resolved: [] },
    "review.dark.source-fidelity": { introduced: [], resolved: [] },
    "review.light.primary-destructive-hue": {
      introduced: [],
      resolved: [],
    },
    "review.light.primary-warning-hue": { introduced: [], resolved: [] },
    "review.light.source-fidelity": { introduced: [], resolved: [] },
  });
  assert.deepEqual(report.comparisonToPrevious.semanticTransitions, {
    "feedback-oklab-separation-passes:unsatisfied": {
      introduced: [],
      resolved: [],
    },
  });
  assert.equal(
    report.summaries["previous-v11-source-first"].maximumSourceDistance,
    report.summaries["current-v12-zero-miss-gated"].maximumSourceDistance,
  );
  assert.equal(
    report.summaries["previous-v11-source-first"].maximumTotalSourceDistance,
    report.summaries["current-v12-zero-miss-gated"].maximumTotalSourceDistance,
  );
  assert.ok(
    Math.abs(
      report.summaries["previous-v11-source-first"].meanMaximumSourceDistance -
        0.2109404,
    ) < 0.0000001,
  );
  assert.ok(
    Math.abs(
      report.summaries["current-v12-zero-miss-gated"]
        .meanMaximumSourceDistance - 0.2111579,
    ) < 0.0000001,
  );
  assert.ok(
    Math.abs(
      report.summaries["previous-v11-source-first"].meanTotalSourceDistance -
        0.3494265,
    ) < 0.0000001,
  );
  assert.ok(
    Math.abs(
      report.summaries["current-v12-zero-miss-gated"].meanTotalSourceDistance -
        0.3497857,
    ) < 0.0000001,
  );

  const before =
    report.summaries["previous-v11-source-first"].pairCheckFailureInputCounts;
  const after =
    report.summaries["current-v12-zero-miss-gated"].pairCheckFailureInputCounts;
  for (const [id, transition] of Object.entries(
    report.comparisonToPrevious.pairCheckTransitions,
  )) {
    assert.equal(
      (after[id] ?? 0) - (before[id] ?? 0),
      transition.introduced.length - transition.resolved.length,
    );
  }

  for (const primary of diagnosticInputGrid()) {
    const production = generatePaletteV2({ primary });
    const diagnostic = generatePaletteV2PairRankingCounterfactual({
      primary,
      strategy:
        PAIR_RANKING_STRATEGIES.ZERO_PRIMARY_PAIR_QUALITY_MISS_GATED_SOURCE_FIRST,
    });
    assert.deepEqual(withoutDiagnosticMetadata(diagnostic), production);
  }
});
