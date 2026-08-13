import assert from "node:assert/strict";
import test from "node:test";

import {
  REFERENCE_TOKEN_MAP,
  serializeReferenceTokens,
} from "../v2/lib/reference-export.js";
import { generatePaletteV2 } from "../v2/lib/palette.js";
import { TOKEN_ORDER } from "../v2/lib/roles.js";

test("every palette role has one reference token mapping", () => {
  assert.deepEqual(Object.keys(REFERENCE_TOKEN_MAP), TOKEN_ORDER);
  assert.equal(
    new Set(Object.values(REFERENCE_TOKEN_MAP)).size,
    TOKEN_ORDER.length,
  );
});

test("reference serialization preserves both modes and policy provenance", () => {
  const palette = generatePaletteV2({ primary: "#507096" });
  const output = serializeReferenceTokens(palette);
  assert.equal(output.schema, "color-lab-reference-tokens-1");
  assert.equal(output.policyVersion, palette.policyVersion);
  assert.deepEqual(output.source, { primary: "#507096" });
  for (const mode of ["light", "dark"]) {
    for (const [role, token] of Object.entries(REFERENCE_TOKEN_MAP)) {
      assert.equal(output.modes[mode][token], palette.modes[mode].values[role]);
    }
  }
});
