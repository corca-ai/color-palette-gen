import {
  clamp,
  contrastRatio,
  hexToRgb,
  isHex,
  normalizeHex,
  oklchDifference,
  oklchToHex,
  rgbToOklch,
} from "../../lib/color-math.js";
import { apcaCheck, apcaContrast } from "./apca.js";
import { anchoredDecision, selectCandidate } from "./decision.js";
import { V2_POLICY, evidence } from "./policy.js";

const MODE_RECIPE = {
  light: {
    background: 0.995,
    foreground: 0.145,
    surface: 0.98,
    raised: 1,
    muted: 0.94,
    mutedText: 0.44,
    border: 0.82,
    input: 0.62,
    destructive: 0.54,
    conflictingDestructive: 0.43,
  },
  dark: {
    background: 0.145,
    foreground: 0.96,
    surface: 0.185,
    raised: 0.215,
    muted: 0.245,
    mutedText: 0.78,
    border: 0.34,
    input: 0.52,
    destructive: 0.637,
    conflictingDestructive: 0.68,
  },
};

const TOKEN_ORDER = [
  "background",
  "foreground",
  "surface",
  "raised surface",
  "muted surface",
  "muted text",
  "border",
  "input border",
  "primary",
  "primary hover",
  "primary active",
  "primary text",
  "focus ring",
  "destructive",
  "destructive text",
];

function classifyInput(input) {
  if (input.c < 0.015) return "achromatic";
  if (input.c < 0.06) return "subdued";
  return "chromatic";
}

function hueDistance(first, second) {
  const distance = Math.abs(first - second) % 360;
  return Math.min(distance, 360 - distance);
}

function tone({ l, c, h }) {
  return oklchToHex({ l: clamp(l), c: Math.max(0, c), h }).hex;
}

function candidate(hex, parameters = {}) {
  return {
    hex,
    oklch: rgbToOklch(hexToRgb(hex)),
    parameters,
  };
}

function neutralTone(input, lightness, tintScale = 0) {
  const tint =
    input.classification === "achromatic"
      ? 0
      : Math.min(0.012, input.brandChroma * tintScale);
  return tone({ l: lightness, c: tint, h: input.h });
}

function brandTone(input, lightness, chromaScale = 1) {
  return tone({
    l: lightness,
    c: input.brandChroma * chromaScale,
    h: input.h,
  });
}

function brandCandidate(input, lightness) {
  return candidate(brandTone(input, lightness), { lightness });
}

function destructiveTone(lightness) {
  return tone({ l: lightness, c: 0.19, h: 27 });
}

function chooseSharedText(backgrounds) {
  return ["#000000", "#FFFFFF"]
    .map((color) => ({
      color,
      minimum: Math.min(
        ...backgrounds.map((background) =>
          Math.abs(apcaContrast(color, background)),
        ),
      ),
    }))
    .sort((a, b) => b.minimum - a.minimum)[0].color;
}

function ratioCheck({ role, foreground, background, target = 3 }) {
  const value = contrastRatio(foreground, background);
  return {
    kind: "non-text",
    metric: "WCAG contrast",
    role,
    foreground,
    background,
    value,
    target,
    pass: value >= target,
  };
}

function differenceCheck({ role, first, second, target = 0.035 }) {
  const firstOklch = rgbToOklch(hexToRgb(first));
  const secondOklch = rgbToOklch(hexToRgb(second));
  const value = oklchDifference(firstOklch, secondOklch).deltaE;
  return {
    kind: "perceptual",
    metric: "Oklab ΔE",
    role,
    foreground: first,
    background: second,
    value,
    target,
    pass: value >= target,
  };
}

function distance(first, second) {
  return oklchDifference(first.oklch, second.oklch).deltaE;
}

function stateSearch({ input, mode, base, role, target }) {
  const direction = V2_POLICY.stateDirection[mode];
  const candidates = [];
  for (let index = 1; index <= 80; index += 1) {
    const lightness =
      base.oklch.l + direction * V2_POLICY.candidateStep * index;
    if (lightness <= 0 || lightness >= 1) break;
    candidates.push(brandCandidate(input, lightness));
  }
  return selectCandidate({
    id: `${mode}.${role.replaceAll(" ", ".")}`,
    role,
    intent: `Create the smallest ${mode === "light" ? "darker" : "lighter"} state change that remains visibly ordered.`,
    candidates,
    evaluate: (item) => {
      const deltaE = distance(base, item);
      return {
        passed: deltaE >= target,
        reasons:
          deltaE >= target
            ? [`Oklab ΔE ${deltaE.toFixed(3)} reaches ${target.toFixed(3)}.`]
            : [`Oklab ΔE ${deltaE.toFixed(3)} is below ${target.toFixed(3)}.`],
        metrics: { deltaE, target },
      };
    },
    objective: (item) => distance(base, item),
    evidence: evidence("carbonStates", "spectrumStates", "stateSeparation"),
    preservedAxes: ["hue", "chroma"],
  });
}

