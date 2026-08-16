import { assertEvidenceAuthority } from "./evidence-authority.js";

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
  "evidence.foundation-hierarchy-decisions.v1": {
    producer: "selected-decision-trace",
    scope: "foundation-surface-family",
    requires: ["light-and-dark", "surface-raised-muted", "hierarchy-rule"],
    cannotEstablish: ["universal-depth-perception"],
  },
  "evidence.foundation-text-apca.v1": {
    producer: "automated-check",
    scope: "foundation-text-family",
    requires: [
      "light-and-dark",
      "body-surface-muted-text",
      "actual-text-pairs",
    ],
    cannotEstablish: ["accessibility-conformance"],
  },
  "evidence.focus-foundation-contrast.v1": {
    producer: "automated-check",
    scope: "focus-foundation-pairs",
    requires: ["light-and-dark", "background-and-surface", "final-srgb"],
    cannotEstablish: [
      "universal-focus-discoverability",
      "accessibility-conformance",
    ],
  },
  "evidence.focus-semantic-separation.v1": {
    producer: "selected-decision-trace",
    scope: "focus-authored-control-relation",
    requires: ["light-and-dark", "primary-and-destructive", "final-srgb"],
    cannotEstablish: [
      "universal-focus-discoverability",
      "perceived-semantic-distinctness",
    ],
  },
  "evidence.destructive-label-apca.v1": {
    producer: "automated-check",
    scope: "destructive-state-family",
    requires: [
      "light-and-dark",
      "destructive-default-hover-active",
      "actual-label-fill",
    ],
    cannotEstablish: ["feedback-meaning", "accessibility-conformance"],
  },
  "evidence.warning-label-apca.v1": {
    producer: "automated-check",
    scope: "warning-state-family",
    requires: [
      "light-and-dark",
      "warning-default-hover-active",
      "actual-label-fill",
    ],
    cannotEstablish: ["feedback-meaning", "accessibility-conformance"],
  },
  "evidence.feedback-oklab-separation.v1": {
    producer: "automated-check",
    scope: "brand-destructive-warning-relations",
    requires: ["light-and-dark", "all-three-pairs", "final-srgb"],
    cannotEstablish: ["perceived-feedback-meaning"],
  },
  "evidence.selection-text-apca.v1": {
    producer: "automated-check",
    scope: "selection-family",
    requires: ["light-and-dark", "selected-content-pair", "actual-text-pair"],
    cannotEstablish: ["selection-discoverability", "accessibility-conformance"],
  },
  "evidence.selection-surface-separation.v1": {
    producer: "automated-check",
    scope: "selection-foundation-relation",
    requires: ["light-and-dark", "surface-selection-pair", "final-srgb"],
    cannotEstablish: ["selection-discoverability"],
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

export const FOUNDATION_FOCUS_SEMANTIC_MODEL = {
  id: "foundation-focus-family",
  version: 1,
  roles: {
    foundation: ["background", "surface", "raised surface", "muted surface"],
    text: ["foreground", "muted text"],
    focus: "focus ring",
    authoredControls: ["primary", "destructive"],
  },
  declarations: [
    {
      id: "foundation-hierarchy-ordered",
      kind: "relation",
      authority: "research-policy",
      statement:
        "Selected Surface, Raised, and Muted candidates pass their declared role-local hierarchy relations.",
      evidence: ["evidence.foundation-hierarchy-decisions.v1"],
      evaluator: "evaluator.foundation-hierarchy.v1",
    },
    {
      id: "foundation-text-targets-pass",
      kind: "constraint",
      authority: "heuristic",
      statement:
        "Foundation body, surface, and muted text pass their declared readability targets.",
      evidence: ["evidence.foundation-text-apca.v1"],
      evaluator: "evaluator.foundation-text-targets.v1",
    },
    {
      id: "focus-adjacent-contrast-passes",
      kind: "constraint",
      authority: "normative",
      statement:
        "The focus indicator passes its declared adjacent-contrast target on background and surface.",
      evidence: ["evidence.focus-foundation-contrast.v1"],
      evaluator: "evaluator.focus-adjacent-contrast.v1",
    },
    {
      id: "focus-control-oklab-separation-passes",
      kind: "relation",
      authority: "heuristic",
      statement:
        "The focus indicator passes the declared Oklab separation heuristic from Primary and Destructive controls.",
      evidence: ["evidence.focus-semantic-separation.v1"],
      evaluator: "evaluator.focus-control-oklab-separation.v1",
    },
  ],
  strategies: [],
};

export const FEEDBACK_SEMANTIC_MODEL = {
  id: "feedback-family",
  version: 1,
  roles: {
    destructive: ["destructive", "destructive hover", "destructive active"],
    destructiveLabel: "destructive text",
    warning: ["warning", "warning hover", "warning active"],
    warningLabel: "warning text",
  },
  declarations: [
    {
      id: "feedback-destructive-label-targets-pass",
      kind: "constraint",
      authority: "heuristic",
      statement:
        "Destructive labels pass their declared APCA targets across default, hover, and active.",
      evidence: ["evidence.destructive-label-apca.v1"],
      evaluator: "evaluator.feedback-destructive-label-targets.v1",
    },
    {
      id: "feedback-warning-label-targets-pass",
      kind: "constraint",
      authority: "heuristic",
      statement:
        "Warning labels pass their declared APCA targets across default, hover, and active.",
      evidence: ["evidence.warning-label-apca.v1"],
      evaluator: "evaluator.feedback-warning-label-targets.v1",
    },
    {
      id: "feedback-oklab-separation-passes",
      kind: "relation",
      authority: "heuristic",
      statement:
        "Brand, Destructive, and Warning pass their declared pairwise Oklab separation heuristics.",
      evidence: ["evidence.feedback-oklab-separation.v1"],
      evaluator: "evaluator.feedback-oklab-separation.v1",
    },
  ],
  strategies: [],
};

export const SELECTION_SEMANTIC_MODEL = {
  id: "selection-family",
  version: 1,
  roles: {
    selection: ["selection", "selection text"],
  },
  declarations: [
    {
      id: "selection-text-target-passes",
      kind: "constraint",
      authority: "heuristic",
      statement: "Selected content passes its declared APCA target.",
      evidence: ["evidence.selection-text-apca.v1"],
      evaluator: "evaluator.selection-text-target.v1",
    },
    {
      id: "selection-surface-oklab-separation-passes",
      kind: "relation",
      authority: "heuristic",
      statement:
        "Selection passes its declared Oklab separation heuristic from Surface.",
      evidence: ["evidence.selection-surface-separation.v1"],
      evaluator: "evaluator.selection-surface-oklab-separation.v1",
    },
  ],
  strategies: [],
};

export const V2_SEMANTIC_MODEL = {
  id: "v2-declarative-design",
  version: 3,
  components: [
    {
      id: PRIMARY_ACTION_SEMANTIC_MODEL.id,
      version: PRIMARY_ACTION_SEMANTIC_MODEL.version,
    },
    {
      id: FOUNDATION_FOCUS_SEMANTIC_MODEL.id,
      version: FOUNDATION_FOCUS_SEMANTIC_MODEL.version,
    },
    {
      id: FEEDBACK_SEMANTIC_MODEL.id,
      version: FEEDBACK_SEMANTIC_MODEL.version,
    },
    {
      id: SELECTION_SEMANTIC_MODEL.id,
      version: SELECTION_SEMANTIC_MODEL.version,
    },
  ],
  declarations: [
    ...PRIMARY_ACTION_SEMANTIC_MODEL.declarations,
    ...FOUNDATION_FOCUS_SEMANTIC_MODEL.declarations,
    ...FEEDBACK_SEMANTIC_MODEL.declarations,
    ...SELECTION_SEMANTIC_MODEL.declarations,
  ],
  strategies: [...PRIMARY_ACTION_SEMANTIC_MODEL.strategies],
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
          .length === 1 &&
        explicitVerdict(
          checks.find((check) => check.mode === mode && check.role === role),
        ) !== null,
    ),
  );
  const passed = checks.every((check) => explicitVerdict(check));
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
    return {
      mode,
      checks,
      complete: checks.length === 1 && explicitVerdict(checks[0]) !== null,
    };
  });
  const complete = observed.every((item) => item.complete);
  const passed = observed.every(({ checks }) =>
    checks.every((check) => explicitVerdict(check)),
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

function explicitVerdict(record) {
  const verdicts = [record?.pass, record?.passed].filter(
    (value) => typeof value === "boolean",
  );
  return verdicts.length === 1 ? verdicts[0] : null;
}

function selectedRuleEvidence(modes, roles, ruleId) {
  return EXPECTED_MODES.flatMap((mode) =>
    roles.map((role) => {
      const results =
        modes[mode]?.decisions?.[role]?.selected?.constraintResults ?? [];
      const matches = results.filter(({ id }) => id === ruleId);
      return {
        mode,
        role,
        matches,
        complete: matches.length === 1 && explicitVerdict(matches[0]) !== null,
      };
    }),
  );
}

function checkEvidence(modes, collection, roles) {
  return EXPECTED_MODES.flatMap((mode) =>
    roles.map((role) => {
      const matches = (modes[mode]?.[collection] ?? []).filter(
        (check) => check.role === role,
      );
      return {
        mode,
        role,
        matches,
        complete: matches.length === 1 && explicitVerdict(matches[0]) !== null,
      };
    }),
  );
}

function evaluateRecordedChecks(
  observed,
  completeReason,
  passReason,
  failReason,
) {
  const complete = observed.every((item) => item.complete);
  const passed = observed.every(({ matches }) => explicitVerdict(matches[0]));
  return evaluation(
    !complete ? "needs-review" : passed ? "satisfied" : "unsatisfied",
    observed,
    !complete ? completeReason : passed ? passReason : failReason,
  );
}

function evaluateFoundationHierarchy({ modes }) {
  return evaluateRecordedChecks(
    selectedRuleEvidence(
      modes,
      ["surface", "raised surface", "muted surface"],
      "foundation.hierarchy",
    ),
    "Expected one selected hierarchy result for every Foundation layer in Light and Dark.",
    "Every selected Foundation layer preserves the declared hierarchy.",
    "At least one selected Foundation layer contradicts the declared hierarchy.",
  );
}

function evaluateFoundationText({ modes }) {
  return evaluateRecordedChecks(
    checkEvidence(modes, "textChecks", [
      "Body text",
      "Text on surface",
      "Muted text",
    ]),
    "Expected one Foundation text check for every declared pair in Light and Dark.",
    "Every Foundation text pair passes its declared APCA target.",
    "At least one Foundation text pair misses its declared APCA target.",
  );
}

function evaluateFocusContrast({ modes }) {
  return evaluateRecordedChecks(
    checkEvidence(modes, "nonTextChecks", [
      "Focus on background",
      "Focus on surface",
    ]),
    "Expected focus contrast checks on both foundations in Light and Dark.",
    "Focus passes its declared adjacent-contrast target on both foundations.",
    "Focus misses its declared adjacent-contrast target on at least one foundation.",
  );
}

function evaluateFocusSeparation({ modes }) {
  return evaluateRecordedChecks(
    selectedRuleEvidence(modes, ["focus ring"], "focus.semantic-separation"),
    "Expected one selected Focus semantic-separation result in Light and Dark.",
    "Focus passes its declared Oklab separation heuristic from authored controls in both modes.",
    "Focus misses its declared Oklab separation heuristic from an authored control in at least one mode.",
  );
}

function evaluateFeedbackLabels(modes, family) {
  const roles = [family, `${family} hover`, `${family} active`].map(
    (role) => `Label on ${role}`,
  );
  return evaluateRecordedChecks(
    checkEvidence(modes, "textChecks", roles),
    `Expected one ${family} label check for every state in Light and Dark.`,
    `Every ${family} label passes its declared APCA target.`,
    `At least one ${family} label misses its declared APCA target.`,
  );
}

function evaluateFeedbackSeparation({ modes }) {
  return evaluateRecordedChecks(
    checkEvidence(modes, "nonTextChecks", [
      "Brand → destructive",
      "Brand → warning",
      "Destructive → warning",
    ]),
    "Expected all three Feedback separation checks in Light and Dark.",
    "Every Feedback pair passes its declared Oklab separation heuristic.",
    "At least one Feedback pair misses its declared Oklab separation heuristic.",
  );
}

function evaluateSelectionText({ modes }) {
  return evaluateRecordedChecks(
    checkEvidence(modes, "textChecks", ["Selected content"]),
    "Expected one selected-content text check in Light and Dark.",
    "Selected content passes its declared APCA target in both modes.",
    "Selected content misses its declared APCA target in at least one mode.",
  );
}

function evaluateSelectionSeparation({ modes }) {
  return evaluateRecordedChecks(
    checkEvidence(modes, "nonTextChecks", ["Surface → selection"]),
    "Expected one Surface-to-selection separation check in Light and Dark.",
    "Selection passes its declared Oklab separation heuristic from Surface in both modes.",
    "Selection misses its declared Oklab separation heuristic from Surface in at least one mode.",
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
  "evaluator.foundation-hierarchy.v1": {
    declaration: "foundation-hierarchy-ordered",
    consumes: ["evidence.foundation-hierarchy-decisions.v1"],
    evaluate: evaluateFoundationHierarchy,
  },
  "evaluator.foundation-text-targets.v1": {
    declaration: "foundation-text-targets-pass",
    consumes: ["evidence.foundation-text-apca.v1"],
    evaluate: evaluateFoundationText,
  },
  "evaluator.focus-adjacent-contrast.v1": {
    declaration: "focus-adjacent-contrast-passes",
    consumes: ["evidence.focus-foundation-contrast.v1"],
    evaluate: evaluateFocusContrast,
  },
  "evaluator.focus-control-oklab-separation.v1": {
    declaration: "focus-control-oklab-separation-passes",
    consumes: ["evidence.focus-semantic-separation.v1"],
    evaluate: evaluateFocusSeparation,
  },
  "evaluator.feedback-destructive-label-targets.v1": {
    declaration: "feedback-destructive-label-targets-pass",
    consumes: ["evidence.destructive-label-apca.v1"],
    evaluate: ({ modes }) => evaluateFeedbackLabels(modes, "destructive"),
  },
  "evaluator.feedback-warning-label-targets.v1": {
    declaration: "feedback-warning-label-targets-pass",
    consumes: ["evidence.warning-label-apca.v1"],
    evaluate: ({ modes }) => evaluateFeedbackLabels(modes, "warning"),
  },
  "evaluator.feedback-oklab-separation.v1": {
    declaration: "feedback-oklab-separation-passes",
    consumes: ["evidence.feedback-oklab-separation.v1"],
    evaluate: evaluateFeedbackSeparation,
  },
  "evaluator.selection-text-target.v1": {
    declaration: "selection-text-target-passes",
    consumes: ["evidence.selection-text-apca.v1"],
    evaluate: evaluateSelectionText,
  },
  "evaluator.selection-surface-oklab-separation.v1": {
    declaration: "selection-surface-oklab-separation-passes",
    consumes: ["evidence.selection-surface-separation.v1"],
    evaluate: evaluateSelectionSeparation,
  },
};

function sameIds(first, second) {
  return (
    first.length === second.length &&
    first.every((value, index) => value === second[index])
  );
}

function validateDeclaration(declaration, evidenceContracts, evaluators) {
  assertEvidenceAuthority(declaration.authority, declaration.id);
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
  model = V2_SEMANTIC_MODEL,
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

export function evaluateV2Semantics(modes, structuralQuality) {
  const context = { modes, structuralQuality };
  const evaluations = V2_SEMANTIC_MODEL.declarations.map((declaration) => {
    const evaluator = SEMANTIC_EVALUATORS[declaration.evaluator];
    return resultFor(
      declaration,
      declaration.evaluator,
      evaluator.evaluate(context),
    );
  });
  const statuses = ["satisfied", "needs-review", "unsatisfied"];
  return {
    model: {
      id: V2_SEMANTIC_MODEL.id,
      version: V2_SEMANTIC_MODEL.version,
      components: V2_SEMANTIC_MODEL.components,
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
