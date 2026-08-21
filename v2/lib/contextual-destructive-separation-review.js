import { oklchDifference } from "../../lib/color-math.js";

import {
  generatePaletteV2BothDarkerLegacyCounterfactual,
  generatePaletteV2ContextualDestructiveSeparationCounterfactual,
} from "./palette.js";
import { candidate } from "./runtime.js";

export const CONTEXTUAL_REVIEW_COHORTS = Object.freeze({
  separation: Object.freeze({
    id: "separation",
    label: "Primary–Destructive separation",
    description:
      "The candidate generates a complete palette, but Primary and Destructive miss the retained Oklab distance review.",
    inputs: Object.freeze([
      "#660000",
      "#990000",
      "#990033",
      "#993300",
      "#993333",
      "#CC0000",
      "#CC0033",
      "#CC3300",
      "#CC3333",
      "#CC6633",
      "#CC6666",
      "#FF0000",
      "#FF0033",
      "#FF0066",
      "#FF3300",
      "#FF3333",
      "#FF3366",
      "#FF6600",
      "#FF6633",
      "#FF6666",
      "#FF9966",
      "#FF9999",
    ]),
  }),
  sourceFidelity: Object.freeze({
    id: "source-fidelity",
    label: "Dark Primary source fidelity",
    description:
      "The candidate remains complete, but its selected Dark Primary moves beyond the existing provisional source-distance review.",
    inputs: Object.freeze([
      "#00CCFF",
      "#33CCCC",
      "#33CCFF",
      "#66CC99",
      "#66CCCC",
      "#99CC00",
      "#99CC33",
      "#99CC66",
      "#99CC99",
    ]),
  }),
});

function direction(values, role) {
  const levels = [role, `${role} hover`, `${role} active`].map(
    (name) => candidate(values[name]).oklch.l,
  );
  return {
    id: levels[0] > levels[1] && levels[1] > levels[2] ? "darker" : "lighter",
    levels,
  };
}

function sourceReview(result, mode) {
  return result.quality.checks.find(
    ({ id }) => id === `review.${mode}.source-fidelity`,
  );
}

function separationReview(result, mode) {
  return [
    ...(result.modes[mode].reviewOnlyChecks ?? []),
    ...result.modes[mode].checks,
  ].find(({ role }) => role === "Brand → destructive");
}

function modeEvidence(result, mode) {
  const { values } = result.modes[mode];
  const primary = candidate(values.primary);
  const destructive = candidate(values.destructive);
  return {
    mode,
    values,
    primary: {
      default: values.primary,
      hover: values["primary hover"],
      active: values["primary active"],
      text: values["primary text"],
      direction: direction(values, "primary"),
    },
    destructive: {
      default: values.destructive,
      hover: values["destructive hover"],
      active: values["destructive active"],
      text: values["destructive text"],
      direction: direction(values, "destructive"),
    },
    separation: separationReview(result, mode),
    sourceFidelity: sourceReview(result, mode),
    measuredSeparation: oklchDifference(primary.oklch, destructive.oklch)
      .deltaE,
    contractsPassed: result.modes[mode].passed,
  };
}

function armEvidence(id, label, result) {
  return {
    id,
    label,
    policyVersion: result.policyVersion,
    contractsPassed: result.contractsPassed,
    qualityReviewPassed: result.quality.passed,
    semanticModelSatisfied: result.semanticEvaluation.satisfied,
    modes: Object.fromEntries(
      ["light", "dark"].map((mode) => [mode, modeEvidence(result, mode)]),
    ),
  };
}

export function contextualReviewCohort(id) {
  const cohort = Object.values(CONTEXTUAL_REVIEW_COHORTS).find(
    (item) => item.id === id,
  );
  if (!cohort) throw new TypeError(`Unknown contextual review cohort: ${id}.`);
  return cohort;
}

export function buildContextualDestructiveSeparationReviewCase(input) {
  if (
    !Object.values(CONTEXTUAL_REVIEW_COHORTS).some(({ inputs }) =>
      inputs.includes(input),
    )
  ) {
    throw new TypeError(`Input is outside the bounded review queue: ${input}.`);
  }
  const current = generatePaletteV2BothDarkerLegacyCounterfactual({
    primary: input,
  });
  const candidateResult =
    generatePaletteV2ContextualDestructiveSeparationCounterfactual({
      primary: input,
    });
  return {
    input,
    source: current.source,
    current: armEvidence("current", "Previous · v15 grammar replay", current),
    candidate: armEvidence(
      "candidate",
      "Adopted · production v16",
      candidateResult,
    ),
  };
}
