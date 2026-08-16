import assert from "node:assert/strict";
import test from "node:test";

import {
  DESTRUCTIVE_ANCHOR_POLICY,
  DESTRUCTIVE_ANCHOR_STRATEGIES,
  destructiveAnchorDecision,
} from "../v2/lib/destructive-anchor.js";
import {
  generatePaletteV2,
  generatePaletteV2DestructiveAnchorCounterfactual,
} from "../v2/lib/palette.js";
import { NoCandidateError } from "../v2/lib/decision.js";
import { buildDestructiveAnchorCounterfactualReport } from "../v2/lib/destructive-anchor-counterfactual.js";

function input(h, classification = "chromatic") {
  return { h, classification };
}

function withoutDiagnosticEvidence(result) {
  const normalized = structuredClone(result);
  delete normalized.diagnosticOverride;
  for (const mode of ["light", "dark"]) {
    delete normalized.modes[mode].adaptations.diagnosticDestructiveAnchor;
  }
  return normalized;
}

test("destructive anchor decision preserves the strict source-band boundary", () => {
  const inside = destructiveAnchorDecision({
    input: input(27 + 37.999),
    mode: "light",
  });
  const equal = destructiveAnchorDecision({
    input: input(27 + 38),
    mode: "light",
  });
  const wrapped = destructiveAnchorDecision({
    input: input(350),
    mode: "light",
  });
  const achromatic = destructiveAnchorDecision({
    input: input(27, "achromatic"),
    mode: "light",
  });

  assert.equal(inside.usesSourceBandAlternative, true);
  assert.equal(equal.usesSourceBandAlternative, false);
  assert.equal(wrapped.usesSourceBandAlternative, true);
  assert.equal(achromatic.usesSourceBandAlternative, false);
  assert.equal(inside.preferredLightness, 0.43);
  assert.equal(equal.preferredLightness, 0.54);
});

test("fixed-default strategy changes only the applicable objective target", () => {
  const current = destructiveAnchorDecision({ input: input(27), mode: "dark" });
  const fixed = destructiveAnchorDecision({
    input: input(27),
    mode: "dark",
    strategy: DESTRUCTIVE_ANCHOR_STRATEGIES.FIXED_DEFAULT,
  });

  assert.equal(current.sourceBandApplicable, true);
  assert.equal(fixed.sourceBandApplicable, true);
  assert.equal(current.preferredLightness, 0.68);
  assert.equal(fixed.preferredLightness, 0.637);
  assert.equal(DESTRUCTIVE_ANCHOR_POLICY.conflictRadiusDegrees, 38);
  assert.throws(
    () =>
      destructiveAnchorDecision({
        input: input(27),
        mode: "light",
        strategy: "unknown",
      }),
    /Unsupported destructive anchor strategy/u,
  );
});

test("fixed-default diagnostic preserves out-of-band output and production cache", () => {
  const before = generatePaletteV2({ primary: "#507096" });
  const diagnostic = generatePaletteV2DestructiveAnchorCounterfactual({
    primary: "#507096",
  });
  const after = generatePaletteV2({ primary: "#507096" });

  assert.strictEqual(after, before);
  assert.deepEqual(withoutDiagnosticEvidence(diagnostic), before);
  assert.deepEqual(
    diagnostic.diagnosticOverride.policySnapshot,
    DESTRUCTIVE_ANCHOR_POLICY,
  );
});

test("fixed-default diagnostic applies the normal anchor to source-band inputs", () => {
  const production = generatePaletteV2({ primary: "#FF0000" });
  const result = generatePaletteV2DestructiveAnchorCounterfactual({
    primary: "#FF0000",
  });
  assert.strictEqual(generatePaletteV2({ primary: "#FF0000" }), production);

  for (const mode of ["light", "dark"]) {
    const evidence = result.modes[mode].adaptations.diagnosticDestructiveAnchor;
    assert.equal(evidence.sourceBandApplicable, true);
    assert.equal(evidence.usesSourceBandAlternative, false);
    assert.equal(
      evidence.preferredLightness,
      result.modes[mode].recipe.destructive,
    );
  }
});

test("destructive anchor report represents an empty applicable cohort explicitly", () => {
  const report = buildDestructiveAnchorCounterfactualReport({ channels: [0] });

  assert.equal(report.corpus.sourceBandApplicableInputCount, 0);
  assert.deepEqual(report.summaries.sourceBandApplicable.current, {
    inputCount: 0,
    modeCaseCount: 0,
    generatedContractFailureInputCount: 0,
    qualityFindingInputCount: 0,
    semanticFindingInputCount: 0,
    shiftedInputCount: 0,
    shiftedModeCaseCount: 0,
    meanPrimaryDestructiveDistance: null,
    minimumPrimaryDestructiveMargin: null,
    minimumDestructiveLabelLc: null,
  });
});

test("destructive anchor report serializes only valid candidate exhaustion", () => {
  const structured = buildDestructiveAnchorCounterfactualReport({
    channels: [0],
    generateFixed: () => {
      throw new NoCandidateError("dark.destructive exhausted.", {
        decisionId: "dark.destructive",
        mode: "dark",
        role: "destructive",
      });
    },
  });
  assert.deepEqual(structured.support.infeasible, [
    {
      input: "#000000",
      failure: {
        code: "NO_CANDIDATE",
        decisionId: "dark.destructive",
        mode: "dark",
        role: "destructive",
        stage: "candidate-selection",
        message: "dark.destructive exhausted.",
      },
    },
  ]);

  assert.throws(
    () =>
      buildDestructiveAnchorCounterfactualReport({
        channels: [0],
        generateFixed: () => {
          throw new NoCandidateError("legacy");
        },
      }),
    /structured decision failure provenance/,
  );
  assert.throws(
    () =>
      buildDestructiveAnchorCounterfactualReport({
        channels: [0],
        generateFixed: () => {
          throw new Error("unexpected");
        },
      }),
    /unexpected/,
  );
});
