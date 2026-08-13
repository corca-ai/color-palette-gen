import assert from "node:assert/strict";
import test from "node:test";

import { generatePaletteV2 } from "../v2/lib/palette.js";

const REAL_INPUTS = [
  "#FF0000",
  "#E53935",
  "#B91C1C",
  "#FF6B6B",
  "#FF9500",
  "#F59E0B",
  "#FFD600",
  "#F2C230",
  "#FFFF00",
  "#00A878",
  "#22C55E",
  "#00FF00",
  "#A3E635",
  "#00A7C4",
  "#00FFFF",
  "#06B6D4",
  "#14B8A6",
  "#2563EB",
  "#0080FF",
  "#0000FF",
  "#16324F",
  "#6633FF",
  "#7A4ED8",
  "#8B5CF6",
  "#D946EF",
  "#FF00FF",
  "#000000",
  "#111111",
  "#404040",
  "#777777",
  "#808080",
  "#C0C0C0",
  "#F5F5F5",
  "#FFFFFF",
  "#F5E8D0",
  "#EFE6DD",
  "#6B5B53",
  "#507096",
];

test("real and adversarial brand inputs remain computable without hidden contract failure", () => {
  for (const primary of REAL_INPUTS) {
    const result = generatePaletteV2({ primary });
    assert.equal(result.passed, true, primary);
    for (const mode of ["light", "dark"]) {
      const values = result.modes[mode].values;
      assert.notEqual(values.warning, values.primary, `${primary}/${mode}`);
      assert.notEqual(values.warning, values.destructive, `${primary}/${mode}`);
      for (const family of ["primary", "destructive", "warning"]) {
        assert.equal(
          new Set([
            values[family],
            values[`${family} hover`],
            values[`${family} active`],
          ]).size,
          3,
          `${primary}/${mode}/${family}`,
        );
      }
    }
  }
});

test("semantic ambiguity is reported for red and amber brands", () => {
  const red = generatePaletteV2({ primary: "#FF0000" });
  const yellow = generatePaletteV2({ primary: "#FFFF00" });
  assert.ok(
    red.quality.semanticChecks.some(
      ({ id, pass }) => id.includes("primary-destructive-hue") && !pass,
    ),
  );
  assert.ok(
    yellow.quality.semanticChecks.some(
      ({ id, pass }) => id.includes("primary-warning-hue") && !pass,
    ),
  );
});

test("achromatic sources that converge to one action pair remain detectable", () => {
  const black = generatePaletteV2({ primary: "#000000" });
  const nearBlack = generatePaletteV2({ primary: "#111111" });
  for (const mode of ["light", "dark"]) {
    assert.equal(
      black.modes[mode].values.primary,
      nearBlack.modes[mode].values.primary,
    );
  }
  assert.notEqual(
    black.modes.light.values["brand source"],
    nearBlack.modes.light.values["brand source"],
  );
});
