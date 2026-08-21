import assert from "node:assert/strict";
import test from "node:test";

import { CONTEXTUAL_DESTRUCTIVE_SEPARATION_EXPERIMENT } from "../v2/lib/contextual-destructive-separation.js";
import { buildContextualDestructiveSeparationCounterfactualReport } from "../v2/lib/contextual-destructive-separation-counterfactual.js";
import {
  generatePaletteV2,
  generatePaletteV2ContextualDestructiveSeparationCounterfactual,
} from "../v2/lib/palette.js";

test("contextual separation is diagnostic-only and retains failed distance evidence", () => {
  const before = generatePaletteV2({ primary: "#FF0000" });
  const candidate =
    generatePaletteV2ContextualDestructiveSeparationCounterfactual({
      primary: "#FF0000",
    });

  assert.equal(candidate.contractsPassed, false);
  assert.deepEqual(
    candidate.diagnosticOverride.experimentDefinition,
    CONTEXTUAL_DESTRUCTIVE_SEPARATION_EXPERIMENT,
  );
  for (const mode of ["light", "dark"]) {
    assert.equal(candidate.modes[mode].reviewOnlyChecks.length, 1);
    assert.equal(
      candidate.modes[mode].reviewOnlyChecks[0].role,
      "Brand → destructive",
    );
    assert.equal(
      candidate.modes[mode].reviewOnlyChecks[0].pass,
      mode === "light",
    );
    assert.equal(
      candidate.modes[mode].checks.some(
        ({ role }) => role === "Brand → destructive",
      ),
      false,
    );
    assert.equal(
      candidate.modes[mode].nonTextChecks.some(
        ({ role }) => role === "Brand → destructive",
      ),
      false,
    );
  }
  assert.equal(
    candidate.semanticEvaluation.evaluations.find(
      ({ id }) => id === "feedback-oklab-separation-passes",
    ).status,
    "unsatisfied",
  );
  assert.deepEqual(generatePaletteV2({ primary: "#FF0000" }), before);
});

test("contextual separation experiment identity fails closed", () => {
  assert.throws(
    () =>
      generatePaletteV2ContextualDestructiveSeparationCounterfactual({
        primary: "#FF0000",
        experiment: {
          ...CONTEXTUAL_DESTRUCTIVE_SEPARATION_EXPERIMENT,
          separationThreshold: 0.07,
        },
      }),
    /experiment identity drifted/u,
  );
});

test("contextual separation report conserves a bounded corpus without fallback", () => {
  const report = buildContextualDestructiveSeparationCounterfactualReport({
    channels: [0, 255],
  });
  assert.deepEqual(report.support, {
    inputCount: 8,
    generatedInputCount: 8,
    generationInfeasibleInputCount: 0,
    comparableInputCount: 8,
  });
  assert.equal(report.infeasible.length, 0);
  assert.equal(report.outcomes.current.contractPassingInputCount, 0);
  assert.equal(report.outcomes.candidate.contractPassingInputCount, 0);
  assert.equal(report.outcomes.candidate.pairEligibilityMissInputCount, 0);
  assert.equal(report.changedInputs.length, 8);
  assert.equal(
    buildContextualDestructiveSeparationCounterfactualReport({
      channels: [0, 255],
    }).caseDigest,
    report.caseDigest,
  );
});
