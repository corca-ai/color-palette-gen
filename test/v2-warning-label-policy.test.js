import assert from "node:assert/strict";
import test from "node:test";

import { generatePaletteV2 } from "../v2/lib/palette.js";
import {
  V2_POLICY,
  warningLabelApcaDiagnosticMinimum,
} from "../v2/lib/policy.js";

function selectedConstraint(result, role, constraintId) {
  return result.modes.light.decisions[role].selected.constraintResults.find(
    ({ id }) => id === constraintId,
  );
}

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
