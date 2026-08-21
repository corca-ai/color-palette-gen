import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { buildDestructiveAnchorCounterfactualReport } from "../../v2/lib/destructive-anchor-counterfactual.js";

function digest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

test("reviewed Destructive anchor counterfactual remains reproducible", () => {
  const report = buildDestructiveAnchorCounterfactualReport();

  assert.equal(
    report.schema,
    "color-palette-destructive-anchor-counterfactual.v2",
  );
  assert.equal(report.policyVersion, "v2-policy-model-18");
  assert.equal(report.resultVersion, 3);
  assert.equal(report.experiment.redHue, 27);
  assert.equal(report.experiment.conflictRadiusDegrees, 38);
  assert.equal(report.experiment.comparison, "strictly-less-than");
  assert.deepEqual(report.corpus, {
    kind: "rgb-channel-grid",
    channels: [0, 51, 102, 153, 204, 255],
    inputCount: 216,
    sourceBandApplicableInputCount: 41,
    sourceBandApplicableModeCaseCount: 82,
  });
  assert.deepEqual(report.support, {
    currentInputCount: 216,
    fixedInputCount: 216,
    infeasible: [],
  });
  assert.deepEqual(report.summaries.current, {
    inputCount: 216,
    modeCaseCount: 432,
    generatedContractFailureInputCount: 0,
    qualityFindingInputCount: 148,
    semanticFindingInputCount: 22,
    shiftedInputCount: 115,
    shiftedModeCaseCount: 186,
    meanPrimaryDestructiveDistance: 0.21912070796389094,
    minimumPrimaryDestructiveMargin: -0.04023380867597208,
    minimumDestructiveLabelLc: 71.5750645955411,
  });
  assert.deepEqual(report.summaries.fixedDefaultAnchor, {
    inputCount: 216,
    modeCaseCount: 432,
    generatedContractFailureInputCount: 0,
    qualityFindingInputCount: 148,
    semanticFindingInputCount: 23,
    shiftedInputCount: 115,
    shiftedModeCaseCount: 186,
    meanPrimaryDestructiveDistance: 0.21615801381319222,
    minimumPrimaryDestructiveMargin: -0.040992586651734095,
    minimumDestructiveLabelLc: 71.5750645955411,
  });
  assert.deepEqual(report.summaries.sourceBandApplicable, {
    current: {
      inputCount: 41,
      modeCaseCount: 82,
      generatedContractFailureInputCount: 0,
      qualityFindingInputCount: 37,
      semanticFindingInputCount: 22,
      shiftedInputCount: 13,
      shiftedModeCaseCount: 16,
      meanPrimaryDestructiveDistance: 0.1001292755699383,
      minimumPrimaryDestructiveMargin: -0.04023380867597208,
      minimumDestructiveLabelLc: 71.5750645955411,
    },
    fixedDefaultAnchor: {
      inputCount: 41,
      modeCaseCount: 82,
      generatedContractFailureInputCount: 0,
      qualityFindingInputCount: 37,
      semanticFindingInputCount: 23,
      shiftedInputCount: 13,
      shiftedModeCaseCount: 16,
      meanPrimaryDestructiveDistance: 0.08452093565406146,
      minimumPrimaryDestructiveMargin: -0.040992586651734095,
      minimumDestructiveLabelLc: 71.5750645955411,
    },
  });
  assert.equal(report.comparison.changedDecisionEvidenceInputCount, 41);
  assert.equal(report.comparison.changedDecisionEvidenceModeCaseCount, 82);
  assert.equal(report.comparison.unchangedApplicableInputCount, 0);
  assert.equal(report.comparison.nonApplicableIdentityMismatchCount, 0);
  assert.deepEqual(report.comparison.selectedRoleChangedModeCaseCounts, {
    destructive: 41,
    destructiveState: 41,
    warning: 0,
    warningState: 0,
  });
  assert.equal(
    report.comparison.candidateConstraintParityDigest,
    "58b7f6e71ad23146f60eb1b0fc8eec28a5e6f845c7597d41e6fbaa226a703843",
  );
  assert.deepEqual(report.comparison.contractTransitions, {});
  assert.deepEqual(report.comparison.semanticTransitions, {
    "feedback-oklab-separation-passes:unsatisfied": {
      introduced: ["#CC3366"],
      resolved: [],
    },
  });
  assert.deepEqual(report.comparison.sourceShiftModeTransitions, {
    dark: { introduced: [], resolved: [] },
    light: { introduced: [], resolved: [] },
  });
  assert.deepEqual(report.comparison.qualityTransitions, {
    "review.dark.primary-destructive-hue": { introduced: [], resolved: [] },
    "review.dark.primary-warning-hue": { introduced: [], resolved: [] },
    "review.dark.source-fidelity": { introduced: [], resolved: [] },
    "review.light.primary-destructive-hue": {
      introduced: [],
      resolved: ["#663300"],
    },
    "review.light.primary-warning-hue": { introduced: [], resolved: [] },
    "review.light.source-fidelity": { introduced: [], resolved: [] },
  });
  assert.equal(
    report.comparison.currentFullResultDigest,
    "61822530a81d23ed163d6e33e09218f0080b633935943db3e31b7b06bbf1dceb",
  );
  assert.equal(
    report.comparison.fixedFullResultDigest,
    "70ebe23ee41378988cd9c26f8bc4364de65cb01dc639b0bcaa34d8615920ff35",
  );
  assert.equal(
    digest(
      report.comparison.changedCases.map((item) => ({
        input: item.input,
        modes: item.decisionEvidenceChangedModes,
        current: Object.fromEntries(
          item.decisionEvidenceChangedModes.map((mode) => [
            mode,
            item.current[mode].destructive,
          ]),
        ),
        fixed: Object.fromEntries(
          item.decisionEvidenceChangedModes.map((mode) => [
            mode,
            item.fixed[mode].destructive,
          ]),
        ),
      })),
    ),
    "8a7c8171773252bca2e8770f6dda4a710a44090ff2c7c7b369da52db6a199071",
  );
});
