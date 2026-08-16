import assert from "node:assert/strict";
import test from "node:test";

import {
  DIAGNOSTIC_RGB_CHANNELS,
  diagnosticInputGrid,
  normalizeDiagnosticChannels,
} from "../v2/lib/diagnostic-corpus.js";

test("diagnostic corpus preserves the reviewed 216-input order", () => {
  const inputs = diagnosticInputGrid();

  assert.deepEqual(DIAGNOSTIC_RGB_CHANNELS, [0, 51, 102, 153, 204, 255]);
  assert.equal(inputs.length, 216);
  assert.equal(inputs[0], "#000000");
  assert.equal(inputs.at(-1), "#FFFFFF");
});

test("diagnostic corpus normalizes channels once", () => {
  assert.deepEqual(
    normalizeDiagnosticChannels([255, 0, 255, 51]),
    [0, 51, 255],
  );
  assert.deepEqual(diagnosticInputGrid([255, 0, 255]), [
    "#000000",
    "#0000FF",
    "#00FF00",
    "#00FFFF",
    "#FF0000",
    "#FF00FF",
    "#FFFF00",
    "#FFFFFF",
  ]);
});

test("diagnostic corpus rejects malformed channel definitions", () => {
  for (const channels of [[], [-1], [256], [1.5], ["51"], null]) {
    assert.throws(
      () => normalizeDiagnosticChannels(channels),
      /channels must contain integers from 0 through 255/u,
    );
  }
});
