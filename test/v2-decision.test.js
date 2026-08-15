import assert from "node:assert/strict";
import test from "node:test";

import { selectCandidate } from "../v2/lib/decision.js";
import { V2_POLICY, validatePolicy } from "../v2/lib/policy.js";

const definition = (id, kind, direction) => ({
  id,
  kind,
  label: id,
  ...(direction ? { direction } : {}),
});

function choose(candidates) {
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
