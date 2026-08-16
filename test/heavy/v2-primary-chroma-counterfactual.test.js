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

  assert.equal(report.schema, "color-palette-primary-chroma-counterfactual.v2");
  assert.equal(report.policyVersion, "v2-policy-model-12");
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
    selectedFromDiagnosticLadderInputCount: 215,
    generationInfeasibleInputCount: 1,
    evaluatedInputCount: 215,
    contractFailureInputCount: 0,
    pairEligibilityMissInputCount: 1,
    pairQualityMissInputCount: 1,
    qualityFindingInputCount: 142,
    semanticFindingInputCount: 0,
    largeSourceShiftInputCount: 108,
    largeSourceShiftModeCount: 177,
    evaluatedModeCount: 430,
    meanModeSourceDistance: 0.16609579039445568,
    maximumModeSourceDistance: 0.5795099175924082,
    meanSelectedRealizedChroma: 0.14725894457823618,
    requestedCandidateOccurrenceCount: 36684,
    uniqueRenderedLadderCandidateCount: 27899,
    renderedConvergenceCount: 8785,
  });
  assert.deepEqual(report.summaries.commonSupport.current, {
    ...current,
    inputCount: 215,
    evaluatedInputCount: 215,
    qualityFindingInputCount: 147,
    evaluatedModeCount: 430,
    meanModeSourceDistance: 0.18065310479437283,
    meanSelectedRealizedChroma: 0.1247080377078258,
  });
  assert.deepEqual(report.summaries.commonSupport.adaptive, {
    ...adaptive,
    inputCount: 215,
    generationInfeasibleInputCount: 0,
  });
  assert.deepEqual(guarded, {
    inputCount: 216,
    selectedFromDiagnosticLadderInputCount: 122,
    generationInfeasibleInputCount: 0,
    evaluatedInputCount: 216,
    contractFailureInputCount: 0,
    pairEligibilityMissInputCount: 0,
    pairQualityMissInputCount: 0,
    qualityFindingInputCount: 143,
    semanticFindingInputCount: 0,
    largeSourceShiftInputCount: 109,
    largeSourceShiftModeCount: 178,
    evaluatedModeCount: 432,
    meanModeSourceDistance: 0.16653808678119425,
    maximumModeSourceDistance: 0.5795099175924082,
    meanSelectedRealizedChroma: 0.14864182796309183,
    requestedCandidateOccurrenceCount: 22928,
    uniqueRenderedLadderCandidateCount: 16171,
    renderedConvergenceCount: 6757,
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
      adoptedInputCount: 122,
      rejectedInputCount: 2,
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
      {
        input: "#FF6666",
        state: "considered-rejected",
        reasonKind: "generation-infeasible",
        evidence: {
          message:
            "dark.destructive has no candidate satisfying its constraints.",
        },
      },
    ],
  );
  assert.equal(
    digest(report.guardedSelection.decisions),
    "b00848ba54552b9c650fb1b2621153ce4f89b4591de6390b6b02029b9f42a5f9",
  );
  assert.equal(
    report.guardedOutputDigest,
    "db5ec8ad7c0c9897edf7644b7a281e42ff64096b117aa0042e76723feafb3e06",
  );
  assert.equal(report.comparisonToCurrent.commonSupportInputCount, 215);
  assert.equal(
    report.candidateEvidence.adaptiveModeCandidateSetDigest,
    "5d86abefe166f888d9067103672ea59d1caa03fd3bb6228f850ecac1cd9c8f6f",
  );
  assert.equal(comparison.changedInputCount, 160);
  assert.equal(comparison.changedModeCount, 265);
  assert.deepEqual(comparison.generationInfeasibleInputs, [
    {
      input: "#FF6666",
      reason: "dark.destructive has no candidate satisfying its constraints.",
    },
  ]);
  assert.equal(
    digest(comparison.changedCases),
    "801275efe1527e8c9f35aedeedea64098c8cc671339754aaf509b90d2d0f5167",
  );
  assert.equal(
    digest({
      contract: comparison.contractTransitions,
      quality: comparison.qualityTransitions,
      semantic: comparison.semanticTransitions,
      shift: comparison.sourceShiftModeTransitions,
    }),
    "b2d1efe08aa66cd0651087a2d16354bc5451c5148a0560bde668db3dd936ca55",
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
  assert.deepEqual(comparison.semanticTransitions, {});
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
  assert.equal(guardedComparison.changedInputCount, 107);
  assert.equal(guardedComparison.changedModeCount, 196);
  assert.deepEqual(guardedComparison.generationInfeasibleInputs, []);
  assert.equal(
    digest(guardedComparison.changedCases),
    "7b15f44eb9e57d8788da149e19ee08985568afd08098e263fdb53d77334a4bf7",
  );
  assert.deepEqual(guardedComparison.contractTransitions, {});
  assert.deepEqual(guardedComparison.semanticTransitions, {});
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
