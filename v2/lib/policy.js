import { assertEvidenceAuthority } from "./evidence-authority.js";

export const EVIDENCE = {
  wcagText: {
    class: "normative",
    label: "WCAG 2.2 · Contrast Minimum",
    url: "https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum",
    scope:
      "Normal text in the declared typography context uses a minimum 4.5:1 rendered-sRGB contrast ratio.",
  },
  wcagNonText: {
    class: "normative",
    label: "WCAG 2.2 · Non-text Contrast",
    url: "https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast",
    scope:
      "Required control boundaries and focus indicators use 3:1 adjacent contrast.",
  },
  apcaText: {
    class: "heuristic",
    label: "APCA-W3 0.1.9 prototype policy",
    url: "https://github.com/Myndex/apca-w3",
    scope:
      "Official calculation implementation; typography targets remain an experimental product policy, not a WCAG conformance claim.",
  },
  carbonStates: {
    class: "reference",
    label: "Carbon · Interaction states",
    url: "https://preview.carbondesignsystem.com/building-blocks/foundations/color/overview",
    scope:
      "Subtle hover and stronger active state progression; it does not determine v2's fixed darker action direction.",
  },
  spectrumStates: {
    class: "reference",
    label: "Spectrum · Using color",
    url: "https://spectrum.adobe.com/page/using-color/",
    scope:
      "Default, hover, and down advance monotonically through a theme-specific scale.",
  },
  calmMinimal: {
    class: "product-policy",
    label: "Color Lab v2 · Calm/minimal definition",
    url: "https://github.com/corca-ai/color-palette-gen/blob/main/docs/v2-decisions/policy/roles.md#calm-and-minimal",
    scope:
      "One brand hue, neutral-dominant foundations, bounded tint, and no generated harmony hues.",
  },
  stateSeparation: {
    class: "heuristic",
    label: "Provisional state-separation threshold",
    url: "https://github.com/corca-ai/color-palette-gen/blob/main/docs/v2-decisions/policy/roles.md#interactive-states",
    scope:
      "Oklab distance is provisional until a designer ranking study replaces it.",
    validationNeeded: true,
  },
  destructiveSeparation: {
    class: "heuristic",
    label: "Provisional semantic separation",
    url: "https://github.com/corca-ai/color-palette-gen/blob/main/docs/v2-decisions/policy/roles.md#destructive",
    scope:
      "Brand and destructive colors need perceptual separation; the current bound is not a published standard.",
    validationNeeded: true,
  },
};

