import { createHash } from "node:crypto";

import { buildAdversarialDiagnosticReport } from "./adversarial-diagnostics.js";
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
  return createHash("sha256").update(value).digest("hex");
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
  const cases = scopedCells.map(({ input, check }) => {
    const result = generated.get(input) ?? generate({ primary: input });
    generated.set(input, result);
    if (
      result.version !== upstream.resultVersion ||
      result.policyVersion !== upstream.policyVersion ||
      JSON.stringify(result.semanticEvaluation.model) !==
        JSON.stringify(upstream.semanticModel)
    ) {
      throw new TypeError(
        "feedback availability generated-result identity must match upstream.",
      );
    }
    const availability = inspect({
      result,
      mode: check.mode,
      relationship: check.relationship.replace("primary-", ""),
    });
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
    const { candidateSetIdentity, ...publicAvailability } = availability;
    return {
      ...publicAvailability,
      candidateSetDigest: digest(candidateSetIdentity),
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

  return {
    schema: "color-palette-feedback-default-candidate-availability.v1",
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
      "Tests role-local default-fill substitution feasibility only for the failed semantic-hue checks in adversarial diagnostics v3. Candidates must pass their existing base constraints and the same provisional hue review. It does not establish hover/active family feasibility, shared-label or pacing preservation, joint Destructive/Warning substitution, perceived meaning, or a production policy change.",
    summary: {
      scopedFailedCheckCaseCount: cases.length,
      availableCaseCount,
      unavailableCaseCount: cases.length - availableCaseCount,
      candidateOccurrenceTotals,
      byMode: sortedAvailability(byMode),
      byRelationship: sortedAvailability(byRelationship),
    },
    cases,
  };
}
