import assert from "node:assert/strict";
import test from "node:test";

import { buildFilledActionDirectionCounterfactualReport } from "../../v2/lib/filled-action-direction-counterfactual.js";

test("reviewed mode-relative filled-action census remains exact", () => {
  const report = buildFilledActionDirectionCounterfactualReport();
  assert.deepEqual(report.scope, {
    inputCount: 216,
    generatedInputCount: 201,
    generationInfeasibleInputCount: 15,
    changedDefaultInputCount: 201,
  });
  assert.deepEqual(report.failureCountsByDecision, {
    "dark.destructive": 15,
  });
  assert.equal(
    report.caseDigest,
    "557760634d28a36c18816f8b56485b7c74bb8dfaada670d6dbe5fd6da9704e42",
  );
  assert.deepEqual(
    report.infeasibleInputs.map(({ input }) => input),
    [
      "#660000",
      "#990000",
      "#990033",
      "#993300",
      "#993333",
      "#CC0000",
      "#CC0033",
      "#CC3300",
      "#CC3333",
      "#FF0000",
      "#FF0033",
      "#FF3300",
      "#FF3333",
      "#FF6633",
      "#FF6666",
    ],
  );
  assert.equal(
    report.commonSupportDefaultMetrics.current.destructive.meanLightness,
    0.6410073402832164,
  );
  assert.equal(
    report.commonSupportDefaultMetrics.candidate.destructive.meanLightness,
    0.6183086507218877,
  );
});
