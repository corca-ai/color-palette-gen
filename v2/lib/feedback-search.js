import { apcaContrast } from "./apca.js";
import { selectCandidate } from "./decision.js";
import { V2_POLICY, decisionPolicy, evidence } from "./policy.js";
import {
  bindRule,
  candidate,
  chooseSharedText,
  destructiveTone,
  distance,
  stableTieBreaker,
  tone,
} from "./runtime.js";

function increment(counts, key) {
  counts[key] = (counts[key] ?? 0) + 1;
}

function validatedCandidateEvidence(item, hueReview, expectedIds) {
  if (
    typeof item?.hex !== "string" ||
    !Array.isArray(item.constraintResults) ||
    typeof item.passed !== "boolean" ||
    typeof hueReview?.pass !== "boolean"
  ) {
    throw new TypeError("feedback candidate evidence verdict is invalid.");
  }
  const constraintIds = item.constraintResults.map(({ id }) => id).sort();
  if (
    JSON.stringify(constraintIds) !== JSON.stringify(expectedIds) ||
    item.constraintResults.some(({ passed }) => typeof passed !== "boolean")
  ) {
    throw new TypeError(
      "feedback candidate evidence constraints must match producer policy.",
    );
  }
  const failedIds = item.constraintResults
    .filter(({ passed }) => !passed)
    .map(({ id }) => id)
    .sort();
  if (item.passed !== (failedIds.length === 0)) {
    throw new TypeError(
      "feedback candidate passed verdict must reconcile with constraints.",
    );
  }
  return failedIds;
}

export function summarizeFeedbackCandidateEvidence({
  searchPlot,
  hueReviews,
  expectedConstraintIds,
}) {
  if (
    !Array.isArray(searchPlot) ||
    searchPlot.length === 0 ||
    !Array.isArray(hueReviews) ||
    searchPlot.length !== hueReviews.length ||
    !Array.isArray(expectedConstraintIds) ||
    expectedConstraintIds.length === 0 ||
    new Set(expectedConstraintIds).size !== expectedConstraintIds.length
  ) {
    throw new TypeError("feedback candidate evidence shape is invalid.");
  }
  const expectedIds = [...expectedConstraintIds].sort();
  const baseConstraintFailedIdOccurrenceCounts = {};
  const baseConstraintFailedPatternOccurrenceCounts = {};
  const candidateEvidenceIdentity = [];
  let baseConstraintRejectedOccurrenceCount = 0;
  let baseConstraintPassedHueReviewRejectedOccurrenceCount = 0;
  let availableOccurrenceCount = 0;

  for (let index = 0; index < searchPlot.length; index += 1) {
    const item = searchPlot[index];
    const hueReview = hueReviews[index];
    const failedIds = validatedCandidateEvidence(item, hueReview, expectedIds);
    const basePassed = failedIds.length === 0;
    if (item.passed !== basePassed) {
      throw new TypeError(
        "feedback candidate passed verdict must reconcile with constraints.",
      );
    }
    let terminalStage;
    if (!basePassed) {
      terminalStage = "base-constraint-rejected";
      baseConstraintRejectedOccurrenceCount += 1;
      for (const id of failedIds)
        increment(baseConstraintFailedIdOccurrenceCounts, id);
      increment(
        baseConstraintFailedPatternOccurrenceCounts,
        failedIds.join("+"),
      );
    } else if (!hueReview.pass) {
      terminalStage = "base-passed-hue-review-rejected";
      baseConstraintPassedHueReviewRejectedOccurrenceCount += 1;
    } else {
      terminalStage = "available";
      availableOccurrenceCount += 1;
    }
    candidateEvidenceIdentity.push({
      hex: item.hex,
      constraintResults: item.constraintResults,
      hueReview,
      terminalStage,
    });
  }

  const inventoryOccurrenceCount = searchPlot.length;
  if (
    baseConstraintRejectedOccurrenceCount +
      baseConstraintPassedHueReviewRejectedOccurrenceCount +
      availableOccurrenceCount !==
    inventoryOccurrenceCount
  ) {
    throw new TypeError("feedback candidate evidence funnel must conserve.");
  }
  if (
    baseConstraintRejectedOccurrenceCount === inventoryOccurrenceCount &&
    inventoryOccurrenceCount > 0
  ) {
    throw new TypeError(
      "feedback candidate inventory must reproduce a base-passing production selection.",
    );
  }
  return {
    candidateOccurrenceFunnel: {
      inventoryOccurrenceCount,
      baseConstraintRejectedOccurrenceCount,
      baseConstraintPassedHueReviewRejectedOccurrenceCount,
      availableOccurrenceCount,
    },
    baseConstraintFailedIdOccurrenceCounts,
    baseConstraintFailedPatternOccurrenceCounts,
    caseOutcomeCategory:
      availableOccurrenceCount > 0
        ? "base-and-hue-alternative-available"
        : "base-pass-candidates-all-hue-rejected",
    candidateEvidenceIdentity,
  };
}

