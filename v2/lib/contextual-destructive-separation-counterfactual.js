import { createHash } from "node:crypto";

import { CONTEXTUAL_DESTRUCTIVE_SEPARATION_EXPERIMENT } from "./contextual-destructive-separation.js";
import { NoCandidateError, noCandidateFailure } from "./decision.js";
import {
  DIAGNOSTIC_RGB_CHANNELS,
  diagnosticInputGrid,
} from "./diagnostic-corpus.js";
import {
  generatePaletteV2BothDarkerLegacyCounterfactual,
  generatePaletteV2ContextualDestructiveSeparationCounterfactual,
} from "./palette.js";
import { V2_POLICY } from "./policy.js";
import { assertDiagnosticResult } from "./result-evidence.js";
import { candidate } from "./runtime.js";

function digest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function assertModeRelativeProgression(result) {
  for (const mode of ["light", "dark"]) {
    for (const family of ["primary", "destructive"]) {
      const lightness = [family, `${family} hover`, `${family} active`].map(
        (role) => candidate(result.modes[mode].values[role]).oklch.l,
      );
      const ordered =
        mode === "light"
          ? lightness[0] > lightness[1] && lightness[1] > lightness[2]
          : lightness[0] < lightness[1] && lightness[1] < lightness[2];
      if (!ordered) {
        throw new TypeError(
          `${mode} ${family} does not follow the contextual diagnostic direction.`,
        );
      }
    }
  }
}

function failedContractChecks(result) {
  return ["light", "dark"].flatMap((mode) =>
    result.modes[mode].checks
      .filter(({ pass }) => !pass)
      .map(({ role }) => `${mode}.${role}`),
  );
}

function failedQualityChecks(result) {
  return result.quality.checks
    .filter(({ pass }) => !pass)
    .map(({ id }) => id)
    .sort();
}

function semanticFindings(result) {
  return result.semanticEvaluation.evaluations
    .filter(({ status }) => status !== "satisfied")
    .map(({ id, status }) => `${id}:${status}`)
    .sort();
}

function failedPairEligibilityChecks(result) {
  const eligibilityIds = new Set(V2_POLICY.crossMode.eligibilityCheckIds);
  return result.quality.checks
    .filter(({ id, pass }) => eligibilityIds.has(id) && !pass)
    .map(({ id }) => id)
    .sort();
}

function roleValues(result) {
  return Object.fromEntries(
    ["light", "dark"].flatMap((mode) =>
      Object.entries(result.modes[mode].values).map(([role, value]) => [
        `${mode}.${role}`,
        value,
      ]),
    ),
  );
}

function observe(input, result) {
  assertDiagnosticResult(result);
  return {
    input,
    contractsPassed: result.contractsPassed,
    qualityReviewPassed: result.quality.passed,
    semanticModelSatisfied: result.semanticEvaluation.satisfied,
    failedContractChecks: failedContractChecks(result),
    failedQualityChecks: failedQualityChecks(result),
    semanticFindings: semanticFindings(result),
    failedPairEligibilityChecks: failedPairEligibilityChecks(result),
    roleValues: roleValues(result),
    fullResultDigest: digest(result),
  };
}

function observeCandidate(input, result) {
  const definition = result.diagnosticOverride?.experimentDefinition;
  if (
    result.diagnosticOverride?.experiment !==
      CONTEXTUAL_DESTRUCTIVE_SEPARATION_EXPERIMENT.id ||
    JSON.stringify(definition) !==
      JSON.stringify(CONTEXTUAL_DESTRUCTIVE_SEPARATION_EXPERIMENT) ||
    result.diagnosticOverride?.destructiveSeparationAuthority !==
      "selected-result-review"
  ) {
    throw new TypeError(
      "Contextual Destructive separation producer identity drifted.",
    );
  }
  assertModeRelativeProgression(result);
  const separationReview = {};
  for (const mode of ["light", "dark"]) {
    const modeResult = result.modes[mode];
    const checks = modeResult.reviewOnlyChecks;
    if (
      modeResult.adaptations.diagnosticDestructiveSeparationAuthority !==
        "selected-result-review" ||
      !Array.isArray(checks) ||
      checks.length !== 1 ||
      checks[0].role !==
        CONTEXTUAL_DESTRUCTIVE_SEPARATION_EXPERIMENT.retainedReviewRole ||
      modeResult.checks.some(
        ({ role }) =>
          role ===
          CONTEXTUAL_DESTRUCTIVE_SEPARATION_EXPERIMENT.retainedReviewRole,
      ) ||
      modeResult.nonTextChecks.some(({ role }) => role === checks[0].role)
    ) {
      throw new TypeError(
        `${mode} contextual separation evidence crossed its declared authority boundary.`,
      );
    }
    separationReview[mode] = {
      value: checks[0].value,
      target: checks[0].target,
      pass: checks[0].pass,
    };
  }
  return { ...observe(input, result), separationReview };
}

function transitions(current, candidate, field) {
  const ids = [
    ...new Set([...current, ...candidate].flatMap((item) => item[field])),
  ].sort();
  return Object.fromEntries(
    ids.map((id) => {
      const introduced = [];
      const resolved = [];
      candidate.forEach((item, index) => {
        const before = current[index][field].includes(id);
        const after = item[field].includes(id);
        if (!before && after) introduced.push(item.input);
        if (before && !after) resolved.push(item.input);
      });
      return [id, { introduced, resolved }];
    }),
  );
}

