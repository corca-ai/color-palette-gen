import assert from "node:assert/strict";
import test from "node:test";

import { generatePaletteV2 } from "../v2/lib/palette.js";
import { ACTION_PRESENTATION_POLICY } from "../v2/lib/action-presentation.js";
import {
  buildRedBandPresentationComparison,
  RED_BAND_PRESENTATION_PROBE,
} from "../v2/lib/red-band-presentation.js";

test("red-band presentation keeps stable families under the adopted hierarchy", () => {
  const result = generatePaletteV2({ primary: "#FF0000" });
  const comparison = buildRedBandPresentationComparison(result);

  assert.equal(comparison.experiment, RED_BAND_PRESENTATION_PROBE);
  assert.equal(
    comparison.adoptedPresentationPolicy,
    ACTION_PRESENTATION_POLICY,
  );
  assert.equal(comparison.applicable, true);
  for (const mode of ["light", "dark"]) {
    const item = comparison.modes[mode];
    assert.notEqual(item.primaryFamily.default, item.destructiveFamily.default);
    assert.equal(
      item.coexistence.strategy,
      "primary-filled-destructive-outline",
    );
    assert.equal(item.coexistence.destructiveVariant, "outline");
    assert.equal(
      item.destructiveConfirmation.strategy,
      "destructive-filled-secondary-cancel",
    );
    assert.equal(item.destructiveConfirmation.visualSourceRole, "destructive");
    assert.equal(
      item.destructiveConfirmation.separationStatus,
      "not-applicable-ordinary-primary-absent",
    );
    assert.equal(
      item.twoFilledControl.status,
      "not-adopted-two-high-emphasis-actions",
    );
  }
});

test("non-red sources stay outside the presentation probe", () => {
  const comparison = buildRedBandPresentationComparison(
    generatePaletteV2({ primary: "#507096" }),
  );
  assert.equal(comparison.applicable, false);
  assert.equal(comparison.modes, null);
});
