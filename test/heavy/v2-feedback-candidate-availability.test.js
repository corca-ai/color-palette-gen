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
    "color-palette-feedback-default-candidate-availability.v2",
  );
  assert.equal(report.policyVersion, "v2-policy-model-12");
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
      baseConstraintPassing: 4748,
      semanticHuePassingAmongBase: 1079,
    },
    candidateOccurrenceFunnelsByRelationship: {
      "primary-destructive": {
        countingUnit: "candidate-occurrence-per-failed-check-case",
        failedCheckCaseCount: 66,
        inventoryOccurrenceCount: 2838,
        baseConstraintRejectedOccurrenceCount: 1026,
        baseConstraintPassedHueReviewRejectedOccurrenceCount: 1798,
        availableOccurrenceCount: 14,
        baseConstraintFailedIdOccurrenceCounts: {
          "destructive.brand-separation": 861,
          "destructive.label-contrast": 165,
        },
        baseConstraintFailedPatternOccurrenceCounts: {
          "destructive.brand-separation": 861,
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
          baseConstraintRejectedOccurrenceCount: 417,
          baseConstraintPassedHueReviewRejectedOccurrenceCount: 1318,
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
          baseConstraintRejectedOccurrenceCount: 609,
          baseConstraintPassedHueReviewRejectedOccurrenceCount: 480,
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
    "c57e7d7c6e33a13ddc9b7c631aaa8ae6dbf6ec3c0096b4d94d45a4adc002e9cb",
  );
  assert.equal(
    digest(
      report.cases.map(
        ({ candidateEvidenceDigest }) => candidateEvidenceDigest,
      ),
    ),
    "cb14eb662744fe9e602e7ae8c7387f1ea15860ed8df1f67d1854b45e3230e7b6",
  );
  assert.deepEqual(totals, {
    inventory: 9156,
    baseConstraintPassing: 4748,
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
