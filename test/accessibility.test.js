import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { contrastRatio, oklchToHex } from "../lib/color-math.js";
import { buildConstraintReport } from "../lib/constraints.js";
import {
  CONTRAST_CONTRACTS,
  HARMONY_CANDIDATES,
  VIBES,
} from "../lib/palette-config.js";
import { generatePalette } from "../lib/palette-generator.js";

test("required contrast contracts hold across the OKLCH input space", () => {
  for (const vibe of Object.keys(VIBES)) {
    for (const l of [0.15, 0.35, 0.55, 0.75, 0.9]) {
      for (const c of [0.02, 0.12, 0.24]) {
        for (let h = 0; h < 360; h += 20) {
          const primary = oklchToHex({ l, c, h }).hex;
          const result = generatePalette({
            primary,
            vibe,
            harmonyId: "default",
            secondary: null,
            additionalColors: [],
          });
          const failures = buildConstraintReport(result).checks.filter(
            ({ category, status }) =>
              category === "contrast" && status === "fail",
          );

          assert.deepEqual(
            failures,
            [],
            `${primary} / ${vibe} must satisfy every contrast contract`,
          );
          assert.equal(
            result.warnings.some((warning) =>
              warning.startsWith("CONTRAST_UNRESOLVED"),
            ),
            false,
          );
        }
      }
    }
  }
});

test("filled accent foregrounds stay readable across harmonies and input modes", () => {
  const modes = [
    { secondary: null, additionalColors: [] },
    { secondary: "#777777", additionalColors: [] },
    { secondary: "#777777", additionalColors: ["#18A58F"] },
  ];
  for (const vibe of Object.keys(VIBES)) {
    for (const candidate of HARMONY_CANDIDATES[vibe]) {
      for (const mode of modes) {
        const result = generatePalette({
          primary: "#FF0000",
          vibe,
          harmonyId: candidate.id,
          ...mode,
        });
        const tokens = Object.fromEntries(
          result.tokens.map(([color, name]) => [name, color]),
        );
        for (const prefix of ["secondary", "decorative"]) {
          assert.ok(
            contrastRatio(
              tokens[`${prefix} accent on-color`],
              tokens[`${prefix} accent`],
            ) >= 4.5,
            `${vibe}/${candidate.id}/${prefix} filled accent must remain readable`,
          );
        }
      }
    }
  }
});

test("CSS uses semantic text, boundary, and focus tokens", () => {
  const css = readFileSync(new URL("../v1/style.css", import.meta.url), "utf8");
  const html = readFileSync(
    new URL("../v1/index.html", import.meta.url),
    "utf8",
  );

  assert.equal(
    css
      .split("\n")
      .some((line) =>
        [
          "color: var(--color-secondary-accent);",
          "color: var(--color-secondary-accent) !important;",
        ].includes(line.trim()),
      ),
    false,
  );
  assert.match(
    css,
    /\.sample-form input,[\s\S]*?border:\s*1px solid var\(--color-border-control\)/,
  );
  for (const [, usageId] of html.matchAll(/data-color-usage="([^"]+)"/g)) {
    assert.ok(
      CONTRAST_CONTRACTS.some(({ id }) => id === usageId),
      `${usageId} must resolve to a declared contrast contract`,
    );
  }
  assert.match(
    css,
    /\.sample-secondary-button:focus-visible[\s\S]*?outline:\s*3px solid var\(--color-focus-ring\)/,
  );
  assert.match(
    css,
    /\.accent-family-badge\s*\{[\s\S]*?color:\s*var\(--color-decorative-accent-on-color\)/,
  );
});
