import assert from "node:assert/strict";
import test from "node:test";

import { apcaContrast } from "../v2/lib/apca.js";

test("APCA preserves contrast polarity and known endpoints", () => {
  assert.ok(
    Math.abs(apcaContrast("#000000", "#FFFFFF") - 106.040673) < 0.000001,
  );
  assert.ok(
    Math.abs(apcaContrast("#FFFFFF", "#000000") + 107.884733) < 0.000001,
  );
  assert.ok(
    Math.abs(apcaContrast("#777777", "#FFFFFF") - 71.111103) < 0.000001,
  );
  assert.ok(
    Math.abs(apcaContrast("#FFFFFF", "#777777") + 76.581946) < 0.000001,
  );
  assert.equal(apcaContrast("#777777", "#777777"), 0);
});

test("APCA rejects invalid color strings", () => {
  assert.throws(() => apcaContrast("red", "#FFFFFF"), /six-digit hex/);
});
