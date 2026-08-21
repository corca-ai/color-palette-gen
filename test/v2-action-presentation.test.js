import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTION_PRESENTATION_POLICY,
  SECONDARY_ACTION_STATE_POLICY,
  actionPresentationForResult,
  secondaryActionPresentationForMode,
} from "../v2/lib/action-presentation.js";
import { hexToRgb, rgbToOklch } from "../lib/color-math.js";
import { generatePaletteV2 } from "../v2/lib/palette.js";

test("destructive confirmation keeps the dedicated Destructive family filled", () => {
  const red = generatePaletteV2({ primary: "#FF0000" });
  const nonRed = generatePaletteV2({ primary: "#507096" });

  for (const presentation of [
    actionPresentationForResult(red, { ordinaryPrimaryPresent: false }),
    actionPresentationForResult(nonRed, { ordinaryPrimaryPresent: false }),
  ]) {
    assert.equal(presentation.policy, ACTION_PRESENTATION_POLICY);
    assert.equal(presentation.strategy, "destructive-filled-secondary-cancel");
    assert.equal(presentation.highestEmphasisRole, "destructive");
    assert.equal(presentation.primaryVariant, "absent");
    assert.equal(presentation.destructiveVariant, "filled");
    assert.equal(presentation.visualSourceRole, "destructive");
    assert.equal(
      presentation.separationStatus,
      "not-applicable-ordinary-primary-absent",
    );
  }
  assert.equal(
    actionPresentationForResult(red, { ordinaryPrimaryPresent: false })
      .redBandDiagnosticApplies,
    true,
  );
  assert.equal(
    actionPresentationForResult(nonRed, { ordinaryPrimaryPresent: false })
      .redBandDiagnosticApplies,
    false,
  );
});

test("coexisting Primary and Destructive actions use one filled action regardless of hue", () => {
  for (const primary of ["#FF0000", "#507096"]) {
    const presentation = actionPresentationForResult(
      generatePaletteV2({ primary }),
      { ordinaryPrimaryPresent: true },
    );
    assert.equal(presentation.strategy, "primary-filled-destructive-outline");
    assert.equal(presentation.highestEmphasisRole, "primary");
    assert.equal(presentation.primaryVariant, "filled");
    assert.equal(presentation.destructiveVariant, "outline");
    assert.equal(presentation.visualSourceRole, "destructive");
    assert.equal(presentation.separationStatus, "evaluated-by-current-policy");
  }
});

test("presentation context is required explicitly", () => {
  const result = generatePaletteV2({ primary: "#FF0000" });
  assert.throws(
    () => actionPresentationForResult(result, {}),
    /ordinaryPrimaryPresent must be a boolean/,
  );
});

test("confirmation Secondary states follow the filled-action mode direction with readable text", () => {
  for (const primary of ["#FF0000", "#507096", "#000000", "#FFFFFF"]) {
    const result = generatePaletteV2({ primary });
    for (const mode of ["light", "dark"]) {
      const presentation = secondaryActionPresentationForMode(
        result.modes[mode],
      );
      const { values, checks, decisions } = presentation;
      const lightness = [values.default, values.hover, values.active].map(
        (hex) => rgbToOklch(hexToRgb(hex)).l,
      );
      const direction = SECONDARY_ACTION_STATE_POLICY.directionByMode[mode];

      assert.equal(presentation.policy, SECONDARY_ACTION_STATE_POLICY);
      assert.equal(values.default, result.modes[mode].values["muted surface"]);
      assert.equal(values.text, result.modes[mode].values.foreground);
      assert.equal(direction * (lightness[1] - lightness[0]) > 0, true);
      assert.equal(direction * (lightness[2] - lightness[1]) > 0, true);
      assert.equal(
        Math.min(
          checks.defaultTextContrast,
          checks.hoverTextContrast,
          checks.activeTextContrast,
        ) >= checks.minimumTextContrast,
        true,
      );
      assert.equal(
        decisions.hover.selected.difference.deltaE >=
          SECONDARY_ACTION_STATE_POLICY.minimumDeltaE.hover,
        true,
      );
      assert.equal(
        decisions.active.selected.difference.deltaE >=
          SECONDARY_ACTION_STATE_POLICY.minimumDeltaE.active,
        true,
      );
    }
  }
});

test("confirmation Secondary states fail closed without their presentation context", () => {
  assert.throws(
    () =>
      secondaryActionPresentationForMode({
        mode: "light",
        values: { foreground: "#000000" },
      }),
    /Secondary action requires muted surface/,
  );
});
