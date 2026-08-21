import { selectCandidate } from "./decision.js";
import { V2_POLICY, decisionPolicy, evidence } from "./policy.js";
import {
  chooseTextContrastForeground,
  TEXT_CONTRAST_STRATEGIES,
  textContrastEvidence,
} from "./text-contrast-strategy.js";
import {
  bindRule,
  candidate,
  destructiveTone,
  distance,
  stableTieBreaker,
  tone,
} from "./runtime.js";

function increment(counts, key) {
  counts[key] = (counts[key] ?? 0) + 1;
}

function destructiveLabelContrastResult({
  actionForeground,
  background,
  textContrastStrategy,
}) {
  const result = textContrastEvidence({
    foreground: actionForeground,
    backgrounds: [background],
    apcaMinimum: V2_POLICY.destructive.apcaDiagnosticLc,
    strategy: textContrastStrategy,
  });
  const lc = result.apca.minimum;
  if (textContrastStrategy !== TEXT_CONTRAST_STRATEGIES.APCA_ONLY) {
    return {
      passed: result.passed,
      reasons: [
        result.passed
          ? `Shared filled-action foreground passes ${textContrastStrategy}.`
          : `Shared filled-action foreground fails ${textContrastStrategy}.`,
      ],
      metrics: { ...result, text: actionForeground },
    };
  }
  return {
    passed: lc >= V2_POLICY.destructive.apcaDiagnosticLc,
    reasons: [
      lc >= V2_POLICY.destructive.apcaDiagnosticLc
        ? `Shared filled-action foreground reaches ${lc.toFixed(1)} Lc.`
        : `Shared filled-action foreground reaches only ${lc.toFixed(1)} Lc.`,
    ],
    metrics: {
      value: lc,
      target: V2_POLICY.destructive.apcaDiagnosticLc,
      text: actionForeground,
    },
  };
}

function destructiveCandidates([start, end], diagnosticHueCandidates) {
  const candidates = [];
  const renderedCandidates = new Map();
  for (
    let lightness = start;
    lightness <= end + V2_POLICY.destructive.candidateStep / 2;
    lightness += V2_POLICY.destructive.candidateStep
  ) {
    if (diagnosticHueCandidates === undefined) {
      candidates.push(candidate(destructiveTone(lightness), { lightness }));
      continue;
    }
    for (const hue of diagnosticHueCandidates) {
      const item = candidate(destructiveTone(lightness, hue), {
        lightness,
        requestedOrigins: [{ lightness, hue }],
      });
      const existing = renderedCandidates.get(item.hex);
      if (existing) {
        existing.parameters.requestedOrigins.push({ lightness, hue });
      } else {
        renderedCandidates.set(item.hex, item);
        candidates.push(item);
      }
    }
  }
  return candidates;
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
      parameters: item.parameters,
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
  actionForeground,
  preferredLightness,
  retainPlot = false,
  diagnosticHueCandidates,
  diagnosticEligibleHexes,
  diagnosticLightnessRange,
  diagnosticOmitBrandSeparation = false,
  textContrastStrategy = TEXT_CONTRAST_STRATEGIES.PRODUCTION,
}) {
  if (!["#000000", "#FFFFFF"].includes(actionForeground)) {
    throw new TypeError(
      "destructive search requires the mode's shared filled-action foreground.",
    );
  }
  if (typeof diagnosticOmitBrandSeparation !== "boolean") {
    throw new TypeError(
      "diagnosticOmitBrandSeparation must be a boolean diagnostic option.",
    );
  }
  const declaredPolicy = decisionPolicy("destructive");
  const policy = diagnosticOmitBrandSeparation
    ? {
        ...declaredPolicy,
        constraints: declaredPolicy.constraints.filter(
          ({ id }) => id !== "destructive.brand-separation",
        ),
      }
    : declaredPolicy;
  const range =
    diagnosticLightnessRange ?? V2_POLICY.destructive.lightnessRange[mode];
  if (
    !Array.isArray(range) ||
    range.length !== 2 ||
    range.some((value) => !Number.isFinite(value) || value < 0 || value > 1) ||
    range[0] > range[1]
  ) {
    throw new TypeError("Destructive lightness range must be a bounded pair.");
  }
  const candidates = destructiveCandidates(range, diagnosticHueCandidates);
  if (diagnosticEligibleHexes !== undefined) {
    if (
      !Array.isArray(diagnosticEligibleHexes) ||
      diagnosticEligibleHexes.some((hex) => typeof hex !== "string")
    ) {
      throw new TypeError(
        "diagnostic Destructive eligibility must be an array of rendered hexes.",
      );
    }
    const eligible = new Set(diagnosticEligibleHexes);
    candidates.splice(
      0,
      candidates.length,
      ...candidates.filter(({ hex }) => eligible.has(hex)),
    );
  }
  return selectCandidate({
    id: `${mode}.destructive`,
    mode,
    role: "destructive",
    intent:
      "Stay near the semantic red anchor while remaining readable and distinct from the generated brand.",
    candidates,
    policy,
    constraints: [
      bindRule(policy, "constraints", "destructive.label-contrast", (item) => {
        return destructiveLabelContrastResult({
          actionForeground,
          background: item.hex,
          textContrastStrategy,
        });
      }),
      ...(!diagnosticOmitBrandSeparation
        ? [
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
          ]
        : []),
    ],
    objectives: [
      bindRule(policy, "objectives", "destructive.semantic-anchor", (item) =>
        Math.abs(item.oklch.l - preferredLightness),
      ),
    ],
    tieBreakers: stableTieBreaker(policy),
    evidence: evidence(
      "wcagText",
      "apcaText",
      "destructiveSeparation",
      "calmMinimal",
    ),
    searchConstants: ["semantic red hue", "requested chroma"],
    retainPlot,
  });
}

