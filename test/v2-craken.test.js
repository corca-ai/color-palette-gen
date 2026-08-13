import assert from "node:assert/strict";
import test from "node:test";

import { CRAKEN_TOKEN_MAP, serializeCrakenTokens } from "../v2/lib/craken.js";
import {
  REFERENCE_TOKEN_MAP,
  serializeReferenceTokens,
} from "../v2/lib/reference-export.js";
import { generatePaletteV2 } from "../v2/lib/palette.js";
import { TOKEN_ORDER } from "../v2/lib/roles.js";

test("the deprecated export preserves its original token mapping", () => {
  assert.deepEqual(Object.keys(CRAKEN_TOKEN_MAP), TOKEN_ORDER);
  assert.deepEqual(CRAKEN_TOKEN_MAP, REFERENCE_TOKEN_MAP);
});

test("the deprecated export preserves its versioned schema and values", () => {
  const palette = generatePaletteV2({ primary: "#507096" });
  const legacy = serializeCrakenTokens(palette);
  const current = serializeReferenceTokens(palette);

  assert.equal(legacy.schema, "craken-color-tokens-1");
  assert.equal(legacy.policyVersion, current.policyVersion);
  assert.deepEqual(legacy.source, current.source);
  assert.deepEqual(legacy.modes, current.modes);
});
