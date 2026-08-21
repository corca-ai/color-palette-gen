import assert from "node:assert/strict";
import test from "node:test";

import {
  generatePaletteV2,
  generatePaletteV2TonalOffsetCounterfactual,
} from "../v2/lib/palette.js";
import { candidate } from "../v2/lib/runtime.js";

test("tonal offset zero preserves current selected colors", () => {
  const current = generatePaletteV2({ primary: "#507096" });
  const preview = generatePaletteV2TonalOffsetCounterfactual({
    primary: "#507096",
    offset: 0,
  });
  for (const mode of ["light", "dark"]) {
    assert.deepEqual(preview.modes[mode].values, current.modes[mode].values);
  }
});

test("tonal offset moves selected defaults and exposes existing pair failures", () => {
  const current = generatePaletteV2({ primary: "#507096" });
  const preview = generatePaletteV2TonalOffsetCounterfactual({
    primary: "#507096",
    offset: 0.01,
  });
  const light = (result) =>
    candidate(result.modes.light.values.primary).oklch.l;
  const dark = (result) => candidate(result.modes.dark.values.primary).oklch.l;

  assert.ok(light(preview) > light(current));
  assert.ok(dark(preview) < dark(current));
  assert.equal(preview.contractsPassed, true);
  assert.equal(
    preview.quality.checks.find(({ id }) => id === "pair.primary-lightness-gap")
      .pass,
    false,
  );
});

test("tonal offset rejects values outside the diagnostic sweep", () => {
  for (const offset of [-0.001, 0.081, Number.NaN]) {
    assert.throws(
      () =>
        generatePaletteV2TonalOffsetCounterfactual({
          primary: "#507096",
          offset,
        }),
      /0 to 0\.08/,
    );
  }
});
