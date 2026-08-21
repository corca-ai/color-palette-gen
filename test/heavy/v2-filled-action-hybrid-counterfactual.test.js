import assert from "node:assert/strict";
import test from "node:test";

import { buildFilledActionHybridCounterfactualReport } from "../../v2/lib/filled-action-hybrid-counterfactual.js";

const SOURCE_FIDELITY_WARNINGS = [
  "#00CCFF",
  "#33CCCC",
  "#33CCFF",
  "#66CC99",
  "#66CCCC",
  "#99CC00",
  "#99CC33",
  "#99CC66",
  "#99CC99",
];

test("fixed 216 grid pins the proposed hybrid policy evidence", () => {
  const report = buildFilledActionHybridCounterfactualReport();

  assert.deepEqual(report.scope, {
    inputCount: 216,
    generatedInputCount: 216,
    sourceRedCollisionInputCount: 41,
    modeRelativeInputCount: 175,
  });
  assert.deepEqual(report.directionCounts, {
    lightDarker: 216,
    darkLighter: 175,
    darkDarker: 41,
  });
  assert.deepEqual(
    report.qualityWarningIntroductions.map(({ input }) => input),
    SOURCE_FIDELITY_WARNINGS,
  );
  assert.ok(
    report.qualityWarningIntroductions.every(
      ({ introducedQualityIds }) =>
        JSON.stringify(introducedQualityIds) ===
        JSON.stringify(["review.dark.source-fidelity"]),
    ),
  );
  assert.deepEqual(report.unexpectedRegressionCases, []);
  assert.equal(
    report.caseDigest,
    "2d79a5a73c24bbe1074a6e2959a2b4ff9e5c91ec4171a9888cc480e422b90eb7",
  );
  assert.equal(
    report.selectedOutputDigest,
    "9f5e98fff6e7354485d7c20e0dd16d21ea6e7ea6cfe109f22e0c48bf1e99512a",
  );
});
