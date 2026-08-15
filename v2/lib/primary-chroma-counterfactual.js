import { createHash } from "node:crypto";

import {
  ADVERSARIAL_CHANNELS,
  assertDiagnosticResult,
} from "./adversarial-diagnostics.js";
import { NoCandidateError } from "./decision.js";
import {
  generatePaletteV2,
  generatePaletteV2PrimaryChromaCounterfactual,
} from "./palette.js";
import {
  PRIMARY_CHROMA_EXPERIMENT,
  primaryChromaRequests,
} from "./primary-chroma-experiment.js";

function digest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function inputGrid(channels) {
  return channels.flatMap((red) =>
    channels.flatMap((green) =>
      channels.map((blue) =>
        `#${[red, green, blue]
          .map((channel) => channel.toString(16).padStart(2, "0"))
          .join("")}`.toUpperCase(),
      ),
    ),
  );
}

function validateChannels(channels) {
  if (
    !Array.isArray(channels) ||
    channels.length === 0 ||
    channels.some(
      (channel) => !Number.isInteger(channel) || channel < 0 || channel > 255,
    )
  ) {
    throw new TypeError("channels must contain integers from 0 through 255.");
  }
}

function failedIds(result) {
  return {
    contracts: ["light", "dark"].flatMap((mode) =>
      result.modes[mode].checks
        .filter(({ pass }) => !pass)
        .map(({ id, role }) => `${mode}:${id ?? role}`),
    ),
    quality: result.quality.checks
      .filter(({ pass }) => !pass)
      .map(({ id }) => id),
    semantic: result.semanticEvaluation.evaluations
      .filter(({ status }) => status !== "satisfied")
      .map(({ id, status }) => `${id}:${status}`),
  };
}

function modeObservation(result, mode) {
  const modeResult = result.modes[mode];
  const selected = modeResult.decisions.primary.selected;
  const plot = modeResult.decisions.primary.searchPlot ?? [];
  const selectedPlot = plot.find(({ hex }) => hex === selected.hex);
  const origins = selectedPlot?.parameters?.requestedOrigins ?? [];
  const requestedCandidateOccurrences = plot.reduce(
    (total, item) => total + (item.parameters?.requestedOrigins?.length ?? 0),
    0,
  );
  const uniqueRenderedLadderCandidateCount = plot.filter(
    ({ parameters }) => (parameters?.requestedOrigins?.length ?? 0) > 0,
  ).length;
  return {
    selectedHex: modeResult.values.primary,
    selectedRealizedChroma: selected.oklch.c,
    selectedRequestedOrigins: origins,
    sourceDistance: modeResult.adaptations.primarySourceDistance,
    largeSourceShift: modeResult.adaptations.largeBrandShift,
    uniqueRenderedLadderCandidateCount,
    requestedCandidateOccurrences,
    renderedConvergenceCount: Math.max(
      0,
      requestedCandidateOccurrences - uniqueRenderedLadderCandidateCount,
    ),
    candidateSetDigest: digest(
      plot.map(
        ({
          hex,
          oklch,
          passed,
          parameters,
          stateFamily,
          constraintResults,
        }) => ({
          hex,
          oklch,
          passed,
          parameters,
          stateFamily,
          constraintResults,
        }),
      ),
    ),
  };
}

function observation(input, result) {
  assertDiagnosticResult(result);
  return {
    input,
    sourceChroma: result.source.oklch.c,
    classification: result.source.classification,
    generationInfeasibility: null,
    passed: result.passed,
    failures: failedIds(result),
    pairEligibilityMisses: result.pairDecision.selected.eligibilityMisses,
    pairQualityMisses: result.pairDecision.selected.qualityMisses,
    modes: Object.fromEntries(
      ["light", "dark"].map((mode) => [mode, modeObservation(result, mode)]),
    ),
  };
}

function infeasibleObservation(input, currentResult, error) {
  return {
    input,
    sourceChroma: currentResult.source.oklch.c,
    classification: currentResult.source.classification,
    generationInfeasibility: error.message,
    passed: false,
    failures: { contracts: [], quality: [], semantic: [] },
    pairEligibilityMisses: null,
    pairQualityMisses: null,
    modes: {},
  };
}

function countInputsWith(items, read) {
  return items.filter((item) => read(item)).length;
}

