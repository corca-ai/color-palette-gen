import assert from "node:assert/strict";
import test from "node:test";

import { buildAdversarialDiagnosticReport } from "../v2/lib/adversarial-diagnostics.js";
import { generatePaletteV2 } from "../v2/lib/palette.js";

test("adversarial diagnostics are deterministic and keep claims bounded", () => {
  const first = buildAdversarialDiagnosticReport({ channels: [0, 255] });
  const second = buildAdversarialDiagnosticReport({ channels: [255, 0] });

  assert.deepEqual(first, second);
  assert.equal(first.schema, "color-palette-adversarial-diagnostics.v1");
  assert.equal(first.authority, "diagnostic");
  assert.match(first.interpretation, /does not score palette quality/);
  assert.equal(first.summary.inputCount, 8);
  assert.equal(
    first.summary.generatedContractFailureCount,
    0,
    "the current engine contracts hold for the small adversarial cube",
  );
});

test("adversarial diagnostics expose named signals and convergence", () => {
  const report = buildAdversarialDiagnosticReport({ channels: [0, 204, 255] });

  assert.ok(report.summary.signaledInputCount > 0);
  assert.ok(
    Object.keys(report.summary.signalCounts).every(
      (signal) =>
        signal.startsWith("quality:") ||
        signal.startsWith("contract:") ||
        signal.startsWith("semantic:") ||
        signal.startsWith("hover:") ||
        signal.startsWith("source-shift:") ||
        signal.startsWith("pair:") ||
        signal === "generated-contract-failure",
    ),
  );
  assert.ok(report.convergenceGroups.length > 0);
  assert.ok(report.convergenceGroups.every(({ inputs }) => inputs.length > 1));
});

test("source-fidelity cohorts preserve input traits and producer rejection evidence", () => {
  const report = buildAdversarialDiagnosticReport({ channels: [0, 255] });
  const shiftedByPattern = Object.values(
    report.sourceFidelity.byModePattern,
  ).reduce((total, count) => total + count, 0);
  const shiftedByLightness = Object.values(
    report.sourceFidelity.byInputLightness,
  ).reduce((total, count) => total + count, 0);
  const shiftedByChroma = Object.values(
    report.sourceFidelity.byInputChroma,
  ).reduce((total, count) => total + count, 0);
  const shiftedByHue = Object.values(report.sourceFidelity.byHueSector).reduce(
    (total, count) => total + count,
    0,
  );
  const yellow = report.cases.find(({ input }) => input === "#FFFF00");

  assert.equal(shiftedByPattern, report.sourceFidelity.shiftedInputCount);
  assert.equal(shiftedByLightness, report.sourceFidelity.shiftedInputCount);
  assert.equal(shiftedByChroma, report.sourceFidelity.shiftedInputCount);
  assert.equal(shiftedByHue, report.sourceFidelity.shiftedInputCount);
  for (const mode of Object.values(report.sourceFidelity.modes)) {
    assert.equal(
      Object.values(mode.lightnessDirectionCounts).reduce(
        (total, count) => total + count,
        0,
      ),
      mode.shiftedModeCount,
    );
    assert.equal(
      Object.values(mode.chromaDirectionCounts).reduce(
        (total, count) => total + count,
        0,
      ),
      mode.shiftedModeCount,
    );
  }
  assert.equal(yellow.sourceProfile.lightnessCohort, "very-light");
  assert.equal(yellow.sourceProfile.chromaCohort, "high");
  assert.equal(yellow.sourceProfile.hueSector, "60–120");
  assert.deepEqual(
    yellow.sourceShiftByMode.light.nearestRejectedConstraintIds,
    ["primary.calm-chroma", "primary.mode-range"],
  );
  assert.equal(yellow.sourceShiftByMode.light.lightnessDirection, "decrease");
  assert.equal(
    report.sourceFidelity.cohortDefinitions.chroma.at(-1).maximumExclusive,
    null,
  );
});

