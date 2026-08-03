import assert from "node:assert/strict";
import test from "node:test";

import {
  FUNCTION_TO_VAR,
  serializeCss,
  serializeDebug,
  serializeTokens,
} from "../lib/output-format.js";
import { generatePalette } from "../lib/palette-generator.js";
import { buildConstraintReport } from "../lib/constraints.js";
import { REQUIRED_FUNCTIONS } from "../lib/palette-config.js";

const result = generatePalette({
  primary: "#FF0000",
  secondary: null,
  additionalColors: [],
  vibe: "balanced",
  harmonyId: "default",
});

test("every semantic function has a CSS variable", () => {
  assert.deepEqual(
    new Set(Object.keys(FUNCTION_TO_VAR)),
    new Set(REQUIRED_FUNCTIONS),
  );
});

test("token JSON preserves the official tuple output", () => {
  assert.deepEqual(JSON.parse(serializeTokens(result.tokens)), result.tokens);
});

test("CSS export contains every resolved semantic token", () => {
  const css = serializeCss(result.tokens);
  assert.match(css, /^:root \{/);
  for (const [color, functionName] of result.tokens) {
    assert.match(css, new RegExp(`${FUNCTION_TO_VAR[functionName]}: ${color}`));
  }
});

test("debug export contains artifacts, traces, and constraints", () => {
  const constraints = buildConstraintReport(result);
  const output = JSON.parse(serializeDebug(result, constraints));
  assert.deepEqual(output.tokens, result.tokens);
  assert.equal(Object.keys(output.artifacts).length, REQUIRED_FUNCTIONS.length);
  assert.ok(output.constraints.checks.length >= REQUIRED_FUNCTIONS.length);
});
