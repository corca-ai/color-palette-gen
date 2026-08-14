import assert from "node:assert/strict";
import test from "node:test";

import { generatePaletteV2 } from "../v2/lib/palette.js";
import {
  HOVER_EVALUATION_SCHEMA,
  HOVER_SPECIMEN,
  hoverEvaluationEvidence,
} from "../v2/lib/hover-evaluation.js";
import {
  evaluateV2Semantics,
  formatSemanticCounts,
  PRIMARY_ACTION_SEMANTIC_MODEL,
  SEMANTIC_EVALUATORS,
  SEMANTIC_EVIDENCE_CONTRACTS,
  V2_SEMANTIC_MODEL,
  validateSemanticTraceability,
} from "../v2/lib/semantic-model.js";

function acceptanceScenario(declaration, outcome, evaluator, mutate) {
  const expectedStatus = {
    positive: "satisfied",
    contradictory: "unsatisfied",
    "missing-evidence": "needs-review",
  }[outcome];
  return {
    id: `${declaration}.${outcome}`,
    declaration,
    outcome,
    evaluator,
    expectedStatus,
    context() {
      const fixture = semanticFixture();
      const context = {
        modes: fixture.modes,
        structuralQuality: fixture.quality,
        hoverEvidence: { complete: false, satisfies: false, record: null },
      };
      mutate?.(context);
      return context;
    },
  };
}

const SEMANTIC_ACCEPTANCE_SCENARIOS = [
  acceptanceScenario(
    "shared-label-readable",
    "positive",
    "evaluator.primary-label-readable.v1",
  ),
  acceptanceScenario(
    "shared-label-readable",
    "contradictory",
    "evaluator.primary-label-readable.v1",
    ({ modes }) => {
      modes.light.textChecks.find(
        ({ role }) => role === "Label on primary hover",
      ).pass = false;
    },
  ),
  acceptanceScenario(
    "shared-label-readable",
    "missing-evidence",
    "evaluator.primary-label-readable.v1",
    ({ modes }) => {
      modes.light.textChecks = [];
    },
  ),
  acceptanceScenario(
    "states-distinct",
    "positive",
    "evaluator.primary-states-distinct.v1",
  ),
  acceptanceScenario(
    "states-distinct",
    "contradictory",
    "evaluator.primary-states-distinct.v1",
    ({ modes }) => {
      modes.dark.values["primary hover"] = modes.dark.values.primary;
    },
  ),
  acceptanceScenario(
    "states-distinct",
    "missing-evidence",
    "evaluator.primary-states-distinct.v1",
    ({ modes }) => {
      delete modes.dark;
    },
  ),
  acceptanceScenario(
    "active-continues-beyond-hover",
    "positive",
    "evaluator.primary-state-progression.v1",
  ),
  acceptanceScenario(
    "active-continues-beyond-hover",
    "contradictory",
    "evaluator.primary-state-progression.v1",
    ({ structuralQuality }) => {
      structuralQuality.states.light.checks.find(({ id }) =>
        id.endsWith("monotonic-lightness"),
      ).pass = false;
    },
  ),
  acceptanceScenario(
    "active-continues-beyond-hover",
    "missing-evidence",
    "evaluator.primary-state-progression.v1",
    ({ structuralQuality }) => {
      structuralQuality.states.dark.checks = [];
    },
  ),
  acceptanceScenario(
    "hover-discoverable",
    "positive",
    "evaluator.primary-hover-discoverable.v1",
    (context) => {
      context.hoverEvidence = {
        complete: true,
        satisfies: true,
        record: { modes: { light: {}, dark: {} } },
      };
    },
  ),
  acceptanceScenario(
    "hover-discoverable",
    "contradictory",
    "evaluator.primary-hover-discoverable.v1",
    (context) => {
      context.hoverEvidence = {
        complete: true,
        satisfies: false,
        record: { modes: { light: {}, dark: {} } },
      };
    },
  ),
  acceptanceScenario(
    "hover-discoverable",
    "missing-evidence",
    "evaluator.primary-hover-discoverable.v1",
  ),
  acceptanceScenario(
    "foundation-hierarchy-ordered",
    "positive",
    "evaluator.foundation-hierarchy.v1",
  ),
  acceptanceScenario(
    "foundation-hierarchy-ordered",
    "contradictory",
    "evaluator.foundation-hierarchy.v1",
    ({ modes }) => {
      modes.light.decisions.surface.selected.constraintResults.find(
        ({ id }) => id === "foundation.hierarchy",
      ).passed = false;
    },
  ),
  acceptanceScenario(
    "foundation-hierarchy-ordered",
    "missing-evidence",
    "evaluator.foundation-hierarchy.v1",
    ({ modes }) => {
      modes.dark.decisions["raised surface"].selected.constraintResults = [];
    },
  ),
  acceptanceScenario(
    "foundation-text-targets-pass",
    "positive",
    "evaluator.foundation-text-targets.v1",
  ),
  acceptanceScenario(
    "foundation-text-targets-pass",
    "contradictory",
    "evaluator.foundation-text-targets.v1",
    ({ modes }) => {
      modes.dark.textChecks.find(({ role }) => role === "Muted text").pass =
        false;
    },
  ),
  acceptanceScenario(
    "foundation-text-targets-pass",
    "missing-evidence",
    "evaluator.foundation-text-targets.v1",
    ({ modes }) => {
      modes.light.textChecks = modes.light.textChecks.filter(
        ({ role }) => role !== "Text on surface",
      );
    },
  ),
  acceptanceScenario(
    "focus-adjacent-contrast-passes",
    "positive",
    "evaluator.focus-adjacent-contrast.v1",
  ),
  acceptanceScenario(
    "focus-adjacent-contrast-passes",
    "contradictory",
    "evaluator.focus-adjacent-contrast.v1",
    ({ modes }) => {
      modes.light.nonTextChecks.find(
        ({ role }) => role === "Focus on surface",
      ).pass = false;
    },
  ),
  acceptanceScenario(
    "focus-adjacent-contrast-passes",
    "missing-evidence",
    "evaluator.focus-adjacent-contrast.v1",
    ({ modes }) => {
      modes.dark.nonTextChecks = modes.dark.nonTextChecks.filter(
        ({ role }) => role !== "Focus on background",
      );
    },
  ),
  acceptanceScenario(
    "focus-control-oklab-separation-passes",
    "positive",
    "evaluator.focus-control-oklab-separation.v1",
  ),
  acceptanceScenario(
    "focus-control-oklab-separation-passes",
    "contradictory",
    "evaluator.focus-control-oklab-separation.v1",
    ({ modes }) => {
      modes.dark.decisions["focus ring"].selected.constraintResults.find(
        ({ id }) => id === "focus.semantic-separation",
      ).passed = false;
    },
  ),
  acceptanceScenario(
    "focus-control-oklab-separation-passes",
    "missing-evidence",
    "evaluator.focus-control-oklab-separation.v1",
    ({ modes }) => {
      modes.light.decisions["focus ring"].selected.constraintResults = [];
    },
  ),
];

