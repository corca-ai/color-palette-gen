import assert from "node:assert/strict";
import test from "node:test";

import { buildContextualDestructiveSeparationCounterfactualReport } from "../../v2/lib/contextual-destructive-separation-counterfactual.js";

function nonemptyTransitions(transitions) {
  return Object.fromEntries(
    Object.entries(transitions).filter(
      ([, value]) => value.introduced.length > 0 || value.resolved.length > 0,
    ),
  );
}

test("reviewed contextual separation census remains exact", () => {
  const report = buildContextualDestructiveSeparationCounterfactualReport();
  assert.deepEqual(report.support, {
    inputCount: 216,
    generatedInputCount: 216,
    generationInfeasibleInputCount: 0,
    comparableInputCount: 216,
  });
  assert.deepEqual(report.outcomes, {
    current: {
      inputCount: 216,
      contractPassingInputCount: 216,
      qualityReviewPassingInputCount: 68,
      semanticModelSatisfiedInputCount: 216,
      pairEligibilityMissInputCount: 0,
    },
    candidate: {
      inputCount: 216,
      contractPassingInputCount: 216,
      qualityReviewPassingInputCount: 68,
      semanticModelSatisfiedInputCount: 194,
      pairEligibilityMissInputCount: 0,
      changedInputCount: 216,
      separationReview: {
        light: {
          modeCaseCount: 216,
          passingModeCaseCount: 211,
          meanDeltaE: 0.22171211571180682,
          minimumDeltaE: 0.03976619132402792,
          maximumDeltaE: 0.31601792657598676,
        },
        dark: {
          modeCaseCount: 216,
          passingModeCaseCount: 194,
          meanDeltaE: 0.21652930021597475,
          minimumDeltaE: 0.040636803816456055,
          maximumDeltaE: 0.3193844234462171,
        },
      },
    },
  });
  assert.deepEqual(nonemptyTransitions(report.transitions.contracts), {});
  assert.deepEqual(nonemptyTransitions(report.transitions.pairEligibility), {});
  assert.deepEqual(nonemptyTransitions(report.transitions.quality), {
    "review.dark.source-fidelity": {
      introduced: [
        "#00CCFF",
        "#33CCCC",
        "#33CCFF",
        "#66CC99",
        "#66CCCC",
        "#99CC00",
        "#99CC33",
        "#99CC66",
        "#99CC99",
      ],
      resolved: [],
    },
  });
  assert.deepEqual(nonemptyTransitions(report.transitions.semantics), {
    "feedback-oklab-separation-passes:unsatisfied": {
      introduced: [
        "#660000",
        "#990000",
        "#990033",
        "#993300",
        "#993333",
        "#CC0000",
        "#CC0033",
        "#CC3300",
        "#CC3333",
        "#CC6633",
        "#CC6666",
        "#FF0000",
        "#FF0033",
        "#FF0066",
        "#FF3300",
        "#FF3333",
        "#FF3366",
        "#FF6600",
        "#FF6633",
        "#FF6666",
        "#FF9966",
        "#FF9999",
      ],
      resolved: [],
    },
  });
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(report.transitions.changedRoleModeCaseCounts).filter(
        ([, count]) => count > 0,
      ),
    ),
    {
      "dark.destructive": 216,
      "dark.destructive active": 216,
      "dark.destructive hover": 216,
      "dark.focus ring": 118,
      "dark.primary": 115,
      "dark.primary active": 216,
      "dark.primary border": 109,
      "dark.primary hover": 216,
      "light.destructive": 5,
      "light.destructive active": 5,
      "light.destructive hover": 5,
    },
  );
  assert.equal(
    report.currentResultDigest,
    "d46e901f997952b8e2089aa5c3d49f5844aaf800cb134423ea61f234de624c0c",
  );
  assert.equal(
    report.candidateResultDigest,
    "8b065e6c06dd7e415fbfcc7749748fcfac3192cec4b0b86a105323cc29ccbd9a",
  );
  assert.equal(
    report.caseDigest,
    "34de7388af589a1b19e45695f4cbab747ac443126b6d6d78bd454785dfb19fe0",
  );
});
