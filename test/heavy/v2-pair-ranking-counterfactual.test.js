import assert from "node:assert/strict";
import test from "node:test";

import { buildPairRankingCounterfactualReport } from "../../v2/lib/pair-ranking-counterfactual.js";
import { ADVERSARIAL_CHANNELS } from "../../v2/lib/adversarial-diagnostics.js";
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

function inputGrid() {
  return ADVERSARIAL_CHANNELS.flatMap((red) =>
    ADVERSARIAL_CHANNELS.flatMap((green) =>
      ADVERSARIAL_CHANNELS.map((blue) =>
        `#${[red, green, blue]
          .map((channel) => channel.toString(16).padStart(2, "0"))
          .join("")}`.toUpperCase(),
      ),
    ),
  );
}

test("reviewed pair-ranking counterfactual remains reproducible", () => {
  const report = buildPairRankingCounterfactualReport();

  assert.equal(report.schema, "color-palette-pair-ranking-counterfactual.v1");
  assert.equal(report.policyVersion, "v2-policy-model-11");
  assert.equal(report.resultVersion, 2);
  assert.deepEqual(report.semanticModel, {
    id: "v2-declarative-design",
    version: 3,
    components: [
      { id: "primary-action-state-family", version: 1 },
      { id: "foundation-focus-family", version: 1 },
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
      current: {
        inputCount: 216,
        pairMissInputs: 4,
        pairMisses: 4,
        avoidablePairMissInputs: 4,
        contractFailures: 0,
        downstreamQualityFindings: 148,
        semanticFindings: 0,
        shiftedInputs: 115,
        shiftedModes: 186,
        droppedSamples: 433,
      },
      "paired-quality-miss-count-first": {
        inputCount: 216,
        pairMissInputs: 0,
        pairMisses: 0,
        avoidablePairMissInputs: 0,
        contractFailures: 0,
        downstreamQualityFindings: 148,
        semanticFindings: 0,
        shiftedInputs: 115,
        shiftedModes: 186,
        droppedSamples: 433,
      },
    },
  );
  assert.deepEqual(
    report.comparisonToCurrent.pairCheckTransitions[
      "pair.primary-lightness-gap"
    ],
    {
      introduced: [],
      resolved: ["#6633FF", "#6666CC", "#9933CC", "#996633"],
    },
  );
  assert.equal(report.comparisonToCurrent.selectedPairChangedInputCount, 4);
  assert.deepEqual(report.comparisonToCurrent.contractFailureTransitions, {
    introduced: [],
    resolved: [],
  });
  assert.deepEqual(report.comparisonToCurrent.sourceShiftTransitions, {
    introduced: [],
    resolved: [],
  });
  assert.deepEqual(report.comparisonToCurrent.sourceShiftModeTransitions, {
    dark: { introduced: [], resolved: [] },
    light: { introduced: [], resolved: [] },
  });
  assert.deepEqual(report.comparisonToCurrent.contractCheckTransitions, {});
  assert.deepEqual(report.comparisonToCurrent.downstreamQualityTransitions, {
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
  assert.deepEqual(report.comparisonToCurrent.semanticTransitions, {});
  assert.equal(
    report.summaries.current.maximumSourceDistance,
    report.summaries["paired-quality-miss-count-first"].maximumSourceDistance,
  );
  assert.equal(
    report.summaries.current.maximumTotalSourceDistance,
    report.summaries["paired-quality-miss-count-first"]
      .maximumTotalSourceDistance,
  );
  assert.ok(
    Math.abs(report.summaries.current.meanMaximumSourceDistance - 0.2109404) <
      0.0000001,
  );
  assert.ok(
    Math.abs(
      report.summaries["paired-quality-miss-count-first"]
        .meanMaximumSourceDistance - 0.2111579,
    ) < 0.0000001,
  );
  assert.ok(
    Math.abs(report.summaries.current.meanTotalSourceDistance - 0.3604809) <
      0.0000001,
  );
  assert.ok(
    Math.abs(
      report.summaries["paired-quality-miss-count-first"]
        .meanTotalSourceDistance - 0.3608402,
    ) < 0.0000001,
  );

  const before = report.summaries.current.pairCheckFailureInputCounts;
  const after =
    report.summaries["paired-quality-miss-count-first"]
      .pairCheckFailureInputCounts;
  for (const [id, transition] of Object.entries(
    report.comparisonToCurrent.pairCheckTransitions,
  )) {
    assert.equal(
      (after[id] ?? 0) - (before[id] ?? 0),
      transition.introduced.length - transition.resolved.length,
    );
  }

  for (const primary of inputGrid()) {
    const production = generatePaletteV2({ primary });
    const diagnostic = generatePaletteV2PairRankingCounterfactual({
      primary,
      strategy: PAIR_RANKING_STRATEGIES.SOURCE_FIRST,
    });
    assert.deepEqual(withoutDiagnosticMetadata(diagnostic), production);
  }
});