export const V2_POLICY = {
  version: "v2-policy-model-20",
  text: {
    strategy: "wcag-eligible-apca-ranked",
    wcagNormalTextMinimum: 4.5,
    typographyContextSchema: "typography-context.v1",
    typographyContexts: {
      body: {
        id: "body-text.v1",
        usage: "normal-text",
        fontSizePx: 11,
        fontWeight: 400,
        apcaDiagnosticMinimum: 75,
      },
      muted: {
        id: "muted-ui-text.v1",
        usage: "normal-text",
        fontSizePx: 9,
        fontWeight: 400,
        apcaDiagnosticMinimum: 60,
      },
      actionLabel: {
        id: "compact-action-label.v1",
        usage: "normal-text",
        fontSizePx: 11,
        fontWeight: 650,
        apcaDiagnosticMinimum: 60,
      },
      warningLabel: {
        id: "compact-warning-label.v1",
        usage: "normal-text",
        fontSizePx: 10,
        fontWeight: 650,
        apcaDiagnosticMinimum: 60,
      },
      selection: {
        id: "selection-text.v1",
        usage: "normal-text",
        fontSizePx: 10,
        fontWeight: 400,
        apcaDiagnosticMinimum: 60,
      },
    },
  },
  search: {
    candidateStep: 0.0025,
    stateCandidateLimit: 80,
  },
  primary: {
    lightnessRange: {
      light: [0.46, 0.54],
      dark: [0.58, 0.62],
    },
    chromaCap: 0.15,
    chromaTolerance: 0.002,
    apcaDiagnosticLc: 60,
    boundaryContrast: 3,
    maximumSourceDistance: 0.18,
  },
  state: {
    // Filled Primary and Destructive actions share one mode-relative grammar:
    // Light gets darker; Dark gets lighter from default to hover to active.
    filledActionDirections: { light: -1, dark: 1 },
    filledActionForeground: "shared-per-mode",
    direction: { light: -1, dark: 1 },
    separation: {
      hoverFromDefault: 0.035,
      activeFromDefault: 0.075,
    },
    progressionRatio: [0.8, 1.5],
  },
  crossMode: {
    maximumHueDrift: 4,
    maximumChromaDifference: 0.035,
    lightnessGap: [0.04, 0.16],
    pairRankingStrategy: "zero-primary-pair-quality-miss-gated-source-first",
    eligibilityCheckIds: [
      "pair.primary-hue-drift",
      "pair.primary-chroma-difference",
      "pair.primary-lightness-gap",
      "light.primary.state.interval-ratio",
      "light.primary.state.monotonic-lightness",
      "dark.primary.state.interval-ratio",
      "dark.primary.state.monotonic-lightness",
    ],
  },
  semanticReview: {
    minimumHueSeparation: 30,
    chromaFloor: 0.025,
  },
  neutral: { tintCap: 0.012 },
  foundation: {
    candidateStep: 0.005,
    candidateRadius: 0.04,
    modeZone: {
      lightMinimum: 0.96,
      darkMaximum: 0.185,
    },
    hierarchySeparation: 0.01,
    bodyTextApcaDiagnosticLc: 75,
    mutedTextApcaDiagnosticLc: 60,
    inputContrast: 3,
  },
  focus: {
    contrast: 3,
    adjacentRoles: ["background", "surface", "muted surface"],
    semanticSeparation: 0.05,
    candidateStep: 0.01,
    lightnessRange: [0.2, 0.86],
    chromaScales: [0.35, 0.65, 1],
  },
  feedback: {
    warningHue: 85,
    warningHueCandidates: [70, 85, 100],
    warningChroma: { light: 0.18, dark: 0.14 },
    warningLightness: { light: 0.78, dark: 0.72 },
    warningRange: { light: [0.52, 0.82], dark: [0.62, 0.8] },
    semanticSeparation: 0.08,
  },
  selection: {
    lightnessRange: { light: [0.82, 0.94], dark: [0.24, 0.38] },
    chromaScales: [0.15, 0.3, 0.45],
    surfaceSeparation: 0.03,
    textApcaDiagnosticLc: 60,
  },
  destructive: {
    separation: 0.08,
    separationAuthority: "selected-result-review",
    apcaDiagnosticLc: 60,
    lightnessRange: {
      light: [0.3, 0.56],
      dark: [0.56, 0.72],
    },
    candidateStep: 0.005,
  },
  decisions: {
    state: {
      constraints: ["state.minimum-separation"],
      objectives: ["state.minimum-change"],
      tieBreakers: ["stable.hex-order"],
    },
    labeledState: {
      constraints: ["state.minimum-separation", "state.shared-label"],
      objectives: ["state.minimum-change"],
      tieBreakers: ["stable.hex-order"],
    },
    primary: {
      constraints: [
        "primary.generated-family",
        "primary.mode-range",
        "primary.calm-chroma",
        "primary.shared-label",
      ],
      objectives: ["primary.source-fidelity"],
      tieBreakers: ["stable.hex-order"],
    },
    destructive: {
      constraints: [
        "destructive.label-contrast",
        "destructive.brand-separation",
      ],
      objectives: ["destructive.semantic-anchor"],
      tieBreakers: ["stable.hex-order"],
    },
    foundationAnchor: {
      constraints: ["foundation.mode-zone", "foundation.calm-tint"],
      objectives: ["foundation.recipe-fidelity"],
      tieBreakers: ["stable.hex-order"],
    },
    foundationLayer: {
      constraints: ["foundation.hierarchy", "foundation.calm-tint"],
      objectives: ["foundation.recipe-fidelity"],
      tieBreakers: ["stable.hex-order"],
    },
    foundationText: {
      constraints: ["foundation.text-contrast", "foundation.calm-tint"],
      objectives: ["foundation.recipe-fidelity"],
      tieBreakers: ["stable.hex-order"],
    },
    foundationInput: {
      constraints: ["foundation.boundary-contrast", "foundation.calm-tint"],
      objectives: ["foundation.recipe-fidelity"],
      tieBreakers: ["stable.hex-order"],
    },
    binaryText: {
      constraints: ["text.required-contrast"],
      objectives: ["text.maximize-weakest-contrast"],
      tieBreakers: ["stable.hex-order"],
    },
    fixedTextValidation: {
      constraints: ["text.required-contrast"],
      objectives: [],
      tieBreakers: [],
    },
    focus: {
      constraints: [
        "focus.adjacent-contrast",
        "focus.semantic-separation",
        "focus.brand-relation",
      ],
      objectives: ["focus.minimum-brand-distance"],
      tieBreakers: ["stable.hex-order"],
    },
    primaryBorder: {
      constraints: ["primary-border.adjacent-contrast"],
      objectives: ["primary-border.minimum-brand-distance"],
      tieBreakers: ["stable.hex-order"],
    },
    warning: {
      constraints: ["feedback.label-contrast", "feedback.semantic-separation"],
      objectives: ["feedback.semantic-anchor"],
      tieBreakers: ["stable.hex-order"],
    },
    selection: {
      constraints: ["selection.text-contrast", "selection.surface-separation"],
      objectives: ["selection.minimum-emphasis"],
      tieBreakers: ["stable.hex-order"],
    },
  },
};