function changedRoleCounts(current, candidate) {
  const roles = [
    ...new Set(current.flatMap(({ roleValues: item }) => Object.keys(item))),
  ].sort();
  return Object.fromEntries(
    roles.map((role) => [
      role,
      candidate.reduce(
        (count, item, index) =>
          count + (current[index].roleValues[role] !== item.roleValues[role]),
        0,
      ),
    ]),
  );
}

function separationSummary(items) {
  if (items.length === 0) return null;
  return Object.fromEntries(
    ["light", "dark"].map((mode) => {
      const values = items.map(
        ({ separationReview }) => separationReview[mode].value,
      );
      return [
        mode,
        {
          modeCaseCount: values.length,
          passingModeCaseCount: items.filter(
            ({ separationReview }) => separationReview[mode].pass,
          ).length,
          meanDeltaE:
            values.reduce((sum, value) => sum + value, 0) / values.length,
          minimumDeltaE: Math.min(...values),
          maximumDeltaE: Math.max(...values),
        },
      ];
    }),
  );
}

function outcomeSummary(items) {
  return {
    inputCount: items.length,
    contractPassingInputCount: items.filter(({ contractsPassed }) =>
      Boolean(contractsPassed),
    ).length,
    qualityReviewPassingInputCount: items.filter(({ qualityReviewPassed }) =>
      Boolean(qualityReviewPassed),
    ).length,
    semanticModelSatisfiedInputCount: items.filter(
      ({ semanticModelSatisfied }) => semanticModelSatisfied,
    ).length,
    pairEligibilityMissInputCount: items.filter(
      ({ failedPairEligibilityChecks }) =>
        failedPairEligibilityChecks.length > 0,
    ).length,
  };
}

export function buildContextualDestructiveSeparationCounterfactualReport({
  channels = DIAGNOSTIC_RGB_CHANNELS,
  generateCurrent = generatePaletteV2BothDarkerLegacyCounterfactual,
  generateCandidate = generatePaletteV2ContextualDestructiveSeparationCounterfactual,
} = {}) {
  const inputs = diagnosticInputGrid(channels);
  const current = [];
  const candidateArm = [];
  const infeasible = [];
  for (const input of inputs) {
    current.push(observe(input, generateCurrent({ primary: input })));
    try {
      candidateArm.push(
        observeCandidate(input, generateCandidate({ primary: input })),
      );
    } catch (error) {
      if (!(error instanceof NoCandidateError)) throw error;
      infeasible.push({ input, failure: noCandidateFailure(error) });
    }
  }
  const comparableCurrent = current.filter(({ input }) =>
    candidateArm.some((item) => item.input === input),
  );
  const changedInputs = candidateArm.filter((item, index) =>
    Object.keys(item.roleValues).some(
      (role) =>
        item.roleValues[role] !== comparableCurrent[index].roleValues[role],
    ),
  );
  return {
    schema: "color-palette-contextual-destructive-separation-counterfactual.v1",
    authority: "diagnostic",
    experiment: CONTEXTUAL_DESTRUCTIVE_SEPARATION_EXPERIMENT,
    support: {
      inputCount: inputs.length,
      generatedInputCount: candidateArm.length,
      generationInfeasibleInputCount: infeasible.length,
      comparableInputCount: comparableCurrent.length,
    },
    outcomes: {
      current: outcomeSummary(comparableCurrent),
      candidate: {
        ...outcomeSummary(candidateArm),
        changedInputCount: changedInputs.length,
        separationReview: separationSummary(candidateArm),
      },
    },
    transitions: {
      contracts: transitions(
        comparableCurrent,
        candidateArm,
        "failedContractChecks",
      ),
      quality: transitions(
        comparableCurrent,
        candidateArm,
        "failedQualityChecks",
      ),
      semantics: transitions(
        comparableCurrent,
        candidateArm,
        "semanticFindings",
      ),
      pairEligibility: transitions(
        comparableCurrent,
        candidateArm,
        "failedPairEligibilityChecks",
      ),
      changedRoleModeCaseCounts: changedRoleCounts(
        comparableCurrent,
        candidateArm,
      ),
    },
    infeasible,
    changedInputs: changedInputs.map(({ input, separationReview }) => ({
      input,
      separationReview,
    })),
    currentResultDigest: digest(
      comparableCurrent.map(({ input, fullResultDigest }) => ({
        input,
        fullResultDigest,
      })),
    ),
    candidateResultDigest: digest(
      candidateArm.map(({ input, fullResultDigest }) => ({
        input,
        fullResultDigest,
      })),
    ),
    caseDigest: digest({ current: comparableCurrent, candidate: candidateArm }),
    interpretation: {
      finding:
        "This diagnostic tests whether Primary↔Destructive Oklab separation can remain visible review evidence instead of generation eligibility under the accepted one-filled-action hierarchy.",
      nonclaims: [
        "A generated result does not establish aesthetic or perceptual acceptability.",
        "A failed separation review remains false and is never relabeled as a pass.",
        "The fixed RGB grid is deterministic coverage, not population evidence.",
        "Production v15, its cache, and exported tokens remain unchanged.",
      ],
    },
  };
}
