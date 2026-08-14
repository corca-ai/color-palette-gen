import assert from "node:assert/strict";
import test from "node:test";

import { diagnosePrimaryHover } from "../v2/lib/hover-diagnostics.js";
import { generatePaletteV2 } from "../v2/lib/palette.js";

test("hover diagnostics report independent post-export signals", () => {
  const result = generatePaletteV2({ primary: "#507096" });
  const diagnostics = result.hoverDiagnostics;
  assert.equal(diagnostics.authority, "diagnostic");
  assert.equal(diagnostics.reviewPriority, "unclassified");
  assert.deepEqual(diagnostics.structuralFlags, []);
  for (const mode of ["light", "dark"]) {
    assert.equal(diagnostics.modes[mode].distinctExportedColors, true);
    for (const pairName of ["defaultToHover", "hoverToActive"]) {
      const pair = diagnostics.modes[mode].pairs[pairName];
      assert.ok(pair.oklabDeltaE > 0);
      assert.ok(pair.ciede2000 > 0);
      for (const context of ["surface", "background"]) {
        const signal = pair.contexts[context];
        assert.equal(signal.contrast.length, 2);
        assert.ok(Number.isFinite(signal.change));
      }
    }
  }
  assert.equal(result.semanticEvaluation.satisfied, true);
});

test("diagnostics flag exported duplicates and surface trajectory reversal", () => {
  const result = generatePaletteV2({ primary: "#507096" });
  const modes = structuredClone(result.modes);
  modes.light.values["primary hover"] = modes.light.values.primary;
  modes.dark.values.primary = "#555555";
  modes.dark.values["primary hover"] = "#777777";
  modes.dark.values["primary active"] = "#666666";
  const diagnostics = diagnosePrimaryHover(modes);
  assert.equal(diagnostics.reviewPriority, "high");
  assert.ok(diagnostics.structuralFlags.includes("light.duplicate-export"));
  assert.ok(
    diagnostics.structuralFlags.includes("dark.surface-direction-reversal"),
  );
  assert.ok(!diagnostics.structuralFlags.includes("dark.duplicate-export"));
});

test("a contrast plateau is not mislabeled as a direction reversal", () => {
  const result = generatePaletteV2({ primary: "#507096" });
  for (const plateau of ["first", "second"]) {
    const modes = structuredClone(result.modes);
    if (plateau === "first") {
      modes.light.values["primary hover"] = modes.light.values.primary;
    } else {
      modes.light.values["primary active"] =
        modes.light.values["primary hover"];
    }
    const diagnostics = diagnosePrimaryHover(modes);
    assert.equal(diagnostics.modes.light.reversesAgainstSurface, false);
    assert.ok(diagnostics.structuralFlags.includes("light.duplicate-export"));
    assert.ok(
      !diagnostics.structuralFlags.includes("light.surface-direction-reversal"),
    );
  }
});