export function warningLabelApcaDiagnosticMinimum(policy = V2_POLICY) {
  const minimum =
    policy?.text?.typographyContexts?.warningLabel?.apcaDiagnosticMinimum;
  if (!Number.isFinite(minimum) || minimum <= 0) {
    throw new TypeError(
      "Warning label typography context must declare a positive APCA diagnostic minimum.",
    );
  }
  return minimum;
}

export const RULE_CATALOG = {
  "state.minimum-separation": {
    label: "Required state separation",
    kind: "constraint",
    authority: "provisional",
    evidence: ["stateSeparation"],
  },
  "state.shared-label": {
    label: "Readable shared state label",
    kind: "constraint",
    authority: "normative",
    evidence: ["wcagText", "apcaText"],
  },
  "primary.generated-family": {
    label: "Complete interaction family",
    kind: "constraint",
    authority: "technical",
  },
  "primary.mode-range": {
    label: "Mode-appropriate lightness",
    kind: "constraint",
    authority: "product-policy",
    evidence: ["calmMinimal"],
  },
  "primary.calm-chroma": {
    label: "Calm source-relative chroma",
    kind: "constraint",
    authority: "provisional",
    evidence: ["calmMinimal"],
  },
  "primary.shared-label": {
    label: "Readable shared label",
    kind: "constraint",
    authority: "normative",
    evidence: ["wcagText", "apcaText"],
  },
  "primary-border.adjacent-contrast": {
    label: "Visible action boundary on both foundations",
    kind: "constraint",
    authority: "normative",
    evidence: ["wcagNonText"],
  },
  "primary-border.minimum-brand-distance": {
    label: "Keep the boundary brand-related",
    kind: "product-objective",
    authority: "product-policy",
    direction: "minimize",
  },
  "destructive.label-contrast": {
    label: "Readable destructive label",
    kind: "constraint",
    authority: "normative",
    evidence: ["wcagText", "apcaText"],
  },
  "destructive.brand-separation": {
    label: "Distinct destructive meaning",
    kind: "constraint",
    authority: "provisional",
    evidence: ["destructiveSeparation"],
  },
  "state.minimum-change": {
    label: "Minimize change from default",
    kind: "product-objective",
    authority: "product-policy",
    direction: "minimize",
  },
  "primary.source-fidelity": {
    label: "Minimize distance from input",
    kind: "product-objective",
    authority: "product-policy",
    direction: "minimize",
  },
  "destructive.semantic-anchor": {
    label: "Stay near preferred semantic red",
    kind: "product-objective",
    authority: "product-policy",
    direction: "minimize",
  },
  "stable.hex-order": {
    label: "Stable hexadecimal order",
    kind: "tie-breaker",
    authority: "technical",
    direction: "ascending",
  },
  "foundation.mode-zone": {
    label: "Mode-appropriate foundation zone",
    kind: "constraint",
    authority: "product-policy",
    evidence: ["calmMinimal"],
  },
  "foundation.hierarchy": {
    label: "Ordered surface hierarchy",
    kind: "constraint",
    authority: "product-policy",
    evidence: ["calmMinimal"],
  },
  "foundation.calm-tint": {
    label: "Bounded neutral tint",
    kind: "constraint",
    authority: "provisional",
    evidence: ["calmMinimal"],
  },
  "foundation.text-contrast": {
    label: "Foundation text contrast",
    kind: "constraint",
    authority: "normative",
    evidence: ["wcagText", "apcaText"],
  },
  "foundation.boundary-contrast": {
    label: "Required input boundary contrast",
    kind: "constraint",
    authority: "normative",
    evidence: ["wcagNonText"],
  },
  "foundation.recipe-fidelity": {
    label: "Stay near the foundation recipe",
    kind: "product-objective",
    authority: "product-policy",
    direction: "minimize",
  },
  "text.required-contrast": {
    label: "Required weakest text contrast",
    kind: "constraint",
    authority: "normative",
    evidence: ["wcagText", "apcaText"],
  },
  "text.maximize-weakest-contrast": {
    label: "Maximize weakest APCA contrast",
    kind: "product-objective",
    authority: "product-policy",
    direction: "maximize",
  },
  "focus.adjacent-contrast": {
    label: "Visible on every applied foundation context",
    kind: "constraint",
    authority: "normative",
    evidence: ["wcagNonText"],
  },
  "focus.semantic-separation": {
    label: "Distinct from authored controls",
    kind: "constraint",
    authority: "provisional",
    evidence: ["stateSeparation"],
  },
  "focus.brand-relation": {
    label: "Remain in the brand hue family",
    kind: "constraint",
    authority: "product-policy",
    evidence: ["calmMinimal"],
  },
  "focus.minimum-brand-distance": {
    label: "Minimize movement from primary",
    kind: "product-objective",
    authority: "product-policy",
    direction: "minimize",
  },
  "feedback.label-contrast": {
    label: "Readable feedback label",
    kind: "constraint",
    authority: "normative",
    evidence: ["wcagText", "apcaText"],
  },
  "feedback.semantic-separation": {
    label: "Distinct feedback meanings",
    kind: "constraint",
    authority: "provisional",
    evidence: ["destructiveSeparation"],
  },
  "feedback.semantic-anchor": {
    label: "Stay near semantic amber",
    kind: "product-objective",
    authority: "product-policy",
    direction: "minimize",
  },
  "selection.text-contrast": {
    label: "Readable selected content",
    kind: "constraint",
    authority: "normative",
    evidence: ["wcagText", "apcaText"],
  },
  "selection.surface-separation": {
    label: "Visible selected surface",
    kind: "constraint",
    authority: "product-policy",
    evidence: ["stateSeparation"],
  },
  "selection.minimum-emphasis": {
    label: "Use the least necessary emphasis",
    kind: "product-objective",
    authority: "product-policy",
    direction: "minimize",
  },
};

