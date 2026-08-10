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
    url: "https://github.com/corca-ai/color-palette-gen/blob/main/docs/v2-decision-justification.md",
    scope:
      "One brand hue, neutral-dominant foundations, bounded tint, and no generated harmony hues.",
  },
  stateSeparation: {
    class: "heuristic",
    label: "Provisional state-separation threshold",
    url: "https://github.com/corca-ai/color-palette-gen/blob/main/docs/v2-decision-justification.md",
    scope:
      "Oklab distance is provisional until a designer ranking study replaces it.",
    validationNeeded: true,
  },
  destructiveSeparation: {
    class: "heuristic",
    label: "Provisional semantic separation",
    url: "https://github.com/corca-ai/color-palette-gen/blob/main/docs/v2-decision-justification.md",
    scope:
      "Brand and destructive colors need perceptual separation; the current bound is not a published standard.",
    validationNeeded: true,
  },
};

export const V2_POLICY = {
  version: "v2-justification-1",
  candidateStep: 0.0025,
  primaryRange: {
    light: [0.46, 0.54],
    dark: [0.56, 0.59],
  },
  stateDirection: { light: -1, dark: 1 },
  stateSeparation: {
    hoverFromDefault: 0.035,
    activeFromDefault: 0.075,
  },
  brandChromaCap: 0.15,
  neutralTintCap: 0.012,
  nonTextContrast: 3,
  destructiveSeparation: 0.08,
};

export function evidence(...ids) {
  return ids.map((id) => ({ id, ...EVIDENCE[id] }));
}
