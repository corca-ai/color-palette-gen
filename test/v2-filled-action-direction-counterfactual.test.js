import assert from "node:assert/strict";
import test from "node:test";

import { NoCandidateError } from "../v2/lib/decision.js";
import { buildFilledActionDirectionCounterfactualReport } from "../v2/lib/filled-action-direction-counterfactual.js";
import {
  generatePaletteV2,
  generatePaletteV2FilledActionDirectionCounterfactual,
} from "../v2/lib/palette.js";

test("mode-relative generator is diagnostic-only and validates its fixed arm", () => {
  const before = generatePaletteV2({ primary: "#663300" });
  assert.throws(
    () =>
      generatePaletteV2FilledActionDirectionCounterfactual({
        primary: "#663300",
        directions: { light: -1, dark: -1 },
      }),
    /Light -1 and Dark \+1/,
  );
  try {
    const diagnostic = generatePaletteV2FilledActionDirectionCounterfactual({
      primary: "#663300",
    });
    assert.equal(diagnostic.diagnosticOverride.authority, "diagnostic");
  } catch (error) {
    assert.ok(error instanceof NoCandidateError);
  }
  assert.deepEqual(generatePaletteV2({ primary: "#663300" }), before);
});

test("direction report accounts for every input without fallback", () => {
  const report = buildFilledActionDirectionCounterfactualReport({
    channels: [0, 255],
  });
  assert.equal(report.scope.inputCount, 8);
  assert.equal(
    report.scope.generatedInputCount +
      report.scope.generationInfeasibleInputCount,
    8,
  );
  assert.equal(report.cases.length, 8);
  assert.equal(
    buildFilledActionDirectionCounterfactualReport({ channels: [0, 255] })
      .caseDigest,
    report.caseDigest,
  );
  for (const item of report.cases) {
    if (item.status === "generation-infeasible") {
      assert.equal(item.failure.code, "NO_CANDIDATE");
      assert.equal(item.failure.stage, "candidate-selection");
    } else {
      assert.deepEqual(item.changedDefaultModes.sort(), ["dark"]);
    }
  }
});
