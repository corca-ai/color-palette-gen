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
    "color-palette-feedback-default-candidate-availability.v1",
  );
  assert.equal(report.policyVersion, "v2-policy-model-12");
  assert.deepEqual(report.upstream, {
    schema: "color-palette-adversarial-diagnostics.v3",
    flaggedInputCount: 59,
    flaggedInputScopeCellCount: 236,
    failedCheckCaseCount: 120,
  });
  assert.deepEqual(report.summary, {
    scopedFailedCheckCaseCount: 120,
    availableCaseCount: 43,
    unavailableCaseCount: 77,
    candidateOccurrenceTotals: {
      inventory: 9156,
      baseConstraintPassing: 4748,
      semanticHuePassingAmongBase: 1079,
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
