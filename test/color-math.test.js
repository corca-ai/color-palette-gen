import assert from "node:assert/strict";
import test from "node:test";

import {
  SRGB_GAMUT_EPSILON,
  contrastRatio,
  hexToRgb,
  inGamut,
  mapToSrgb,
  oklchDifference,
  oklchToHex,
  oklchToRawRgb,
  rgbToHex,
  rgbToOklch,
  solveOklchContrast,
} from "../lib/color-math.js";

function approximately(actual, expected, tolerance, message) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${message}: expected ${expected} ± ${tolerance}, received ${actual}`,
  );
}

test("hex and normalized RGB round-trip without changing 8-bit values", () => {
  for (const hex of ["#000000", "#FFFFFF", "#FF0000", "#00A59B", "#7A4FE0"]) {
    assert.equal(rgbToHex(hexToRgb(hex)), hex);
  }
});

test("sRGB red converts to the expected OKLCH coordinates", () => {
  const red = rgbToOklch(hexToRgb("#FF0000"));

  approximately(red.l, 0.627955, 0.00001, "lightness");
  approximately(red.c, 0.257683, 0.00001, "chroma");
  approximately(red.h, 29.234, 0.01, "hue");
});

test("known sRGB colors survive an OKLCH export round-trip", () => {
  for (const hex of [
    "#000000",
    "#FFFFFF",
    "#FF0000",
    "#00FF00",
    "#0000FF",
    "#6F5D5A",
  ]) {
    const exported = oklchToHex(rgbToOklch(hexToRgb(hex)));
    assert.equal(exported.hex, hex);
  }
});

test("WCAG contrast calculation has known endpoints and is symmetric", () => {
  assert.equal(contrastRatio("#000000", "#FFFFFF"), 21);
  assert.equal(
    contrastRatio("#6F5D5A", "#FFFFFF"),
    contrastRatio("#FFFFFF", "#6F5D5A"),
  );
});

test("OKLCH difference exposes axis movement and Oklab delta E", () => {
  const difference = oklchDifference(
    { l: 0.5, c: 0.1, h: 350 },
    { l: 0.56, c: 0.12, h: 10 },
  );
  approximately(difference.deltaL, 0.06, 1e-12, "delta L");
  approximately(difference.deltaC, 0.02, 1e-12, "delta C");
  approximately(difference.deltaH, 20, 1e-12, "signed hue delta");
  assert.ok(difference.deltaE > Math.abs(difference.deltaL));
});

test("contrast solver finds the closest darker OKLCH color after sRGB export", () => {
  const source = { l: 0.72, c: 0.16, h: 250 };
  const solved = solveOklchContrast({
    color: source,
    against: "#FFFFFF",
    target: 4.5,
    direction: "darker",
  });

  assert.equal(solved.passed, true);
  assert.ok(solved.color.l < source.l);
  assert.ok(solved.ratio >= 4.5);
  assert.equal(solved.color.h, source.h);
  assert.ok(
    contrastRatio(solved.hex, "#FFFFFF") >= 4.5,
    "the rounded hex output must satisfy the target",
  );
});

test("contrast solver evaluates the worst case across multiple backgrounds", () => {
  const solved = solveOklchContrast({
    color: { l: 0.64, c: 0.1, h: 30 },
    against: ["#FFFFFF", "#F0F0F0"],
    target: 4.5,
  });

  assert.equal(solved.passed, true);
  assert.ok(contrastRatio(solved.hex, "#FFFFFF") >= 4.5);
  assert.ok(contrastRatio(solved.hex, "#F0F0F0") >= 4.5);
});

test("contrast solver reports impossible multi-background requests", () => {
  const solved = solveOklchContrast({
    color: { l: 0.5, c: 0.1, h: 200 },
    against: ["#000000", "#FFFFFF"],
    target: 7,
  });

  assert.equal(solved.strategy, "neutral-fallback");
  assert.equal(solved.passed, false);
});

test("out-of-gamut mapping preserves lightness and hue while reducing chroma", () => {
  const candidate = { l: 0.72, c: 0.4, h: 35 };
  const mapped = mapToSrgb(candidate);

  assert.equal(mapped.adjusted, true);
  assert.ok(mapped.color.c < candidate.c);
  assert.equal(mapped.color.l, candidate.l);
  assert.equal(mapped.color.h, candidate.h);
  assert.equal(inGamut(mapped.rgb), true);
  assert.equal(mapped.mapping.sourceSpace, "outside-srgb");
  assert.ok(mapped.mapping.chromaReduction > 0);
  assert.ok(mapped.mapping.chromaReductionRatio > 0);
  assert.equal(mapped.mapping.lightnessDelta, 0);
  assert.equal(mapped.mapping.hueDelta, 0);
});

test("in-gamut colors report a zero-cost mapping", () => {
  const mapped = mapToSrgb({ l: 0.6, c: 0.05, h: 220 });

  assert.equal(mapped.adjusted, false);
  assert.equal(mapped.mapping.sourceSpace, "srgb");
  assert.equal(mapped.mapping.chromaReduction, 0);
  assert.equal(mapped.mapping.chromaReductionRatio, 0);
});

test("gamut mapping yields sRGB output across representative OKLCH coordinates", () => {
  for (const l of [0.15, 0.35, 0.55, 0.75, 0.95]) {
    for (const c of [0, 0.05, 0.15, 0.3, 0.45]) {
      for (let h = 0; h < 360; h += 15) {
        const mapped = mapToSrgb({ l, c, h });
        assert.equal(
          inGamut(mapped.rgb),
          true,
          `Expected mapped oklch(${l} ${c} ${h}) inside sRGB`,
        );
      }
    }
  }
});

test("gamut tolerance accepts floating-point boundary noise only", () => {
  assert.equal(inGamut({ r: -SRGB_GAMUT_EPSILON / 2, g: 0.5, b: 1 }), true);
  assert.equal(inGamut({ r: -SRGB_GAMUT_EPSILON * 2, g: 0.5, b: 1 }), false);
});

test("raw conversion identifies a deliberately extreme color as out of gamut", () => {
  assert.equal(inGamut(oklchToRawRgb({ l: 0.7, c: 0.45, h: 140 })), false);
});
