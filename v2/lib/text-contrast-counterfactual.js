import { createHash } from "node:crypto";

import { NoCandidateError, noCandidateFailure } from "./decision.js";
import { EVALUATION_INPUTS } from "./evaluation-inputs.js";
import {
  generatePaletteV2,
  generatePaletteV2TextContrastCounterfactual,
} from "./palette.js";
import { assertDiagnosticResult } from "./result-evidence.js";
import {
  TEXT_CONTRAST_EXPERIMENT,
  TEXT_CONTRAST_STRATEGIES,
} from "./text-contrast-strategy.js";

export const TEXT_CONTRAST_COUNTERFACTUAL_REPORT_SCHEMA =
  "text-contrast-policy-counterfactual-report.v2";

const STRATEGIES = TEXT_CONTRAST_EXPERIMENT.strategies;

function digest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function withoutDiagnosticOverride(result) {
  const normalized = structuredClone(result);
  delete normalized.diagnosticOverride;
  return normalized;
}

function changedRoles(current, selected) {
  return Object.fromEntries(
    ["light", "dark"].map((mode) => [
      mode,
      Object.keys(current.modes[mode].values).filter(
        (role) =>
          current.modes[mode].values[role] !==
          selected.modes[mode].values[role],
      ),
    ]),
  );
}

function assertExperimentIdentity(result, strategy) {
  if (
    result.diagnosticOverride?.experiment !== TEXT_CONTRAST_EXPERIMENT.id ||
    result.diagnosticOverride?.textContrastStrategy !== strategy ||
    JSON.stringify(result.diagnosticOverride.experimentDefinition) !==
      JSON.stringify(TEXT_CONTRAST_EXPERIMENT)
  ) {
    throw new TypeError("Text contrast experiment identity drifted.");
  }
}

function successfulObservation(input, strategy, current, selected) {
  assertDiagnosticResult(selected);
  assertExperimentIdentity(selected, strategy);
  const normalized = withoutDiagnosticOverride(selected);
  if (
    strategy === TEXT_CONTRAST_STRATEGIES.PRODUCTION &&
    JSON.stringify(normalized) !== JSON.stringify(current)
  ) {
    throw new TypeError(
      "Production diagnostic arm must preserve production output.",
    );
  }
  return {
    input,
    strategy,
    status: "generated",
    resultDigest: digest(normalized),
    changedRoles: changedRoles(current, selected),
    verdicts: {
      contractsPassed: selected.contractsPassed,
      qualityReviewPassed: selected.quality.passed,
      semanticModelSatisfied: selected.semanticEvaluation.satisfied,
      pairEligibilityMisses: selected.pairDecision.eligibilityMisses,
    },
  };
}

function strategySummary(cases, strategy) {
  const observations = cases.map(({ arms }) => arms[strategy]);
  const generated = observations.filter(({ status }) => status === "generated");
  const infeasible = observations.filter(
    ({ status }) => status === "generation-infeasible",
  );
  return {
    attemptedInputCount: observations.length,
    generatedInputCount: generated.length,
    generationInfeasibleInputCount: infeasible.length,
    contractsPassedInputCount: generated.filter(
      ({ verdicts }) => verdicts.contractsPassed,
    ).length,
    qualityReviewPassedInputCount: generated.filter(
      ({ verdicts }) => verdicts.qualityReviewPassed,
    ).length,
    semanticModelSatisfiedInputCount: generated.filter(
      ({ verdicts }) => verdicts.semanticModelSatisfied,
    ).length,
    changedInputCount: generated.filter(({ changedRoles: roles }) =>
      Object.values(roles).some((items) => items.length > 0),
    ).length,
    failureCountsByDecision: countBy(
      infeasible.map(({ failure }) => failure.decisionId),
    ),
    failedConstraintIdOccurrenceCounts: sumCountRecords(
      infeasible.map(
        ({ candidateFailureEvidence: evidence }) =>
          evidence?.failedIdOccurrenceCounts ?? {},
      ),
    ),
  };
}

function candidateFailureEvidence(searchPlot) {
  if (!Array.isArray(searchPlot) || searchPlot.length === 0) return null;
  const failedIdOccurrenceCounts = {};
  const failedPatternOccurrenceCounts = {};
  for (const item of searchPlot) {
    const failedIds = item.constraintResults
      .filter(({ passed }) => !passed)
      .map(({ id }) => id)
      .sort();
    const pattern = failedIds.join("+");
    failedPatternOccurrenceCounts[pattern] =
      (failedPatternOccurrenceCounts[pattern] ?? 0) + 1;
    for (const id of failedIds) {
      failedIdOccurrenceCounts[id] = (failedIdOccurrenceCounts[id] ?? 0) + 1;
    }
  }
  return {
    candidateOccurrenceCount: searchPlot.length,
    failedIdOccurrenceCounts,
    failedPatternOccurrenceCounts,
  };
}

export function buildTextContrastCounterfactualReport({
  inputs = EVALUATION_INPUTS,
  generateCurrent = generatePaletteV2,
  generateArm = generatePaletteV2TextContrastCounterfactual,
} = {}) {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new TypeError("Text contrast report requires one or more inputs.");
  }
  if (new Set(inputs).size !== inputs.length) {
    throw new TypeError("Text contrast report inputs must be unique.");
  }
  const cases = inputs.map((input) => {
    const current = generateCurrent({ primary: input });
    assertDiagnosticResult(current);
    const arms = Object.fromEntries(
      STRATEGIES.map((strategy) => {
        try {
          const selected = generateArm({ primary: input, strategy });
          return [
            strategy,
            successfulObservation(input, strategy, current, selected),
          ];
        } catch (error) {
          if (!(error instanceof NoCandidateError)) throw error;
          return [
            strategy,
            {
              input,
              strategy,
              status: "generation-infeasible",
              failure: noCandidateFailure(error),
              candidateFailureEvidence: candidateFailureEvidence(
                error.diagnosticSearchPlot,
              ),
            },
          ];
        }
      }),
    );
    return { input, currentResultDigest: digest(current), arms };
  });
  const summaries = Object.fromEntries(
    STRATEGIES.map((strategy) => [strategy, strategySummary(cases, strategy)]),
  );
  return {
    schema: TEXT_CONTRAST_COUNTERFACTUAL_REPORT_SCHEMA,
    authority: "diagnostic",
    experiment: TEXT_CONTRAST_EXPERIMENT,
    support: {
      inputCount: inputs.length,
      attemptedArmInputCount: inputs.length * STRATEGIES.length,
    },
    summaries,
    cases,
    caseDigest: digest(cases),
    interpretation: {
      nextGate:
        summaries[TEXT_CONTRAST_STRATEGIES.INTERSECTION]
          .generationInfeasibleInputCount === 0
          ? "eligible-for-broader-corpus-probe"
          : "current-inventory-falsifies-intersection-readiness",
      nonclaims: [
        "Generation feasibility does not establish visual quality or accessibility certification.",
        "The APCA-only and intersection arms do not redefine production WCAG eligibility or generated-contract authority.",
        "The intersection arm adds two independent eligibility requirements and never averages their measurements.",
      ],
    },
  };
}

function countBy(values) {
  return Object.fromEntries(
    [...new Set(values)]
      .sort()
      .map((value) => [value, values.filter((item) => item === value).length]),
  );
}

function sumCountRecords(records) {
  const result = {};
  for (const record of records) {
    for (const [id, count] of Object.entries(record)) {
      result[id] = (result[id] ?? 0) + count;
    }
  }
  return Object.fromEntries(
    Object.entries(result).sort(([first], [second]) =>
      first.localeCompare(second),
    ),
  );
}
