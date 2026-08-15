import assert from "node:assert/strict";
import test from "node:test";

import { buildModeRangeCounterfactualReport } from "../../v2/lib/mode-range-counterfactual.js";

test("reviewed mode-range counterfactual counts remain reproducible", () => {
  const report = buildModeRangeCounterfactualReport();

  assert.equal(report.schema, "color-palette-mode-range-counterfactual.v2");
  assert.equal(report.policyVersion, "v2-policy-model-12");
  assert.equal(report.resultVersion, 2);
  assert.deepEqual(report.semanticModel, {
    id: "v2-declarative-design",
    version: 3,
    components: [
      { id: "primary-action-state-family", version: 1 },
      { id: "foundation-focus-family", version: 1 },
      { id: "feedback-family", version: 1 },
      { id: "selection-family", version: 1 },
    ],
  });

  assert.deepEqual(
    Object.fromEntries(
      Object.entries(report.summaries).map(([id, summary]) => [
        id,
        {
          inputs: summary.inputCount,
          contractFailures: summary.contractFailureInputCount,
          shiftedInputs: summary.largeSourceShiftInputCount,
          shiftedModes: summary.largeSourceShiftModeCount,
          pairMisses: summary.pairQualityMissInputCount,
        },
      ]),
    ),
    {
      current: {
        inputs: 216,
        contractFailures: 0,
        shiftedInputs: 115,
        shiftedModes: 186,
        pairMisses: 0,
      },
      widened: {
        inputs: 216,
        contractFailures: 0,
        shiftedInputs: 116,
        shiftedModes: 186,
        pairMisses: 15,
      },
      "gap-preserving-outward": {
        inputs: 216,
        contractFailures: 0,
        shiftedInputs: 115,
        shiftedModes: 183,
        pairMisses: 1,
      },
      "source-inclusive": {
        inputs: 216,
        contractFailures: 1,
        shiftedInputs: 49,
        shiftedModes: 77,
        pairMisses: 35,
      },
    },
  );
  assert.ok(
    Math.abs(report.summaries.current.meanModeSourceDistance - 0.1804201) <
      0.0000001,
  );
  const outward = report.comparisonsToCurrent["gap-preserving-outward"];
  assert.deepEqual(outward.sourceShiftResolvedInputs, []);
  assert.deepEqual(outward.sourceShiftIntroducedInputs, []);
  assert.equal(
    report.summaries.current.signalCounts["quality:pair.primary-lightness-gap"],
    undefined,
  );
  assert.equal(
    report.summaries["gap-preserving-outward"].signalCounts[
      "quality:pair.primary-lightness-gap"
    ],
    1,
  );
  assert.equal(
    outward.namedSignalCountDelta["quality:pair.primary-lightness-gap"],
    1,
  );
  assert.ok(
    Math.abs(report.summaries.widened.meanModeSourceDistance - 0.1844459) <
      0.0000001,
  );
  assert.ok(
    Math.abs(
      report.summaries["gap-preserving-outward"].meanModeSourceDistance -
        0.1796149,
    ) < 0.0000001,
  );
  assert.ok(
    Math.abs(
      report.summaries["source-inclusive"].meanModeSourceDistance - 0.1190562,
    ) < 0.0000001,
  );
});
