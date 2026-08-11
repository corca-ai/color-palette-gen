import assert from "node:assert/strict";
import test from "node:test";

import { CRAKEN_TOKEN_MAP, serializeCrakenTokens } from "../v2/lib/craken.js";
import { generatePaletteV2 } from "../v2/lib/palette.js";
import { TOKEN_ORDER } from "../v2/lib/roles.js";

test("every palette role has one Craken token mapping", () => {
  assert.deepEqual(Object.keys(CRAKEN_TOKEN_MAP), TOKEN_ORDER);
  assert.equal(
    new Set(Object.values(CRAKEN_TOKEN_MAP)).size,
    TOKEN_ORDER.length,
  );
});

test("Craken serialization preserves both mode values and policy provenance", () => {
  const palette = generatePaletteV2({ primary: "#507096" });
  const output = serializeCrakenTokens(palette);
  assert.equal(output.schema, "craken-color-tokens-1");
  assert.equal(output.policyVersion, palette.policyVersion);
  assert.deepEqual(output.source, { primary: "#507096" });
  for (const mode of ["light", "dark"]) {
    for (const [role, token] of Object.entries(CRAKEN_TOKEN_MAP)) {
      assert.equal(output.modes[mode][token], palette.modes[mode].values[role]);
    }
  }
});

test("edge inputs retain distinct feedback and readable selected states", () => {
  for (const primary of [
    "#FF0000",
    "#FFB000",
    "#FFFF00",
    "#000000",
    "#FFFFFF",
    "#00FFFF",
  ]) {
    const palette = generatePaletteV2({ primary });
    for (const mode of ["light", "dark"]) {
      const result = palette.modes[mode];
      assert.notEqual(result.values.warning, result.values.primary);
      assert.notEqual(result.values.warning, result.values.destructive);
      assert.equal(
        result.checks.every(({ pass }) => pass),
        true,
      );
    }
  }
});
