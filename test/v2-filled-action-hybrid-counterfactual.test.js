import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFilledActionHybridCounterfactualReport,
  FILLED_ACTION_HYBRID_PROPOSAL,
} from "../v2/lib/filled-action-hybrid-counterfactual.js";

test("hybrid proposal selects a grammar before generation and conserves support", () => {
  const report = buildFilledActionHybridCounterfactualReport({
    channels: [0, 255],
  });

  assert.equal(report.authority, "diagnostic");
  assert.equal(report.proposal.status, "proposed");
  assert.equal(report.proposal.noFallback, true);
  assert.equal(report.scope.inputCount, 8);
  assert.equal(report.scope.generatedInputCount, 8);
  assert.equal(
    report.scope.sourceRedCollisionInputCount +
      report.scope.modeRelativeInputCount,
    report.scope.inputCount,
  );
  assert.equal(report.directionCounts.lightDarker, 8);
  assert.equal(
    report.directionCounts.darkDarker + report.directionCounts.darkLighter,
    8,
  );
  assert.deepEqual(report.unexpectedRegressionCases, []);
  assert.equal(report.currentContractDifferenceCases.length, 7);
  for (const item of report.cases) {
    const expectedDark =
      FILLED_ACTION_HYBRID_PROPOSAL.darkDirectionByBranch[item.branch];
    assert.deepEqual(item.direction.light, {
      primary: FILLED_ACTION_HYBRID_PROPOSAL.lightDirection,
      destructive: FILLED_ACTION_HYBRID_PROPOSAL.lightDirection,
    });
    assert.deepEqual(item.direction.dark, {
      primary: expectedDark,
      destructive: expectedDark,
    });
    assert.deepEqual(item.foregroundMismatchModes, []);
  }
});