for (const scenario of SEMANTIC_ACCEPTANCE_SCENARIOS) {
  test(`semantic acceptance · ${scenario.id}`, () => {
    const result = SEMANTIC_EVALUATORS[scenario.evaluator].evaluate(
      scenario.context(),
    );
    assert.equal(result.status, scenario.expectedStatus);
  });
}

test("the primary action semantic model separates intent from mechanisms", () => {
  assert.deepEqual(
    PRIMARY_ACTION_SEMANTIC_MODEL.declarations.map(({ kind }) => kind),
    ["constraint", "invariant", "relation", "intent"],
  );
  assert.equal(PRIMARY_ACTION_SEMANTIC_MODEL.strategies[0].kind, "heuristic");
});

test("every declaration chains through evidence, evaluator, and acceptance scenarios", () => {
  assert.equal(
    validateSemanticTraceability({
      acceptanceScenarios: SEMANTIC_ACCEPTANCE_SCENARIOS,
    }),
    true,
  );
  for (const declaration of V2_SEMANTIC_MODEL.declarations) {
    assert.ok(SEMANTIC_EVALUATORS[declaration.evaluator]);
    for (const evidence of declaration.evidence) {
      assert.ok(SEMANTIC_EVIDENCE_CONTRACTS[evidence]);
    }
  }
});

test("the aggregate result exposes the exact semantic model boundary", () => {
  const result = generatePaletteV2({ primary: "#507096" });
  assert.deepEqual(result.semanticEvaluation.model, {
    id: "v2-declarative-design",
    version: 1,
    components: [
      { id: "primary-action-state-family", version: 1 },
      { id: "foundation-focus-family", version: 1 },
    ],
  });
  assert.deepEqual(
    result.semanticEvaluation.evaluations.map(({ id }) => id),
    [
      "shared-label-readable",
      "states-distinct",
      "active-continues-beyond-hover",
      "hover-discoverable",
      "foundation-hierarchy-ordered",
      "foundation-text-targets-pass",
      "focus-adjacent-contrast-passes",
      "focus-control-oklab-separation-passes",
    ],
  );
});

