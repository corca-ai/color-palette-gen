import { createHash } from "node:crypto";

import {
  DESTRUCTIVE_ANCHOR_POLICY,
  DESTRUCTIVE_ANCHOR_STRATEGIES,
} from "./destructive-anchor.js";
import { NoCandidateError, noCandidateFailure } from "./decision.js";
import {
  DIAGNOSTIC_RGB_CHANNELS,
  diagnosticInputGrid,
} from "./diagnostic-corpus.js";
import {
  generatePaletteV2,
  generatePaletteV2DestructiveAnchorCounterfactual,
} from "./palette.js";
import { inspectDestructiveCandidateConstraints } from "./feedback-search.js";
import { assertDiagnosticResult } from "./result-evidence.js";
import { candidate } from "./runtime.js";

const DESTRUCTIVE_ANCHOR_EXPERIMENT = Object.freeze({
  id: "destructive-fixed-default-anchor",
  ...DESTRUCTIVE_ANCHOR_POLICY,
});

function digest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function identity(result) {
  return {
    resultVersion: result.version,
    policyVersion: result.policyVersion,
    semanticModel: result.semanticEvaluation.model,
  };
}

function failedEvidence(result) {
  return {
    contracts: ["light", "dark"].flatMap((mode) =>
      result.modes[mode].checks
        .filter(({ pass }) => !pass)
        .map(({ id, role }) => `${mode}:${id ?? role}`),
    ),
    quality: result.quality.checks
      .filter(({ pass }) => !pass)
      .map(({ id }) => id),
    semantics: result.semanticEvaluation.evaluations
      .filter(({ status }) => status !== "satisfied")
      .map(({ id, status }) => `${id}:${status}`),
    shiftedModes: ["light", "dark"].filter(
      (mode) => result.modes[mode].adaptations.largeBrandShift,
    ),
  };
}

function modeObservation(result, mode) {
  const modeResult = result.modes[mode];
  const selected = modeResult.decisions.destructive.selected;
  const separation = selected.constraintResults.find(
    ({ id }) => id === "destructive.brand-separation",
  );
  const label = selected.constraintResults.find(
    ({ id }) => id === "destructive.label-contrast",
  );
  if (!separation || !label) {
    throw new TypeError(
      "destructive selection must expose label and Primary-separation evidence.",
    );
  }
  const normalizedModeResult = structuredClone(modeResult);
  delete normalizedModeResult.adaptations.diagnosticDestructiveAnchor;
  return {
    engineResultDigest: digest(normalizedModeResult),
    sourceBandApplicable: modeResult.adaptations.redConflict,
    appliedAnchor:
      modeResult.adaptations.diagnosticDestructiveAnchor?.preferredLightness ??
      (modeResult.adaptations.redConflict
        ? modeResult.recipe.conflictingDestructive
        : modeResult.recipe.destructive),
    primary: modeResult.values.primary,
    destructive: modeResult.values.destructive,
    destructiveHover: modeResult.values["destructive hover"],
    destructiveActive: modeResult.values["destructive active"],
    warning: modeResult.values.warning,
    warningHover: modeResult.values["warning hover"],
    warningActive: modeResult.values["warning active"],
    destructiveLightness: selected.oklch.l,
    primaryDestructiveDistance: separation.metrics.value,
    primaryDestructiveMargin:
      separation.metrics.value - separation.metrics.target,
    destructiveLabelLc: label.metrics.value,
  };
}

function normalizedEngineResult(result) {
  const normalized = structuredClone(result);
  delete normalized.diagnosticOverride;
  for (const mode of ["light", "dark"]) {
    delete normalized.modes[mode].adaptations.diagnosticDestructiveAnchor;
  }
  return normalized;
}

function observation(input, result) {
  assertDiagnosticResult(result);
  const modes = Object.fromEntries(
    ["light", "dark"].map((mode) => [mode, modeObservation(result, mode)]),
  );
  if (modes.light.sourceBandApplicable !== modes.dark.sourceBandApplicable) {
    throw new TypeError("source-band applicability must be input-scoped.");
  }
  return {
    input,
    sourceBandApplicable: modes.light.sourceBandApplicable,
    source: result.source,
    modes,
    evidence: failedEvidence(result),
    fullResultDigest: digest(result),
    normalizedEngineResultDigest: digest(normalizedEngineResult(result)),
  };
}