function summarize(items) {
  const modes = items.flatMap((item) => Object.values(item.modes));
  return {
    inputCount: items.length,
    selectedFromDiagnosticLadderInputCount: countInputsWith(items, (item) =>
      Object.values(item.modes).some(
        ({ selectedRequestedOrigins }) => selectedRequestedOrigins.length > 0,
      ),
    ),
    generationInfeasibleInputCount: countInputsWith(
      items,
      ({ generationInfeasibility }) => generationInfeasibility !== null,
    ),
    evaluatedInputCount: countInputsWith(
      items,
      ({ generationInfeasibility }) => generationInfeasibility === null,
    ),
    contractFailureInputCount: countInputsWith(
      items,
      (item) => !item.generationInfeasibility && !item.passed,
    ),
    pairEligibilityMissInputCount: countInputsWith(
      items,
      ({ pairEligibilityMisses }) => pairEligibilityMisses > 0,
    ),
    pairQualityMissInputCount: countInputsWith(
      items,
      ({ pairQualityMisses }) => pairQualityMisses > 0,
    ),
    qualityFindingInputCount: countInputsWith(
      items,
      ({ failures }) => failures.quality.length > 0,
    ),
    semanticFindingInputCount: countInputsWith(
      items,
      ({ failures }) => failures.semantic.length > 0,
    ),
    largeSourceShiftInputCount: countInputsWith(items, (item) =>
      Object.values(item.modes).some(
        ({ largeSourceShift }) => largeSourceShift,
      ),
    ),
    largeSourceShiftModeCount: modes.filter(
      ({ largeSourceShift }) => largeSourceShift,
    ).length,
    evaluatedModeCount: modes.length,
    meanModeSourceDistance: modes.length
      ? modes.reduce((total, { sourceDistance }) => total + sourceDistance, 0) /
        modes.length
      : null,
    maximumModeSourceDistance: modes.length
      ? Math.max(...modes.map(({ sourceDistance }) => sourceDistance))
      : null,
    meanSelectedRealizedChroma: modes.length
      ? modes.reduce(
          (total, { selectedRealizedChroma }) => total + selectedRealizedChroma,
          0,
        ) / modes.length
      : null,
    requestedCandidateOccurrenceCount: modes.reduce(
      (total, { requestedCandidateOccurrences }) =>
        total + requestedCandidateOccurrences,
      0,
    ),
    uniqueRenderedLadderCandidateCount: modes.reduce(
      (total, { uniqueRenderedLadderCandidateCount }) =>
        total + uniqueRenderedLadderCandidateCount,
      0,
    ),
    renderedConvergenceCount: modes.reduce(
      (total, { renderedConvergenceCount }) => total + renderedConvergenceCount,
      0,
    ),
  };
}

function transitionMap(current, adaptive, read) {
  const ids = new Set([...current, ...adaptive].flatMap((item) => read(item)));
  return Object.fromEntries(
    [...ids].sort().map((id) => {
      const introduced = [];
      const resolved = [];
      for (let index = 0; index < current.length; index += 1) {
        if (adaptive[index].generationInfeasibility) continue;
        const before = new Set(read(current[index])).has(id);
        const after = new Set(read(adaptive[index])).has(id);
        if (!before && after) introduced.push(adaptive[index].input);
        if (before && !after) resolved.push(adaptive[index].input);
      }
      return [id, { introduced, resolved }];
    }),
  );
}

function modeShiftIds(item) {
  return Object.entries(item.modes)
    .filter(([, value]) => value.largeSourceShift)
    .map(([mode]) => mode);
}

function comparison(current, adaptive) {
  const changedCases = adaptive.flatMap((item, index) =>
    item.generationInfeasibility
      ? [
          {
            input: item.input,
            sourceChroma: item.sourceChroma,
            generationInfeasibility: item.generationInfeasibility,
          },
        ]
      : ["light", "dark"].flatMap((mode) => {
          const before = current[index].modes[mode];
          const after = item.modes[mode];
          return before.selectedHex === after.selectedHex
            ? []
            : [
                {
                  input: item.input,
                  mode,
                  sourceChroma: item.sourceChroma,
                  current: before,
                  adaptive: after,
                },
              ];
        }),
  );
  return {
    commonSupportInputCount: adaptive.filter(
      ({ generationInfeasibility }) => !generationInfeasibility,
    ).length,
    changedInputCount: new Set(changedCases.map(({ input }) => input)).size,
    changedModeCount: changedCases.filter(({ mode }) => mode).length,
    generationInfeasibleInputs: adaptive
      .filter(({ generationInfeasibility }) => generationInfeasibility)
      .map(({ input, generationInfeasibility }) => ({
        input,
        reason: generationInfeasibility,
      })),
    changedCases,
    contractTransitions: transitionMap(
      current,
      adaptive,
      (item) => item.failures.contracts,
    ),
    qualityTransitions: transitionMap(
      current,
      adaptive,
      (item) => item.failures.quality,
    ),
    semanticTransitions: transitionMap(
      current,
      adaptive,
      (item) => item.failures.semantic,
    ),
    sourceShiftModeTransitions: transitionMap(current, adaptive, modeShiftIds),
  };
}

