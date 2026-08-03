import assert from "node:assert/strict";
import test from "node:test";
import { hexToRgb, rgbToOklch } from "../lib/color-math.js";
import { completeHarmonyColor, hueDistance } from "../lib/harmony.js";

const primary = rgbToOklch(hexToRgb("#FF0000"));
const base = { name: "balanced", derivedChromaScale: 0.82 };

test("analogous mirrors the actual secondary offset", () => {
  const secondary = "#FF8800";
  const secondaryHue = rgbToOklch(hexToRgb(secondary)).h;
  const result = completeHarmonyColor(primary, secondary, {
    ...base,
    harmony: "analogous",
    hueOffsets: [-30, 30],
  });
  const expected = (2 * primary.h - secondaryHue + 360) % 360;
  assert.ok(hueDistance(result.targetHue, expected) < 0.001);
});

test("split complement completes the configured opposite arm", () => {
  const result = completeHarmonyColor(primary, "#00AA88", {
    ...base,
    harmony: "split complement",
    hueOffsets: [150, 210],
  });
  const arms = [150, 210].map((offset) => (primary.h + offset) % 360);
  assert.ok(arms.some((arm) => hueDistance(result.targetHue, arm) < 0.001));
});

test("analogous and split complement do not collapse to one formula", () => {
  const secondary = "#FF8800";
  const analogous = completeHarmonyColor(primary, secondary, {
    ...base,
    harmony: "analogous",
    hueOffsets: [-30, 30],
  });
  const split = completeHarmonyColor(primary, secondary, {
    ...base,
    harmony: "split complement",
    hueOffsets: [150, 210],
  });
  assert.ok(hueDistance(analogous.targetHue, split.targetHue) > 30);
});

test("triadic completion selects an arm 120 degrees from primary", () => {
  const result = completeHarmonyColor(primary, "#00AA88", {
    ...base,
    harmony: "triadic",
    hueOffsets: [120, 240],
  });
  const distance = hueDistance(primary.h, result.targetHue);
  assert.ok(Math.abs(distance - 120) < 0.001);
});