export function decisionPolicy(id) {
  const policy = V2_POLICY.decisions[id];
  if (!policy) throw new Error(`Unknown decision policy: ${id}`);
  const expand = (ruleId) => {
    const rule = RULE_CATALOG[ruleId];
    if (!rule) throw new Error(`Unknown rule in ${id}: ${ruleId}`);
    return { id: ruleId, ...rule };
  };
  return {
    id,
    constraints: policy.constraints.map(expand),
    objectives: policy.objectives.map(expand),
    tieBreakers: policy.tieBreakers.map(expand),
  };
}

function validateTextPolicy() {
  if (
    V2_POLICY.text.strategy !== "wcag-eligible-apca-ranked" ||
    V2_POLICY.text.wcagNormalTextMinimum !== 4.5 ||
    V2_POLICY.text.typographyContextSchema !== "typography-context.v1" ||
    Object.values(V2_POLICY.text.typographyContexts).some(
      (context) =>
        context.usage !== "normal-text" ||
        !Number.isFinite(context.fontSizePx) ||
        context.fontSizePx <= 0 ||
        !Number.isFinite(context.fontWeight) ||
        context.fontWeight <= 0 ||
        !Number.isFinite(context.apcaDiagnosticMinimum) ||
        context.apcaDiagnosticMinimum <= 0,
    )
  ) {
    throw new Error(
      "text policy must declare WCAG normal-text eligibility and versioned typography contexts.",
    );
  }
}

export function validatePolicy() {
  const { lightMinimum, darkMaximum } = V2_POLICY.foundation.modeZone;
  if (
    !Number.isFinite(lightMinimum) ||
    !Number.isFinite(darkMaximum) ||
    lightMinimum < 0 ||
    lightMinimum > 1 ||
    darkMaximum < 0 ||
    darkMaximum > 1 ||
    darkMaximum >= lightMinimum
  ) {
    throw new Error("foundation.modeZone must define ordered L bounds in 0–1.");
  }
  validateTextPolicy();
  if (
    JSON.stringify(V2_POLICY.focus.adjacentRoles) !==
    JSON.stringify(["background", "surface", "muted surface"])
  ) {
    throw new Error(
      "focus.adjacentRoles must cover every applied foundation context.",
    );
  }
  for (const [ruleId, rule] of Object.entries(RULE_CATALOG)) {
    assertEvidenceAuthority(rule.authority, ruleId);
  }
  const groups = {
    constraints: "constraint",
    objectives: "product-objective",
    tieBreakers: "tie-breaker",
  };
  for (const [decisionId, policy] of Object.entries(V2_POLICY.decisions)) {
    for (const [group, expectedKind] of Object.entries(groups)) {
      if (new Set(policy[group]).size !== policy[group].length) {
        throw new Error(`${decisionId}.${group} contains duplicate rules.`);
      }
      for (const ruleId of policy[group]) {
        const rule = RULE_CATALOG[ruleId];
        if (!rule)
          throw new Error(`${decisionId} references unknown ${ruleId}.`);
        if (rule.kind !== expectedKind) {
          throw new Error(`${ruleId} must be a ${expectedKind}.`);
        }
        if (
          group !== "constraints" &&
          !["minimize", "maximize", "ascending", "descending"].includes(
            rule.direction,
          )
        ) {
          throw new Error(`${ruleId} has an invalid direction.`);
        }
      }
    }
  }
  return true;
}

validatePolicy();

export function evidence(...ids) {
  return ids.map((id) => ({ id, ...EVIDENCE[id] }));
}
