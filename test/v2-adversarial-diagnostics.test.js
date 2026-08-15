import assert from "node:assert/strict";
import test from "node:test";

import { buildAdversarialDiagnosticReport } from "../v2/lib/adversarial-diagnostics.js";
import { generatePaletteV2 } from "../v2/lib/palette.js";

test("adversarial diagnostics are deterministic and keep claims bounded", () => {
  const first = buildAdversarialDiagnosticReport({ channels: [0, 255] });
  const second = buildAdversarialDiagnosticReport({ channels: [255, 0] });

  assert.deepEqual(first, second);
  assert.equal(first.schema, "color-palette-adversarial-diagnostics.v3");
  assert.equal(first.authority, "diagnostic");
  assert.match(first.interpretation, /does not score palette quality/);
  assert.equal(first.summary.inputCount, 8);
  assert.equal(
    first.summary.generatedContractFailureCount,
    0,
    "the current engine contracts hold for the small adversarial cube",
  );
  assert.ok(
    first.cases.every(
      (item) =>
        item.semanticHueReviewChecks === undefined &&
        item.pairEligibilityMisses === undefined,
    ),
  );
});

test("semantic-hue review keeps input, mode, and check units distinct", () => {
  const report = buildAdversarialDiagnosticReport({
    channels: [0],
    generate: ({ primary }) => {
      const result = structuredClone(generatePaletteV2({ primary }));
      const failedIds = new Set([
        "review.light.primary-destructive-hue",
        "review.light.primary-warning-hue",
        "review.dark.primary-warning-hue",
      ]);
      for (const check of result.quality.semanticChecks) {
        check.pass = !failedIds.has(check.id);
        result.quality.checks.find(({ id }) => id === check.id).pass =
          check.pass;
      }
      return result;
    },
  });
  const review = report.semanticHueReview;

  assert.equal(review.flaggedInputCount, 1);
  assert.equal(review.flaggedModeCaseCount, 2);
  assert.equal(review.failedCheckOccurrenceCount, 3);
  assert.equal(
    Object.values(review.exactPatternInputCounts).reduce(
      (total, count) => total + count,
      0,
    ),
    review.flaggedInputCount,
  );
  assert.equal(
    Object.values(review.failedCheckOccurrenceCountsByMode).reduce(
      (total, count) => total + count,
      0,
    ),
    review.failedCheckOccurrenceCount,
  );
  assert.equal(
    Object.values(review.failedCheckOccurrenceCountsByRelationship).reduce(
      (total, count) => total + count,
      0,
    ),
    review.failedCheckOccurrenceCount,
  );
});

test("adversarial overlaps reconcile contract and eligibility producer evidence", () => {
  const mutations = [
    (result) => {
      result.pairDecision.selected.eligibilityMisses = -1;
    },
    (result) => {
      result.pairDecision.eligibility.checkIds.pop();
    },
    (result) => {
      result.pairDecision.eligibility.checkIds[1] =
        result.pairDecision.eligibility.checkIds[0];
    },
    (result) => {
      result.pairDecision.selected.eligibilityMisses += 1;
    },
    (result) => {
      const id = result.pairDecision.eligibility.checkIds[0];
      result.quality.checks = result.quality.checks.filter(
        (check) => check.id !== id,
      );
    },
    (result) => {
      const id = result.pairDecision.eligibility.checkIds[0];
      result.quality.checks.push(
        result.quality.checks.find((check) => check.id === id),
      );
    },
    (result) => {
      result.passed = !result.passed;
    },
    (result) => {
      result.modes.light.passed = !result.modes.light.passed;
    },
  ];

  for (const mutate of mutations) {
    assert.throws(
      () =>
        buildAdversarialDiagnosticReport({
          channels: [0],
          generate: ({ primary }) => {
            const result = structuredClone(generatePaletteV2({ primary }));
            mutate(result);
            return result;
          },
        }),
      /eligibility|passed must reconcile/,
    );
  }
});