function brandFamilySearch({ input, mode, background, surface }) {
  const [start, end] = V2_POLICY.primaryRange[mode];
  const source = candidate(input.hex, { lightness: input.l });
  const candidates = [];
  const addFamily = (primary) => {
    const hover = stateSearch({
      input,
      mode,
      base: primary,
      role: "primary hover",
      target: V2_POLICY.stateSeparation.hoverFromDefault,
    });
    const active = stateSearch({
      input,
      mode,
      base: primary,
      role: "primary active",
      target: V2_POLICY.stateSeparation.activeFromDefault,
    });
    return { ...primary, family: { hover, active } };
  };
  const sourceCanGenerateStates =
    mode === "light" ? source.oklch.l > 0.1 : source.oklch.l < 0.9;
  candidates.push(sourceCanGenerateStates ? addFamily(source) : source);
  for (
    let lightness = start;
    lightness <= end + V2_POLICY.candidateStep / 2;
    lightness += V2_POLICY.candidateStep
  ) {
    const primary = brandCandidate(input, lightness);
    if (primary.hex !== source.hex) candidates.push(addFamily(primary));
  }
  const selection = selectCandidate({
    id: `${mode}.primary`,
    role: "primary",
    intent:
      "Stay as close to the source as possible while the complete mode state family remains usable.",
    candidates,
    evaluate: (item) => {
      if (!item.family) {
        return {
          passed: false,
          reasons: [
            "Exact source is retained as a counterfactual; it is not a generated mode-family candidate.",
          ],
          metrics: { source: true },
        };
      }
      const colors = [
        item.hex,
        item.family.hover.value.hex,
        item.family.active.value.hex,
      ];
      const text = chooseSharedText(colors);
      const minimumLc = Math.min(
        ...colors.map((color) => Math.abs(apcaContrast(text, color))),
      );
      const focusContrast = Math.min(
        contrastRatio(item.hex, background),
        contrastRatio(item.hex, surface),
      );
      const reasons = [];
      if (item.oklch.l < start - 0.001 || item.oklch.l > end + 0.001) {
        reasons.push(
          `L ${item.oklch.l.toFixed(3)} is outside the ${mode} role range ${start.toFixed(3)}–${end.toFixed(3)}.`,
        );
      }
      if (item.oklch.c > input.brandChroma + 0.002) {
        reasons.push(
          `C ${item.oklch.c.toFixed(3)} exceeds the calm source-relative bound ${input.brandChroma.toFixed(3)}.`,
        );
      }
      if (minimumLc < 60)
        reasons.push(`Shared label reaches only ${minimumLc.toFixed(1)} Lc.`);
      if (focusContrast < V2_POLICY.nonTextContrast)
        reasons.push(
          `Focus contrast ${focusContrast.toFixed(2)}:1 is below ${V2_POLICY.nonTextContrast}:1.`,
        );
      if (!reasons.length)
        reasons.push("State labels and focus contrast pass together.");
      return {
        passed:
          reasons.length === 1 &&
          reasons[0] === "State labels and focus contrast pass together.",
        reasons,
        metrics: { minimumLc, focusContrast },
      };
    },
    objective: (item) => distance(source, item),
    evidence: evidence("apcaText", "wcagNonText", "calmMinimal"),
    preservedAxes: ["hue", "relative chroma"],
  });
  return {
    primary: selection.value,
    hover: selection.value.family.hover.value,
    active: selection.value.family.active.value,
    traces: {
      primary: selection.trace,
      "primary hover": selection.value.family.hover.trace,
      "primary active": selection.value.family.active.trace,
    },
  };
}

