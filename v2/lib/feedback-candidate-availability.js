import { createHash } from "node:crypto";

import { buildAdversarialDiagnosticReport } from "./adversarial-diagnostics.js";
import { DESTRUCTIVE_HUE_INVENTORY_EXPERIMENT } from "./destructive-hue-experiment.js";
import {
  generatePaletteV2,
  inspectFeedbackDefaultCandidateAvailabilityV2,
} from "./palette.js";

function incrementAvailability(counts, key, available) {
  const entry = counts[key] ?? { available: 0, unavailable: 0 };
  entry[available ? "available" : "unavailable"] += 1;
  counts[key] = entry;
}

function sortedAvailability(counts) {
  return Object.fromEntries(
    Object.entries(counts).sort(([first], [second]) =>
      first.localeCompare(second),
    ),
  );
}

function digest(value) {
  return createHash("sha256")
    .update(typeof value === "string" ? value : JSON.stringify(value))
    .digest("hex");
}

function addMap(target, source) {
  for (const [key, count] of Object.entries(source)) {
    target[key] = (target[key] ?? 0) + count;
  }
}

function isCount(value) {
  return Number.isInteger(value) && value >= 0;
}

function sortedMap(value) {
  return Object.fromEntries(
    Object.entries(value).sort(([first], [second]) =>
      first.localeCompare(second),
    ),
  );
}

function assertInspectorEvidence(availability, expected) {
  const funnel = availability?.candidateOccurrenceFunnel;
  const countMaps = [
    availability?.baseConstraintFailedIdOccurrenceCounts,
    availability?.baseConstraintFailedPatternOccurrenceCounts,
  ];
  if (
    availability?.input !== expected.input ||
    availability.mode !== expected.mode ||
    availability.relationship !== expected.relationship ||
    !Array.isArray(availability.candidateEvidenceIdentity) ||
    !funnel ||
    !Object.values(funnel).every(isCount) ||
    !Object.values(availability.candidateCounts ?? {}).every(isCount) ||
    countMaps.some(
      (map) =>
        !map ||
        Object.keys(map).some((key) => key.length === 0) ||
        !Object.values(map).every(isCount),
    ) ||
    availability.candidateEvidenceIdentity.length !==
      funnel.inventoryOccurrenceCount
  ) {
    throw new TypeError(
      "feedback candidate inspector evidence identity and counts must reconcile.",
    );
  }
  const failedIdsFromPatterns = {};
  for (const [pattern, count] of Object.entries(
    availability.baseConstraintFailedPatternOccurrenceCounts,
  )) {
    for (const id of pattern.split("+"))
      incrementMap(failedIdsFromPatterns, id, count);
  }
  if (
    JSON.stringify(sortedMap(failedIdsFromPatterns)) !==
    JSON.stringify(
      sortedMap(availability.baseConstraintFailedIdOccurrenceCounts),
    )
  ) {
    throw new TypeError(
      "feedback candidate failure IDs must reconcile with exact patterns.",
    );
  }
}

function incrementMap(counts, key, amount) {
  counts[key] = (counts[key] ?? 0) + amount;
}

