import assert from "node:assert/strict";
import test from "node:test";

import {
  NoCandidateError,
  noCandidateFailure,
  selectCandidate,
} from "../v2/lib/decision.js";
import { V2_POLICY, validatePolicy } from "../v2/lib/policy.js";

const definition = (id, kind, direction) => ({
  id,
  kind,
  label: id,
  ...(direction ? { direction } : {}),
});

function choose(candidates, retainPlot = false) {
  const policy = {
    id: "test",
    constraints: [definition("must-pass", "hard-constraint")],
    objectives: [definition("quality", "product-objective", "minimize")],
    tieBreakers: [definition("stable", "tie-breaker", "ascending")],
  };
  return selectCandidate({
    id: "test.choice",
    role: "test",
    intent:
      "Verify layered candidate selection independently from palette recipes.",
    candidates,
    policy,
    constraints: [
      {
        definition: policy.constraints[0],
        evaluate: (candidate) => ({
          passed: candidate.allowed,
          reasons: [candidate.allowed ? "Allowed." : "Rejected."],
          metrics: {},
        }),
      },
    ],
    objectives: [
      {
        definition: policy.objectives[0],
        evaluate: (candidate) => candidate.cost,
      },
    ],
    tieBreakers: [
      {
        definition: policy.tieBreakers[0],
        evaluate: (candidate) => candidate.hex,
      },
    ],
    evidence: [],
    retainPlot,
  });
}

test("constraints reject a candidate even when it has the best objective", () => {
  const result = choose([
    { hex: "#000000", oklch: {}, allowed: false, cost: 0 },
    { hex: "#BBBBBB", oklch: {}, allowed: true, cost: 2 },
    { hex: "#AAAAAA", oklch: {}, allowed: true, cost: 1 },
  ]);
  assert.equal(result.value.hex, "#AAAAAA");
  assert.equal(result.trace.alternatives.nearestRejected.hex, "#000000");
});

test("tie-breakers run only after objective scores are equal", () => {
  const result = choose([
    { hex: "#FFFFFF", oklch: {}, allowed: true, cost: 0 },
    { hex: "#222222", oklch: {}, allowed: true, cost: 1 },
    { hex: "#111111", oklch: {}, allowed: true, cost: 1 },
  ]);
  assert.equal(result.value.hex, "#FFFFFF");
  assert.equal(result.trace.alternatives.nextPassing.hex, "#111111");
});

test("the declared v2 policy schema is internally valid", () => {
  assert.equal(validatePolicy(), true);
  assert.deepEqual(V2_POLICY.foundation.modeZone, {
    lightMinimum: 0.96,
    darkMaximum: 0.185,
  });
  assert.equal(V2_POLICY.text.wcagNormalTextMinimum, 4.5);
  assert.equal(V2_POLICY.text.typographyContexts.actionLabel.fontSizePx, 11);
  assert.equal(
    V2_POLICY.crossMode.pairRankingStrategy,
    "zero-primary-pair-quality-miss-gated-source-first",
  );
  assert.deepEqual(V2_POLICY.crossMode.eligibilityCheckIds, [
    "pair.primary-hue-drift",
    "pair.primary-chroma-difference",
    "pair.primary-lightness-gap",
    "light.primary.state.interval-ratio",
    "light.primary.state.monotonic-lightness",
    "dark.primary.state.interval-ratio",
    "dark.primary.state.monotonic-lightness",
  ]);
});

test("invalid objective values fail instead of silently changing rank order", () => {
  assert.throws(
    () =>
      choose([{ hex: "#000000", oklch: {}, allowed: true, cost: Number.NaN }]),
    /invalid ranking value/,
  );
});

test("candidate exhaustion exposes structured failure provenance", () => {
  assert.throws(
    () =>
      choose(
        [{ hex: "#000000", oklch: {}, allowed: false, cost: 0 }],
        "detailed",
      ),
    (error) => {
      assert.ok(error instanceof NoCandidateError);
      assert.deepEqual(noCandidateFailure(error), {
        code: "NO_CANDIDATE",
        decisionId: "test.choice",
        mode: null,
        role: "test",
        stage: "candidate-selection",
        message: "test.choice has no candidate satisfying its constraints.",
      });
      assert.equal(
        Object.hasOwn(noCandidateFailure(error), "diagnosticSearchPlot"),
        false,
      );
      assert.deepEqual(error.diagnosticSearchPlot, [
        {
          hex: "#000000",
          oklch: {},
          objectiveCost: 0,
          constraintResults: [
            {
              id: "must-pass",
              kind: "hard-constraint",
              label: "must-pass",
              passed: false,
              reasons: ["Rejected."],
              metrics: {},
            },
          ],
          objectiveResults: [
            {
              id: "quality",
              kind: "product-objective",
              label: "quality",
              direction: "minimize",
              value: 0,
            },
          ],
          tieBreakerResults: [
            {
              id: "stable",
              kind: "tie-breaker",
              label: "stable",
              direction: "ascending",
              value: "#000000",
            },
          ],
          passed: false,
          reasons: ["Rejected."],
          metrics: { "must-pass": {} },
          parameters: undefined,
          stateFamily: null,
        },
      ]);
      return true;
    },
  );
});

test("ordinary candidate exhaustion does not retain a diagnostic search plot", () => {
  assert.throws(
    () => choose([{ hex: "#000000", oklch: {}, allowed: false, cost: 0 }]),
    (error) => {
      assert.ok(error instanceof NoCandidateError);
      assert.equal(Object.hasOwn(error, "diagnosticSearchPlot"), false);
      return true;
    },
  );
});

test("unstructured candidate errors cannot masquerade as report evidence", () => {
  assert.throws(
    () => noCandidateFailure(new NoCandidateError("legacy message only")),
    /structured decision failure provenance/,
  );
  for (const details of [
    { decisionId: "", role: "test" },
    { decisionId: "test.choice", role: "" },
    { decisionId: "test.choice", role: "test", message: "" },
    { decisionId: "test.choice", role: "test", stage: "unknown-stage" },
    { decisionId: "dark.test", mode: "light", role: "test" },
    { decisionId: "dark.test", mode: null, role: "test" },
  ]) {
    assert.throws(
      () =>
        noCandidateFailure(
          new NoCandidateError(details.message ?? "invalid", details),
        ),
      /structured decision failure provenance/,
    );
  }
});