function transitionMap(before, after, field) {
  const ids = new Set(
    [...before, ...after].flatMap((item) => item.evidence[field]),
  );
  return Object.fromEntries(
    [...ids].sort().map((id) => {
      const introduced = [];
      const resolved = [];
      for (let index = 0; index < before.length; index += 1) {
        const had = before[index].evidence[field].includes(id);
        const has = after[index].evidence[field].includes(id);
        if (!had && has) introduced.push(before[index].input);
        if (had && !has) resolved.push(before[index].input);
      }
      return [id, { introduced, resolved }];
    }),
  );
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function summary(observations) {
  const modeItems = observations.flatMap(({ modes }) => Object.values(modes));
  const hasModes = modeItems.length > 0;
  return {
    inputCount: observations.length,
    modeCaseCount: modeItems.length,
    generatedContractFailureInputCount: observations.filter(
      ({ evidence }) => evidence.contracts.length > 0,
    ).length,
    qualityFindingInputCount: observations.filter(
      ({ evidence }) => evidence.quality.length > 0,
    ).length,
    semanticFindingInputCount: observations.filter(
      ({ evidence }) => evidence.semantics.length > 0,
    ).length,
    shiftedInputCount: observations.filter(
      ({ evidence }) => evidence.shiftedModes.length > 0,
    ).length,
    shiftedModeCaseCount: observations.reduce(
      (total, { evidence }) => total + evidence.shiftedModes.length,
      0,
    ),
    meanPrimaryDestructiveDistance: hasModes
      ? mean(
          modeItems.map(
            ({ primaryDestructiveDistance }) => primaryDestructiveDistance,
          ),
        )
      : null,
    minimumPrimaryDestructiveMargin: hasModes
      ? Math.min(
          ...modeItems.map(
            ({ primaryDestructiveMargin }) => primaryDestructiveMargin,
          ),
        )
      : null,
    minimumDestructiveLabelLc: hasModes
      ? Math.min(
          ...modeItems.map(({ destructiveLabelLc }) => destructiveLabelLc),
        )
      : null,
  };
}

export function buildDestructiveAnchorCounterfactualReport({
  channels = DIAGNOSTIC_RGB_CHANNELS,
  generateCurrent = generatePaletteV2,
  generateFixed = generatePaletteV2DestructiveAnchorCounterfactual,
} = {}) {
  const inputs = diagnosticInputGrid(channels);
  const current = [];
  const fixed = [];
  const infeasible = [];
  let producerIdentity;

  for (const input of inputs) {
    const currentResult = generateCurrent({ primary: input });
    assertDiagnosticResult(currentResult);
    producerIdentity ??= identity(currentResult);
    if (
      JSON.stringify(identity(currentResult)) !==
      JSON.stringify(producerIdentity)
    ) {
      throw new TypeError(
        "destructive anchor results must share producer identity.",
      );
    }
    const currentObservation = observation(input, currentResult);
    current.push(currentObservation);
    try {
      const fixedResult = generateFixed({
        primary: input,
        strategy: DESTRUCTIVE_ANCHOR_STRATEGIES.FIXED_DEFAULT,
      });
      if (
        JSON.stringify(identity(fixedResult)) !==
        JSON.stringify(producerIdentity)
      ) {
        throw new TypeError(
          "destructive anchor results must share producer identity.",
        );
      }
      const override = fixedResult.diagnosticOverride;
      if (
        override?.experiment !== "destructive-anchor" ||
        override?.strategy !== DESTRUCTIVE_ANCHOR_STRATEGIES.FIXED_DEFAULT ||
        JSON.stringify(override.policySnapshot) !==
          JSON.stringify(DESTRUCTIVE_ANCHOR_POLICY)
      ) {
        throw new TypeError(
          "destructive anchor experiment metadata is invalid.",
        );
      }
      const fixedObservation = observation(input, fixedResult);
      if (
        !currentObservation.sourceBandApplicable &&
        currentObservation.normalizedEngineResultDigest !==
          fixedObservation.normalizedEngineResultDigest
      ) {
        throw new TypeError(
          "out-of-band inputs must remain engine-identical in the fixed-anchor arm.",
        );
      }
      fixed.push(fixedObservation);
    } catch (error) {
      if (!(error instanceof NoCandidateError)) throw error;
      infeasible.push({ input, failure: noCandidateFailure(error) });
    }
  }

  const comparableCurrent = current.filter(({ input }) =>
    fixed.some((item) => item.input === input),
  );
  const applicableCurrent = comparableCurrent.filter(
    ({ sourceBandApplicable }) => sourceBandApplicable,
  );
  const applicableFixed = fixed.filter(
    ({ sourceBandApplicable }) => sourceBandApplicable,
  );
  const candidateConstraintParity = applicableCurrent.flatMap(
    (before, index) => {
      const after = applicableFixed[index];
      return ["light", "dark"].map((mode) => {
        const currentEvidence = inspectDestructiveCandidateConstraints({
          mode,
          primary: candidate(before.modes[mode].primary),
          preferredLightness: before.modes[mode].appliedAnchor,
        });
        const fixedEvidence = inspectDestructiveCandidateConstraints({
          mode,
          primary: candidate(after.modes[mode].primary),
          preferredLightness: after.modes[mode].appliedAnchor,
        });
        const currentDigest = digest(currentEvidence);
        const fixedDigest = digest(fixedEvidence);
        if (currentDigest !== fixedDigest) {
          throw new TypeError(
            "Destructive candidate and constraint evidence must remain identical between anchor strategies.",
          );
        }
        return { input: before.input, mode, digest: currentDigest };
      });
    },
  );
  const changedCases = applicableCurrent
    .map((before, index) => {
      const after = applicableFixed[index];
      const changedModes = ["light", "dark"].filter(
        (mode) =>
          before.modes[mode].engineResultDigest !==
          after.modes[mode].engineResultDigest,
      );
      return changedModes.length > 0
        ? {
            input: before.input,
            decisionEvidenceChangedModes: changedModes,
            current: before.modes,
            fixed: after.modes,
          }
        : null;
    })
    .filter(Boolean);
  const selectedRoleChanges = Object.fromEntries(
    [
      ["destructive", ["destructive"]],
      ["destructiveState", ["destructiveHover", "destructiveActive"]],
      ["warning", ["warning"]],
      ["warningState", ["warningHover", "warningActive"]],
    ].map(([id, fields]) => [
      id,
      applicableCurrent.reduce((count, before, index) => {
        const after = applicableFixed[index];
        return (
          count +
          ["light", "dark"].filter((mode) =>
            fields.some(
              (field) => before.modes[mode][field] !== after.modes[mode][field],
            ),
          ).length
        );
      }, 0),
    ]),
  );

  return {
    schema: "color-palette-destructive-anchor-counterfactual.v2",
    authority: "diagnostic",
    ...producerIdentity,
    experiment: {
      ...DESTRUCTIVE_ANCHOR_EXPERIMENT,
      currentStrategy: DESTRUCTIVE_ANCHOR_STRATEGIES.CURRENT_SOURCE_BAND,
      candidateStrategy: DESTRUCTIVE_ANCHOR_STRATEGIES.FIXED_DEFAULT,
      changedPolicyDimension:
        "Destructive preferred-lightness objective target only",
    },
    corpus: {
      kind: "rgb-channel-grid",
      channels: [...new Set(channels)].sort((a, b) => a - b),
      inputCount: inputs.length,
      sourceBandApplicableInputCount: current.filter(
        ({ sourceBandApplicable }) => sourceBandApplicable,
      ).length,
      sourceBandApplicableModeCaseCount:
        current.filter(({ sourceBandApplicable }) => sourceBandApplicable)
          .length * 2,
    },
    support: {
      currentInputCount: current.length,
      fixedInputCount: fixed.length,
      infeasible,
    },
    summaries: {
      current: summary(comparableCurrent),
      fixedDefaultAnchor: summary(fixed),
      sourceBandApplicable: {
        current: summary(applicableCurrent),
        fixedDefaultAnchor: summary(applicableFixed),
      },
    },
    comparison: {
      changedDecisionEvidenceInputCount: changedCases.length,
      changedDecisionEvidenceModeCaseCount: changedCases.reduce(
        (total, item) => total + item.decisionEvidenceChangedModes.length,
        0,
      ),
      unchangedApplicableInputCount:
        applicableCurrent.length - changedCases.length,
      nonApplicableIdentityMismatchCount: 0,
      selectedRoleChangedModeCaseCounts: selectedRoleChanges,
      candidateConstraintParityDigest: digest(candidateConstraintParity),
      contractTransitions: transitionMap(comparableCurrent, fixed, "contracts"),
      qualityTransitions: transitionMap(comparableCurrent, fixed, "quality"),
      semanticTransitions: transitionMap(comparableCurrent, fixed, "semantics"),
      sourceShiftModeTransitions: transitionMap(
        comparableCurrent,
        fixed,
        "shiftedModes",
      ),
      changedCases,
      currentFullResultDigest: digest(
        current.map(({ input, fullResultDigest }) => ({
          input,
          fullResultDigest,
        })),
      ),
      fixedFullResultDigest: digest(
        fixed.map(({ input, fullResultDigest }) => ({
          input,
          fullResultDigest,
        })),
      ),
    },
    interpretation: {
      measured:
        "Deterministic downstream effects of replacing the source-red-band alternate Destructive anchor with the normal mode anchor on this fixed corpus.",
      nonclaims: [
        "The result does not establish that the source-red band is perceptually or semantically unnecessary.",
        "The existing Primary-to-Destructive distance constraint validates only its recorded metric, not perceived meaning.",
        "The report does not recommend a production policy or an optimal Destructive anchor.",
      ],
    },
  };
}
