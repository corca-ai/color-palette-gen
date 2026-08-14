export const SEMANTIC_EVIDENCE_CONTRACTS = {
  "evidence.primary-label-apca.v1": {
    producer: "automated-check",
    scope: "primary-action-state-family",
    requires: ["light-and-dark", "default-hover-active", "actual-label-fill"],
    cannotEstablish: ["hover-discoverability", "accessibility-conformance"],
  },
  "evidence.primary-exported-states.v1": {
    producer: "generated-output",
    scope: "primary-action-state-family",
    requires: ["light-and-dark", "default-hover-active", "final-srgb"],
    cannotEstablish: ["perceived-state-difference"],
  },
  "evidence.primary-state-progression.v1": {
    producer: "automated-check",
    scope: "primary-action-state-family",
    requires: ["light-and-dark", "monotonic-lightness-check"],
    cannotEstablish: ["hover-discoverability"],
  },
  "evidence.interactive-hover-rating.v1": {
    producer: "human-observation",
    scope: "local-version-matched-evaluation-instance",
    requires: [
      "normalized-primary",
      "policy-version",
      "specimen-version",
      "light-judgment-and-note",
      "dark-judgment-and-note",
    ],
    cannotEstablish: [
      "policy-level-discoverability",
      "population-preference",
      "accessibility-conformance",
    ],
  },
};

export const PRIMARY_ACTION_SEMANTIC_MODEL = {
  id: "primary-action-state-family",
  version: 1,
  roles: {
    default: "primary",
    hover: "primary hover",
    active: "primary active",
    label: "primary text",
    boundary: "primary border",
  },
  declarations: [
    {
      id: "shared-label-readable",
      kind: "constraint",
      authority: "heuristic",
      statement: "One label remains readable on every primary action state.",
      evidence: ["evidence.primary-label-apca.v1"],
      evaluator: "evaluator.primary-label-readable.v1",
    },
    {
      id: "states-distinct",
      kind: "invariant",
      authority: "technical",
      statement: "Default, hover, and active export as distinct sRGB colors.",
      evidence: ["evidence.primary-exported-states.v1"],
      evaluator: "evaluator.primary-states-distinct.v1",
    },
    {
      id: "active-continues-beyond-hover",
      kind: "relation",
      authority: "research-policy",
      statement:
        "Active continues beyond hover in the same mode-specific direction.",
      evidence: ["evidence.primary-state-progression.v1"],
      evaluator: "evaluator.primary-state-progression.v1",
    },
    {
      id: "hover-discoverable",
      kind: "intent",
      authority: "declared-intent",
      statement:
        "Hover is noticeable during interaction without overpowering brand identity.",
      evidence: ["evidence.interactive-hover-rating.v1"],
      evaluator: "evaluator.primary-hover-discoverable.v1",
    },
  ],
  strategies: [
    {
      id: "lightness-search",
      kind: "heuristic",
      statement:
        "Search mode-directed lightness candidates while holding requested hue and chroma.",
    },
  ],
};

const EXPECTED_MODES = ["light", "dark"];
const EXPECTED_LABEL_ROLES = [
  "Label on primary",
  "Label on primary hover",
  "Label on primary active",
];
const ACCEPTANCE_OUTCOMES = ["positive", "contradictory", "missing-evidence"];
const ACCEPTANCE_STATUS = {
  positive: "satisfied",
  contradictory: "unsatisfied",
  "missing-evidence": "needs-review",
};

function evaluation(status, observedEvidence, reason) {
  return { status, observedEvidence, reason };
}

function evaluateSharedLabel({ modes }) {
  const checks = EXPECTED_MODES.flatMap((mode) =>
    (modes[mode]?.textChecks ?? [])
      .filter(({ role }) => EXPECTED_LABEL_ROLES.includes(role))
      .map((check) => ({ mode, ...check })),
  );
  const complete = EXPECTED_MODES.every((mode) =>
    EXPECTED_LABEL_ROLES.every(
      (role) =>
        checks.filter((check) => check.mode === mode && check.role === role)
          .length === 1,
    ),
  );
  const passed = checks.every(({ pass }) => pass);
  return evaluation(
    !complete ? "needs-review" : passed ? "satisfied" : "unsatisfied",
    checks,
    !complete
      ? "Expected one primary label check for every state in Light and Dark."
      : passed
        ? "Every mode and state passes its declared label APCA target."
        : "At least one state misses its declared label APCA target.",
  );
}

