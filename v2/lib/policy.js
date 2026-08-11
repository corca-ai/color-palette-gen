export const EVIDENCE = {
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
    url: "https://github.com/Myndex/SAPC-APCA",
    scope:
      "Experimental typography-aware text targets; not a WCAG conformance claim.",
  },
  carbonStates: {
    class: "reference",
    label: "Carbon · Interaction states",
    url: "https://preview.carbondesignsystem.com/building-blocks/foundations/color/overview",
    scope:
      "Subtle hover, stronger active, darker movement on light values and lighter movement on dark values.",
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
    url: "https://github.com/corca-ai/color-palette-gen/blob/main/docs/v2-decisions/role-policies.md#calm-and-minimal",
    scope:
      "One brand hue, neutral-dominant foundations, bounded tint, and no generated harmony hues.",
  },
  stateSeparation: {
    class: "heuristic",
    label: "Provisional state-separation threshold",
    url: "https://github.com/corca-ai/color-palette-gen/blob/main/docs/v2-decisions/role-policies.md#interactive-states",
    scope:
      "Oklab distance is provisional until a designer ranking study replaces it.",
    validationNeeded: true,
  },
  destructiveSeparation: {
    class: "heuristic",
    label: "Provisional semantic separation",
    url: "https://github.com/corca-ai/color-palette-gen/blob/main/docs/v2-decisions/role-policies.md#destructive",
    scope:
      "Brand and destructive colors need perceptual separation; the current bound is not a published standard.",
    validationNeeded: true,
  },
};

export const V2_POLICY = {
  version: "v2-policy-model-2",
  search: {
    candidateStep: 0.0025,
    stateCandidateLimit: 80,
  },
  primary: {
    lightnessRange: {
      light: [0.46, 0.54],
      dark: [0.56, 0.59],
    },
    chromaCap: 0.15,
    chromaTolerance: 0.002,
    labelLc: 60,
    focusContrast: 3,
    maximumSourceDistance: 0.18,
  },
  state: {
    direction: { light: -1, dark: 1 },
    separation: {
      hoverFromDefault: 0.035,
      activeFromDefault: 0.075,
    },
  },
  neutral: { tintCap: 0.012 },
  destructive: {
    separation: 0.08,
    labelLc: 60,
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
    primary: {
      constraints: [
        "primary.generated-family",
        "primary.mode-range",
        "primary.calm-chroma",
        "primary.shared-label",
        "primary.focus-contrast",
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
  },
};

export const RULE_CATALOG = {
  "state.minimum-separation": {
    label: "Required state separation",
    kind: "constraint",
    authority: "provisional",
    evidence: ["stateSeparation"],
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
    authority: "provisional",
    evidence: ["apcaText"],
  },
  "primary.focus-contrast": {
    label: "Visible focus boundary",
    kind: "constraint",
    authority: "normative",
    evidence: ["wcagNonText"],
  },
  "destructive.label-contrast": {
    label: "Readable destructive label",
    kind: "constraint",
    authority: "provisional",
    evidence: ["apcaText"],
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

export function validatePolicy() {
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
