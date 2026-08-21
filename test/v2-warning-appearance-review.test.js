import assert from "node:assert/strict";
import test from "node:test";

import {
  generatePaletteV2,
  inspectLightWarningAppearance,
} from "../v2/lib/palette.js";
import {
  buildWarningAppearanceReviewCase,
  buildWarningAppearanceReviewReport,
} from "../v2/lib/warning-appearance-review.js";
import { WARNING_APPEARANCE_INPUTS } from "../v2/lib/warning-appearance-experiment.js";

test("Warning appearance review reproduces production and isolates lightness and hue", () => {
  const review = buildWarningAppearanceReviewCase("#507096");
  assert.equal(review.schema, "light-warning-appearance-review-case.v3");
  assert.equal(review.authority, "accepted-decision-record");
  assert.equal(review.arms.length, 5);

  const byId = Object.fromEntries(review.arms.map((arm) => [arm.id, arm]));
  assert.deepEqual(byId.current.inspection.family, {
    default: "#E6AD00",
    hover: "#F3B924",
    active: "#FFC640",
    text: "#000000",
  });
  assert.equal(byId.current.matchesCurrentRenderedFamily, false);
  assert.equal(byId["old-production"].inspection.family.default, "#B48700");
  assert.equal(byId["prior-best"].inspection.family.default, "#C79600");
  assert.equal(byId.orangeward.inspection.family.default, "#FBA100");
  assert.equal(byId.yellowward.inspection.family.default, "#D0B800");
  for (const arm of review.arms) {
    assert.ok(arm.inspection.candidates.passing > 0);
    assert.ok(arm.inspection.rendered.minimumTextContrast >= 4.5);
    assert.ok(arm.inspection.rendered.primaryDistance >= 0.08);
    assert.ok(arm.inspection.rendered.destructiveDistance >= 0.08);
    assert.ok(arm.inspection.rendered.hoverDeltaE >= 0.035);
    assert.ok(arm.inspection.rendered.activeDeltaE >= 0.075);
  }
});

test("Warning appearance report keeps six inputs and production immutable", () => {
  const before = generatePaletteV2({ primary: "#507096" });
  const beforeSnapshot = structuredClone(before);
  const report = buildWarningAppearanceReviewReport();
  const after = generatePaletteV2({ primary: "#507096" });

  assert.equal(report.inputCount, WARNING_APPEARANCE_INPUTS.length);
  assert.equal(report.cases.length, 6);
  assert.equal(report.summary.current.uniqueDefaultCount, 1);
  assert.equal(report.summary.current.minimumPassingCandidates, 183);
  assert.equal(report.summary["old-production"].uniqueDefaultCount, 1);
  assert.deepEqual(before, beforeSnapshot);
  assert.strictEqual(after, before);
  assert.equal(before.diagnosticOverride, undefined);
  assert.deepEqual(
    {
      default: before.modes.dark.values.warning,
      hover: before.modes.dark.values["warning hover"],
      active: before.modes.dark.values["warning active"],
      text: before.modes.dark.values["warning text"],
    },
    {
      default: "#CD9C1F",
      hover: "#D9A831",
      active: "#E6B441",
      text: "#000000",
    },
  );
});

test("Warning appearance inspection fails closed outside its bounded recipe", () => {
  const result = generatePaletteV2({ primary: "#507096" });
  assert.throws(
    () => inspectLightWarningAppearance({ result, recipe: { chroma: 0.5 } }),
    /outside its bounded diagnostic envelope/,
  );
  assert.throws(
    () => inspectLightWarningAppearance({ result: null }),
    /requires a current generated v2 result/,
  );
  assert.throws(
    () => buildWarningAppearanceReviewCase("#123456"),
    /Unsupported Warning appearance review input/,
  );
});
