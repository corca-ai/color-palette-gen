import assert from "node:assert/strict";
import test from "node:test";

import { buildAdversarialDiagnosticReport } from "../../v2/lib/adversarial-diagnostics.js";
import { generatePaletteV2 } from "../../v2/lib/palette.js";

test("v2 contracts hold across an RGB input grid", () => {
  const report = buildAdversarialDiagnosticReport({
    generate: ({ primary }) => {
      const result = generatePaletteV2({ primary });
      assert.equal(result.passed, true, primary);
      assert.equal(
        result.quality.checks.every(({ value }) => Number.isFinite(value)),
        true,
        `${primary} paired quality metrics`,
      );
      return result;
    },
  });

  assert.equal(report.policyVersion, "v2-policy-model-12");
  assert.equal(report.schema, "color-palette-adversarial-diagnostics.v2");
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
    light: 25,
    "light+dark": 71,
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
    decrease: 64,
    increase: 26,
  });
  assert.deepEqual(report.sourceFidelity.modes.dark.chromaDirectionCounts, {
    decrease: 72,
    increase: 18,
  });
  assert.deepEqual(
    report.sourceFidelity.modes.light.sourceLightnessRoleRangePositionCounts,
    { above: 89, below: 7 },
  );
  assert.deepEqual(
    report.sourceFidelity.modes.dark.sourceLightnessRoleRangePositionCounts,
    { above: 64, below: 26 },
  );
  assert.deepEqual(
    report.sourceFidelity.modes.light
      .bestRankedRejectedConstraintCombinationCounts,
    {
      "primary.calm-chroma+primary.mode-range": 31,
      "primary.calm-chroma+primary.mode-range+primary.shared-label": 21,
      "primary.generated-family+primary.mode-range+primary.shared-label": 1,
      "primary.mode-range": 25,
      "primary.mode-range+primary.shared-label": 18,
    },
  );
  assert.deepEqual(
    report.sourceFidelity.modes.dark
      .bestRankedRejectedConstraintCombinationCounts,
    {
      "primary.calm-chroma+primary.generated-family+primary.mode-range+primary.shared-label": 11,
      "primary.calm-chroma+primary.mode-range": 32,
      "primary.calm-chroma+primary.mode-range+primary.shared-label": 2,
      "primary.generated-family+primary.mode-range+primary.shared-label": 12,
      "primary.mode-range": 33,
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
    90,
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
    45,
  );
  assert.equal(
    report.summary.signalCounts["quality:review.light.source-fidelity"] +
      report.summary.signalCounts["quality:review.dark.source-fidelity"],
    186,
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
  assert.equal(
    report.cases.filter(({ signals }) =>
      signals.some((signal) => signal.startsWith("quality:pair.")),
    ).length,
    0,
  );
});