function destructiveSearch({ mode, primary, preferredLightness }) {
  const [start, end] = mode === "light" ? [0.3, 0.56] : [0.56, 0.72];
  const candidates = [];
  for (let lightness = start; lightness <= end + 0.0025; lightness += 0.005) {
    candidates.push(candidate(destructiveTone(lightness), { lightness }));
  }
  return selectCandidate({
    id: `${mode}.destructive`,
    role: "destructive",
    intent:
      "Stay near the semantic red anchor while remaining readable and distinct from the generated brand.",
    candidates,
    evaluate: (item) => {
      const text = chooseSharedText([item.hex]);
      const lc = Math.abs(apcaContrast(text, item.hex));
      const deltaE = distance(primary, item);
      const reasons = [];
      if (lc < 60) reasons.push(`Best label reaches only ${lc.toFixed(1)} Lc.`);
      if (deltaE < V2_POLICY.destructiveSeparation) {
        reasons.push(
          `Brand separation ΔE ${deltaE.toFixed(3)} is below ${V2_POLICY.destructiveSeparation.toFixed(3)}.`,
        );
      }
      if (!reasons.length) {
        reasons.push("Label contrast and brand separation pass together.");
      }
      return {
        passed: lc >= 60 && deltaE >= V2_POLICY.destructiveSeparation,
        reasons,
        metrics: { lc, deltaE },
      };
    },
    objective: (item) => Math.abs(item.oklch.l - preferredLightness),
    evidence: evidence("apcaText", "destructiveSeparation", "calmMinimal"),
    preservedAxes: ["semantic red hue", "chroma"],
  });
}

function modePalette(input, mode) {
  const recipe = MODE_RECIPE[mode];
  const foundations = {
    background: neutralTone(input, recipe.background, 0.16),
    foreground: neutralTone(input, recipe.foreground, 0.08),
    surface: neutralTone(input, recipe.surface, 0.28),
    "raised surface": neutralTone(input, recipe.raised, 0.12),
    "muted surface": neutralTone(input, recipe.muted, 0.52),
    "muted text": neutralTone(input, recipe.mutedText, 0.16),
    border: neutralTone(input, recipe.border, 0.3),
    "input border": neutralTone(input, recipe.input, 0.22),
  };
  const brandFamily = brandFamilySearch({
    input,
    mode,
    background: foundations.background,
    surface: foundations.surface,
  });
  const primary = brandFamily.primary.hex;
  const primaryHover = brandFamily.hover.hex;
  const primaryActive = brandFamily.active.hex;
  const primaryText = chooseSharedText([primary, primaryHover, primaryActive]);
  const redConflict =
    input.classification !== "achromatic" && hueDistance(input.h, 27) < 38;
  const destructiveDecision = destructiveSearch({
    mode,
    primary: brandFamily.primary,
    preferredLightness: redConflict
      ? recipe.conflictingDestructive
      : recipe.destructive,
  });
  const destructiveColor = destructiveDecision.value.hex;
  const destructiveText = chooseSharedText([destructiveColor]);
  const values = {
    ...foundations,
    primary,
    "primary hover": primaryHover,
    "primary active": primaryActive,
    "primary text": primaryText,
    "focus ring": primary,
    destructive: destructiveColor,
    "destructive text": destructiveText,
  };
  const textChecks = [
    apcaCheck({
      role: "Body text",
      foreground: values.foreground,
      background: values.background,
      target: 75,
      typography: "16px / 400",
    }),
    apcaCheck({
      role: "Text on surface",
      foreground: values.foreground,
      background: values.surface,
      target: 75,
      typography: "16px / 400",
    }),
    apcaCheck({
      role: "Muted text",
      foreground: values["muted text"],
      background: values.background,
      target: 60,
      typography: "14px / 500",
    }),
    ...["primary", "primary hover", "primary active"].map((role) =>
      apcaCheck({
        role: `Label on ${role}`,
        foreground: primaryText,
        background: values[role],
        target: 60,
        typography: "14px / 600",
      }),
    ),
    apcaCheck({
      role: "Destructive label",
      foreground: destructiveText,
      background: destructiveColor,
      target: 60,
      typography: "14px / 600",
    }),
  ].map((check) => ({
    ...check,
    kind: "text",
    metric: "APCA Lc",
    value: Math.abs(check.lc),
  }));

  const nonTextChecks = [
    ratioCheck({
      role: "Input boundary",
      foreground: values["input border"],
      background: values.surface,
    }),
    ratioCheck({
      role: "Focus on background",
      foreground: values["focus ring"],
      background: values.background,
    }),
    ratioCheck({
      role: "Focus on surface",
      foreground: values["focus ring"],
      background: values.surface,
    }),
    differenceCheck({
      role: "Default → hover",
      first: primary,
      second: primaryHover,
    }),
    differenceCheck({
      role: "Hover → active",
      first: primaryHover,
      second: primaryActive,
    }),
    differenceCheck({
      role: "Brand → destructive",
      first: primary,
      second: destructiveColor,
      target: 0.08,
    }),
  ];
  const checks = [...textChecks, ...nonTextChecks];

  const decisions = { ...brandFamily.traces };
  for (const role of [
    "background",
    "foreground",
    "surface",
    "raised surface",
    "muted surface",
    "muted text",
    "border",
    "input border",
  ]) {
    decisions[role] = anchoredDecision({
      id: `${mode}.${role.replaceAll(" ", ".")}`,
      role,
      intent: `Provide the ${role} role within the calm, neutral-dominant ${mode} foundation.`,
      candidate: candidate(values[role]),
      evidence: evidence(
        ...(role === "input border"
          ? ["calmMinimal", "wcagNonText"]
          : ["calmMinimal"]),
      ),
      summary:
        role === "input border"
          ? "Policy anchor retained because it passes the required control-boundary contrast."
          : "Current foundation anchor; candidate search is the next policy migration stage.",
    });
  }
  decisions["primary text"] = anchoredDecision({
    id: `${mode}.primary.text`,
    role: "primary text",
    intent:
      "Use one foreground that remains readable across the complete brand state family.",
    candidate: candidate(primaryText),
    evidence: evidence("apcaText"),
    summary:
      "Black and white were compared; this foreground maximizes the weakest APCA score across all states.",
  });
  decisions["focus ring"] = anchoredDecision({
    id: `${mode}.focus.ring`,
    role: "focus ring",
    intent: "Reuse the brand primary as a visible authored focus indicator.",
    candidate: candidate(primary),
    evidence: evidence("wcagNonText", "calmMinimal"),
    summary:
      "Aliased to primary only after adjacent background and surface contrast pass 3:1.",
    aliases: ["primary"],
  });
  decisions.destructive = destructiveDecision.trace;
  decisions["destructive text"] = anchoredDecision({
    id: `${mode}.destructive.text`,
    role: "destructive text",
    intent:
      "Choose the more readable black-or-white label for destructive fill.",
    candidate: candidate(destructiveText),
    evidence: evidence("apcaText"),
    summary: "Selected from black and white by the larger APCA magnitude.",
  });

  return {
    mode,
    tokens: TOKEN_ORDER.map((role) => [values[role], role]),
    checks,
    textChecks,
    nonTextChecks,
    values,
    decisions,
    recipe,
    adaptations: {
      inputLightnessInfluence: brandFamily.primary.oklch.l - input.l,
      neutralTintChroma:
        input.classification === "achromatic"
          ? 0
          : Math.min(0.012, input.brandChroma * 0.52),
      redConflict,
    },
    passed: checks.every((check) => check.pass),
  };
}

