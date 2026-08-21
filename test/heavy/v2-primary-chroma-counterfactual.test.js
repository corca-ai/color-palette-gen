import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { buildPrimaryChromaCounterfactualReport } from "../../v2/lib/primary-chroma-counterfactual.js";

function digest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

test("reviewed Primary chroma counterfactual remains reproducible", () => {
  const report = buildPrimaryChromaCounterfactualReport();
  const current = report.summaries.current;
  const adaptive = report.summaries.adaptive;
  const guarded = report.summaries.guardedAdaptive;
  const comparison = report.comparisonToCurrent;

  assert.equal(report.schema, "color-palette-primary-chroma-counterfactual.v3");
  assert.equal(report.policyVersion, "v2-policy-model-18");
  assert.deepEqual(
    {
      inputCount: current.inputCount,
      largeSourceShiftInputCount: current.largeSourceShiftInputCount,
      largeSourceShiftModeCount: current.largeSourceShiftModeCount,
      qualityFindingInputCount: current.qualityFindingInputCount,
      meanModeSourceDistance: current.meanModeSourceDistance,
      meanSelectedRealizedChroma: current.meanSelectedRealizedChroma,
    },
    {
      inputCount: 216,
      largeSourceShiftInputCount: 115,
      largeSourceShiftModeCount: 186,
      qualityFindingInputCount: 148,
      meanModeSourceDistance: 0.18042009820944052,
      meanSelectedRealizedChroma: 0.12482728640836428,
    },
  );
  assert.deepEqual(adaptive, {
    inputCount: 216,
    selectedFromDiagnosticLadderInputCount: 216,
    generationInfeasibleInputCount: 0,
    evaluatedInputCount: 216,
    contractFailureInputCount: 0,
    pairEligibilityMissInputCount: 1,
    pairQualityMissInputCount: 1,
    qualityFindingInputCount: 143,
    semanticFindingInputCount: 22,
    largeSourceShiftInputCount: 108,
    largeSourceShiftModeCount: 177,
    evaluatedModeCount: 432,
    meanModeSourceDistance: 0.16590742211414422,
    maximumModeSourceDistance: 0.5795099175924082,
    meanSelectedRealizedChroma: 0.147444906449093,
    requestedCandidateOccurrenceCount: 36884,
    uniqueRenderedLadderCandidateCount: 28098,
    renderedConvergenceCount: 8786,
  });
  assert.deepEqual(report.summaries.commonSupport.current, {
    ...current,
    inputCount: 216,
    evaluatedInputCount: 216,
  });
  assert.deepEqual(report.summaries.commonSupport.adaptive, {
    ...adaptive,
    inputCount: 216,
    generationInfeasibleInputCount: 0,
  });
  assert.deepEqual(guarded, {
    inputCount: 216,
    selectedFromDiagnosticLadderInputCount: 123,
    generationInfeasibleInputCount: 0,
    evaluatedInputCount: 216,
    contractFailureInputCount: 0,
    pairEligibilityMissInputCount: 0,
    pairQualityMissInputCount: 0,
    qualityFindingInputCount: 143,
    semanticFindingInputCount: 22,
    largeSourceShiftInputCount: 109,
    largeSourceShiftModeCount: 178,
    evaluatedModeCount: 432,
    meanModeSourceDistance: 0.1665153301117414,
    maximumModeSourceDistance: 0.5795099175924082,
    meanSelectedRealizedChroma: 0.14881294348003243,
    requestedCandidateOccurrenceCount: 23128,
    uniqueRenderedLadderCandidateCount: 16370,
    renderedConvergenceCount: 6758,
  });
  assert.deepEqual(
    {
      outOfScopeInputCount: report.guardedSelection.outOfScopeInputCount,
      consideredInputCount: report.guardedSelection.consideredInputCount,
      adoptedInputCount: report.guardedSelection.adoptedInputCount,
      rejectedInputCount: report.guardedSelection.rejectedInputCount,
    },
    {
      outOfScopeInputCount: 92,
      consideredInputCount: 124,
      adoptedInputCount: 123,
      rejectedInputCount: 1,
    },
  );
  assert.deepEqual(
    report.guardedSelection.decisions.filter(
      ({ state }) => state === "considered-rejected",
    ),
    [
      {
        input: "#3300FF",
        state: "considered-rejected",
        reasonKind: "pair-eligibility-regression",
        evidence: {
          introducedContracts: [],
          introducedEligibilityIds: ["pair.primary-chroma-difference"],
        },
      },
    ],
  );
  assert.equal(
    digest(report.guardedSelection.decisions),
    "4939ccd3a3985208457728a3e55342b7442c8b8ea0d882597214b0315c7d5f3a",
  );
  assert.equal(
    report.guardedOutputDigest,
    "feab974e88bf1e016c939e4c69487853324a0ad998a7bc42e7c123ca8ea2aad0",
  );
  assert.equal(report.comparisonToCurrent.commonSupportInputCount, 216);
  assert.equal(
    report.candidateEvidence.adaptiveModeCandidateSetDigest,
    "815ad8c6c78165115105ec7d0946f04e6264a139e26fbcabc99b6e3caa0c8df0",
  );
  assert.equal(comparison.changedInputCount, 160);
  assert.equal(comparison.changedModeCount, 267);
  assert.deepEqual(comparison.generationInfeasibleInputs, []);
  assert.equal(
    digest(comparison.changedCases),
    "5d932be504f6138374064cf58fbce9df48e27cfafb73f80bb85132e65dec6fe8",
  );
  assert.equal(
    digest({
      contract: comparison.contractTransitions,
      quality: comparison.qualityTransitions,
      semantic: comparison.semanticTransitions,
      shift: comparison.sourceShiftModeTransitions,
    }),
    "8cbae817f13bce7e6c71e3871a0937cfef806dc40529438ceee26299adaa8b3e",
  );
  assert.deepEqual(comparison.qualityTransitions, {
    "pair.primary-chroma-difference": {
      introduced: ["#3300FF"],
      resolved: [],
    },
    "review.dark.primary-destructive-hue": { introduced: [], resolved: [] },
    "review.dark.primary-warning-hue": { introduced: [], resolved: [] },
    "review.dark.source-fidelity": {
      introduced: [],
      resolved: ["#0000FF", "#3300CC", "#3300FF", "#FF00FF", "#FF33FF"],
    },
    "review.light.primary-destructive-hue": { introduced: [], resolved: [] },
    "review.light.primary-warning-hue": { introduced: [], resolved: [] },
    "review.light.source-fidelity": {
      introduced: [],
      resolved: ["#FF00CC", "#FF00FF", "#FF33CC", "#FF6699"],
    },
  });
  assert.deepEqual(comparison.contractTransitions, {});
  assert.deepEqual(comparison.semanticTransitions, {
    "feedback-oklab-separation-passes:unsatisfied": {
      introduced: ["#CC3366"],
      resolved: ["#FF0066"],
    },
  });
  assert.deepEqual(comparison.sourceShiftModeTransitions, {
    dark: {
      introduced: [],
      resolved: ["#0000FF", "#3300CC", "#3300FF", "#FF00FF", "#FF33FF"],
    },
    light: {
      introduced: [],
      resolved: ["#FF00CC", "#FF00FF", "#FF33CC", "#FF6699"],
    },
  });

  const guardedComparison = report.guardedComparisonToCurrent;
  assert.equal(guardedComparison.commonSupportInputCount, 216);
  assert.equal(guardedComparison.changedInputCount, 108);
  assert.equal(guardedComparison.changedModeCount, 198);
  assert.deepEqual(guardedComparison.generationInfeasibleInputs, []);
  assert.equal(
    digest(guardedComparison.changedCases),
    "019fd61ce311ffbe71847592511363980fb0d130fa6b3c362107e823992e3dff",
  );
  assert.deepEqual(guardedComparison.contractTransitions, {});
  assert.deepEqual(guardedComparison.semanticTransitions, {
    "feedback-oklab-separation-passes:unsatisfied": {
      introduced: ["#CC3366"],
      resolved: ["#FF0066"],
    },
  });
  assert.deepEqual(guardedComparison.qualityTransitions, {
    "review.dark.primary-destructive-hue": { introduced: [], resolved: [] },
    "review.dark.primary-warning-hue": { introduced: [], resolved: [] },
    "review.dark.source-fidelity": {
      introduced: [],
      resolved: ["#0000FF", "#3300CC", "#FF00FF", "#FF33FF"],
    },
    "review.light.primary-destructive-hue": { introduced: [], resolved: [] },
    "review.light.primary-warning-hue": { introduced: [], resolved: [] },
    "review.light.source-fidelity": {
      introduced: [],
      resolved: ["#FF00CC", "#FF00FF", "#FF33CC", "#FF6699"],
    },
  });
  assert.deepEqual(guardedComparison.sourceShiftModeTransitions, {
    dark: {
      introduced: [],
      resolved: ["#0000FF", "#3300CC", "#FF00FF", "#FF33FF"],
    },
    light: {
      introduced: [],
      resolved: ["#FF00CC", "#FF00FF", "#FF33CC", "#FF6699"],
    },
  });
});
