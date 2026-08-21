import { V2_POLICY } from "./policy.js";

export const CONTEXTUAL_DESTRUCTIVE_SEPARATION_EXPERIMENT = Object.freeze({
  id: "mode-relative-contextual-destructive-separation",
  authority: "diagnostic",
  directions: Object.freeze({ light: -1, dark: 1 }),
  generationConstraintOmitted: "destructive.brand-separation",
  retainedReviewRole: "Brand → destructive",
  separationThreshold: V2_POLICY.destructive.separation,
  presentationCondition:
    "Primary and Destructive are not simultaneously rendered as filled actions under ADR-0003.",
  fallback: "none",
});

export function assertContextualDestructiveSeparationExperiment(experiment) {
  if (
    JSON.stringify(experiment) !==
    JSON.stringify(CONTEXTUAL_DESTRUCTIVE_SEPARATION_EXPERIMENT)
  ) {
    throw new TypeError(
      "Contextual Destructive separation experiment identity drifted.",
    );
  }
  return experiment;
}