function evaluateDistinctStates({ modes }) {
  const observed = EXPECTED_MODES.map((mode) => {
    const result = modes[mode];
    const values = [
      result?.values?.primary,
      result?.values?.["primary hover"],
      result?.values?.["primary active"],
    ];
    const complete = values.every((value) => typeof value === "string");
    return {
      mode,
      values,
      complete,
      distinct: complete && new Set(values).size === values.length,
    };
  });
  const complete = observed.every((item) => item.complete);
  const passed = observed.every((item) => item.distinct);
  return evaluation(
    !complete ? "needs-review" : passed ? "satisfied" : "unsatisfied",
    observed,
    !complete
      ? "Expected all three exported primary state colors in Light and Dark."
      : passed
        ? "Every mode exports three distinct state colors."
        : "At least one mode collapses two states to the same exported color.",
  );
}

function evaluateStateProgression({ structuralQuality }) {
  const observed = EXPECTED_MODES.map((mode) => {
    const state = structuralQuality?.states?.[mode];
    const expectedId = `${mode}.primary.state.monotonic-lightness`;
    const checks = (state?.checks ?? []).filter(({ id }) => id === expectedId);
    return { mode, checks, complete: checks.length === 1 };
  });
  const complete = observed.every((item) => item.complete);
  const passed = observed.every(({ checks }) =>
    checks.every(({ pass }) => pass),
  );
  return evaluation(
    !complete ? "needs-review" : passed ? "satisfied" : "unsatisfied",
    observed,
    !complete
      ? "Expected one primary monotonic-lightness check in Light and Dark."
      : passed
        ? "Every mode preserves the declared default → hover → active direction."
        : "At least one mode reverses or collapses the declared state direction.",
  );
}

function evaluateHoverDiscoverability({ hoverEvidence }) {
  const complete = hoverEvidence.complete && hoverEvidence.record !== null;
  return evaluation(
    !complete
      ? "needs-review"
      : hoverEvidence.satisfies
        ? "satisfied"
        : "unsatisfied",
    complete ? [hoverEvidence.record] : [],
    !complete
      ? "A matching interactive specimen judgment and note are required in both modes."
      : hoverEvidence.satisfies
        ? "The recorded Light and Dark specimen judgments both meet the declared intent."
        : "At least one recorded mode judges the hover as too subtle or too strong.",
  );
}

export const SEMANTIC_EVALUATORS = {
  "evaluator.primary-label-readable.v1": {
    declaration: "shared-label-readable",
    consumes: ["evidence.primary-label-apca.v1"],
    evaluate: evaluateSharedLabel,
  },
  "evaluator.primary-states-distinct.v1": {
    declaration: "states-distinct",
    consumes: ["evidence.primary-exported-states.v1"],
    evaluate: evaluateDistinctStates,
  },
  "evaluator.primary-state-progression.v1": {
    declaration: "active-continues-beyond-hover",
    consumes: ["evidence.primary-state-progression.v1"],
    evaluate: evaluateStateProgression,
  },
  "evaluator.primary-hover-discoverable.v1": {
    declaration: "hover-discoverable",
    consumes: ["evidence.interactive-hover-rating.v1"],
    evaluate: evaluateHoverDiscoverability,
  },
};

function sameIds(first, second) {
  return (
    first.length === second.length &&
    first.every((value, index) => value === second[index])
  );
}

function validateDeclaration(declaration, evidenceContracts, evaluators) {
  if (declaration.evidence.length === 0) {
    throw new Error(`${declaration.id} must declare evidence.`);
  }
  for (const evidenceId of declaration.evidence) {
    if (!evidenceContracts[evidenceId]) {
      throw new Error(`${declaration.id} references unknown ${evidenceId}.`);
    }
  }
  const evaluator = evaluators[declaration.evaluator];
  if (!evaluator) {
    throw new Error(
      `${declaration.id} references unknown ${declaration.evaluator}.`,
    );
  }
  if (typeof evaluator.evaluate !== "function") {
    throw new Error(`${declaration.evaluator} must provide an evaluator.`);
  }
  if (evaluator.declaration !== declaration.id) {
    throw new Error(`${declaration.evaluator} owns another declaration.`);
  }
  if (!sameIds(evaluator.consumes, declaration.evidence)) {
    throw new Error(`${declaration.evaluator} consumes undeclared evidence.`);
  }
}

