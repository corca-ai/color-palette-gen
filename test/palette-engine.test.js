import assert from "node:assert/strict";
import test from "node:test";

import {
  resolvePaletteInput,
  resolvePaletteParams,
} from "../lib/palette-engine.js";
import { HARMONY_CANDIDATES, VIBES } from "../lib/palette-config.js";

const primary = "#FF0000";

test("unknown vibe and harmony ids resolve to balanced defaults", () => {
  const params = resolvePaletteParams("unknown", "missing");
  assert.equal(params.name, "balanced");
  assert.equal(params.harmonyId, "default");
  assert.equal(params.vibeDefaulted, true);
});

test("unsupported vibe fallback remains visible in palette warnings", async () => {
  const { generatePalette } = await import("../lib/palette-generator.js");
  const result = generatePalette({
    primary,
    secondary: null,
    additional: null,
    vibe: "luxurious",
    harmonyId: "default",
  });
  assert.match(result.warnings[0], /^UNSUPPORTED_VIBE:/);
  assert.equal(result.params.name, "balanced");
});

test("primary-only input derives both supporting colors", () => {
  const result = resolvePaletteInput({
    primary,
    secondary: null,
    additional: null,
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
    additional: null,
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
    additional: "#2255CC",
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
    { secondary: null, additional: null },
    { secondary: "#00AA88", additional: null },
    { secondary: "#00AA88", additional: "#2255CC" },
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
