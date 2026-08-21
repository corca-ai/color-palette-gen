import { createHash } from "node:crypto";

import { NoCandidateError, noCandidateFailure } from "./decision.js";
import {
  DIAGNOSTIC_RGB_CHANNELS,
  diagnosticInputGrid,
} from "./diagnostic-corpus.js";
import { FILLED_ACTION_DIRECTION_EXPERIMENT } from "./filled-action-direction.js";
import {
  generatePaletteV2BothDarkerLegacyCounterfactual,
  generatePaletteV2FilledActionDirectionCounterfactual,
} from "./palette.js";
import { assertDiagnosticResult } from "./result-evidence.js";
import { candidate } from "./runtime.js";

function digest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function selectedDefaults(result) {
  return Object.fromEntries(
    ["light", "dark"].map((mode) => [
      mode,
      {
        primary: result.modes[mode].values.primary,
        destructive: result.modes[mode].values.destructive,
        foreground: result.modes[mode].values["primary text"],
      },
    ]),
  );
}

function defaultMetricSummary(cases, arm) {
  const values = cases.flatMap((item) =>
    ["primary", "destructive"].map((family) => {
      const color = candidate(item[arm].dark[family]).oklch;
      return { family, l: color.l, c: color.c };
    }),
  );
  return Object.fromEntries(
    ["primary", "destructive"].map((family) => {
      const familyValues = values.filter((item) => item.family === family);
      return [
        family,
        {
          meanLightness:
            familyValues.reduce((sum, item) => sum + item.l, 0) /
            familyValues.length,
          meanChroma:
            familyValues.reduce((sum, item) => sum + item.c, 0) /
            familyValues.length,
          minimumLightness: Math.min(...familyValues.map((item) => item.l)),
          maximumLightness: Math.max(...familyValues.map((item) => item.l)),
        },
      ];
    }),
  );
}

function assertModeRelativeProgression(result) {
  for (const mode of ["light", "dark"]) {
    for (const family of ["primary", "destructive"]) {
      const values = result.modes[mode].values;
      const lightness = [family, `${family} hover`, `${family} active`].map(
        (role) => candidate(values[role]).oklch.l,
      );
      const ordered =
        mode === "light"
          ? lightness[0] > lightness[1] && lightness[1] > lightness[2]
          : lightness[0] < lightness[1] && lightness[1] < lightness[2];
      if (!ordered) {
        throw new TypeError(
          `${mode} ${family} does not follow the diagnostic direction.`,
        );
      }
    }
  }
}

function successfulObservation(input, current, candidateResult) {
  assertDiagnosticResult(candidateResult);
  if (
    candidateResult.diagnosticOverride?.experiment !==
      FILLED_ACTION_DIRECTION_EXPERIMENT.id ||
    JSON.stringify(candidateResult.diagnosticOverride.experimentDefinition) !==
      JSON.stringify(FILLED_ACTION_DIRECTION_EXPERIMENT)
  ) {
    throw new TypeError("Filled-action direction experiment identity drifted.");
  }
  assertModeRelativeProgression(candidateResult);
  const currentDefaults = selectedDefaults(current);
  const candidateDefaults = selectedDefaults(candidateResult);
  return {
    input,
    status: "generated",
    changedDefaultModes: ["light", "dark"].filter(
      (mode) =>
        JSON.stringify(currentDefaults[mode]) !==
        JSON.stringify(candidateDefaults[mode]),
    ),
    currentDefaults,
    candidateDefaults,
    contractsPassed: candidateResult.contractsPassed,
    qualityReviewPassed: candidateResult.quality.passed,
    semanticModelSatisfied: candidateResult.semanticEvaluation.satisfied,
    darkDestructiveFamilyCandidateCounts:
      candidateResult.modes.dark.adaptations
        .diagnosticDestructiveFamilyCandidateCounts,
    resultDigest: digest(candidateResult),
  };
}

export function buildFilledActionDirectionCounterfactualReport({
  channels = DIAGNOSTIC_RGB_CHANNELS,
  generateCurrent = generatePaletteV2BothDarkerLegacyCounterfactual,
  generateCandidate = generatePaletteV2FilledActionDirectionCounterfactual,
} = {}) {
  const inputs = diagnosticInputGrid(channels);
  const cases = inputs.map((input) => {
    const current = generateCurrent({ primary: input });
    assertDiagnosticResult(current);
    try {
      return successfulObservation(
        input,
        current,
        generateCandidate({ primary: input }),
      );
    } catch (error) {
      if (!(error instanceof NoCandidateError)) throw error;
      return {
        input,
        status: "generation-infeasible",
        failure: noCandidateFailure(error),
        currentDefaults: selectedDefaults(current),
      };
    }
  });
  const generated = cases.filter(({ status }) => status === "generated");
  const infeasible = cases.filter(
    ({ status }) => status === "generation-infeasible",
  );
  const changedDefaultInputs = generated.filter(
    ({ changedDefaultModes }) => changedDefaultModes.length > 0,
  );
  return {
    schema: "color-palette-filled-action-direction-counterfactual.v1",
    authority: "diagnostic",
    experiment: FILLED_ACTION_DIRECTION_EXPERIMENT,
    scope: {
      inputCount: inputs.length,
      generatedInputCount: generated.length,
      generationInfeasibleInputCount: infeasible.length,
      changedDefaultInputCount: changedDefaultInputs.length,
    },
    failureCountsByDecision: Object.fromEntries(
      [...new Set(infeasible.map(({ failure }) => failure.decisionId))]
        .sort()
        .map((decisionId) => [
          decisionId,
          infeasible.filter(({ failure }) => failure.decisionId === decisionId)
            .length,
        ]),
    ),
    commonSupportDefaultMetrics:
      generated.length === 0
        ? null
        : {
            inputCount: generated.length,
            current: defaultMetricSummary(generated, "currentDefaults"),
            candidate: defaultMetricSummary(generated, "candidateDefaults"),
          },
    infeasibleInputs: infeasible.map(({ input, failure }) => ({
      input,
      failure,
    })),
    cases,
    caseDigest: digest(cases),
    interpretation: {
      finding:
        "This census tests a coupled diagnostic arm: Light-darker/Dark-lighter states plus transactional Dark Destructive default eligibility.",
      defaultFirstBoundary:
        "Generation feasibility does not establish that either arm has the better resting/default appearance.",
      noFallback:
        "Infeasible candidate results remain failures; the report does not fall back to current output.",
      nonclaims: [
        "No perceptual preference or production-policy recommendation is established.",
        "The fixed RGB corpus is deterministic coverage, not population evidence.",
        "A failure applies to the current candidate, foreground, and state-search envelope rather than to dark-mode interaction generally.",
      ],
    },
  };
}
