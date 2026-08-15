import assert from "node:assert/strict";
import test from "node:test";

import { buildPrimaryChromaCounterfactualReport } from "../v2/lib/primary-chroma-counterfactual.js";
import { NoCandidateError } from "../v2/lib/decision.js";
import {
  generatePaletteV2,
  generatePaletteV2PrimaryChromaCounterfactual,
} from "../v2/lib/palette.js";
import { paletteCache } from "../v2/lib/runtime.js";

function withoutDiagnostic(result) {
  const copy = structuredClone(result);
  delete copy.diagnosticOverride;
  return copy;
}

test("Primary chroma diagnostic leaves production generation and cache unchanged", () => {
  const inputs = ["#000000", "#507096", "#FF00FF", "#FFFFFF"];
  for (const primary of inputs) {
    paletteCache.clear();
    const before = generatePaletteV2({ primary });
    const cached = paletteCache.get(`${before.policyVersion}/${primary}`);
    generatePaletteV2PrimaryChromaCounterfactual({ primary });
    assert.strictEqual(
      paletteCache.get(`${before.policyVersion}/${primary}`),
      cached,
    );
    assert.deepEqual(generatePaletteV2({ primary }), before);
  }
});

test("adaptive Primary chroma records requested and rendered candidate evidence", () => {
  const result = generatePaletteV2PrimaryChromaCounterfactual({
    primary: "#FF00FF",
  });
  const plot = result.modes.light.decisions.primary.searchPlot;
  const selected = result.modes.light.decisions.primary.selected;
  const selectedEvidence = plot.find(({ hex }) => hex === selected.hex);

  assert.equal(result.diagnosticOverride.experiment, "primary-chroma-ladder");
  assert.ok(plot.length > 0);
  assert.ok(
    selectedEvidence.parameters.requestedOrigins.every(
      ({ requestedLightness, requestedChroma }) =>
        Number.isFinite(requestedLightness) && Number.isFinite(requestedChroma),
    ),
  );
  assert.ok(
    plot.some(
      ({ parameters }) => (parameters.requestedOrigins?.length ?? 0) > 1,
    ),
  );
  assert.ok(
    selected.oklch.c >
      generatePaletteV2({ primary: "#FF00FF" }).modes.light.decisions.primary
        .selected.oklch.c,
  );
});

test("Primary chroma report is deterministic and claim-bounded", () => {
  const first = buildPrimaryChromaCounterfactualReport({ channels: [0, 255] });
  const second = buildPrimaryChromaCounterfactualReport({ channels: [255, 0] });

  assert.deepEqual(first, second);
  assert.equal(first.schema, "color-palette-primary-chroma-counterfactual.v1");
  assert.equal(
    first.experiment.id,
    "source-relative-four-origin-primary-chroma",
  );
  assert.equal(first.summaries.current.inputCount, 8);
  assert.ok(first.summaries.adaptive.requestedCandidateOccurrenceCount > 0);
  assert.ok(first.summaries.adaptive.renderedConvergenceCount > 0);
  assert.match(first.interpretation, /do not establish vividness/);
  assert.equal(
    first.comparisonToCurrent.changedCases[0].current.selectedRequestedOrigins
      .length,
    0,
  );
});

test("Primary chroma report records expected infeasibility and rethrows defects", () => {
  const unavailable = buildPrimaryChromaCounterfactualReport({
    channels: [0],
    generateAdaptive: () => {
      throw new NoCandidateError("dark.destructive has no candidate.");
    },
  });
  assert.equal(
    unavailable.summaries.adaptive.generationInfeasibleInputCount,
    1,
  );
  assert.deepEqual(unavailable.comparisonToCurrent.generationInfeasibleInputs, [
    { input: "#000000", reason: "dark.destructive has no candidate." },
  ]);
  assert.throws(
    () =>
      buildPrimaryChromaCounterfactualReport({
        channels: [0],
        generateAdaptive: () => {
          throw new Error("programming defect");
        },
      }),
    /programming defect/,
  );
});

test("Primary chroma report rejects invalid channels and mixed identities", () => {
  assert.throws(
    () => buildPrimaryChromaCounterfactualReport({ channels: [] }),
    /channels/,
  );
  assert.throws(
    () =>
      buildPrimaryChromaCounterfactualReport({
        channels: [0],
        generateAdaptive: ({ primary }) => ({
          ...withoutDiagnostic(
            generatePaletteV2PrimaryChromaCounterfactual({ primary }),
          ),
          policyVersion: "stale",
        }),
      }),
    /share producer identity/,
  );
  assert.throws(
    () =>
      buildPrimaryChromaCounterfactualReport({
        channels: [0],
        generateAdaptive: ({ primary }) => {
          const result = generatePaletteV2PrimaryChromaCounterfactual({
            primary,
          });
          result.diagnosticOverride.experimentDefinition = {
            ...result.diagnosticOverride.experimentDefinition,
            requestedScales: [1],
          };
          return result;
        },
      }),
    /experiment identity/,
  );
  assert.throws(
    () =>
      buildPrimaryChromaCounterfactualReport({
        channels: [0],
        generateAdaptive: ({ primary }) => {
          const result = generatePaletteV2PrimaryChromaCounterfactual({
            primary,
          });
          result.diagnosticOverride.primaryChromaExperiment = {
            ...result.diagnosticOverride.primaryChromaExperiment,
            requestedChromas: [0.123],
          };
          return result;
        },
      }),
    /experiment identity/,
  );
  assert.throws(
    () =>
      buildPrimaryChromaCounterfactualReport({
        channels: [0],
        generateAdaptive: ({ primary }) => {
          const result = generatePaletteV2PrimaryChromaCounterfactual({
            primary,
          });
          delete result.quality.checks[0].pass;
          return result;
        },
      }),
    /quality\.checks/,
  );
});