test("semantic traceability rejects dangling and incomplete acceptance links", () => {
  const danglingModel = structuredClone(PRIMARY_ACTION_SEMANTIC_MODEL);
  danglingModel.declarations[0].evidence = ["evidence.unknown.v1"];
  assert.throws(
    () => validateSemanticTraceability({ model: danglingModel }),
    /references unknown evidence.unknown.v1/,
  );
  assert.throws(
    () =>
      validateSemanticTraceability({
        acceptanceScenarios: SEMANTIC_ACCEPTANCE_SCENARIOS.filter(
          ({ id }) => id !== "hover-discoverable.missing-evidence",
        ),
      }),
    /hover-discoverable lacks missing-evidence acceptance coverage/,
  );
  assert.throws(
    () =>
      validateSemanticTraceability({
        acceptanceScenarios: [
          ...SEMANTIC_ACCEPTANCE_SCENARIOS,
          {
            id: "unknown.positive",
            declaration: "unknown",
            outcome: "positive",
            evaluator: "unknown",
          },
        ],
      }),
    /references unknown unknown/,
  );
  assert.throws(
    () =>
      validateSemanticTraceability({
        acceptanceScenarios: [
          ...SEMANTIC_ACCEPTANCE_SCENARIOS,
          SEMANTIC_ACCEPTANCE_SCENARIOS[0],
        ],
      }),
    /Acceptance scenario ids must be unique/,
  );
});

test("impossible hover evidence cannot satisfy declared intent", () => {
  const result = SEMANTIC_EVALUATORS[
    "evaluator.primary-hover-discoverable.v1"
  ].evaluate({
    hoverEvidence: { complete: true, satisfies: true, record: null },
  });
  assert.equal(result.status, "needs-review");
  assert.deepEqual(result.observedEvidence, []);
});

test("matching automated evidence without an explicit boolean remains needs-review", () => {
  const missingLabelVerdict = semanticFixture();
  delete missingLabelVerdict.modes.light.textChecks.find(
    ({ role }) => role === "Label on primary hover",
  ).pass;
  assert.equal(
    evaluationsFor(missingLabelVerdict.modes, missingLabelVerdict.quality)[
      "shared-label-readable"
    ].status,
    "needs-review",
  );

  const missingProgressionVerdict = semanticFixture();
  delete missingProgressionVerdict.quality.states.dark.checks.find(({ id }) =>
    id.endsWith("monotonic-lightness"),
  ).pass;
  assert.equal(
    evaluationsFor(
      missingProgressionVerdict.modes,
      missingProgressionVerdict.quality,
    )["active-continues-beyond-hover"].status,
    "needs-review",
  );

  const missingCheckVerdict = semanticFixture();
  delete missingCheckVerdict.modes.light.nonTextChecks.find(
    ({ role }) => role === "Focus on surface",
  ).pass;
  assert.equal(
    evaluationsFor(missingCheckVerdict.modes, missingCheckVerdict.quality)[
      "focus-adjacent-contrast-passes"
    ].status,
    "needs-review",
  );

  const missingRuleVerdict = semanticFixture();
  delete missingRuleVerdict.modes.dark.decisions[
    "focus ring"
  ].selected.constraintResults.find(
    ({ id }) => id === "focus.semantic-separation",
  ).passed;
  assert.equal(
    evaluationsFor(missingRuleVerdict.modes, missingRuleVerdict.quality)[
      "focus-control-oklab-separation-passes"
    ].status,
    "needs-review",
  );
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
  assert.deepEqual(byId["hover-discoverable"].trace, {
    declaration: "hover-discoverable",
    evaluator: "evaluator.primary-hover-discoverable.v1",
    evidence: ["evidence.interactive-hover-rating.v1"],
  });
  assert.equal(result.semanticEvaluation.satisfied, false);
});

test("complete interactive evidence can resolve hover discoverability", () => {
  const result = generatePaletteV2({ primary: "#507096" });
  const record = {
    schema: HOVER_EVALUATION_SCHEMA,
    input: result.input.primary,
    policyVersion: result.policyVersion,
    specimen: HOVER_SPECIMEN,
    modes: {
      light: { judgment: "meets-intent", note: "Clearly visible." },
      dark: { judgment: "meets-intent", note: "Clearly visible." },
    },
  };
  const evaluation = evaluateV2Semantics(
    result.modes,
    result.quality,
    hoverEvaluationEvidence(record, result.input.primary, result.policyVersion),
  );
  assert.equal(
    evaluation.evaluations.find(({ id }) => id === "hover-discoverable").status,
    "satisfied",
  );
  assert.equal(evaluation.satisfied, true);
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
    evaluateV2Semantics(modes, quality).evaluations.map((item) => [
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