export function inspectDestructiveCandidateConstraints({
  mode,
  primary,
  actionForeground,
  preferredLightness,
}) {
  return destructiveSearch({
    mode,
    primary,
    actionForeground,
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

function resolvedWarningRecipe(mode, recipe) {
  const configured = {
    preferredLightness: V2_POLICY.feedback.warningLightness[mode],
    chroma: V2_POLICY.feedback.warningChroma,
    anchorHue: V2_POLICY.feedback.warningHue,
    hueCandidates: V2_POLICY.feedback.warningHueCandidates,
    lightnessRange: V2_POLICY.feedback.warningRange[mode],
    ...recipe,
  };
  const validRange =
    Array.isArray(configured.lightnessRange) &&
    configured.lightnessRange.length === 2 &&
    configured.lightnessRange.every(
      (value) => Number.isFinite(value) && value > 0 && value < 1,
    ) &&
    configured.lightnessRange[0] <= configured.lightnessRange[1];
  const validHues =
    Number.isFinite(configured.anchorHue) &&
    Array.isArray(configured.hueCandidates) &&
    configured.hueCandidates.length > 0 &&
    configured.hueCandidates.every(Number.isFinite);
  const validCoordinates =
    Number.isFinite(configured.preferredLightness) &&
    configured.preferredLightness >= configured.lightnessRange?.[0] &&
    configured.preferredLightness <= configured.lightnessRange?.[1] &&
    Number.isFinite(configured.chroma) &&
    configured.chroma > 0 &&
    configured.chroma <= 0.24;
  if (!validRange || !validHues || !validCoordinates) {
    throw new TypeError(
      "Warning appearance recipe is outside its bounded diagnostic envelope.",
    );
  }
  return configured;
}

export function warningSearch({
  mode,
  primary,
  destructive,
  retainPlot = false,
  textContrastStrategy = TEXT_CONTRAST_STRATEGIES.PRODUCTION,
  recipe = null,
}) {
  const policy = decisionPolicy("warning");
  const configured = resolvedWarningRecipe(mode, recipe);
  const preferredLightness = configured.preferredLightness;
  const anchor = candidate(
    tone({
      l: preferredLightness,
      c: configured.chroma,
      h: configured.anchorHue,
    }),
  );
  const [start, end] = configured.lightnessRange;
  const candidates = [];
  for (let lightness = start; lightness <= end + 0.0025; lightness += 0.005) {
    for (const hue of configured.hueCandidates) {
      candidates.push(
        candidate(
          tone({
            l: lightness,
            c: configured.chroma,
            h: hue,
          }),
          { lightness, hue },
        ),
      );
    }
  }
  return selectCandidate({
    id: `${mode}.warning`,
    mode,
    role: "warning",
    intent:
      "Resolve an amber warning fill that remains readable and distinct from brand and destructive feedback.",
    candidates,
    policy,
    constraints: [
      bindRule(policy, "constraints", "feedback.label-contrast", (item) => {
        const choice = chooseTextContrastForeground({
          backgrounds: [item.hex],
          apcaMinimum: V2_POLICY.primary.apcaDiagnosticLc,
          strategy: textContrastStrategy,
        });
        const text = choice.foreground;
        const lc = choice.evidence.apca.minimum;
        const passed = choice.evidence.passed;
        if (textContrastStrategy !== TEXT_CONTRAST_STRATEGIES.APCA_ONLY) {
          return {
            passed,
            reasons: [
              passed
                ? `Best warning label passes ${textContrastStrategy}.`
                : `Best warning label fails ${textContrastStrategy}.`,
            ],
            metrics: { ...choice.evidence, text },
          };
        }
        return {
          passed,
          reasons: [
            passed
              ? `Best warning label reaches ${lc.toFixed(1)} Lc.`
              : `Best warning label reaches only ${lc.toFixed(1)} Lc.`,
          ],
          metrics: {
            lc,
            target: V2_POLICY.primary.apcaDiagnosticLc,
            text,
          },
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
    evidence: evidence(
      "wcagText",
      "apcaText",
      "destructiveSeparation",
      "calmMinimal",
    ),
    searchConstants: [
      "bounded amber hue candidates",
      "warning chroma",
      ...(recipe ? ["diagnostic warning appearance recipe"] : []),
    ],
    retainPlot: retainPlot === "detailed" ? "detailed" : true,
  });
}
