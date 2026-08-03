import assert from "node:assert/strict";
import test from "node:test";

import { buildConstraintReport } from "../lib/constraints.js";
import { rgbToOklch, hexToRgb } from "../lib/color-math.js";

function makeResult() {
  const tokens = [
    ["#FFFFFF", "background"],
    ["#111111", "main text"],
    ["#555555", "secondary text"],
    ["#B42318", "primary button default"],
    ["#921F17", "primary button hover"],
    ["#731A14", "primary button active"],
    ["#FFFFFF", "primary button text"],
    ["#555555", "focus ring"],
    ["#DDEEFF", "secondary accent soft"],
    ["#12345A", "secondary accent text"],
    ["#336699", "secondary accent"],
    ["#FFF0D5", "decorative accent soft"],
    ["#5A3212", "decorative accent text"],
    ["#CC7722", "decorative accent"],
  ];
  const traces = Object.fromEntries(
    tokens.map(([, functionName]) => [
      functionName,
      {
        steps: [{
          stage: "gamut",
          message: "Candidate already fits inside sRGB.",
        }],
      },
    ]),
  );
  return {
    input: { vibe: "balanced", secondary: null },
    params: {
      stateLightnessStep: 0.08,
      harmony: "analogous",
    },
    supportingColors: {
      secondary: {
        isDerived: true,
        targetHue: rgbToOklch(hexToRgb("#336699")).h,
        edgeLabel: "P + 30°",
        relation: "Rotated around the hue wheel.",
      },
      additional: {
        isDerived: true,
        targetHue: rgbToOklch(hexToRgb("#CC7722")).h,
        edgeLabel: "P − 30°",
        relation: "Rotated around the hue wheel.",
      },
    },
    tokens,
    traces,
  };
}

test("constraint report covers every declared rule category", () => {
  const report = buildConstraintReport(makeResult());
  assert.deepEqual(
    new Set(report.checks.map((check) => check.category)),
    new Set(["contrast", "gamut", "state", "relation"]),
  );
  assert.equal(
    report.checks.filter((check) => check.category === "gamut").length,
    makeResult().tokens.length,
  );
});

test("constraint report exposes failing contrast rather than hiding it", () => {
  const result = makeResult();
  result.tokens = result.tokens.map(([hex, name]) =>
    name === "main text" ? ["#EEEEEE", name] : [hex, name],
  );
  const report = buildConstraintReport(result);
  const check = report.checks.find(
    ({ token, label }) =>
      token === "main text" && label === "Primary reading contrast",
  );
  assert.equal(check.status, "fail");
});

test("gamut adjustments remain visible in the report", () => {
  const result = makeResult();
  result.traces["decorative accent"].steps[0] = {
    stage: "gamut",
    message: "Reduced chroma by 12.0% to fit inside sRGB.",
    before: "oklch(70% 0.3 30)",
    after: "oklch(70% 0.264 30)",
  };
  const report = buildConstraintReport(result);
  const check = report.checks.find(
    ({ token, category }) =>
      token === "decorative accent" && category === "gamut",
  );
  assert.equal(check.status, "adjusted");
  assert.match(check.explanation, /0\.3 30.*0\.264 30/);
});
