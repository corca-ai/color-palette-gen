import assert from "node:assert/strict";
import test from "node:test";

import {
  generatePaletteV2,
  generatePaletteV2DestructiveGrammarCounterfactual,
  inspectDestructiveGrammar,
} from "../v2/lib/palette.js";

test("Destructive grammar inspection is Primary-independent and reuses state evidence", () => {
  const inspected = inspectDestructiveGrammar({
    mode: "light",
    lightness: 0.54,
    direction: -1,
    foreground: "#FFFFFF",
  });
  assert.equal(inspected.conditioning, "none");
  assert.equal(inspected.complete, true);
  assert.deepEqual(Object.keys(inspected.values), [
    "default",
    "hover",
    "active",
  ]);
  assert.ok(
    inspected.realized.default.oklch.l > inspected.realized.hover.oklch.l,
  );
  assert.ok(
    inspected.realized.hover.oklch.l > inspected.realized.active.oklch.l,
  );
  assert.ok(inspected.weakestLc >= 60);
});

test("Destructive grammar inspection retains an infeasible foreground arm", () => {
  const inspected = inspectDestructiveGrammar({
    mode: "light",
    lightness: 0.54,
    direction: -1,
    foreground: "#000000",
  });
  assert.equal(inspected.complete, false);
  assert.equal(inspected.failure.stage, "default-label-contrast");
  assert.equal(inspected.failure.checkId, "destructive.label-contrast");
});

test("Destructive grammar inspection validates its bounded axes", () => {
  for (const options of [
    { mode: "sepia", lightness: 0.54, direction: -1, foreground: "#FFFFFF" },
    { mode: "light", lightness: 0.8, direction: -1, foreground: "#FFFFFF" },
    { mode: "light", lightness: 0.54, direction: 0, foreground: "#FFFFFF" },
    { mode: "light", lightness: 0.54, direction: -1, foreground: "#FF0000" },
  ]) {
    assert.throws(() => inspectDestructiveGrammar(options), TypeError);
  }
});

test("selected Destructive grammar drives a complete diagnostic palette", () => {
  const primary = "#507096";
  const current = generatePaletteV2({ primary });
  const grammar = {
    light: { lightness: 0.54, direction: -1, foreground: "#FFFFFF" },
    dark: { lightness: 0.637, direction: -1, foreground: "#FFFFFF" },
  };
  const preview = generatePaletteV2DestructiveGrammarCounterfactual({
    primary,
    grammar,
  });

  assert.equal(
    preview.diagnosticOverride.experiment,
    "destructive-first-grammar-preview",
  );
  for (const mode of ["light", "dark"]) {
    assert.equal(preview.modes[mode].values["primary text"], "#FFFFFF");
    assert.equal(preview.modes[mode].values["destructive text"], "#FFFFFF");
    assert.ok(
      preview.modes[mode].values.destructive !== undefined,
      `${mode} must regenerate a Destructive default`,
    );
  }
  assert.strictEqual(generatePaletteV2({ primary }), current);
});

test("Destructive grammar preview rejects incomplete tuples", () => {
  assert.throws(
    () =>
      generatePaletteV2DestructiveGrammarCounterfactual({
        primary: "#507096",
        grammar: {
          light: { lightness: 0.54, direction: -1, foreground: "#FFFFFF" },
        },
      }),
    /requires bounded Light and Dark tuples/,
  );
});
