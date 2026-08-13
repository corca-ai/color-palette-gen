import assert from "node:assert/strict";
import test from "node:test";

import { EVALUATION_INPUTS } from "../v2/lib/evaluation-inputs.js";
import { prioritizeHoverReview } from "../v2/lib/hover-review-priority.js";
import { generatePaletteV2 } from "../v2/lib/palette.js";

test("representative review recommendations expose named extremes without a score", () => {
  const results = EVALUATION_INPUTS.map((primary) =>
    generatePaletteV2({ primary }),
  );
  const priority = prioritizeHoverReview(results);
  assert.match(priority.method, /no weighted score/i);
  assert.ok(priority.recommendations.length >= 3);
  assert.ok(priority.recommendations.length <= 5);
  assert.equal(
    priority.coveredReasonCount + priority.uncoveredReasons.length,
    priority.totalReasonCount,
  );
  assert.equal(priority.rows.length, EVALUATION_INPUTS.length);
  for (const recommendation of priority.recommendations) {
    assert.ok(EVALUATION_INPUTS.includes(recommendation.primary));
    assert.ok(recommendation.reasons.length > 0);
  }
  for (const row of priority.rows) {
    for (const mode of ["light", "dark"]) {
      assert.ok(row.metrics[mode].oklabDeltaE > 0);
      assert.ok(row.metrics[mode].ciede2000 > 0);
      assert.ok(Number.isFinite(row.metrics[mode].surfaceContrastChange));
    }
  }
});

test("recommendations are deterministic and respect the requested limit", () => {
  const results = EVALUATION_INPUTS.map((primary) =>
    generatePaletteV2({ primary }),
  );
  assert.deepEqual(
    prioritizeHoverReview(results, 3),
    prioritizeHoverReview(results, 3),
  );
  assert.equal(prioritizeHoverReview(results, 3).recommendations.length, 3);
});

test("precomputed comparison inputs require diagnostics from their producer", () => {
  const result = generatePaletteV2({ primary: "#507096" });
  assert.doesNotThrow(() =>
    prioritizeHoverReview([
      {
        input: result.input,
        policyVersion: result.policyVersion,
        hoverDiagnostics: result.hoverDiagnostics,
      },
    ]),
  );
});

test("empty and zero-limit review sets retain an honest contract", () => {
  const empty = prioritizeHoverReview([]);
  assert.equal(empty.recommendations.length, 0);
  assert.equal(empty.coveredReasonCount, 0);
  assert.equal(empty.uncoveredReasons.length, empty.totalReasonCount);

  const result = generatePaletteV2({ primary: "#507096" });
  const zero = prioritizeHoverReview([result], 0);
  assert.equal(zero.recommendations.length, 0);
  assert.equal(zero.coveredReasonCount, 0);
  assert.throws(() => prioritizeHoverReview([result], -1), /nonnegative/);
  assert.throws(() => prioritizeHoverReview([result], 1.5), /nonnegative/);
});

test("one input can honestly own every named extreme", () => {
  const result = generatePaletteV2({ primary: "#507096" });
  const priority = prioritizeHoverReview([result]);
  assert.equal(priority.recommendations.length, 1);
  assert.equal(priority.coveredReasonCount, priority.totalReasonCount);
  assert.equal(priority.uncoveredReasons.length, 0);
});

test("missing diagnostics fail with an explicit producer-contract error", () => {
  assert.throws(
    () =>
      prioritizeHoverReview([
        { input: { primary: "#507096" }, policyVersion: "test" },
      ]),
    /hoverDiagnostics/,
  );
});