export function destructiveSearch({
  mode,
  primary,
  preferredLightness,
  retainPlot = false,
}) {
  const policy = decisionPolicy("destructive");
  const [start, end] = V2_POLICY.destructive.lightnessRange[mode];
  const candidates = [];
  for (
    let lightness = start;
    lightness <= end + V2_POLICY.destructive.candidateStep / 2;
    lightness += V2_POLICY.destructive.candidateStep
  ) {
    candidates.push(candidate(destructiveTone(lightness), { lightness }));
  }
  return selectCandidate({
    id: `${mode}.destructive`,
    role: "destructive",
    intent:
      "Stay near the semantic red anchor while remaining readable and distinct from the generated brand.",
    candidates,
    policy,
    constraints: [
      bindRule(policy, "constraints", "destructive.label-contrast", (item) => {
        const text = chooseSharedText([item.hex]);
        const lc = Math.abs(apcaContrast(text, item.hex));
        return {
          passed: lc >= V2_POLICY.destructive.labelLc,
          reasons: [
            lc >= V2_POLICY.destructive.labelLc
              ? `Best label reaches ${lc.toFixed(1)} Lc.`
              : `Best label reaches only ${lc.toFixed(1)} Lc.`,
          ],
          metrics: { value: lc, target: V2_POLICY.destructive.labelLc, text },
        };
      }),
      bindRule(
        policy,
        "constraints",
        "destructive.brand-separation",
        (item) => {
          const deltaE = distance(primary, item);
          const passed = deltaE >= V2_POLICY.destructive.separation;
          return {
            passed,
            reasons: [
              passed
                ? `Brand separation reaches ΔE ${deltaE.toFixed(3)}.`
                : `Brand separation ΔE ${deltaE.toFixed(3)} is below ${V2_POLICY.destructive.separation.toFixed(3)}.`,
            ],
            metrics: {
              value: deltaE,
              target: V2_POLICY.destructive.separation,
            },
          };
        },
      ),
    ],
    objectives: [
      bindRule(policy, "objectives", "destructive.semantic-anchor", (item) =>
        Math.abs(item.oklch.l - preferredLightness),
      ),
    ],
    tieBreakers: stableTieBreaker(policy),
    evidence: evidence("apcaText", "destructiveSeparation", "calmMinimal"),
    searchConstants: ["semantic red hue", "requested chroma"],
    retainPlot,
  });
}

export function inspectDestructiveCandidateConstraints({
  mode,
  primary,
  preferredLightness,
}) {
  return destructiveSearch({
    mode,
    primary,
    preferredLightness,
    retainPlot: "detailed",
  })
    .trace.searchPlot.map(({ hex, oklch, constraintResults, passed }) => ({
      hex,
      oklch,
      constraintResults,
      passed,
    }))
    .sort((first, second) => first.hex.localeCompare(second.hex));
}

export function warningSearch({
  mode,
  primary,
  destructive,
  retainPlot = false,
}) {
  const policy = decisionPolicy("warning");
  const preferredLightness = V2_POLICY.feedback.warningLightness[mode];
  const anchor = candidate(
    tone({
      l: preferredLightness,
      c: V2_POLICY.feedback.warningChroma,
      h: V2_POLICY.feedback.warningHue,
    }),
  );
  const [start, end] = V2_POLICY.feedback.warningRange[mode];
  const candidates = [];
  for (let lightness = start; lightness <= end + 0.0025; lightness += 0.005) {
    for (const hue of V2_POLICY.feedback.warningHueCandidates) {
      candidates.push(
        candidate(
          tone({
            l: lightness,
            c: V2_POLICY.feedback.warningChroma,
            h: hue,
          }),
          { lightness, hue },
        ),
      );
    }
  }
  return selectCandidate({
    id: `${mode}.warning`,
    role: "warning",
    intent:
      "Resolve an amber warning fill that remains readable and distinct from brand and destructive feedback.",
    candidates,
    policy,
    constraints: [
      bindRule(policy, "constraints", "feedback.label-contrast", (item) => {
        const text = chooseSharedText([item.hex]);
        const lc = Math.abs(apcaContrast(text, item.hex));
        const passed = lc >= V2_POLICY.primary.labelLc;
        return {
          passed,
          reasons: [
            passed
              ? `Best warning label reaches ${lc.toFixed(1)} Lc.`
              : `Best warning label reaches only ${lc.toFixed(1)} Lc.`,
          ],
          metrics: { lc, target: V2_POLICY.primary.labelLc, text },
        };
      }),
      bindRule(
        policy,
        "constraints",
        "feedback.semantic-separation",
        (item) => {
          const brandDistance = distance(primary, item);
          const destructiveDistance = distance(destructive, item);
          const minimumDistance = Math.min(brandDistance, destructiveDistance);
          const passed =
            minimumDistance >= V2_POLICY.feedback.semanticSeparation;
          return {
            passed,
            reasons: [
              passed
                ? `Nearest semantic color remains ΔE ${minimumDistance.toFixed(3)} away.`
                : `Nearest semantic color is only ΔE ${minimumDistance.toFixed(3)} away.`,
            ],
            metrics: {
              brandDistance,
              destructiveDistance,
              target: V2_POLICY.feedback.semanticSeparation,
            },
          };
        },
      ),
    ],
    objectives: [
      bindRule(policy, "objectives", "feedback.semantic-anchor", (item) =>
        distance(anchor, item),
      ),
    ],
    tieBreakers: stableTieBreaker(policy),
    evidence: evidence("apcaText", "destructiveSeparation", "calmMinimal"),
    searchConstants: ["bounded amber hue candidates", "warning chroma"],
    retainPlot: retainPlot === "detailed" ? "detailed" : true,
  });
}
