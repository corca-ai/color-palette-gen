import assert from "node:assert/strict";
import test from "node:test";

import { buildModeRangeCounterfactualReport } from "../v2/lib/mode-range-counterfactual.js";
import {
  generatePaletteV2,
  generatePaletteV2Counterfactual,
} from "../v2/lib/palette.js";
import { V2_POLICY } from "../v2/lib/policy.js";
import { paletteCache } from "../v2/lib/runtime.js";

function withoutDiagnosticMetadata(result) {
  const normalized = structuredClone(result);
  delete normalized.diagnosticOverride;
  for (const mode of ["light", "dark"]) {
    delete normalized.modes[mode].adaptations
      .diagnosticInfeasiblePrimaryStateCandidateCount;
  }
  return normalized;
}

test("the current range override preserves production results", () => {
  for (const primary of ["#000000", "#507096", "#FFFF00", "#FFFFFF"]) {
    const production = generatePaletteV2({ primary });
    const counterfactual = generatePaletteV2Counterfactual({
      primary,
      primaryLightnessRanges: V2_POLICY.primary.lightnessRange,
    });

    assert.deepEqual(withoutDiagnosticMetadata(counterfactual), production);
    assert.deepEqual(counterfactual.diagnosticOverride.primaryLightnessRanges, {
      light: [0.46, 0.54],
      dark: [0.58, 0.62],
    });
    assert.equal(counterfactual.diagnosticOverride.authority, "diagnostic");
    assert.equal(production.diagnosticOverride, undefined);
  }
});

test("counterfactual generation bypasses the production palette cache", () => {
  const production = generatePaletteV2({ primary: "#336699" });
  const size = paletteCache.size;

  generatePaletteV2Counterfactual({
    primary: "#336699",
    primaryLightnessRanges: V2_POLICY.primary.lightnessRange,
  });

  assert.equal(paletteCache.size, size);
  assert.equal(generatePaletteV2({ primary: "#336699" }), production);
});

test("mode-range counterfactuals expose gains and losses without a verdict", () => {
  const first = buildModeRangeCounterfactualReport({ channels: [0] });
  const second = buildModeRangeCounterfactualReport({ channels: [0] });

  assert.deepEqual(first, second);
  assert.equal(first.authority, "diagnostic");
  assert.match(first.interpretation, /do not identify an optimal range/);
  assert.deepEqual(first.experiments.widened.ranges, {
    light: [0.42, 0.58],
    dark: [0.54, 0.66],
  });
  assert.deepEqual(first.experiments["gap-preserving-outward"].ranges, {
    light: [0.42, 0.54],
    dark: [0.58, 0.66],
  });
  assert.equal(first.summaries.current.inputCount, 1);
  assert.equal(first.resultVersion, 3);
  assert.equal(first.semanticModel.id, "v2-declarative-design");
  assert.deepEqual(
    first.comparisonsToCurrent["source-inclusive"].excludedBaselineInputs,
    ["#000000"],
  );
  assert.equal(first.summaries["source-inclusive"].inputCount, 0);
  assert.deepEqual(
    first.comparisonsToCurrent["source-inclusive"]
      .contractFailureIntroducedInputs,
    [],
  );
  for (const [id, comparison] of Object.entries(first.comparisonsToCurrent)) {
    const candidate = first.summaries[id];
    const current = first.summaries.current;
    if (comparison.excludedBaselineInputs.length > 0) continue;
    assert.equal(
      candidate.largeSourceShiftInputCount - current.largeSourceShiftInputCount,
      comparison.sourceShiftIntroducedInputs.length -
        comparison.sourceShiftResolvedInputs.length,
    );
    for (const [field, introducedField, resolvedField] of [
      [
        "contractFailureInputCount",
        "contractFailureIntroducedInputs",
        "contractFailureResolvedInputs",
      ],
      [
        "qualityFindingInputCount",
        "qualityFindingIntroducedInputs",
        "qualityFindingResolvedInputs",
      ],
      [
        "semanticFindingInputCount",
        "semanticFindingIntroducedInputs",
        "semanticFindingResolvedInputs",
      ],
      [
        "pairQualityMissInputCount",
        "pairQualityMissIntroducedInputs",
        "pairQualityMissResolvedInputs",
      ],
    ]) {
      assert.equal(
        candidate[field] - current[field],
        comparison[introducedField].length - comparison[resolvedField].length,
      );
    }
  }
});

test("counterfactual generation rejects invalid ranges", () => {
  assert.throws(
    () =>
      generatePaletteV2Counterfactual({
        primary: "#507096",
        primaryLightnessRanges: { light: [0.6, 0.4], dark: [0.5, 0.7] },
      }),
    /ordered light and dark ranges within 0–1/,
  );
});