function candidateOccurrenceAnalysis(items) {
  const analysis = {
    countingUnit: "candidate-occurrence-per-failed-check-case",
    failedCheckCaseCount: items.length,
    inventoryOccurrenceCount: 0,
    baseConstraintRejectedOccurrenceCount: 0,
    baseConstraintPassedHueReviewRejectedOccurrenceCount: 0,
    availableOccurrenceCount: 0,
    baseConstraintFailedIdOccurrenceCounts: {},
    baseConstraintFailedPatternOccurrenceCounts: {},
    caseOutcomeCategoryCounts: {},
  };
  for (const item of items) {
    const funnel = item.candidateOccurrenceFunnel;
    const expectedAvailable = funnel?.availableOccurrenceCount > 0;
    const expectedCategory = expectedAvailable
      ? "base-and-hue-alternative-available"
      : "base-pass-candidates-all-hue-rejected";
    if (
      !funnel ||
      funnel.inventoryOccurrenceCount <= 0 ||
      funnel.baseConstraintPassedHueReviewRejectedOccurrenceCount +
        funnel.availableOccurrenceCount <=
        0 ||
      funnel.inventoryOccurrenceCount !== item.candidateCounts.inventory ||
      funnel.baseConstraintRejectedOccurrenceCount +
        funnel.baseConstraintPassedHueReviewRejectedOccurrenceCount +
        funnel.availableOccurrenceCount !==
        funnel.inventoryOccurrenceCount ||
      funnel.baseConstraintPassedHueReviewRejectedOccurrenceCount +
        funnel.availableOccurrenceCount !==
        item.candidateCounts.baseConstraintPassing ||
      funnel.availableOccurrenceCount !==
        item.candidateCounts.semanticHuePassingAmongBase ||
      Object.values(item.baseConstraintFailedPatternOccurrenceCounts).reduce(
        (sum, count) => sum + count,
        0,
      ) !== funnel.baseConstraintRejectedOccurrenceCount ||
      item.roleLocalAlternativeAvailable !== expectedAvailable ||
      item.caseOutcomeCategory !== expectedCategory
    ) {
      throw new TypeError(
        "feedback candidate occurrence evidence must reconcile per case.",
      );
    }
    for (const key of [
      "inventoryOccurrenceCount",
      "baseConstraintRejectedOccurrenceCount",
      "baseConstraintPassedHueReviewRejectedOccurrenceCount",
      "availableOccurrenceCount",
    ]) {
      analysis[key] += funnel[key];
    }
    addMap(
      analysis.baseConstraintFailedIdOccurrenceCounts,
      item.baseConstraintFailedIdOccurrenceCounts,
    );
    addMap(
      analysis.baseConstraintFailedPatternOccurrenceCounts,
      item.baseConstraintFailedPatternOccurrenceCounts,
    );
    analysis.caseOutcomeCategoryCounts[item.caseOutcomeCategory] =
      (analysis.caseOutcomeCategoryCounts[item.caseOutcomeCategory] ?? 0) + 1;
  }
  for (const key of [
    "baseConstraintFailedIdOccurrenceCounts",
    "baseConstraintFailedPatternOccurrenceCounts",
    "caseOutcomeCategoryCounts",
  ]) {
    analysis[key] = Object.fromEntries(
      Object.entries(analysis[key]).sort(([first], [second]) =>
        first.localeCompare(second),
      ),
    );
  }
  return analysis;
}

function hueRungOccurrenceCounts(candidateEvidenceIdentity) {
  const counts = {};
  for (const item of candidateEvidenceIdentity) {
    for (const origin of item.parameters.requestedOrigins ?? []) {
      const key = String(origin.hue);
      const entry = counts[key] ?? {
        requestedOccurrenceCount: 0,
        baseConstraintRejectedOccurrenceCount: 0,
        baseConstraintPassedHueReviewRejectedOccurrenceCount: 0,
        availableOccurrenceCount: 0,
      };
      entry.requestedOccurrenceCount += 1;
      counts[key] = entry;
      if (item.terminalStage === "base-constraint-rejected") {
        entry.baseConstraintRejectedOccurrenceCount += 1;
      } else if (item.terminalStage === "base-passed-hue-review-rejected") {
        entry.baseConstraintPassedHueReviewRejectedOccurrenceCount += 1;
      } else {
        entry.availableOccurrenceCount += 1;
      }
    }
  }
  return sortedMap(counts);
}

export function assertDestructiveHueInventoryOrigins(
  expanded,
  currentEvidence,
) {
  const expectedHues = DESTRUCTIVE_HUE_INVENTORY_EXPERIMENT.requestedHues;
  const baselineLightnesses = currentEvidence.map(
    ({ parameters }) => parameters?.lightness,
  );
  if (
    baselineLightnesses.some((lightness) => !Number.isFinite(lightness)) ||
    new Set(baselineLightnesses).size !== baselineLightnesses.length
  ) {
    throw new TypeError(
      "current Destructive inventory requires unique finite lightness origins.",
    );
  }
  const expectedTuples = new Set(
    baselineLightnesses.flatMap((lightness) =>
      expectedHues.map((hue) => `${lightness}/${hue}`),
    ),
  );
  const tuples = new Set();
  let requestedCount = 0;
  for (const item of expanded.candidateEvidenceIdentity) {
    const origins = item.parameters?.requestedOrigins;
    if (!Array.isArray(origins) || origins.length === 0) {
      throw new TypeError(
        "expanded Destructive hue inventory requires requested origins.",
      );
    }
    for (const origin of origins) {
      const tuple = `${origin.lightness}/${origin.hue}`;
      if (
        !Number.isFinite(origin.lightness) ||
        !expectedHues.includes(origin.hue) ||
        tuples.has(tuple)
      ) {
        throw new TypeError(
          "expanded Destructive hue origins must match the fixed Cartesian inventory.",
        );
      }
      tuples.add(tuple);
      requestedCount += 1;
    }
  }
  if (
    requestedCount !== expanded.requestedCandidateOccurrenceCount ||
    JSON.stringify([...tuples].sort()) !==
      JSON.stringify([...expectedTuples].sort())
  ) {
    throw new TypeError(
      "expanded Destructive hue origin counts must reconcile with the current inventory.",
    );
  }
  return requestedCount;
}

