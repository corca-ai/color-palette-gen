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
      evidence: ["apca-label-checks"],
    },
    {
      id: "states-distinct",
      kind: "invariant",
      authority: "technical",
      statement: "Default, hover, and active export as distinct sRGB colors.",
      evidence: ["exported-state-values"],
    },
    {
      id: "active-continues-beyond-hover",
      kind: "relation",
      authority: "product-policy",
      statement:
        "Active continues beyond hover in the same mode-specific direction.",
      evidence: ["state-progression"],
    },
    {
      id: "hover-discoverable",
      kind: "intent",
      authority: "product-intent",
      statement:
        "Hover is noticeable during interaction without overpowering brand identity.",
      evidence: ["interactive-specimen-rating"],
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

function resultFor(declaration, status, evidence, reason) {
  return { ...declaration, status, observedEvidence: evidence, reason };
}

export function formatSemanticCounts(counts) {
  const summary = `${counts.satisfied} satisfied · ${counts["needs-review"]} needs review`;
  return counts.unsatisfied > 0
    ? `${summary} · ${counts.unsatisfied} unsatisfied`
    : summary;
}

export function evaluatePrimaryActionSemantics(modes, structuralQuality) {
  const declarations = Object.fromEntries(
    PRIMARY_ACTION_SEMANTIC_MODEL.declarations.map((item) => [item.id, item]),
  );
  const labelChecks = EXPECTED_MODES.flatMap((mode) =>
    (modes[mode]?.textChecks ?? [])
      .filter(({ role }) => EXPECTED_LABEL_ROLES.includes(role))
      .map((check) => ({ mode, ...check })),
  );
  const labelEvidenceComplete = EXPECTED_MODES.every((mode) =>
    EXPECTED_LABEL_ROLES.every(
      (role) =>
        labelChecks.filter(
          (check) => check.mode === mode && check.role === role,
        ).length === 1,
    ),
  );
  const labelPassed = labelChecks.every(({ pass }) => pass);
  const distinctModes = EXPECTED_MODES.map((mode) => {
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
  const progression = EXPECTED_MODES.map((mode) => {
    const state = structuralQuality?.states?.[mode];
    const expectedId = `${mode}.primary.state.monotonic-lightness`;
    const checks = (state?.checks ?? []).filter(({ id }) => id === expectedId);
    return { mode, checks, complete: checks.length === 1 };
  });
  const progressionEvidenceComplete = progression.every(
    ({ complete }) => complete,
  );
  const progressionPassed = progression.every(({ checks }) =>
    checks.every(({ pass }) => pass),
  );
  const distinctEvidenceComplete = distinctModes.every(
    ({ complete }) => complete,
  );
  const distinctPassed = distinctModes.every(({ distinct }) => distinct);
  const evaluations = [
    resultFor(
      declarations["shared-label-readable"],
      !labelEvidenceComplete
        ? "needs-review"
        : labelPassed
          ? "satisfied"
          : "unsatisfied",
      labelChecks,
      !labelEvidenceComplete
        ? "Expected one primary label check for every state in Light and Dark."
        : labelPassed
          ? "Every mode and state passes its declared label APCA target."
          : "At least one state misses its declared label APCA target.",
    ),
    resultFor(
      declarations["states-distinct"],
      !distinctEvidenceComplete
        ? "needs-review"
        : distinctPassed
          ? "satisfied"
          : "unsatisfied",
      distinctModes,
      !distinctEvidenceComplete
        ? "Expected all three exported primary state colors in Light and Dark."
        : distinctPassed
          ? "Every mode exports three distinct state colors."
          : "At least one mode collapses two states to the same exported color.",
    ),
    resultFor(
      declarations["active-continues-beyond-hover"],
      !progressionEvidenceComplete
        ? "needs-review"
        : progressionPassed
          ? "satisfied"
          : "unsatisfied",
      progression,
      !progressionEvidenceComplete
        ? "Expected one primary monotonic-lightness check in Light and Dark."
        : progressionPassed
          ? "Every mode preserves the declared default → hover → active direction."
          : "At least one mode reverses or collapses the declared state direction.",
    ),
    resultFor(
      declarations["hover-discoverable"],
      "needs-review",
      [],
      "No recorded interactive specimen rating proves this intent for the current input in both modes.",
    ),
  ];
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
