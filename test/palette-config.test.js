import assert from "node:assert/strict";
import test from "node:test";

import {
  CONTRAST_CONTRACTS,
  HARMONY_CANDIDATES,
  REQUIRED_FUNCTIONS,
  VIBES,
} from "../lib/palette-config.js";

test("every vibe has a matching harmony candidate set", () => {
  assert.deepEqual(
    Object.keys(HARMONY_CANDIDATES).sort(),
    Object.keys(VIBES).sort(),
  );
});

test("every candidate set has one default and unique ids", () => {
  for (const [vibe, candidates] of Object.entries(HARMONY_CANDIDATES)) {
    assert.equal(
      candidates.filter(({ id }) => id === "default").length,
      1,
      `${vibe} must have exactly one default`,
    );
    assert.equal(
      new Set(candidates.map(({ id }) => id)).size,
      candidates.length,
      `${vibe} candidate ids must be unique`,
    );
  }
});

test("harmony offsets are finite hue rotations", () => {
  for (const [vibe, candidates] of Object.entries(HARMONY_CANDIDATES)) {
    for (const candidate of candidates) {
      assert.equal(candidate.offsets.length, 2);
      for (const offset of candidate.offsets) {
        assert.equal(Number.isFinite(offset), true);
        assert.ok(
          Math.abs(offset) <= 360,
          `${vibe}/${candidate.id} has invalid offset ${offset}`,
        );
      }
    }
  }
});

test("vibe parameters stay inside their declared domains", () => {
  for (const [name, vibe] of Object.entries(VIBES)) {
    assert.ok(vibe.chromaScale > 0, `${name} chromaScale`);
    assert.ok(vibe.derivedChromaScale > 0, `${name} derivedChromaScale`);
    assert.ok(
      vibe.surfaceTint >= 0 && vibe.surfaceTint <= 1,
      `${name} surfaceTint`,
    );
    assert.ok(
      vibe.stateLightnessStep > 0 && vibe.stateLightnessStep < 1,
      `${name} stateLightnessStep`,
    );
    assert.ok(
      vibe.borderEmphasis >= 0 && vibe.borderEmphasis <= 1,
      `${name} borderEmphasis`,
    );
  }
});

test("required semantic functions are unique", () => {
  assert.equal(new Set(REQUIRED_FUNCTIONS).size, REQUIRED_FUNCTIONS.length);
});

test("contrast contracts reference declared semantic functions", () => {
  for (const contract of CONTRAST_CONTRACTS) {
    assert.ok(REQUIRED_FUNCTIONS.includes(contract.foreground));
    assert.ok(contract.target >= 3);
    for (const background of contract.backgrounds) {
      assert.ok(REQUIRED_FUNCTIONS.includes(background));
    }
  }
});