function scopedFailedChecks(upstream) {
  const review = upstream.semanticHueReview;
  if (
    !review ||
    !Array.isArray(review.flaggedCases) ||
    review.flaggedInputCount !== review.flaggedCases.length
  ) {
    throw new TypeError(
      "feedback availability requires a reconciled flagged-input census.",
    );
  }
  const inputs = new Set();
  const cells = [];
  for (const item of review.flaggedCases) {
    if (
      typeof item.input !== "string" ||
      inputs.has(item.input) ||
      !Array.isArray(item.failedChecks)
    ) {
      throw new TypeError(
        "feedback availability requires unique flagged inputs and failed checks.",
      );
    }
    inputs.add(item.input);
    const checkIds = new Set();
    for (const check of item.failedChecks) {
      const expectedId = `review.${check.mode}.${check.relationship}-hue`;
      if (
        !["light", "dark"].includes(check.mode) ||
        !["primary-destructive", "primary-warning"].includes(
          check.relationship,
        ) ||
        check.id !== expectedId ||
        check.pass !== false ||
        checkIds.has(check.id)
      ) {
        throw new TypeError(
          "feedback availability requires unique exact failed semantic-hue checks.",
        );
      }
      checkIds.add(check.id);
      cells.push({ input: item.input, check });
    }
  }
  if (cells.length !== review.failedCheckOccurrenceCount) {
    throw new TypeError(
      "feedback availability failed-check count must reconcile.",
    );
  }
  return cells;
}

