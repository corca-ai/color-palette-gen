import assert from "node:assert/strict";
import test from "node:test";

import { buildConstraintReport } from "../lib/constraints.js";
import { rgbToOklch, hexToRgb } from "../lib/color-math.js";

function makeResult() {
  const tokens = [
    ["#FFFFFF", "background"],
    ["#FFFFFF", "surface"],
    ["#111111", "main text"],
    ["#555555", "secondary text"],
    ["#DDDDDD", "border"],
    ["#767676", "border control"],
    ["#B42318", "primary button default"],
    ["#921F17", "primary button hover"],
    ["#731A14", "primary button active"],
    ["#FFFFFF", "primary button text"],
    ["#555555", "focus ring"],
    ["#DDEEFF", "secondary accent soft"],
    ["#12345A", "secondary accent text"],
    ["#FFFFFF", "secondary accent on-color"],
    ["#336699", "secondary accent"],
    ["#FFF0D5", "decorative accent soft"],
    ["#5A3212", "decorative accent text"],
    ["#000000", "decorative accent on-color"],
    ["#CC7722", "decorative accent"],
  ];
  const traces = Object.fromEntries(
    tokens.map(([, functionName]) => [
      functionName,
      {
        steps: [
          {
            stage: "gamut",
            message: "Candidate already fits inside sRGB.",
          },
        ],
      },
    ]),
  );
  const artifacts = Object.fromEntries(
    tokens.map(([hex, functionName]) => {
      const color = rgbToOklch(hexToRgb(hex));
      return [
        functionName,
        {
          candidate: { space: "oklch", value: color },
          output: { srgb: { hex, oklch: color } },
          diagnostic: {
            adjusted: false,
            gamut: { chromaReductionRatio: 0 },
          },
        },
      ];
    }),
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
    artifacts,
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

test("constraint checks identify how each value was decided", () => {
  const report = buildConstraintReport(makeResult());
  const find = (token, category) =>
    report.checks.find(
      (check) => check.token === token && check.category === category,
    );

  assert.equal(find("main text", "contrast").decision.mode, "solved");
  assert.equal(
    find("primary button text", "contrast").decision.mode,
    "selected",
  );
  assert.equal(find("surface", "gamut").decision.mode, "validated");
  assert.equal(find("secondary accent", "relation").decision.mode, "validated");
  assert.equal(
    find("primary button hover", "state").decision.mode,
    "heuristic",
  );
  assert.match(find("main text", "contrast").decision.optimization, /nearest/i);
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
  result.artifacts["decorative accent"] = {
    candidate: {
      space: "oklch",
      value: { l: 0.7, c: 0.3, h: 30 },
    },
    output: {
      srgb: {
        hex: "#CC7722",
        oklch: { l: 0.7, c: 0.264, h: 30 },
      },
    },
    diagnostic: {
      adjusted: true,
      gamut: { chromaReductionRatio: 0.12 },
    },
  };
  const report = buildConstraintReport(result);
  const check = report.checks.find(
    ({ token, category }) =>
      token === "decorative accent" && category === "gamut",
  );
  assert.equal(check.status, "adjusted");
  assert.equal(check.decision.mode, "mapped");
  assert.ok(check.metrics.boundary > 0);
  assert.ok(check.metrics.candidate.c > check.metrics.boundary);
  assert.equal(
    check.explanation,
    "oklch(70.0% 0.300 30.0) → oklch(70.0% 0.264 30.0)",
  );
});

test("state checks expose perceptual and per-axis movement", () => {
  const report = buildConstraintReport(makeResult());
  const check = report.checks.find(
    ({ token, category }) =>
      token === "primary button hover" && category === "state",
  );
  assert.ok(check.metrics.deltaE > 0);
  assert.equal(typeof check.metrics.deltaL, "number");
  assert.equal(typeof check.metrics.deltaC, "number");
  assert.equal(typeof check.metrics.deltaH, "number");
  assert.match(check.actual, /ΔE .* · ΔL .* · ΔC .* · ΔH/);
});