function identity(result) {
  return {
    resultVersion: result.version,
    policyVersion: result.policyVersion,
    semanticModel: result.semanticEvaluation.model,
  };
}

export function buildPrimaryChromaCounterfactualReport({
  channels = ADVERSARIAL_CHANNELS,
  generateCurrent = generatePaletteV2,
  generateAdaptive = generatePaletteV2PrimaryChromaCounterfactual,
} = {}) {
  validateChannels(channels);
  const inputs = inputGrid([...new Set(channels)].sort((a, b) => a - b));
  const current = [];
  const adaptive = [];
  let reportIdentity;
  let producerExperiment = PRIMARY_CHROMA_EXPERIMENT;
  for (const input of inputs) {
    const currentResult = generateCurrent({ primary: input });
    reportIdentity ??= identity(currentResult);
    if (
      JSON.stringify(identity(currentResult)) !== JSON.stringify(reportIdentity)
    ) {
      throw new TypeError(
        "primary chroma results must share producer identity.",
      );
    }
    current.push(observation(input, currentResult));
    try {
      const adaptiveResult = generateAdaptive({ primary: input });
      if (
        JSON.stringify(identity(adaptiveResult)) !==
        JSON.stringify(reportIdentity)
      ) {
        throw new TypeError(
          "primary chroma results must share producer identity.",
        );
      }
      const declaredExperiment =
        adaptiveResult.diagnosticOverride?.experimentDefinition;
      const appliedExperiment =
        adaptiveResult.diagnosticOverride?.primaryChromaExperiment;
      const expectedRequests = primaryChromaRequests(
        adaptiveResult.source.oklch.c,
      );
      const expectedAppliedExperiment = {
        ...PRIMARY_CHROMA_EXPERIMENT,
        requestedChromaOrigins: expectedRequests.origins,
        requestedChromas: expectedRequests.distinct,
        maximumRequestedChroma: adaptiveResult.source.oklch.c,
      };
      if (
        JSON.stringify(declaredExperiment) !==
          JSON.stringify(PRIMARY_CHROMA_EXPERIMENT) ||
        JSON.stringify(appliedExperiment) !==
          JSON.stringify(expectedAppliedExperiment)
      ) {
        throw new TypeError(
          "primary chroma experiment identity must match producer evidence.",
        );
      }
      producerExperiment = declaredExperiment;
      adaptive.push(observation(input, adaptiveResult));
    } catch (error) {
      if (!(error instanceof NoCandidateError)) throw error;
      adaptive.push(infeasibleObservation(input, currentResult, error));
    }
  }
  const commonIndexes = adaptive
    .map((item, index) => (item.generationInfeasibility ? null : index))
    .filter((index) => index !== null);
  const commonCurrent = commonIndexes.map((index) => current[index]);
  const commonAdaptive = commonIndexes.map((index) => adaptive[index]);
  return {
    schema: "color-palette-primary-chroma-counterfactual.v1",
    authority: "diagnostic",
    ...reportIdentity,
    corpus: {
      kind: "rgb-channel-grid",
      channels: [...new Set(channels)].sort((a, b) => a - b),
    },
    experiment: {
      ...producerExperiment,
      changedPolicyDimension:
        "Replace the Primary-only effective chroma cap and matching calm-chroma bound with a discrete ladder up to source chroma.",
    },
    interpretation:
      "Compares the current v12 engine with an expanded Primary-only source-relative chroma inventory and matching bound. Requested chroma may map to lower realized chroma. Results describe this fixed corpus and coupled engine; they do not establish vividness, aesthetic quality, optimal chroma, or a production policy recommendation.",
    summaries: {
      current: summarize(current),
      adaptive: summarize(adaptive),
      commonSupport: {
        current: summarize(commonCurrent),
        adaptive: summarize(commonAdaptive),
      },
    },
    candidateEvidence: {
      adaptiveModeCandidateSetDigest: digest(
        commonAdaptive.flatMap(({ input, modes }) =>
          Object.entries(modes).map(([mode, value]) => ({
            input,
            mode,
            digest: value.candidateSetDigest,
          })),
        ),
      ),
    },
    comparisonToCurrent: comparison(current, adaptive),
  };
}