function validateAcceptanceScenario(scenario, declarations) {
  if (typeof scenario.id !== "string" || scenario.id.length === 0) {
    throw new Error("Acceptance scenarios require an id.");
  }
  const declaration = declarations.find(
    ({ id }) => id === scenario.declaration,
  );
  if (!declaration) {
    throw new Error(
      `Acceptance scenario references unknown ${scenario.declaration}.`,
    );
  }
  if (scenario.evaluator !== declaration.evaluator) {
    throw new Error(`${scenario.id} references the wrong evaluator.`);
  }
  if (!ACCEPTANCE_OUTCOMES.includes(scenario.outcome)) {
    throw new Error(`${scenario.id} has an unknown acceptance outcome.`);
  }
  if (scenario.expectedStatus !== ACCEPTANCE_STATUS[scenario.outcome]) {
    throw new Error(`${scenario.id} has the wrong expected status.`);
  }
  if (typeof scenario.context !== "function") {
    throw new Error(`${scenario.id} must provide an executable context.`);
  }
}

function validateAcceptanceCoverage(declaration, acceptanceScenarios) {
  const outcomes = new Set(
    acceptanceScenarios
      .filter((scenario) => scenario.declaration === declaration.id)
      .map(({ outcome }) => outcome),
  );
  for (const outcome of ACCEPTANCE_OUTCOMES) {
    if (!outcomes.has(outcome)) {
      throw new Error(
        `${declaration.id} lacks ${outcome} acceptance coverage.`,
      );
    }
  }
}

export function validateSemanticTraceability({
  model = PRIMARY_ACTION_SEMANTIC_MODEL,
  evidenceContracts = SEMANTIC_EVIDENCE_CONTRACTS,
  evaluators = SEMANTIC_EVALUATORS,
  acceptanceScenarios = null,
} = {}) {
  const declarations = model.declarations;
  const declarationIds = declarations.map(({ id }) => id);
  if (new Set(declarationIds).size !== declarationIds.length) {
    throw new Error("Semantic declaration ids must be unique.");
  }
  for (const declaration of declarations) {
    validateDeclaration(declaration, evidenceContracts, evaluators);
  }
  if (acceptanceScenarios) {
    const scenarioIds = acceptanceScenarios.map(({ id }) => id);
    if (new Set(scenarioIds).size !== scenarioIds.length) {
      throw new Error("Acceptance scenario ids must be unique.");
    }
    for (const scenario of acceptanceScenarios) {
      validateAcceptanceScenario(scenario, declarations);
    }
    for (const declaration of declarations) {
      validateAcceptanceCoverage(declaration, acceptanceScenarios);
    }
  }
  return true;
}

validateSemanticTraceability();

function resultFor(declaration, evaluatorId, result) {
  return {
    ...declaration,
    evaluator: evaluatorId,
    trace: {
      declaration: declaration.id,
      evaluator: evaluatorId,
      evidence: [...declaration.evidence],
    },
    ...result,
  };
}

export function formatSemanticCounts(counts) {
  const summary = `${counts.satisfied} satisfied · ${counts["needs-review"]} needs review`;
  return counts.unsatisfied > 0
    ? `${summary} · ${counts.unsatisfied} unsatisfied`
    : summary;
}

export function evaluatePrimaryActionSemantics(
  modes,
  structuralQuality,
  hoverEvidence = { complete: false, satisfies: false, record: null },
) {
  const context = { modes, structuralQuality, hoverEvidence };
  const evaluations = PRIMARY_ACTION_SEMANTIC_MODEL.declarations.map(
    (declaration) => {
      const evaluator = SEMANTIC_EVALUATORS[declaration.evaluator];
      return resultFor(
        declaration,
        declaration.evaluator,
        evaluator.evaluate(context),
      );
    },
  );
  const statuses = ["satisfied", "needs-review", "unsatisfied"];
  return {
    model: {
      id: PRIMARY_ACTION_SEMANTIC_MODEL.id,
      version: PRIMARY_ACTION_SEMANTIC_MODEL.version,
    },
    evaluations,
    counts: Object.fromEntries(
      statuses.map((status) => [
        status,
        evaluations.filter((item) => item.status === status).length,
      ]),
    ),
    satisfied: evaluations.every(({ status }) => status === "satisfied"),
  };
}
