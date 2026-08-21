import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { buildAdversarialDiagnosticReport } from "../../v2/lib/adversarial-diagnostics.js";
import { secondaryActionPresentationForMode } from "../../v2/lib/action-presentation.js";
import { generatePaletteV2 } from "../../v2/lib/palette.js";

test("v2 contracts hold across an RGB input grid", () => {
  const report = buildAdversarialDiagnosticReport({
    generate: ({ primary }) => {
      const result = generatePaletteV2({ primary });
      assert.equal(result.passed, true, primary);
      for (const mode of ["light", "dark"]) {
        const modeResult = result.modes[mode];
        const secondary = secondaryActionPresentationForMode(modeResult);
        assert.equal(
          Math.min(
            secondary.checks.defaultTextContrast,
            secondary.checks.hoverTextContrast,
            secondary.checks.activeTextContrast,
          ) >= secondary.checks.minimumTextContrast,
          true,
          `${primary}/${mode} Secondary labels must remain readable`,
        );
        assert.equal(
          modeResult.nonTextChecks.find(
            ({ role }) => role === "Focus on muted surface",
          ).pass,
          true,
          `${primary}/${mode} focus must remain visible on muted surface`,
        );
        assert.equal(
          modeResult.values["primary text"],
          modeResult.values["destructive text"],
          `${primary}/${mode} must share one filled-action foreground`,
        );
        const destructiveLabelConstraint =
          modeResult.decisions.destructive.selected.constraintResults.find(
            ({ id }) => id === "destructive.label-contrast",
          );
        assert.equal(
          destructiveLabelConstraint.metrics.text,
          modeResult.values["primary text"],
          `${primary}/${mode} destructive selection must use the shared foreground`,
        );
        for (const state of ["destructive hover", "destructive active"]) {
          const sharedLabelConstraint = modeResult.decisions[
            state
          ].selected.constraintResults.find(
            ({ id }) => id === "state.shared-label",
          );
          assert.equal(
            sharedLabelConstraint.metrics.labelText,
            modeResult.values["primary text"],
            `${primary}/${mode}/${state} must use the shared foreground`,
          );
        }
      }
      assert.equal(
        result.quality.checks.every(({ value }) => Number.isFinite(value)),
        true,
        `${primary} paired quality metrics`,
      );
      return result;
    },
  });

  assert.equal(report.policyVersion, "v2-policy-model-18");
  assert.equal(report.schema, "color-palette-adversarial-diagnostics.v3");
  assert.equal(report.summary.inputCount, 216);
  assert.equal(report.summary.signaledInputCount, 148);
  assert.equal(report.sourceFidelity.shiftedInputCount, 115);
  assert.deepEqual(report.sourceFidelity.byInputLightness, {
    dark: 21,
    light: 16,
    "very-dark": 5,
    "very-light": 73,
  });
  assert.deepEqual(report.sourceFidelity.byInputChroma, {
    achromatic: 4,
    high: 59,
    low: 10,
    moderate: 42,
  });
  assert.deepEqual(report.sourceFidelity.byModePattern, {
    dark: 19,
    light: 34,
    "light+dark": 62,
  });
  assert.deepEqual(report.sourceFidelity.modes.light.lightnessDirectionCounts, {
    decrease: 89,
    increase: 7,
  });
  assert.deepEqual(report.sourceFidelity.modes.light.chromaDirectionCounts, {
    decrease: 82,
    increase: 14,
  });
  assert.deepEqual(report.sourceFidelity.modes.dark.lightnessDirectionCounts, {
    decrease: 55,
    increase: 26,
  });
  assert.deepEqual(report.sourceFidelity.modes.dark.chromaDirectionCounts, {
    decrease: 64,
    increase: 17,
  });
  assert.deepEqual(
    report.sourceFidelity.modes.light.sourceLightnessRoleRangePositionCounts,
    { above: 89, below: 7 },
  );
  assert.deepEqual(
    report.sourceFidelity.modes.dark.sourceLightnessRoleRangePositionCounts,
    { above: 55, below: 26 },
  );
  assert.deepEqual(
    report.sourceFidelity.modes.light
      .bestRankedRejectedConstraintCombinationCounts,
    {
      "primary.calm-chroma+primary.mode-range": 52,
      "primary.generated-family+primary.mode-range+primary.shared-label": 1,
      "primary.mode-range": 43,
    },
  );
  assert.deepEqual(
    report.sourceFidelity.modes.dark
      .bestRankedRejectedConstraintCombinationCounts,
    {
      "primary.calm-chroma+primary.generated-family+primary.mode-range+primary.shared-label": 11,
      "primary.calm-chroma+primary.mode-range": 32,
      "primary.generated-family+primary.mode-range+primary.shared-label": 12,
      "primary.mode-range": 26,
    },
  );
  assert.equal(
    report.sourceFidelity.modes.light.bestRankedRejectedConstraintCounts[
      "primary.mode-range"
    ],
    96,
  );
  assert.equal(
    report.sourceFidelity.modes.dark.bestRankedRejectedConstraintCounts[
      "primary.mode-range"
    ],
    81,
  );
  assert.equal(
    report.sourceFidelity.modes.light.bestRankedRejectedConstraintCounts[
      "primary.calm-chroma"
    ],
    52,
  );
  assert.equal(
    report.sourceFidelity.modes.dark.bestRankedRejectedConstraintCounts[
      "primary.calm-chroma"
    ],
    43,
  );
  assert.equal(
    report.summary.signalCounts["quality:review.light.source-fidelity"] +
      report.summary.signalCounts["quality:review.dark.source-fidelity"],
    177,
  );
  assert.equal(
    report.cases.filter(({ signals }) =>
      signals.some(
        (signal) =>
          signal.includes("primary-destructive-hue") ||
          signal.includes("primary-warning-hue"),
      ),
    ).length,
    59,
  );
  assert.deepEqual(report.semanticHueReview.opportunityCounts, {
    input: 216,
    inputMode: 432,
    inputModeRelationshipCheck: 864,
  });
  assert.equal(report.semanticHueReview.flaggedInputCount, 59);
  assert.equal(report.semanticHueReview.flaggedModeCaseCount, 118);
  assert.equal(report.semanticHueReview.failedCheckOccurrenceCount, 120);
  assert.deepEqual(report.semanticHueReview.failedCheckCounts, {
    "review.dark.primary-destructive-hue": 33,
    "review.dark.primary-warning-hue": 27,
    "review.light.primary-destructive-hue": 33,
    "review.light.primary-warning-hue": 27,
  });
  assert.equal(
    Object.values(report.semanticHueReview.failedCheckCounts).reduce(
      (total, count) => total + count,
      0,
    ),
    report.semanticHueReview.failedCheckOccurrenceCount,
  );
  assert.deepEqual(
    report.semanticHueReview.failedCheckOccurrenceCountsByRelationship,
    { "primary-destructive": 66, "primary-warning": 54 },
  );
  assert.deepEqual(report.semanticHueReview.failedCheckOccurrenceCountsByMode, {
    dark: 60,
    light: 60,
  });
  assert.deepEqual(report.semanticHueReview.exactPatternInputCounts, {
    "review.dark.primary-destructive-hue+review.dark.primary-warning-hue+review.light.primary-destructive-hue+review.light.primary-warning-hue": 1,
    "review.dark.primary-destructive-hue+review.light.primary-destructive-hue": 32,
    "review.dark.primary-warning-hue+review.light.primary-warning-hue": 26,
  });
  assert.deepEqual(report.semanticHueReview.inputLevelOverlaps, {
    sourceShift: {
      both: 26,
      semanticHueOnly: 33,
      otherOnly: 89,
      neither: 68,
    },
    contractFailure: {
      both: 0,
      semanticHueOnly: 59,
      otherOnly: 0,
      neither: 157,
    },
    pairEligibilityMiss: {
      both: 0,
      semanticHueOnly: 59,
      otherOnly: 0,
      neither: 157,
    },
  });
  for (const overlap of Object.values(
    report.semanticHueReview.inputLevelOverlaps,
  )) {
    assert.equal(
      Object.values(overlap).reduce((total, count) => total + count, 0),
      report.semanticHueReview.opportunityCounts.input,
    );
    assert.equal(
      overlap.both + overlap.semanticHueOnly,
      report.semanticHueReview.flaggedInputCount,
    );
  }
  assert.equal(
    createHash("sha256")
      .update(
        JSON.stringify(
          report.semanticHueReview.flaggedCases.map(({ input }) => input),
        ),
      )
      .digest("hex"),
    "bf1ccad9730033ce3d5b790547e52069a611e4b09391318d46fa348af564eae2",
  );
  for (const cohort of Object.values(report.semanticHueReview.sourceCohorts)) {
    assert.equal(
      Object.values(cohort).reduce(
        (total, item) => total + item.corpusInputCount,
        0,
      ),
      216,
    );
    assert.equal(
      Object.values(cohort).reduce(
        (total, item) => total + item.flaggedInputCount,
        0,
      ),
      59,
    );
  }
  assert.deepEqual(report.semanticHueReview.sourceCohorts.lightness, {
    dark: {
      corpusInputCount: 46,
      flaggedInputCount: 11,
      flaggedFractionWithinCorpusCohort: 11 / 46,
    },
    light: {
      corpusInputCount: 92,
      flaggedInputCount: 29,
      flaggedFractionWithinCorpusCohort: 29 / 92,
    },
    "very-dark": {
      corpusInputCount: 5,
      flaggedInputCount: 1,
      flaggedFractionWithinCorpusCohort: 1 / 5,
    },
    "very-light": {
      corpusInputCount: 73,
      flaggedInputCount: 18,
      flaggedFractionWithinCorpusCohort: 18 / 73,
    },
  });
  assert.deepEqual(report.semanticHueReview.sourceCohorts.chroma, {
    achromatic: {
      corpusInputCount: 6,
      flaggedInputCount: 0,
      flaggedFractionWithinCorpusCohort: 0,
    },
    high: {
      corpusInputCount: 116,
      flaggedInputCount: 27,
      flaggedFractionWithinCorpusCohort: 27 / 116,
    },
    low: {
      corpusInputCount: 18,
      flaggedInputCount: 9,
      flaggedFractionWithinCorpusCohort: 9 / 18,
    },
    moderate: {
      corpusInputCount: 76,
      flaggedInputCount: 23,
      flaggedFractionWithinCorpusCohort: 23 / 76,
    },
  });
  assert.deepEqual(report.semanticHueReview.sourceCohorts.hueSector, {
    "0–60": {
      corpusInputCount: 32,
      flaggedInputCount: 32,
      flaggedFractionWithinCorpusCohort: 1,
    },
    "120–180": {
      corpusInputCount: 55,
      flaggedInputCount: 0,
      flaggedFractionWithinCorpusCohort: 0,
    },
    "180–240": {
      corpusInputCount: 20,
      flaggedInputCount: 0,
      flaggedFractionWithinCorpusCohort: 0,
    },
    "240–300": {
      corpusInputCount: 39,
      flaggedInputCount: 0,
      flaggedFractionWithinCorpusCohort: 0,
    },
    "300–360": {
      corpusInputCount: 38,
      flaggedInputCount: 1,
      flaggedFractionWithinCorpusCohort: 1 / 38,
    },
    "60–120": {
      corpusInputCount: 26,
      flaggedInputCount: 26,
      flaggedFractionWithinCorpusCohort: 1,
    },
    achromatic: {
      corpusInputCount: 6,
      flaggedInputCount: 0,
      flaggedFractionWithinCorpusCohort: 0,
    },
  });
  assert.equal(
    report.cases.filter(({ signals }) =>
      signals.some((signal) => signal.startsWith("quality:pair.")),
    ).length,
    0,
  );
});
