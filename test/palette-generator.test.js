import assert from "node:assert/strict";
import test from "node:test";

import { buildConstraintReport } from "../lib/constraints.js";
import { generatePalette } from "../lib/palette-generator.js";
import {
  HARMONY_CANDIDATES,
  REQUIRED_FUNCTIONS,
  VIBES,
} from "../lib/palette-config.js";

const primaries = ["#FF0000", "#2878D0", "#25A55F", "#8055CC"];
const modes = [
  { secondary: null, additionalColors: [] },
  { secondary: "#00AA88", additionalColors: [] },
  { secondary: "#00AA88", additionalColors: ["#2255CC"] },
];

test("complete palette contains every semantic function exactly once", () => {
  const result = generatePalette({
    primary: "#FF0000",
    rawPrimary: "red",
    secondary: null,
    additionalColors: [],
    vibe: "balanced",
    harmonyId: "default",
  });
  const names = result.tokens.map(([, name]) => name);
  assert.deepEqual(new Set(names), new Set(REQUIRED_FUNCTIONS));
  assert.equal(names.length, REQUIRED_FUNCTIONS.length);
  assert.equal(
    result.warnings.some((warning) => warning.startsWith("MISSING_FUNCTIONS")),
    false,
  );
});

test("every generated token has a complete inspectable trace", () => {
  const result = generatePalette({
    primary: "#2878D0",
    secondary: "#00AA88",
    additionalColors: [],
    vibe: "soft",
    harmonyId: "default",
  });
  for (const [, name] of result.tokens) {
    assert.ok(result.traces[name], `${name} should have a trace`);
    assert.ok(result.traces[name].steps.length >= 2);
    assert.equal(result.traces[name].recipe.source, result.traces[name].source);
    assert.ok(result.traces[name].recipe.operations.length >= 1);
    assert.equal(result.traces[name].recipe.operations[0].index, 1);
    assert.equal(
      result.traces[name].steps.at(-1).stage,
      "final",
      `${name} should end with a final step`,
    );
    assert.equal(result.artifacts[name].candidate.space, "oklch");
    assert.match(result.artifacts[name].output.srgb.hex, /^#[0-9A-F]{6}$/);
    assert.equal(
      typeof result.artifacts[name].diagnostic.gamut.chromaReductionRatio,
      "number",
    );
  }
});

test("contrast artifacts preserve directional alternatives and their limiting backgrounds", () => {
  const result = generatePalette({
    primary: "#FF0000",
    secondary: null,
    additionalColors: [],
    vibe: "balanced",
    harmonyId: "default",
  });
  const diagnostic = result.artifacts["main text"].diagnostic.contrast;

  assert.equal(diagnostic.solutions.length, 2);
  assert.ok(
    diagnostic.solutions.every(
      ({ limitingBackground }) => typeof limitingBackground === "string",
    ),
  );
  assert.equal(
    diagnostic.solutions.some(
      ({ direction, available }) => direction === "lighter" && !available,
    ),
    true,
  );
});

test("representative full palettes remain computable and reportable", () => {
  for (const primary of primaries) {
    for (const vibe of Object.keys(VIBES)) {
      for (const harmony of HARMONY_CANDIDATES[vibe]) {
        for (const mode of modes) {
          const result = generatePalette({
            primary,
            rawPrimary: primary,
            vibe,
            harmonyId: harmony.id,
            ...mode,
          });
          assert.equal(result.tokens.length, REQUIRED_FUNCTIONS.length);
          assert.equal(
            new Set(result.tokens.map(([, name]) => name)).size,
            REQUIRED_FUNCTIONS.length,
          );
          const report = buildConstraintReport(result);
          assert.ok(report.checks.length >= REQUIRED_FUNCTIONS.length);
          assert.equal(
            report.checks.some((check) => check.actual.includes("NaN")),
            false,
          );
          assert.deepEqual(
            report.checks.filter((check) => check.status === "fail"),
            [],
            `${primary} / ${vibe} / ${harmony.id} should satisfy every hard constraint`,
          );
        }
      }
    }
  }
});
