import assert from "node:assert/strict";
import test from "node:test";

import { buildFeedbackCandidateAvailabilityReport } from "../v2/lib/feedback-candidate-availability.js";
import {
  generatePaletteV2,
  inspectFeedbackDefaultCandidateAvailabilityV2,
} from "../v2/lib/palette.js";

test("feedback availability inspects failed checks without mutating production output", () => {
  const result = generatePaletteV2({ primary: "#330000" });
  const before = structuredClone(result);
  const finding = result.quality.semanticChecks.find(
    ({ pass }) => pass === false,
  );
  const [, mode, relationshipId] = finding.id.split(".");
  const availability = inspectFeedbackDefaultCandidateAvailabilityV2({
    result,
    mode,
    relationship: relationshipId.replace("primary-", "").replace("-hue", ""),
  });

  assert.deepEqual(result, before);
  assert.equal(availability.input, "#330000");
  assert.equal(availability.baselineCheck.id, finding.id);
  assert.equal(availability.scope, "role-local-default-fill");
  assert.equal(
    availability.roleLocalAlternativeAvailable,
    availability.candidateCounts.semanticHuePassingAmongBase > 0,
  );
  assert.equal(
    availability.objectiveBestRoleLocalAlternative !== null,
    availability.roleLocalAlternativeAvailable,
  );
  assert.match(availability.candidateSetIdentity, /v2-policy-model-12/);
});

test("feedback availability rejects invalid or already-passing scopes", () => {
  const result = generatePaletteV2({ primary: "#330000" });
  const passing = result.quality.semanticChecks.find(({ pass }) => pass);
  const [, passingMode, passingRelationshipId] = passing.id.split(".");

  assert.throws(
    () =>
      inspectFeedbackDefaultCandidateAvailabilityV2({
        result,
        mode: "unknown",
        relationship: "warning",
      }),
    /mode/,
  );
  assert.throws(
    () =>
      inspectFeedbackDefaultCandidateAvailabilityV2({
        result,
        mode: passingMode,
        relationship: passingRelationshipId
          .replace("primary-", "")
          .replace("-hue", ""),
      }),
    /failed baseline semantic-hue check/,
  );

  const tampered = structuredClone(result);
  const failed = tampered.quality.semanticChecks.find(({ pass }) => !pass);
  failed.value += 1;
  const [, failedMode, failedRelationshipId] = failed.id.split(".");
  assert.throws(
    () =>
      inspectFeedbackDefaultCandidateAvailabilityV2({
        result: tampered,
        mode: failedMode,
        relationship: failedRelationshipId
          .replace("primary-", "")
          .replace("-hue", ""),
      }),
    /baseline hue evidence must reconcile/,
  );
});

test("feedback report preserves the failed-check denominator and role-local wording", () => {
  const calls = [];
  const report = buildFeedbackCandidateAvailabilityReport({
    buildUpstream: () => ({
      schema: "color-palette-adversarial-diagnostics.v3",
      resultVersion: "test-result",
      policyVersion: "test-policy",
      semanticModel: { id: "test-semantic", version: 1 },
      semanticHueReview: {
        flaggedInputCount: 1,
        failedCheckOccurrenceCount: 2,
        flaggedCases: [
          {
            input: "#000000",
            failedChecks: [
              {
                id: "review.light.primary-warning-hue",
                mode: "light",
                relationship: "primary-warning",
                pass: false,
              },
              {
                id: "review.dark.primary-destructive-hue",
                mode: "dark",
                relationship: "primary-destructive",
                pass: false,
              },
            ],
          },
        ],
      },
    }),
    generate: ({ primary }) => ({
      input: primary,
      version: "test-result",
      policyVersion: "test-policy",
      semanticEvaluation: { model: { id: "test-semantic", version: 1 } },
    }),
    inspect: ({ result, mode, relationship }) => {
      calls.push({ result, mode, relationship });
      return {
        input: result.input,
        mode,
        relationship,
        candidateSetIdentity: `${mode}/${relationship}`,
        candidateCounts: {
          inventory: 0,
          baseConstraintPassing: 0,
          semanticHuePassingAmongBase: 0,
        },
        roleLocalAlternativeAvailable: relationship === "warning",
      };
    },
  });

  assert.equal(calls.length, 2);
  assert.equal(report.upstream.flaggedInputScopeCellCount, 4);
  assert.equal(report.summary.scopedFailedCheckCaseCount, 2);
  assert.equal(report.summary.availableCaseCount, 1);
  assert.equal(report.summary.unavailableCaseCount, 1);
  assert.deepEqual(report.summary.candidateOccurrenceTotals, {
    inventory: 0,
    baseConstraintPassing: 0,
    semanticHuePassingAmongBase: 0,
  });
  assert.match(report.interpretation, /role-local default-fill/);
  assert.match(report.interpretation, /does not establish hover\/active/);
});

test("feedback report fails closed on the wrong upstream schema", () => {
  assert.throws(
    () =>
      buildFeedbackCandidateAvailabilityReport({
        buildUpstream: () => ({ schema: "unexpected" }),
      }),
    /requires adversarial diagnostics v3/,
  );
});

test("feedback report rejects stale or malformed upstream census evidence", () => {
  const base = {
    schema: "color-palette-adversarial-diagnostics.v3",
    resultVersion: 2,
    policyVersion: "v2-policy-model-12",
    semanticModel: { id: "v2-declarative-design", version: 3 },
    semanticHueReview: {
      flaggedInputCount: 1,
      failedCheckOccurrenceCount: 1,
      flaggedCases: [
        {
          input: "#000000",
          failedChecks: [
            {
              id: "review.light.primary-warning-hue",
              mode: "light",
              relationship: "primary-warning",
              pass: false,
            },
          ],
        },
      ],
    },
  };
  const mutations = [
    (value) =>
      value.semanticHueReview.flaggedCases.push(
        structuredClone(value.semanticHueReview.flaggedCases[0]),
      ),
    (value) => {
      value.semanticHueReview.flaggedCases[0].failedChecks[0].id =
        "review.light.unknown-hue";
    },
    (value) => {
      value.semanticHueReview.failedCheckOccurrenceCount = 2;
    },
  ];

  for (const mutate of mutations) {
    const upstream = structuredClone(base);
    mutate(upstream);
    assert.throws(
      () =>
        buildFeedbackCandidateAvailabilityReport({
          buildUpstream: () => upstream,
        }),
      /feedback availability/,
    );
  }
  assert.throws(
    () =>
      buildFeedbackCandidateAvailabilityReport({
        buildUpstream: () => structuredClone(base),
        generate: () => ({
          version: 2,
          policyVersion: "stale-policy",
          semanticEvaluation: { model: base.semanticModel },
        }),
      }),
    /identity must match upstream/,
  );
});
