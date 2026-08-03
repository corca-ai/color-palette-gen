import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizePaletteInput,
  resolvePaletteInput,
  resolvePaletteParams,
} from "../lib/palette-engine.js";
import { generatePalette } from "../lib/palette-generator.js";
import { HARMONY_CANDIDATES, VIBES } from "../lib/palette-config.js";

const primary = "#FF0000";

test("unknown vibe and harmony ids resolve to balanced defaults", () => {
  const params = resolvePaletteParams("unknown", "missing");
  assert.equal(params.name, "balanced");
  assert.equal(params.harmonyId, "default");
  assert.equal(params.vibeDefaulted, true);
});

test("unsupported vibe fallback remains visible in palette warnings", () => {
  const result = generatePalette({
    primary,
    secondary: null,
    additionalColors: [],
    vibe: "luxurious",
    harmonyId: "default",
  });
  assert.match(result.warnings[0], /^UNSUPPORTED_VIBE:/);
  assert.equal(result.params.name, "balanced");
});

test("omitted vibe uses balanced without an unsupported warning", () => {
  const result = generatePalette({ primary });
  assert.equal(result.params.name, "balanced");
  assert.equal(result.params.vibeDefaulted, false);
  assert.equal(
    result.warnings.some((warning) => warning.startsWith("UNSUPPORTED_VIBE")),
    false,
  );
});

test("official additionalColors input is normalized and preserved", () => {
  const result = resolvePaletteInput({
    primary: "#ff0000",
    secondary: "#00aa88",
    additionalColors: ["#2255cc"],
  });
  assert.equal(result.input.primary, "#FF0000");
  assert.deepEqual(result.input.additionalColors, ["#2255CC"]);
  assert.equal(result.supportingColors.additional.hex, "#2255CC");
  assert.equal(result.supportingColors.additional.isDerived, false);
});

test("extra additional colors remain visible and produce a scope warning", () => {
  const result = generatePalette({
    primary,
    additionalColors: ["#2255CC", "#CC5522"],
  });
  assert.deepEqual(result.input.additionalColors, ["#2255CC", "#CC5522"]);
  assert.match(
    result.warnings.find((warning) =>
      warning.startsWith("ADDITIONAL_COLORS_TRUNCATED"),
    ),
    /first of 2/,
  );
});

test("invalid public engine inputs fail explicitly", () => {
  assert.throws(() => normalizePaletteInput(null), /must be an object/);
  assert.throws(
    () => normalizePaletteInput({ primary: "red" }),
    /primary must be a six-digit hex color/,
  );
  assert.throws(
    () => normalizePaletteInput({ primary, additionalColors: "#2255CC" }),
    /must be an array/,
  );
  assert.throws(
    () => normalizePaletteInput({ primary, additionalColors: [null] }),
    /additionalColors\[0\] must be a six-digit hex color/,
  );
  assert.throws(
    () => normalizePaletteInput({ primary, secondary: "#XYZXYZ" }),
    /secondary must be a six-digit hex color/,
  );
});

test("primary-only input derives both supporting colors", () => {
  const result = resolvePaletteInput({
    primary,
    secondary: null,
    additionalColors: [],
    vibe: "balanced",
    harmonyId: "default",
  });
  assert.equal(result.supportingColors.secondary.isDerived, true);
  assert.equal(result.supportingColors.additional.isDerived, true);
  assert.equal(
    result.supportingColors.additional.derivationMode,
    "primary-template",
  );
});

test("explicit secondary drives pair completion for missing additional", () => {
  const result = resolvePaletteInput({
    primary,
    secondary: "#00AA88",
    additionalColors: [],
    vibe: "balanced",
    harmonyId: "default",
  });
  assert.equal(result.supportingColors.secondary.isDerived, false);
  assert.equal(result.supportingColors.secondary.hex, "#00AA88");
  assert.equal(result.supportingColors.additional.isDerived, true);
  assert.equal(
    result.supportingColors.additional.derivationMode,
    "primary-secondary-completion",
  );
});

test("all explicit input colors remain locked", () => {
  const result = resolvePaletteInput({
    primary,
    secondary: "#00AA88",
    additionalColors: ["#2255CC"],
    vibe: "soft",
    harmonyId: "monochromatic",
  });
  assert.equal(result.supportingColors.secondary.hex, "#00AA88");
  assert.equal(result.supportingColors.additional.hex, "#2255CC");
  assert.equal(result.supportingColors.secondary.isDerived, false);
  assert.equal(result.supportingColors.additional.isDerived, false);
});

test("every vibe and harmony candidate resolves every input mode", () => {
  const modes = [
    { secondary: null, additionalColors: [] },
    { secondary: "#00AA88", additionalColors: [] },
    { secondary: "#00AA88", additionalColors: ["#2255CC"] },
  ];

  for (const vibe of Object.keys(VIBES)) {
    for (const candidate of HARMONY_CANDIDATES[vibe]) {
      for (const mode of modes) {
        const result = resolvePaletteInput({
          primary,
          vibe,
          harmonyId: candidate.id,
          ...mode,
        });
        assert.match(result.supportingColors.secondary.hex, /^#[0-9A-F]{6}$/);
        assert.match(result.supportingColors.additional.hex, /^#[0-9A-F]{6}$/);
        assert.equal(result.params.harmonyId, candidate.id);
      }
    }
  }
});
