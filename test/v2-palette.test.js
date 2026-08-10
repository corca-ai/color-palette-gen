import assert from "node:assert/strict";
import test from "node:test";

import { generatePaletteV2, serializeModeCss } from "../v2/lib/palette.js";

const REQUIRED = [
  "background",
  "foreground",
  "surface",
  "raised surface",
  "muted surface",
  "muted text",
  "border",
  "input border",
  "primary",
  "primary hover",
  "primary active",
  "primary text",
  "focus ring",
  "destructive",
  "destructive text",
];

test("v2 accepts only a primary contract and resolves both modes", () => {
  const result = generatePaletteV2({ primary: "#507096" });
  assert.deepEqual(result.input, { primary: "#507096" });
  assert.equal(result.direction, "calm minimal");
  for (const mode of ["light", "dark"]) {
    assert.deepEqual(
      result.modes[mode].tokens.map(([, role]) => role),
      REQUIRED,
    );
    assert.equal(result.modes[mode].passed, true);
    assert.ok(result.modes[mode].textChecks.length > 0);
    assert.ok(result.modes[mode].nonTextChecks.length > 0);
  }
});

test("v2 text contracts hold across representative primary colors", () => {
  for (const primary of [
    "#FF0000",
    "#507096",
    "#00A878",
    "#7A4ED8",
    "#111111",
    "#F2C230",
  ]) {
    const result = generatePaletteV2({ primary });
    for (const mode of ["light", "dark"]) {
      const failures = result.modes[mode].checks.filter((check) => !check.pass);
      assert.deepEqual(failures, [], `${primary}/${mode} APCA contracts`);
    }
  }
});

test("v2 CSS serialization remains mode-scoped", () => {
  const result = generatePaletteV2({ primary: "#507096" });
  assert.match(serializeModeCss(result.modes.light), /^\[data-theme="light"\]/);
  assert.match(
    serializeModeCss(result.modes.dark),
    /--palette-primary-active: #[0-9A-F]{6}/,
  );
});

test("v2 preserves input character without collapsing light and dark achromatics", () => {
  const black = generatePaletteV2({ primary: "#000000" });
  const white = generatePaletteV2({ primary: "#FFFFFF" });
  assert.equal(black.source.classification, "achromatic");
  assert.equal(white.source.classification, "achromatic");
  assert.notEqual(
    black.modes.light.values.primary,
    white.modes.light.values.primary,
  );
  assert.notEqual(
    black.modes.dark.values.primary,
    white.modes.dark.values.primary,
  );
});

test("v2 applies restrained hue tint only to chromatic foundations", () => {
  const chromatic = generatePaletteV2({ primary: "#507096" });
  const achromatic = generatePaletteV2({ primary: "#777777" });
  assert.ok(chromatic.modes.light.adaptations.neutralTintChroma > 0);
  assert.equal(achromatic.modes.light.adaptations.neutralTintChroma, 0);
});

test("v2 separates destructive feedback when the primary is red", () => {
  const result = generatePaletteV2({ primary: "#FF0000" });
  for (const mode of ["light", "dark"]) {
    assert.equal(result.modes[mode].adaptations.redConflict, true);
    const check = result.modes[mode].nonTextChecks.find(
      ({ role }) => role === "Brand → destructive",
    );
    assert.equal(check.pass, true);
  }
});

test("every v2 role exposes provenance and a selected decision", () => {
  const result = generatePaletteV2({ primary: "#507096" });
  assert.equal(result.policyVersion, "v2-justification-1");
  for (const mode of ["light", "dark"]) {
    for (const role of REQUIRED) {
      const decision = result.modes[mode].decisions[role];
      assert.ok(decision, `${mode}/${role} decision`);
      assert.equal(decision.selected.hex, result.modes[mode].values[role]);
      assert.ok(decision.intent.length > 20);
      assert.ok(decision.evidence.length > 0);
      assert.ok(
        decision.evidence.every(({ class: evidenceClass }) =>
          [
            "normative",
            "reference",
            "product-policy",
            "empirical",
            "heuristic",
          ].includes(evidenceClass),
        ),
      );
    }
  }
});

test("searched roles retain counterfactual candidates", () => {
  const result = generatePaletteV2({ primary: "#507096" });
  for (const mode of ["light", "dark"]) {
    for (const role of [
      "primary",
      "primary hover",
      "primary active",
      "destructive",
    ]) {
      const decision = result.modes[mode].decisions[role];
      assert.equal(decision.strategy, "minimum-change candidate search");
      assert.ok(decision.candidateCount > 1);
      assert.ok(
        decision.alternatives.nearestRejected ||
          decision.alternatives.nextPassing,
        `${mode}/${role} alternative`,
      );
    }
  }
});

test("v2 contracts hold across an RGB input grid", () => {
  const channels = [0, 51, 102, 153, 204, 255];
  for (const red of channels) {
    for (const green of channels) {
      for (const blue of channels) {
        const primary = `#${[red, green, blue]
          .map((channel) => channel.toString(16).padStart(2, "0"))
          .join("")}`;
        const result = generatePaletteV2({ primary });
        assert.equal(result.passed, true, primary);
      }
    }
  }
});

test("v2 invalid input fails explicitly", () => {
  assert.throws(
    () => generatePaletteV2({ primary: "blue" }),
    /primary must be a six-digit hex color/,
  );
});
