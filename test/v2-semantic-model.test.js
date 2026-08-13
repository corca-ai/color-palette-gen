import assert from "node:assert/strict";
import test from "node:test";

import { generatePaletteV2 } from "../v2/lib/palette.js";
import {
  evaluatePrimaryActionSemantics,
  formatSemanticCounts,
  PRIMARY_ACTION_SEMANTIC_MODEL,
} from "../v2/lib/semantic-model.js";

test("the primary action semantic model separates intent from mechanisms", () => {
  assert.deepEqual(
    PRIMARY_ACTION_SEMANTIC_MODEL.declarations.map(({ kind }) => kind),
    ["constraint", "invariant", "relation", "intent"],
  );
  assert.equal(PRIMARY_ACTION_SEMANTIC_MODEL.strategies[0].kind, "heuristic");
});

test("numeric checks cannot claim that hover discoverability is satisfied", () => {
  const result = generatePaletteV2({ primary: "#507096" });
  const byId = Object.fromEntries(
    result.semanticEvaluation.evaluations.map((item) => [item.id, item]),
  );
  assert.equal(byId["shared-label-readable"].status, "satisfied");
  assert.equal(byId["states-distinct"].status, "satisfied");
  assert.equal(byId["active-continues-beyond-hover"].status, "satisfied");
  assert.equal(byId["hover-discoverable"].status, "needs-review");
  assert.deepEqual(byId["hover-discoverable"].observedEvidence, []);
  assert.equal(result.semanticEvaluation.satisfied, false);
});

function semanticFixture() {
  const result = generatePaletteV2({ primary: "#507096" });
  return {
    modes: structuredClone(result.modes),
    quality: structuredClone(result.quality),
  };
}

function evaluationsFor(modes, quality) {
  return Object.fromEntries(
    evaluatePrimaryActionSemantics(modes, quality).evaluations.map((item) => [
      item.id,
      item,
    ]),
  );
}

test("incomplete evidence cannot satisfy an automated declaration", () => {
  const missingLabels = semanticFixture();
  missingLabels.modes.light.textChecks = [];
  assert.equal(
    evaluationsFor(missingLabels.modes, missingLabels.quality)[
      "shared-label-readable"
    ].status,
    "needs-review",
  );

  const missingMode = semanticFixture();
  delete missingMode.modes.dark;
  const missingModeEvaluations = evaluationsFor(
    missingMode.modes,
    missingMode.quality,
  );
  assert.equal(
    missingModeEvaluations["shared-label-readable"].status,
    "needs-review",
  );
  assert.equal(
    missingModeEvaluations["states-distinct"].status,
    "needs-review",
  );

  const missingProgression = semanticFixture();
  missingProgression.quality.states.dark.checks = [];
  assert.equal(
    evaluationsFor(missingProgression.modes, missingProgression.quality)[
      "active-continues-beyond-hover"
    ].status,
    "needs-review",
  );
});

test("only declared label roles can affect label readability", () => {
  const fixture = semanticFixture();
  fixture.modes.light.textChecks.push({
    role: "Label on primary border",
    pass: false,
  });
  const evaluation = evaluationsFor(fixture.modes, fixture.quality)[
    "shared-label-readable"
  ];
  assert.equal(evaluation.status, "satisfied");
  assert.equal(
    evaluation.observedEvidence.some(
      ({ role }) => role === "Label on primary border",
    ),
    false,
  );
});

test("semantic count summaries account for contradictory evidence", () => {
  assert.equal(
    formatSemanticCounts({
      satisfied: 3,
      "needs-review": 1,
      unsatisfied: 0,
    }),
    "3 satisfied · 1 needs review",
  );
  assert.equal(
    formatSemanticCounts({
      satisfied: 2,
      "needs-review": 1,
      unsatisfied: 1,
    }),
    "2 satisfied · 1 needs review · 1 unsatisfied",
  );
});

test("complete contradictory evidence makes declarations unsatisfied", () => {
  const failedLabel = semanticFixture();
  failedLabel.modes.light.textChecks.find(
    ({ role }) => role === "Label on primary hover",
  ).pass = false;
  assert.equal(
    evaluationsFor(failedLabel.modes, failedLabel.quality)[
      "shared-label-readable"
    ].status,
    "unsatisfied",
  );

  const duplicateState = semanticFixture();
  duplicateState.modes.dark.values["primary hover"] =
    duplicateState.modes.dark.values.primary;
  assert.equal(
    evaluationsFor(duplicateState.modes, duplicateState.quality)[
      "states-distinct"
    ].status,
    "unsatisfied",
  );

  const reversedProgression = semanticFixture();
  reversedProgression.quality.states.light.checks.find(({ id }) =>
    id.endsWith("monotonic-lightness"),
  ).pass = false;
  assert.equal(
    evaluationsFor(reversedProgression.modes, reversedProgression.quality)[
      "active-continues-beyond-hover"
    ].status,
    "unsatisfied",
  );
});
