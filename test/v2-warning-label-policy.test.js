import assert from "node:assert/strict";
import test from "node:test";

import {
  generatePaletteV2,
  generatePaletteV2TextContrastCounterfactual,
} from "../v2/lib/palette.js";
import {
  V2_POLICY,
  warningLabelApcaDiagnosticMinimum,
} from "../v2/lib/policy.js";

function selectedConstraint(result, role, constraintId) {
  return result.modes.light.decisions[role].selected.constraintResults.find(
    ({ id }) => id === constraintId,
  );
}

function selectedConstraintForMode(result, mode, role, constraintId) {
  return result.modes[mode].decisions[role].selected.constraintResults.find(
    ({ id }) => id === constraintId,
  );
}

test("Warning locks one selected label across its complete family", () => {
  const result = generatePaletteV2({ primary: "#2468AC" });
  for (const mode of ["light", "dark"]) {
    const { decisions, values } = result.modes[mode];
    const label = selectedConstraintForMode(
      result,
      mode,
      "warning",
      "feedback.label-contrast",
    ).metrics.text;
    assert.equal(
      selectedConstraintForMode(
        result,
        mode,
        "warning hover",
        "state.shared-label",
      ).metrics.labelText,
      label,
    );
    assert.equal(
      selectedConstraintForMode(
        result,
        mode,
        "warning active",
        "state.shared-label",
      ).metrics.labelText,
      label,
    );
    assert.equal(decisions["warning text"].selected.hex, label);
    assert.equal(values["warning text"], label);
    assert.equal(decisions["warning text"].candidateCount, 1);
    assert.equal(
      decisions["warning text"].strategy,
      "fixed foreground validation",
    );
    assert.match(decisions["warning text"].intent, /Validate and reuse/u);
    assert.equal(decisions["warning text"].alternatives.nearestRejected, null);
    assert.equal(decisions["warning text"].alternatives.nextPassing, null);
    assert.deepEqual(decisions["warning text"].policy.objectives, []);
    assert.deepEqual(decisions["warning text"].policy.tieBreakers, []);
  }
});

test("successful diagnostic strategies keep the same Warning label identity", () => {
  for (const strategy of ["apca-only", "wcag-only"]) {
    const result = generatePaletteV2TextContrastCounterfactual({
      primary: "#2468AC",
      strategy,
    });
    for (const mode of ["light", "dark"]) {
      const label = selectedConstraintForMode(
        result,
        mode,
        "warning",
        "feedback.label-contrast",
      ).metrics.text;
      assert.equal(
        selectedConstraintForMode(
          result,
          mode,
          "warning hover",
          "state.shared-label",
        ).metrics.labelText,
        label,
        `${strategy}/${mode}/hover`,
      );
      assert.equal(
        selectedConstraintForMode(
          result,
          mode,
          "warning active",
          "state.shared-label",
        ).metrics.labelText,
        label,
        `${strategy}/${mode}/active`,
      );
      assert.equal(result.modes[mode].values["warning text"], label);
      assert.equal(
        result.modes[mode].decisions["warning text"].strategy,
        "fixed foreground validation",
      );
    }
  }
});

test("Warning generation uses the Warning-owned APCA diagnostic minimum", () => {
  const originalPrimaryMinimum = V2_POLICY.primary.apcaDiagnosticLc;
  const originalWarningMinimum =
    V2_POLICY.text.typographyContexts.warningLabel.apcaDiagnosticMinimum;

  try {
    V2_POLICY.primary.apcaDiagnosticLc = 91;
    V2_POLICY.text.typographyContexts.warningLabel.apcaDiagnosticMinimum = 41;

    assert.equal(warningLabelApcaDiagnosticMinimum(), 41);
    const result = generatePaletteV2({ primary: "#123457" });
    for (const [role, constraintId] of [
      ["warning", "feedback.label-contrast"],
      ["warning hover", "state.shared-label"],
      ["warning active", "state.shared-label"],
      ["warning text", "text.required-contrast"],
    ]) {
      assert.equal(
        selectedConstraint(result, role, constraintId).metrics.apca.required,
        41,
        role,
      );
    }
  } finally {
    V2_POLICY.primary.apcaDiagnosticLc = originalPrimaryMinimum;
    V2_POLICY.text.typographyContexts.warningLabel.apcaDiagnosticMinimum =
      originalWarningMinimum;
  }
});

test("Warning APCA owner fails closed when its context is absent", () => {
  assert.throws(
    () => warningLabelApcaDiagnosticMinimum({ text: {} }),
    /Warning label typography context must declare/,
  );
});