test("semantic-hue review fails closed on malformed or divergent producer evidence", () => {
  const invalid = [
    (result) => result.quality.semanticChecks.pop(),
    (result) =>
      result.quality.semanticChecks.push(result.quality.semanticChecks[0]),
    (result) => {
      result.quality.semanticChecks[0].id = "review.light.unknown-hue";
    },
    (result) => {
      delete result.quality.semanticChecks[0].pass;
    },
    (result) => {
      result.quality.semanticChecks[0].authority = "empirical";
    },
    (result) => {
      const semantic = result.quality.semanticChecks[0];
      const index = result.quality.checks.findIndex(
        ({ id }) => id === semantic.id,
      );
      result.quality.checks[index] = { ...result.quality.checks[index] };
      result.quality.semanticChecks[0].pass =
        !result.quality.semanticChecks[0].pass;
    },
  ];

  for (const mutate of invalid) {
    assert.throws(
      () =>
        buildAdversarialDiagnosticReport({
          channels: [0],
          generate: ({ primary }) => {
            const result = structuredClone(generatePaletteV2({ primary }));
            mutate(result);
            return result;
          },
        }),
      /semantic-hue review|semanticChecks|quality\.checks/,
    );
  }
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
    assert.equal(
      Object.values(mode.sourceLightnessRoleRangePositionCounts).reduce(
        (total, count) => total + count,
        0,
      ),
      mode.shiftedModeCount,
    );
    assert.equal(
      Object.values(mode.bestRankedRejectedConstraintCombinationCounts).reduce(
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
    yellow.sourceShiftByMode.light.bestRankedRejectedConstraintIds,
    ["primary.calm-chroma", "primary.mode-range"],
  );
  assert.equal(yellow.sourceShiftByMode.light.lightnessDirection, "decrease");
  assert.equal(
    yellow.sourceShiftByMode.light.sourceLightnessRoleRange.position,
    "above",
  );
  assert.deepEqual(
    {
      minimum: yellow.sourceShiftByMode.light.sourceLightnessRoleRange.minimum,
      maximum: yellow.sourceShiftByMode.light.sourceLightnessRoleRange.maximum,
    },
    { minimum: 0.46, maximum: 0.54 },
  );
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

test("source range evidence preserves inclusive producer-recorded bounds", () => {
  const report = buildAdversarialDiagnosticReport({
    channels: [0],
    generate: ({ primary }) => {
      const result = structuredClone(generatePaletteV2({ primary }));
      result.modes.light.adaptations.largeBrandShift = true;
      const modeRange =
        result.modes.light.decisions.primary.alternatives.nearestRejected.constraintResults.find(
          ({ id }) => id === "primary.mode-range",
        );
      result.source.oklch.l = modeRange.metrics.minimum;
      return result;
    },
  });
  const range =
    report.cases[0].sourceShiftByMode.light.sourceLightnessRoleRange;

  assert.equal(range.position, "inside");
  assert.equal(range.sourceLightness, range.minimum);
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
  assert.throws(
    () =>
      buildAdversarialDiagnosticReport({
        channels: [0],
        generate: ({ primary }) => {
          const result = structuredClone(generatePaletteV2({ primary }));
          result.modes.light.adaptations.largeBrandShift = true;
          const constraints =
            result.modes.light.decisions.primary.alternatives.nearestRejected
              .constraintResults;
          constraints.push(structuredClone(constraints[0]));
          return result;
        },
      }),
    /unique constraints, one ordered mode range, and a failed verdict/,
  );
  assert.throws(
    () =>
      buildAdversarialDiagnosticReport({
        channels: [0],
        generate: ({ primary }) => {
          const result = structuredClone(generatePaletteV2({ primary }));
          result.modes.light.adaptations.largeBrandShift = true;
          const constraints =
            result.modes.light.decisions.primary.alternatives.nearestRejected
              .constraintResults;
          result.modes.light.decisions.primary.alternatives.nearestRejected.constraintResults =
            constraints.filter(({ id }) => id !== "primary.mode-range");
          return result;
        },
      }),
    /unique constraints, one ordered mode range, and a failed verdict/,
  );
  assert.throws(
    () =>
      buildAdversarialDiagnosticReport({
        channels: [0],
        generate: ({ primary }) => {
          const result = structuredClone(generatePaletteV2({ primary }));
          result.modes.light.adaptations.largeBrandShift = true;
          const modeRange =
            result.modes.light.decisions.primary.alternatives.nearestRejected.constraintResults.find(
              ({ id }) => id === "primary.mode-range",
            );
          [modeRange.metrics.minimum, modeRange.metrics.maximum] = [
            modeRange.metrics.maximum,
            modeRange.metrics.minimum,
          ];
          return result;
        },
      }),
    /unique constraints, one ordered mode range, and a failed verdict/,
  );
  assert.throws(
    () =>
      buildAdversarialDiagnosticReport({
        channels: [0],
        generate: ({ primary }) => {
          const result = structuredClone(generatePaletteV2({ primary }));
          result.modes.light.adaptations.largeBrandShift = true;
          for (const constraint of result.modes.light.decisions.primary
            .alternatives.nearestRejected.constraintResults) {
            constraint.passed = true;
          }
          return result;
        },
      }),
    /unique constraints, one ordered mode range, and a failed verdict/,
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
