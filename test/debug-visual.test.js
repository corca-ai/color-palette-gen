import assert from "node:assert/strict";
import test from "node:test";

import { axisMarkerPosition, parseMeasurement } from "../lib/debug-visual.js";

test("constraint labels yield finite visual meter values", () => {
  assert.equal(parseMeasurement("≥ 4.5:1 in every state"), 4.5);
  assert.equal(parseMeasurement("5.23:1 minimum"), 5.23);
  assert.equal(parseMeasurement("no value"), 0);
});

test("axis markers are clamped and reject invalid ranges", () => {
  assert.equal(axisMarkerPosition(0.5, 1), 50);
  assert.equal(axisMarkerPosition(2, 1), 100);
  assert.equal(axisMarkerPosition(-1, 1), 0);
  assert.equal(axisMarkerPosition(Number.NaN, 1), 0);
  assert.equal(axisMarkerPosition(1, 0), 0);
});
