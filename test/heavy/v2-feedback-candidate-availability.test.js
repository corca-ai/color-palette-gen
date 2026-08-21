import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { buildFeedbackCandidateAvailabilityReport } from "../../v2/lib/feedback-candidate-availability.js";

function digest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

test("reviewed feedback default-candidate census remains reproducible", () => {
  const report = buildFeedbackCandidateAvailabilityReport();
  const destructiveAvailable = report.cases.filter(
    ({ relationship, roleLocalAlternativeAvailable }) =>
      relationship === "destructive" && roleLocalAlternativeAvailable,
  );
  const totals = report.cases.reduce(
    (sum, item) => ({
      inventory: sum.inventory + item.candidateCounts.inventory,
      baseConstraintPassing:
        sum.baseConstraintPassing + item.candidateCounts.baseConstraintPassing,
      semanticHuePassingAmongBase:
        sum.semanticHuePassingAmongBase +
        item.candidateCounts.semanticHuePassingAmongBase,
    }),
    { inventory: 0, baseConstraintPassing: 0, semanticHuePassingAmongBase: 0 },
  );

  assert.equal(
    report.schema,
    "color-palette-feedback-default-candidate-availability.v3",
  );
  assert.equal(report.policyVersion, "v2-policy-model-19");
  assert.deepEqual(report.upstream, {
    schema: "color-palette-adversarial-diagnostics.v3",
    flaggedInputCount: 59,
    flaggedInputScopeCellCount: 236,
    failedCheckCaseCount: 120,
  });
  const {
    candidateOccurrenceFunnelsByModeAndRelationship,
    ...summaryWithoutModeFunnels
  } = report.summary;
  assert.deepEqual(summaryWithoutModeFunnels, {
    scopedFailedCheckCaseCount: 120,
    availableCaseCount: 43,
    unavailableCaseCount: 77,
    candidateOccurrenceTotals: {
      inventory: 9156,
      baseConstraintPassing: 5609,
      semanticHuePassingAmongBase: 1079,
    },
    candidateOccurrenceFunnelsByRelationship: {
      "primary-destructive": {
        countingUnit: "candidate-occurrence-per-failed-check-case",
        failedCheckCaseCount: 66,
        inventoryOccurrenceCount: 2838,
        baseConstraintRejectedOccurrenceCount: 165,
        baseConstraintPassedHueReviewRejectedOccurrenceCount: 2659,
        availableOccurrenceCount: 14,
        baseConstraintFailedIdOccurrenceCounts: {
          "destructive.label-contrast": 165,
        },
        baseConstraintFailedPatternOccurrenceCounts: {
          "destructive.label-contrast": 165,
        },
        caseOutcomeCategoryCounts: {
          "base-and-hue-alternative-available": 1,
          "base-pass-candidates-all-hue-rejected": 65,
        },
      },
      "primary-warning": {
        countingUnit: "candidate-occurrence-per-failed-check-case",
        failedCheckCaseCount: 54,
        inventoryOccurrenceCount: 6318,
        baseConstraintRejectedOccurrenceCount: 3382,
        baseConstraintPassedHueReviewRejectedOccurrenceCount: 1871,
        availableOccurrenceCount: 1065,
        baseConstraintFailedIdOccurrenceCounts: {
          "feedback.label-contrast": 1782,
          "feedback.semantic-separation": 1603,
        },
        baseConstraintFailedPatternOccurrenceCounts: {
          "feedback.label-contrast": 1779,
          "feedback.label-contrast+feedback.semantic-separation": 3,
          "feedback.semantic-separation": 1600,
        },
        caseOutcomeCategoryCounts: {
          "base-and-hue-alternative-available": 42,
          "base-pass-candidates-all-hue-rejected": 12,
        },
      },
    },
    byMode: {
      dark: { available: 21, unavailable: 39 },
      light: { available: 22, unavailable: 38 },
    },
    byRelationship: {
      "primary-destructive": { available: 1, unavailable: 65 },
      "primary-warning": { available: 42, unavailable: 12 },
    },
  });
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(candidateOccurrenceFunnelsByModeAndRelationship).map(
        ([mode, relationships]) => [
          mode,
          Object.fromEntries(
            Object.entries(relationships).map(([relationship, funnel]) => [
              relationship,
              {
                failedCheckCaseCount: funnel.failedCheckCaseCount,
                inventoryOccurrenceCount: funnel.inventoryOccurrenceCount,
                baseConstraintRejectedOccurrenceCount:
                  funnel.baseConstraintRejectedOccurrenceCount,
                baseConstraintPassedHueReviewRejectedOccurrenceCount:
                  funnel.baseConstraintPassedHueReviewRejectedOccurrenceCount,
                availableOccurrenceCount: funnel.availableOccurrenceCount,
              },
            ]),
          ),
        ],
      ),
    ),
    {
      light: {
        "primary-destructive": {
          failedCheckCaseCount: 33,
          inventoryOccurrenceCount: 1749,
          baseConstraintRejectedOccurrenceCount: 0,
          baseConstraintPassedHueReviewRejectedOccurrenceCount: 1735,
          availableOccurrenceCount: 14,
        },
        "primary-warning": {
          failedCheckCaseCount: 27,
          inventoryOccurrenceCount: 3321,
          baseConstraintRejectedOccurrenceCount: 1725,
          baseConstraintPassedHueReviewRejectedOccurrenceCount: 1008,
          availableOccurrenceCount: 588,
        },
      },
      dark: {
        "primary-destructive": {
          failedCheckCaseCount: 33,
          inventoryOccurrenceCount: 1089,
          baseConstraintRejectedOccurrenceCount: 165,
          baseConstraintPassedHueReviewRejectedOccurrenceCount: 924,
          availableOccurrenceCount: 0,
        },
        "primary-warning": {
          failedCheckCaseCount: 27,
          inventoryOccurrenceCount: 2997,
          baseConstraintRejectedOccurrenceCount: 1657,
          baseConstraintPassedHueReviewRejectedOccurrenceCount: 863,
          availableOccurrenceCount: 477,
        },
      },
    },
  );
  assert.deepEqual(report.destructiveHueInventoryProbe.experiment, {
    id: "bounded-red-hue-ladder",
    anchorHue: 27,
    requestedHues: [12, 27, 42],
    derivation:
      "symmetric ±15° around the existing 27° anchor, matching the existing Warning inventory spacing",
    chroma: 0.19,
    authority: "diagnostic",
  });
  assert.deepEqual(report.destructiveHueInventoryProbe.scope, {
    failedDestructiveCheckCaseCount: 66,
    lightCaseCount: 33,
    darkCaseCount: 33,
  });
  assert.deepEqual(report.destructiveHueInventoryProbe.current, {
    countingUnit: "candidate-occurrence-per-failed-check-case",
    failedCheckCaseCount: 66,
    inventoryOccurrenceCount: 2838,
    baseConstraintRejectedOccurrenceCount: 165,
    baseConstraintPassedHueReviewRejectedOccurrenceCount: 2659,
    availableOccurrenceCount: 14,
    baseConstraintFailedIdOccurrenceCounts: {
      "destructive.label-contrast": 165,
    },
    baseConstraintFailedPatternOccurrenceCounts: {
      "destructive.label-contrast": 165,
    },
    caseOutcomeCategoryCounts: {
      "base-and-hue-alternative-available": 1,
      "base-pass-candidates-all-hue-rejected": 65,
    },
  });
  assert.deepEqual(report.destructiveHueInventoryProbe.expanded, {
    countingUnit: "candidate-occurrence-per-failed-check-case",
    failedCheckCaseCount: 66,
    inventoryOccurrenceCount: 8514,
    baseConstraintRejectedOccurrenceCount: 462,
    baseConstraintPassedHueReviewRejectedOccurrenceCount: 7223,
    availableOccurrenceCount: 829,
    baseConstraintFailedIdOccurrenceCounts: {
      "destructive.label-contrast": 462,
    },
    baseConstraintFailedPatternOccurrenceCounts: {
      "destructive.label-contrast": 462,
    },
    caseOutcomeCategoryCounts: {
      "base-and-hue-alternative-available": 20,
      "base-pass-candidates-all-hue-rejected": 46,
    },
  });
  assert.equal(
    report.destructiveHueInventoryProbe.requestedCandidateOccurrenceCount,
    8514,
  );
  assert.equal(
    report.destructiveHueInventoryProbe.uniqueRenderedCandidateOccurrenceCount,
    8514,
  );
  assert.deepEqual(
    report.destructiveHueInventoryProbe.availabilityTransitionCounts,
    {
      "newly-available": 19,
      "retained-available": 1,
      "still-unavailable": 46,
    },
  );
  assert.deepEqual(
    report.destructiveHueInventoryProbe.hueRungOccurrenceTotals,
    {
      12: {
        requestedOccurrenceCount: 2838,
        baseConstraintRejectedOccurrenceCount: 132,
        baseConstraintPassedHueReviewRejectedOccurrenceCount: 2296,
        availableOccurrenceCount: 410,
      },
      27: {
        requestedOccurrenceCount: 2838,
        baseConstraintRejectedOccurrenceCount: 165,
        baseConstraintPassedHueReviewRejectedOccurrenceCount: 2659,
        availableOccurrenceCount: 14,
      },
      42: {
        requestedOccurrenceCount: 2838,
        baseConstraintRejectedOccurrenceCount: 165,
        baseConstraintPassedHueReviewRejectedOccurrenceCount: 2268,
        availableOccurrenceCount: 405,
      },
    },
  );
  assert.equal(
    report.destructiveHueInventoryProbe.newlyAvailableCases.length,
    19,
  );
  assert.ok(
    report.destructiveHueInventoryProbe.newlyAvailableCases.every(
      ({ firstAvailableUnderExistingTechnicalRank }) =>
        JSON.stringify(
          firstAvailableUnderExistingTechnicalRank.selectionBasis,
        ) ===
        JSON.stringify(["destructive.semantic-anchor", "stable.hex-order"]),
    ),
  );
  assert.equal(
    report.destructiveHueInventoryProbe.caseIdentityDigest,
    "39d662d4db81ece670ac35ac1a02fc338ed29c458bde470adb1a472f5765b834",
  );
  assert.equal(
    report.destructiveHueInventoryProbe.candidateEvidenceDigest,
    "f2ac53c7403fd6efca90c26edf9b42058ca171c47a50d39ff9e8059719b55ebc",
  );
  assert.deepEqual(
    destructiveAvailable.map(
      ({ input, mode, objectiveBestRoleLocalAlternative }) => ({
        input,
        mode,
        hex: objectiveBestRoleLocalAlternative.hex,
      }),
    ),
    [{ input: "#663300", mode: "light", hex: "#97000D" }],
  );
  assert.equal(
    digest(
      report.cases.map(({ input, mode, relationship }) => ({
        input,
        mode,
        relationship,
      })),
    ),
    "177c9d91662456562df4808ee48a0924e3c65d0fea84b5641682a61d0a7f0251",
  );
  assert.equal(
    digest(
      report.cases
        .filter(
          ({ roleLocalAlternativeAvailable }) => roleLocalAlternativeAvailable,
        )
        .map(
          ({
            input,
            mode,
            relationship,
            objectiveBestRoleLocalAlternative,
          }) => ({
            input,
            mode,
            relationship,
            hex: objectiveBestRoleLocalAlternative.hex,
          }),
        ),
    ),
    "13b09a9b5ccc5e16daec488cd6387bb58f301d0e5c4ab7da4825478fb806f07b",
  );
  assert.equal(
    digest(report.cases.map(({ candidateSetDigest }) => candidateSetDigest)),
    "43950292e6526d0f4e0dd4edbd8dfe9dc4b895a0af0898425d2c0280353ad7da",
  );
  assert.equal(
    digest(
      report.cases.map(
        ({ candidateEvidenceDigest }) => candidateEvidenceDigest,
      ),
    ),
    "e178e4c57973775522dfc6412d5772cbaf16c7fccc5983793f1b6f774051d994",
  );
  assert.deepEqual(totals, {
    inventory: 9156,
    baseConstraintPassing: 5609,
    semanticHuePassingAmongBase: 1079,
  });
  assert.ok(totals.inventory > totals.baseConstraintPassing);
  assert.ok(totals.baseConstraintPassing >= totals.semanticHuePassingAmongBase);
  assert.equal(
    report.cases.filter(
      ({ roleLocalAlternativeAvailable }) => roleLocalAlternativeAvailable,
    ).length,
    report.summary.availableCaseCount,
  );
});
