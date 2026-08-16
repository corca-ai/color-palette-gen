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
    "color-palette-destructive-anchor-counterfactual.v1",
  );
  assert.equal(report.policyVersion, "v2-policy-model-12");
  assert.equal(report.resultVersion, 2);
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
    semanticFindingInputCount: 0,
    shiftedInputCount: 115,
    shiftedModeCaseCount: 186,
    meanPrimaryDestructiveDistance: 0.22294111585885346,
    minimumPrimaryDestructiveMargin: 0.0004252584604935161,
    minimumDestructiveLabelLc: 61.40241410956562,
  });
  assert.deepEqual(report.summaries.fixedDefaultAnchor, {
    inputCount: 216,
    modeCaseCount: 432,
    generatedContractFailureInputCount: 0,
    qualityFindingInputCount: 148,
    semanticFindingInputCount: 0,
    shiftedInputCount: 115,
    shiftedModeCaseCount: 186,
    meanPrimaryDestructiveDistance: 0.2191753082151845,
    minimumPrimaryDestructiveMargin: 0.0004136725705020522,
    minimumDestructiveLabelLc: 61.40241410956562,
  });
  assert.deepEqual(report.summaries.sourceBandApplicable, {
    current: {
      inputCount: 41,
      modeCaseCount: 82,
      generatedContractFailureInputCount: 0,
      qualityFindingInputCount: 37,
      semanticFindingInputCount: 0,
      shiftedInputCount: 13,
      shiftedModeCaseCount: 16,
      meanPrimaryDestructiveDistance: 0.1174811146053545,
      minimumPrimaryDestructiveMargin: 0.0004252584604935161,
      minimumDestructiveLabelLc: 61.40241410956562,
    },
    fixedDefaultAnchor: {
      inputCount: 41,
      modeCaseCount: 82,
      generatedContractFailureInputCount: 0,
      qualityFindingInputCount: 37,
      semanticFindingInputCount: 0,
      shiftedInputCount: 13,
      shiftedModeCaseCount: 16,
      meanPrimaryDestructiveDistance: 0.09764173775090328,
      minimumPrimaryDestructiveMargin: 0.0004136725705020522,
      minimumDestructiveLabelLc: 61.40241410956562,
    },
  });
  assert.equal(report.comparison.changedDecisionEvidenceInputCount, 41);
  assert.equal(report.comparison.changedDecisionEvidenceModeCaseCount, 82);
  assert.equal(report.comparison.unchangedApplicableInputCount, 0);
  assert.equal(report.comparison.nonApplicableIdentityMismatchCount, 0);
  assert.deepEqual(report.comparison.selectedRoleChangedModeCaseCounts, {
    destructive: 75,
    destructiveState: 75,
    warning: 0,
    warningState: 0,
  });
  assert.equal(
    report.comparison.candidateConstraintParityDigest,
    "4bf715775b67313e058d76cb47991e7ebe43a9032567972e6a5139eeb0b9aad7",
  );
  assert.deepEqual(report.comparison.contractTransitions, {});
  assert.deepEqual(report.comparison.semanticTransitions, {});
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
    "a9be68204818942787de7c14689bb54b6b34ac5e9f7709d1d6c501c1d39d954a",
  );
  assert.equal(
    report.comparison.fixedFullResultDigest,
    "d0aab51b7f838e0a032272c8f0a02e5542b0121378e255d95667ded6ce3bf84e",
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
    "98ffca70a1f98406c9dc348278a0838e3da117969c6f5bca1c440bd2162bb777",
  );
});
