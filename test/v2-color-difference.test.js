import assert from "node:assert/strict";
import test from "node:test";

import { ciede2000, hexCiede2000 } from "../v2/lib/color-difference.js";

test("CIEDE2000 matches published reference pairs", () => {
  const pairs = [
    [{ l: 50, a: 2.6772, b: -79.7751 }, { l: 50, a: 0, b: -82.7485 }, 2.0425],
    [{ l: 50, a: 3.1571, b: -77.2803 }, { l: 50, a: 0, b: -82.7485 }, 2.8615],
    [{ l: 50, a: 2.8361, b: -74.02 }, { l: 50, a: 0, b: -82.7485 }, 3.4412],
    [{ l: 50, a: -1.3802, b: -84.2814 }, { l: 50, a: 0, b: -82.7485 }, 1],
  ];
  for (const [first, second, expected] of pairs) {
    assert.ok(Math.abs(ciede2000(first, second) - expected) < 0.0001);
  }
});

test("hex CIEDE2000 is symmetric with a zero identity", () => {
  assert.equal(hexCiede2000("#507096", "#507096"), 0);
  assert.ok(
    Math.abs(
      hexCiede2000("#507096", "#46658A") - hexCiede2000("#46658A", "#507096"),
    ) < 1e-12,
  );
});