test("adversarial diagnostics preserve named contract and semantic failures", () => {
  const generate = ({ primary }) => {
    const result = structuredClone(generatePaletteV2({ primary }));
    result.passed = false;
    result.modes.light.passed = false;
    result.modes.light.checks[0].pass = false;
    result.semanticEvaluation.evaluations[0].status = "needs-review";
    return result;
  };
  const report = buildAdversarialDiagnosticReport({ channels: [0], generate });
  const [item] = report.cases;

  assert.equal(item.failedContractChecks.length, 1);
  assert.ok(item.signals.includes(`contract:${item.failedContractChecks[0]}`));
  assert.deepEqual(item.semanticFindings, [
    "shared-label-readable:needs-review",
  ]);
  assert.ok(item.signals.includes("generated-contract-failure"));
  assert.ok(
    item.signals.includes("semantic:shared-label-readable:needs-review"),
  );
});

test("adversarial diagnostics reject missing verdicts and mixed versions", () => {
  assert.throws(
    () =>
      buildAdversarialDiagnosticReport({
        channels: [0],
        generate: ({ primary }) => {
          const result = structuredClone(generatePaletteV2({ primary }));
          delete result.quality.checks[0].pass;
          return result;
        },
      }),
    /quality\.checks must contain named boolean check verdicts/,
  );
  assert.throws(
    () =>
      buildAdversarialDiagnosticReport({
        channels: [0],
        generate: ({ primary }) => {
          const result = structuredClone(generatePaletteV2({ primary }));
          result.quality.checks[0].role = result.quality.checks[0].id;
          delete result.quality.checks[0].id;
          return result;
        },
      }),
    /quality\.checks must use stable check ids/,
  );
  assert.throws(
    () =>
      buildAdversarialDiagnosticReport({
        channels: [0],
        generate: ({ primary }) => {
          const result = structuredClone(generatePaletteV2({ primary }));
          delete result.modes.light.values["primary hover"];
          return result;
        },
      }),
    /action states must be final six-digit sRGB colors/,
  );
  assert.throws(
    () =>
      buildAdversarialDiagnosticReport({
        channels: [0],
        generate: ({ primary }) => {
          const result = structuredClone(generatePaletteV2({ primary }));
          result.modes.light.adaptations.largeBrandShift = true;
          result.modes.light.adaptations.primarySourceDistance = Number.NaN;
          return result;
        },
      }),
    /best-ranked rejected Primary evidence/,
  );
  assert.throws(
    () =>
      buildAdversarialDiagnosticReport({
        channels: [0],
        generate: ({ primary }) => {
          const result = structuredClone(generatePaletteV2({ primary }));
          result.modes.light.adaptations.largeBrandShift = true;
          delete result.modes.light.decisions.primary.alternatives
            .nearestRejected.constraintResults[0].id;
          return result;
        },
      }),
    /best-ranked rejected Primary evidence/,
  );
  assert.throws(
    () =>
      buildAdversarialDiagnosticReport({
        channels: [0],
        generate: ({ primary }) => {
          const result = structuredClone(generatePaletteV2({ primary }));
          result.modes.light.adaptations.largeBrandShift = true;
          delete result.modes.light.decisions.primary.alternatives
            .nearestRejected.constraintResults[0].passed;
          return result;
        },
      }),
    /best-ranked rejected Primary evidence/,
  );

  let call = 0;
  assert.throws(
    () =>
      buildAdversarialDiagnosticReport({
        channels: [0, 255],
        generate: ({ primary }) => {
          const result = structuredClone(generatePaletteV2({ primary }));
          if (call++ > 0) result.policyVersion = "mixed-version";
          return result;
        },
      }),
    /all corpus results must share one version identity/,
  );
});

test("adversarial diagnostics reject invalid channel definitions", () => {
  assert.throws(
    () => buildAdversarialDiagnosticReport({ channels: [] }),
    /channels must contain integers/,
  );
  assert.throws(
    () => buildAdversarialDiagnosticReport({ channels: [256] }),
    /channels must contain integers/,
  );
});
