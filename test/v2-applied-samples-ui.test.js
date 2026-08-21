import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { generatePaletteV2 } from "../v2/lib/palette.js";
import { SAMPLE_ROLE_COVERAGE } from "../v2/lib/view.js";

test("Generator exposes accepted component situations instead of diagnostic controls", async () => {
  const [html, app, view, css] = await Promise.all([
    readFile(new URL("../v2/index.html", import.meta.url), "utf8"),
    readFile(new URL("../v2/app.js", import.meta.url), "utf8"),
    readFile(new URL("../v2/lib/view.js", import.meta.url), "utf8"),
    readFile(new URL("../v2/styles/specimens.css", import.meta.url), "utf8"),
  ]);

  for (const scenario of [
    "workspace",
    "routine-actions",
    "destructive-confirmation",
    "feedback-selection",
    "form-focus",
  ]) {
    assert.match(html, new RegExp(`data-sample-scenario="${scenario}"`));
  }
  assert.doesNotMatch(html, /data-palette-variant|destructive-calibration/);
  assert.doesNotMatch(
    app,
    /inspectDestructiveGrammar|buildRedBandPresentationComparison/,
  );
  assert.match(app, /ArrowLeft/);
  assert.match(app, /aria-selected/);
  assert.match(app, /sampleScenario === "routine-actions"/);
  assert.match(view, /reference-destructive-outline/);
  assert.match(view, /reference-destructive-demo/);
  assert.match(view, /reference-warning/);
  assert.match(view, /reference-warning-demo/);
  assert.match(view, /reference-form-scenario/);
  assert.match(view, /reference-popover/);
  assert.match(view, /disabled/);
  assert.match(view, /secondaryActionPresentationForMode/);
  assert.match(view, /--sample-secondary-action-hover/);
  assert.match(view, /confirmation-secondary-state-family-v1/);
  assert.match(css, /var\(--sample-secondary-action-hover\)/);
  assert.match(css, /var\(--sample-secondary-action-active\)/);

  const generatedRoles = generatePaletteV2({ primary: "#507096" })
    .modes.light.tokens.map(([, role]) => role)
    .sort();
  const appliedRoles = Object.values(SAMPLE_ROLE_COVERAGE.scenarios).flat();
  const classifiedRoles = [
    ...appliedRoles,
    ...SAMPLE_ROLE_COVERAGE.provenanceOnly,
  ].sort();
  assert.deepEqual(classifiedRoles, generatedRoles);
  assert.deepEqual(SAMPLE_ROLE_COVERAGE.provenanceOnly, ["brand source"]);
  for (const role of appliedRoles) {
    const variable = `var(--sample-${role.replaceAll(" ", "-")})`;
    assert.ok(css.includes(variable), `${role} lacks an applied CSS consumer`);
  }
});