export function buildFeedbackCandidateAvailabilityReport({
  buildUpstream = buildAdversarialDiagnosticReport,
  generate = generatePaletteV2,
  inspect = inspectFeedbackDefaultCandidateAvailabilityV2,
} = {}) {
  const upstream = buildUpstream();
  if (upstream.schema !== "color-palette-adversarial-diagnostics.v3") {
    throw new TypeError(
      "feedback candidate availability requires adversarial diagnostics v3.",
    );
  }
  const scopedCells = scopedFailedChecks(upstream);
  const byMode = {};
  const byRelationship = {};
  const generated = new Map();
  const baselineEvidence = new Map();
  const cases = scopedCells.map(({ input, check }) => {
    const result = generated.get(input) ?? generate({ primary: input });
    generated.set(input, result);
    if (
      result.input?.primary !== input ||
      result.version !== upstream.resultVersion ||
      result.policyVersion !== upstream.policyVersion ||
      JSON.stringify(result.semanticEvaluation.model) !==
        JSON.stringify(upstream.semanticModel)
    ) {
      throw new TypeError(
        "feedback availability generated-result identity must match upstream.",
      );
    }
    const relationship = check.relationship.replace("primary-", "");
    const availability = inspect({
      result,
      mode: check.mode,
      relationship,
    });
    assertInspectorEvidence(availability, {
      input,
      mode: check.mode,
      relationship,
    });
    baselineEvidence.set(
      `${input}/${check.mode}/${relationship}`,
      availability,
    );
    incrementAvailability(
      byMode,
      check.mode,
      availability.roleLocalAlternativeAvailable,
    );
    incrementAvailability(
      byRelationship,
      check.relationship,
      availability.roleLocalAlternativeAvailable,
    );
    const {
      candidateSetIdentity,
      candidateEvidenceIdentity,
      ...publicAvailability
    } = availability;
    return {
      ...publicAvailability,
      candidateSetDigest: digest(candidateSetIdentity),
      candidateEvidenceDigest: digest(candidateEvidenceIdentity),
    };
  });
  const availableCaseCount = cases.filter(
    ({ roleLocalAlternativeAvailable }) => roleLocalAlternativeAvailable,
  ).length;
  const candidateOccurrenceTotals = cases.reduce(
    (totals, item) => ({
      inventory: totals.inventory + item.candidateCounts.inventory,
      baseConstraintPassing:
        totals.baseConstraintPassing +
        item.candidateCounts.baseConstraintPassing,
      semanticHuePassingAmongBase:
        totals.semanticHuePassingAmongBase +
        item.candidateCounts.semanticHuePassingAmongBase,
    }),
    { inventory: 0, baseConstraintPassing: 0, semanticHuePassingAmongBase: 0 },
  );
  const candidateOccurrenceFunnelsByRelationship = Object.fromEntries(
    ["primary-destructive", "primary-warning"].map((relationship) => [
      relationship,
      candidateOccurrenceAnalysis(
        cases.filter((item) => `primary-${item.relationship}` === relationship),
      ),
    ]),
  );
  const candidateOccurrenceFunnelsByModeAndRelationship = Object.fromEntries(
    ["light", "dark"].map((mode) => [
      mode,
      Object.fromEntries(
        ["primary-destructive", "primary-warning"].map((relationship) => [
          relationship,
          candidateOccurrenceAnalysis(
            cases.filter(
              (item) =>
                item.mode === mode &&
                `primary-${item.relationship}` === relationship,
            ),
          ),
        ]),
      ),
    ]),
  );
  const destructiveHueCases = scopedCells
    .filter(({ check }) => check.relationship === "primary-destructive")
    .map(({ input, check }) => {
      const relationship = "destructive";
      const expanded = inspect({
        result: generated.get(input),
        mode: check.mode,
        relationship,
        diagnosticDestructiveHueCandidates:
          DESTRUCTIVE_HUE_INVENTORY_EXPERIMENT.requestedHues,
      });
      assertInspectorEvidence(expanded, {
        input,
        mode: check.mode,
        relationship,
      });
      const current = baselineEvidence.get(
        `${input}/${check.mode}/${relationship}`,
      );
      assertDestructiveHueInventoryOrigins(
        expanded,
        current.candidateEvidenceIdentity,
      );
      const expandedByHex = new Map(
        expanded.candidateEvidenceIdentity.map((item) => [item.hex, item]),
      );
      const parityEvidence = ({
        hex,
        constraintResults,
        hueReview,
        terminalStage,
      }) => ({ hex, constraintResults, hueReview, terminalStage });
      if (
        current.candidateEvidenceIdentity.some(
          (item) =>
            JSON.stringify(
              parityEvidence(expandedByHex.get(item.hex) ?? {}),
            ) !== JSON.stringify(parityEvidence(item)),
        )
      ) {
        throw new TypeError(
          "expanded Destructive hue inventory must preserve current candidate evidence.",
        );
      }
      const transition = current.roleLocalAlternativeAvailable
        ? expanded.roleLocalAlternativeAvailable
          ? "retained-available"
          : "lost-available"
        : expanded.roleLocalAlternativeAvailable
          ? "newly-available"
          : "still-unavailable";
      if (transition === "lost-available") {
        throw new TypeError(
          "expanded Destructive hue inventory cannot lose current availability.",
        );
      }
      const {
        candidateSetIdentity,
        candidateEvidenceIdentity,
        ...publicExpanded
      } = expanded;
      return {
        ...publicExpanded,
        hueRungOccurrenceCounts: hueRungOccurrenceCounts(
          candidateEvidenceIdentity,
        ),
        availabilityTransition: transition,
        candidateSetDigest: digest(candidateSetIdentity),
        candidateEvidenceDigest: digest(candidateEvidenceIdentity),
      };
    });
  const transitionCounts = {};
  for (const item of destructiveHueCases) {
    incrementMap(transitionCounts, item.availabilityTransition, 1);
  }
  const hueRungOccurrenceTotals = {};
  for (const item of destructiveHueCases) {
    for (const [hue, counts] of Object.entries(item.hueRungOccurrenceCounts)) {
      const totals = (hueRungOccurrenceTotals[hue] ??= {});
      for (const [key, count] of Object.entries(counts)) {
        incrementMap(totals, key, count);
      }
    }
  }
  for (const counts of Object.values(hueRungOccurrenceTotals)) {
    if (
      counts.baseConstraintRejectedOccurrenceCount +
        counts.baseConstraintPassedHueReviewRejectedOccurrenceCount +
        counts.availableOccurrenceCount !==
      counts.requestedOccurrenceCount
    ) {
      throw new TypeError(
        "Destructive hue rung occurrence counts must conserve requested origins.",
      );
    }
  }
  const requestedCandidateOccurrenceCount = destructiveHueCases.reduce(
    (sum, item) => sum + item.requestedCandidateOccurrenceCount,
    0,
  );
  if (
    Object.values(hueRungOccurrenceTotals).reduce(
      (sum, counts) => sum + counts.requestedOccurrenceCount,
      0,
    ) !== requestedCandidateOccurrenceCount
  ) {
    throw new TypeError(
      "Destructive hue rung totals must reconcile with requested occurrences.",
    );
  }

  return {
    schema: "color-palette-feedback-default-candidate-availability.v3",
    authority: "diagnostic",
    resultVersion: upstream.resultVersion,
    policyVersion: upstream.policyVersion,
    semanticModel: upstream.semanticModel,
    upstream: {
      schema: upstream.schema,
      flaggedInputCount: upstream.semanticHueReview.flaggedInputCount,
      flaggedInputScopeCellCount:
        upstream.semanticHueReview.flaggedInputCount * 2 * 2,
      failedCheckCaseCount:
        upstream.semanticHueReview.failedCheckOccurrenceCount,
    },
    interpretation:
      "Tests role-local default-fill substitution feasibility only for the failed semantic-hue checks in adversarial diagnostics v3. Candidate-occurrence funnels describe where repeated conditional candidates leave this ordered probe; they do not identify causes, probabilities, unique colors, or a policy change. Candidates must pass their existing base constraints and the same provisional hue review. It does not establish hover/active family feasibility, shared-label or pacing preservation, joint Destructive/Warning substitution, or perceived meaning.",
    summary: {
      scopedFailedCheckCaseCount: cases.length,
      availableCaseCount,
      unavailableCaseCount: cases.length - availableCaseCount,
      candidateOccurrenceTotals,
      candidateOccurrenceFunnelsByRelationship,
      candidateOccurrenceFunnelsByModeAndRelationship,
      byMode: sortedAvailability(byMode),
      byRelationship: sortedAvailability(byRelationship),
    },
    destructiveHueInventoryProbe: {
      experiment: DESTRUCTIVE_HUE_INVENTORY_EXPERIMENT,
      scope: {
        failedDestructiveCheckCaseCount: destructiveHueCases.length,
        lightCaseCount: destructiveHueCases.filter(
          ({ mode }) => mode === "light",
        ).length,
        darkCaseCount: destructiveHueCases.filter(({ mode }) => mode === "dark")
          .length,
      },
      interpretation:
        "Compares the current 27° Destructive default-fill inventory with the fixed 12°/27°/42° diagnostic inventory in the same 66 failed-check contexts. ±15° mirrors the existing Warning inventory spacing; it is not an empirical semantic-red range. Hue-rung totals count requested origins when multiple requests converge to one rendered candidate; the expanded funnel counts unique rendered candidate occurrences. Availability remains role-local default-fill evidence and does not establish state-family, downstream Warning, perception, or policy suitability. The reported first candidate follows the unchanged lightness objective and technical hex tie-break, which has no semantic hue authority.",
      current: candidateOccurrenceAnalysis(
        cases.filter(({ relationship }) => relationship === "destructive"),
      ),
      expanded: candidateOccurrenceAnalysis(destructiveHueCases),
      requestedCandidateOccurrenceCount,
      uniqueRenderedCandidateOccurrenceCount: destructiveHueCases.reduce(
        (sum, item) => sum + item.candidateCounts.inventory,
        0,
      ),
      availabilityTransitionCounts: sortedMap(transitionCounts),
      hueRungOccurrenceTotals: sortedMap(hueRungOccurrenceTotals),
      newlyAvailableCases: destructiveHueCases
        .filter(
          ({ availabilityTransition }) =>
            availabilityTransition === "newly-available",
        )
        .map(({ input, mode, objectiveBestRoleLocalAlternative }) => ({
          input,
          mode,
          firstAvailableUnderExistingTechnicalRank: {
            selectionBasis: ["destructive.semantic-anchor", "stable.hex-order"],
            hex: objectiveBestRoleLocalAlternative.hex,
            oklch: objectiveBestRoleLocalAlternative.oklch,
            semanticHueReview:
              objectiveBestRoleLocalAlternative.semanticHueReview,
          },
        })),
      caseIdentityDigest: digest(
        destructiveHueCases.map(({ input, mode, availabilityTransition }) => ({
          input,
          mode,
          availabilityTransition,
        })),
      ),
      candidateEvidenceDigest: digest(
        destructiveHueCases.map(
          ({ candidateEvidenceDigest }) => candidateEvidenceDigest,
        ),
      ),
    },
    cases,
  };
}