export function generatePaletteV2({ primary }) {
  if (typeof primary !== "string" || !isHex(primary)) {
    throw new TypeError("primary must be a six-digit hex color.");
  }
  const normalizedPrimary = normalizeHex(primary);
  const rawInput = rgbToOklch(hexToRgb(normalizedPrimary));
  const classification = classifyInput(rawInput);
  const inputColor = {
    ...rawInput,
    hex: normalizedPrimary,
    classification,
    brandChroma:
      classification === "achromatic" ? 0 : Math.min(0.15, rawInput.c * 0.82),
  };
  const modes = {
    light: modePalette(inputColor, "light"),
    dark: modePalette(inputColor, "dark"),
  };
  return {
    version: 2,
    policyVersion: V2_POLICY.version,
    input: { primary: normalizedPrimary },
    source: {
      hex: normalizedPrimary,
      oklch: rawInput,
      classification,
      policy:
        classification === "achromatic"
          ? "Preserve source lightness influence; generate an achromatic brand family."
          : "Preserve hue and relative chroma; normalize lightness for usable mode roles.",
    },
    direction: "calm minimal",
    contrastModel: "APCA-W3 0.1.9 text + WCAG non-text",
    modes,
    passed: Object.values(modes).every((mode) => mode.passed),
  };
}

export function serializeModeCss(modeResult) {
  const declarations = modeResult.tokens
    .map(
      ([color, role]) => `  --palette-${role.replaceAll(" ", "-")}: ${color};`,
    )
    .join("\n");
  return `[data-theme="${modeResult.mode}"] {\n${declarations}\n}`;
}
