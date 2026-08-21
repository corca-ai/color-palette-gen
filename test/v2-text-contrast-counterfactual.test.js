import assert from "node:assert/strict";
import test from "node:test";

import {
  generatePaletteV2,
  generatePaletteV2TextContrastCounterfactual,
} from "../v2/lib/palette.js";
import {
  buildTextContrastCounterfactualReport,
  TEXT_CONTRAST_COUNTERFACTUAL_REPORT_SCHEMA,
} from "../v2/lib/text-contrast-counterfactual.js";
import {
  assertTextContrastStrategy,
  TEXT_CONTRAST_EXPERIMENT,
  TEXT_CONTRAST_STRATEGIES,
  textContrastEvidence,
} from "../v2/lib/text-contrast-strategy.js";

function withoutDiagnosticOverride(result) {
  const copy = structuredClone(result);
  delete copy.diagnosticOverride;
  return copy;
}

test("text contrast strategies preserve independent APCA and WCAG verdicts", () => {
  const apcaOnlyPass = textContrastEvidence({
    foreground: "#FFFFFF",
    backgrounds: ["#777777"],
    apcaMinimum: 60,
    strategy: TEXT_CONTRAST_STRATEGIES.INTERSECTION,
  });
  assert.equal(apcaOnlyPass.apca.passed, true);
  assert.equal(apcaOnlyPass.wcag.passed, false);
  assert.equal(apcaOnlyPass.passed, false);

  const wcagOnlyPass = textContrastEvidence({
    foreground: "#000000",
    backgrounds: ["#757575"],
    apcaMinimum: 60,
    strategy: TEXT_CONTRAST_STRATEGIES.INTERSECTION,
  });
  assert.equal(wcagOnlyPass.apca.passed, false);
  assert.equal(wcagOnlyPass.wcag.passed, true);
  assert.equal(wcagOnlyPass.passed, false);
  assert.throws(
    () => assertTextContrastStrategy("average-score"),
    /Unsupported text contrast strategy/,
  );
});

test("the production diagnostic arm preserves output and cache", () => {
  const before = generatePaletteV2({ primary: "#507096" });
  const diagnostic = generatePaletteV2TextContrastCounterfactual({
    primary: "#507096",
    strategy: TEXT_CONTRAST_STRATEGIES.PRODUCTION,
  });
  const after = generatePaletteV2({ primary: "#507096" });

  assert.strictEqual(after, before);
  assert.deepEqual(withoutDiagnosticOverride(diagnostic), before);
  assert.equal(
    diagnostic.diagnosticOverride.experiment,
    TEXT_CONTRAST_EXPERIMENT.id,
  );
  assert.deepEqual(
    diagnostic.diagnosticOverride.experimentDefinition,
    TEXT_CONTRAST_EXPERIMENT,
  );
});

test("the historical APCA-only arm stays diagnostic and may change output", () => {
  const production = generatePaletteV2({ primary: "#507096" });
  const diagnostic = generatePaletteV2TextContrastCounterfactual({
    primary: "#507096",
    strategy: TEXT_CONTRAST_STRATEGIES.APCA_ONLY,
  });

  assert.notDeepEqual(withoutDiagnosticOverride(diagnostic), production);
  assert.equal(diagnostic.diagnosticOverride.textContrastStrategy, "apca-only");
});

test("the fixed contrast-policy probe remains deterministic and falsifiable", () => {
  const report = buildTextContrastCounterfactualReport();

  assert.equal(report.schema, TEXT_CONTRAST_COUNTERFACTUAL_REPORT_SCHEMA);
  assert.deepEqual(report.support, {
    inputCount: 14,
    attemptedArmInputCount: 56,
  });
  assert.deepEqual(report.summaries, {
    "wcag-eligible-apca-ranked": {
      attemptedInputCount: 14,
      generatedInputCount: 14,
      generationInfeasibleInputCount: 0,
      contractsPassedInputCount: 14,
      qualityReviewPassedInputCount: 7,
      semanticModelSatisfiedInputCount: 13,
      changedInputCount: 0,
      failureCountsByDecision: {},
      failedConstraintIdOccurrenceCounts: {},
    },
    "apca-only": {
      attemptedInputCount: 14,
      generatedInputCount: 14,
      generationInfeasibleInputCount: 0,
      contractsPassedInputCount: 0,
      qualityReviewPassedInputCount: 7,
      semanticModelSatisfiedInputCount: 0,
      changedInputCount: 14,
      failureCountsByDecision: {},
      failedConstraintIdOccurrenceCounts: {},
    },
    "wcag-only": {
      attemptedInputCount: 14,
      generatedInputCount: 14,
      generationInfeasibleInputCount: 0,
      contractsPassedInputCount: 14,
      qualityReviewPassedInputCount: 7,
      semanticModelSatisfiedInputCount: 13,
      changedInputCount: 0,
      failureCountsByDecision: {},
      failedConstraintIdOccurrenceCounts: {},
    },
    intersection: {
      attemptedInputCount: 14,
      generatedInputCount: 0,
      generationInfeasibleInputCount: 14,
      contractsPassedInputCount: 0,
      qualityReviewPassedInputCount: 0,
      semanticModelSatisfiedInputCount: 0,
      changedInputCount: 0,
      failureCountsByDecision: {
        "dark.primary": 13,
        "light.warning": 1,
      },
      failedConstraintIdOccurrenceCounts: {
        "feedback.label-contrast": 91,
        "feedback.semantic-separation": 56,
        "primary.calm-chroma": 5,
        "primary.generated-family": 2,
        "primary.mode-range": 13,
        "primary.shared-label": 232,
      },
    },
  });
  assert.equal(
    report.interpretation.nextGate,
    "current-inventory-falsifies-intersection-readiness",
  );
  assert.equal(
    report.cases.filter(
      ({ arms }) =>
        arms.intersection.status === "generation-infeasible" &&
        arms.intersection.failure.code === "NO_CANDIDATE",
    ).length,
    14,
  );
});

test("the report rejects invalid support and experiment identity", () => {
  assert.throws(
    () => buildTextContrastCounterfactualReport({ inputs: [] }),
    /requires one or more inputs/,
  );
  assert.throws(
    () =>
      buildTextContrastCounterfactualReport({
        inputs: ["#507096", "#507096"],
      }),
    /inputs must be unique/,
  );
  assert.throws(
    () =>
      buildTextContrastCounterfactualReport({
        inputs: ["#507096"],
        generateArm: ({ primary }) => generatePaletteV2({ primary }),
      }),
    /experiment identity drifted/,
  );
});
