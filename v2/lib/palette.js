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
import { V2_POLICY, decisionPolicy, evidence } from "./policy.js";

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

function stateCandidate(base, lightness) {
  return candidate(tone({ l: lightness, c: base.oklch.c, h: base.oklch.h }), {
    lightness,
  });
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

function bindRule(policy, group, id, evaluate) {
  const definition = policy[group].find((rule) => rule.id === id);
  if (!definition) throw new Error(`${policy.id} does not declare ${id}.`);
  return { definition, evaluate };
}

function stableTieBreaker(policy) {
  return [
    bindRule(policy, "tieBreakers", "stable.hex-order", (item) => item.hex),
  ];
}

function stateSearch({ mode, base, role, target }) {
  const policy = decisionPolicy("state");
  const direction = V2_POLICY.state.direction[mode];
  const candidates = [];
  for (
    let index = 1;
    index <= V2_POLICY.search.stateCandidateLimit;
    index += 1
  ) {
    const lightness =
      base.oklch.l + direction * V2_POLICY.search.candidateStep * index;
    if (lightness <= 0 || lightness >= 1) break;
    candidates.push(stateCandidate(base, lightness));
  }
  return selectCandidate({
    id: `${mode}.${role.replaceAll(" ", ".")}`,
    role,
    intent: `Create the smallest ${mode === "light" ? "darker" : "lighter"} state change that remains visibly ordered.`,
    candidates,
    policy,
    constraints: [
      bindRule(policy, "constraints", "state.minimum-separation", (item) => {
        const deltaE = distance(base, item);
        const chromaShift = item.oklch.c - base.oklch.c;
        const hueShift = hueDistance(item.oklch.h, base.oklch.h);
        return {
          passed: deltaE >= target,
          reasons: [
            deltaE >= target
              ? `Oklab ΔE ${deltaE.toFixed(3)} reaches ${target.toFixed(3)}.`
              : `Oklab ΔE ${deltaE.toFixed(3)} is below ${target.toFixed(3)}.`,
          ],
          metrics: { deltaE, target, chromaShift, hueShift },
        };
      }),
    ],
    objectives: [
      bindRule(policy, "objectives", "state.minimum-change", (item) =>
        distance(base, item),
      ),
    ],
    tieBreakers: stableTieBreaker(policy),
    evidence: evidence("carbonStates", "spectrumStates", "stateSeparation"),
    searchConstants: ["requested hue", "requested chroma"],
  });
}

function brandFamilySearch({ input, mode, background, surface, primaryRange }) {
  const policy = decisionPolicy("primary");
  const [start, end] = primaryRange ?? V2_POLICY.primary.lightnessRange[mode];
  const source = candidate(input.hex, { lightness: input.l });
  const candidates = [];
  const addFamily = (primary) => {
    const hover = stateSearch({
      mode,
      base: primary,
      role: "primary hover",
      target: V2_POLICY.state.separation.hoverFromDefault,
    });
    const active = stateSearch({
      mode,
      base: primary,
      role: "primary active",
      target: V2_POLICY.state.separation.activeFromDefault,
    });
    return { ...primary, family: { hover, active } };
  };
  const sourceCanGenerateStates =
    mode === "light" ? source.oklch.l > 0.1 : source.oklch.l < 0.9;
  candidates.push(sourceCanGenerateStates ? addFamily(source) : source);
  for (
    let lightness = start;
    lightness <= end + V2_POLICY.search.candidateStep / 2;
    lightness += V2_POLICY.search.candidateStep
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
    policy,
    constraints: [
      bindRule(policy, "constraints", "primary.generated-family", (item) => ({
        passed: Boolean(item.family),
        reasons: [
          item.family
            ? "Default, hover, and active candidates are all available."
            : "Exact source is retained as a counterfactual; it cannot produce the complete mode family.",
        ],
        metrics: { completeFamily: Boolean(item.family) },
      })),
      bindRule(policy, "constraints", "primary.mode-range", (item) => {
        const passed =
          item.oklch.l >= start - 0.001 && item.oklch.l <= end + 0.001;
        return {
          passed,
          reasons: [
            passed
              ? `L ${item.oklch.l.toFixed(3)} is inside the ${mode} role range.`
              : `L ${item.oklch.l.toFixed(3)} is outside ${start.toFixed(3)}–${end.toFixed(3)}.`,
          ],
          metrics: { value: item.oklch.l, minimum: start, maximum: end },
        };
      }),
      bindRule(policy, "constraints", "primary.calm-chroma", (item) => {
        const maximum = input.brandChroma + V2_POLICY.primary.chromaTolerance;
        const passed = item.oklch.c <= maximum;
        return {
          passed,
          reasons: [
            passed
              ? `C ${item.oklch.c.toFixed(3)} preserves the restrained source chroma.`
              : `C ${item.oklch.c.toFixed(3)} exceeds the calm bound ${maximum.toFixed(3)}.`,
          ],
          metrics: { value: item.oklch.c, maximum },
        };
      }),
      bindRule(policy, "constraints", "primary.shared-label", (item) => {
        const colors = item.family
          ? [
              item.hex,
              item.family.hover.value.hex,
              item.family.active.value.hex,
            ]
          : [item.hex];
        const text = chooseSharedText(colors);
        const minimumLc = Math.min(
          ...colors.map((color) => Math.abs(apcaContrast(text, color))),
        );
        return {
          passed:
            Boolean(item.family) && minimumLc >= V2_POLICY.primary.labelLc,
          reasons: [
            item.family && minimumLc >= V2_POLICY.primary.labelLc
              ? `Shared label reaches ${minimumLc.toFixed(1)} Lc.`
              : `Complete-family label reaches only ${minimumLc.toFixed(1)} Lc.`,
          ],
          metrics: { minimumLc, target: V2_POLICY.primary.labelLc, text },
        };
      }),
      bindRule(policy, "constraints", "primary.focus-contrast", (item) => {
        const focusContrast = Math.min(
          contrastRatio(item.hex, background),
          contrastRatio(item.hex, surface),
        );
        const passed = focusContrast >= V2_POLICY.primary.focusContrast;
        return {
          passed,
          reasons: [
            passed
              ? `Focus contrast reaches ${focusContrast.toFixed(2)}:1.`
              : `Focus contrast ${focusContrast.toFixed(2)}:1 is below ${V2_POLICY.primary.focusContrast}:1.`,
          ],
          metrics: {
            value: focusContrast,
            target: V2_POLICY.primary.focusContrast,
          },
        };
      }),
    ],
    objectives: [
      bindRule(policy, "objectives", "primary.source-fidelity", (item) =>
        distance(source, item),
      ),
    ],
    tieBreakers: stableTieBreaker(policy),
    evidence: evidence("apcaText", "wcagNonText", "calmMinimal"),
    searchConstants: ["input hue", "bounded source chroma"],
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
  const policy = decisionPolicy("destructive");
  const [start, end] = V2_POLICY.destructive.lightnessRange[mode];
  const candidates = [];
  for (
    let lightness = start;
    lightness <= end + V2_POLICY.destructive.candidateStep / 2;
    lightness += V2_POLICY.destructive.candidateStep
  ) {
    candidates.push(candidate(destructiveTone(lightness), { lightness }));
  }
  return selectCandidate({
    id: `${mode}.destructive`,
    role: "destructive",
    intent:
      "Stay near the semantic red anchor while remaining readable and distinct from the generated brand.",
    candidates,
    policy,
    constraints: [
      bindRule(policy, "constraints", "destructive.label-contrast", (item) => {
        const text = chooseSharedText([item.hex]);
        const lc = Math.abs(apcaContrast(text, item.hex));
        return {
          passed: lc >= V2_POLICY.destructive.labelLc,
          reasons: [
            lc >= V2_POLICY.destructive.labelLc
              ? `Best label reaches ${lc.toFixed(1)} Lc.`
              : `Best label reaches only ${lc.toFixed(1)} Lc.`,
          ],
          metrics: { value: lc, target: V2_POLICY.destructive.labelLc, text },
        };
      }),
      bindRule(
        policy,
        "constraints",
        "destructive.brand-separation",
        (item) => {
          const deltaE = distance(primary, item);
          const passed = deltaE >= V2_POLICY.destructive.separation;
          return {
            passed,
            reasons: [
              passed
                ? `Brand separation reaches ΔE ${deltaE.toFixed(3)}.`
                : `Brand separation ΔE ${deltaE.toFixed(3)} is below ${V2_POLICY.destructive.separation.toFixed(3)}.`,
            ],
            metrics: {
              value: deltaE,
              target: V2_POLICY.destructive.separation,
            },
          };
        },
      ),
    ],
    objectives: [
      bindRule(policy, "objectives", "destructive.semantic-anchor", (item) =>
        Math.abs(item.oklch.l - preferredLightness),
      ),
    ],
    tieBreakers: stableTieBreaker(policy),
    evidence: evidence("apcaText", "destructiveSeparation", "calmMinimal"),
    searchConstants: ["semantic red hue", "requested chroma"],
  });
}

function modePalette(input, mode, options = {}) {
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
    primaryRange: options.primaryRange,
  });
  const primary = brandFamily.primary.hex;
  const primaryHover = brandFamily.hover.hex;
  const primaryActive = brandFamily.active.hex;
  const primaryText = chooseSharedText([primary, primaryHover, primaryActive]);
  const primarySourceDistance = distance(
    candidate(input.hex),
    brandFamily.primary,
  );
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
      primarySourceDistance,
      largeBrandShift:
        primarySourceDistance > V2_POLICY.primary.maximumSourceDistance,
      neutralTintChroma:
        input.classification === "achromatic"
          ? 0
          : Math.min(V2_POLICY.neutral.tintCap, input.brandChroma * 0.52),
      redConflict,
    },
    passed: checks.every((check) => check.pass),
  };
}

function exactModeCandidate(input, mode, lightness) {
  try {
    return modePalette(input, mode, { primaryRange: [lightness, lightness] });
  } catch {
    return null;
  }
}

function uniqueModeCandidates(input, mode, baseline) {
  const [start, end] = V2_POLICY.primary.lightnessRange[mode];
  const lightnesses = [start, (start + end) / 2, end];
  const candidates = [
    baseline,
    ...lightnesses.map((lightness) =>
      exactModeCandidate(input, mode, lightness),
    ),
  ].filter(Boolean);
  return candidates.filter(
    (candidateMode, index) =>
      candidates.findIndex(
        (other) => other.values.primary === candidateMode.values.primary,
      ) === index,
  );
}

function qualityPenalty(quality) {
  return quality.checks.reduce((total, check) => {
    if (check.pass) return total;
    if (Array.isArray(check.target)) {
      return (
        total +
        Math.min(
          Math.abs(check.value - check.target[0]),
          Math.abs(check.value - check.target[1]),
        )
      );
    }
    return total + Math.abs(check.value - check.target);
  }, 0);
}

function comparePair(first, second) {
  const firstRank = first.rank;
  const secondRank = second.rank;
  for (let index = 0; index < firstRank.length; index += 1) {
    if (firstRank[index] !== secondRank[index]) {
      return firstRank[index] - secondRank[index];
    }
  }
  return first.id.localeCompare(second.id);
}

function selectModePair(input, baselineModes) {
  const source = candidate(input.hex);
  const lightCandidates = uniqueModeCandidates(
    input,
    "light",
    baselineModes.light,
  );
  const darkCandidates = uniqueModeCandidates(
    input,
    "dark",
    baselineModes.dark,
  );
  const pairs = lightCandidates
    .flatMap((light) =>
      darkCandidates.map((dark) => {
        const modes = { light, dark };
        const quality = pairedQuality(modes);
        const lightDistance = distance(source, candidate(light.values.primary));
        const darkDistance = distance(source, candidate(dark.values.primary));
        return {
          id: `${light.values.primary}/${dark.values.primary}`,
          modes,
          quality,
          lightDistance,
          darkDistance,
          rank: [
            quality.checks.filter(({ pass }) => !pass).length,
            Math.max(lightDistance, darkDistance),
            lightDistance + darkDistance,
            qualityPenalty(quality),
          ],
        };
      }),
    )
    .sort(comparePair);
  const selected = pairs[0];
  const compactPair = (pair) =>
    pair
      ? {
          light: pair.modes.light.values.primary,
          dark: pair.modes.dark.values.primary,
          qualityMisses: pair.rank[0],
          maximumSourceDistance: pair.rank[1],
          totalSourceDistance: pair.rank[2],
          hueDrift: pair.quality.crossMode.hueDrift,
          chromaDifference: pair.quality.crossMode.chromaDifference,
          lightnessGap: pair.quality.crossMode.lightnessGap,
        }
      : null;
  const sourceFidelity = [...pairs].sort(
    (first, second) =>
      first.lightDistance +
        first.darkDistance -
        (second.lightDistance + second.darkDistance) ||
      first.id.localeCompare(second.id),
  )[0];
  const qualityRejected = pairs.find((pair) => pair.rank[0] > selected.rank[0]);
  return {
    modes: selected.modes,
    quality: selected.quality,
    decision: {
      strategy: "bounded joint light/dark search",
      candidateCount: pairs.length,
      ranking: [
        "fewest paired-quality misses",
        "smallest worst-mode source distance",
        "smallest total source distance",
        "smallest quality miss",
      ],
      selected: compactPair(selected),
      alternatives: {
        nextRanked: compactPair(pairs[1]),
        sourceFidelity: compactPair(sourceFidelity),
        qualityRejected: compactPair(qualityRejected),
      },
    },
  };
}

function rangeQualityCheck({ id, label, value, range, unit = "" }) {
  const pass = value >= range[0] && value <= range[1];
  return {
    id,
    label,
    value,
    target: range,
    unit,
    pass,
    authority: "provisional",
  };
}

function maximumQualityCheck({ id, label, value, maximum, unit = "" }) {
  return {
    id,
    label,
    value,
    target: maximum,
    unit,
    pass: value <= maximum,
    authority: "provisional",
  };
}

function stateProgression(modeResult) {
  const values = modeResult.values;
  const primary = candidate(values.primary);
  const hover = candidate(values["primary hover"]);
  const active = candidate(values["primary active"]);
  const defaultToHover = distance(primary, hover);
  const hoverToActive = distance(hover, active);
  const ratio = hoverToActive / defaultToHover;
  const direction = V2_POLICY.state.direction[modeResult.mode];
  const monotonic =
    direction < 0
      ? primary.oklch.l > hover.oklch.l && hover.oklch.l > active.oklch.l
      : primary.oklch.l < hover.oklch.l && hover.oklch.l < active.oklch.l;
  const checks = [
    rangeQualityCheck({
      id: `${modeResult.mode}.state.interval-ratio`,
      label: "Hover → active interval balance",
      value: ratio,
      range: V2_POLICY.state.progressionRatio,
      unit: "× hover interval",
    }),
    {
      id: `${modeResult.mode}.state.monotonic-lightness`,
      label: "Monotonic state direction",
      value: monotonic ? 1 : 0,
      target: 1,
      unit: "ordered",
      pass: monotonic,
      authority: "product-policy",
    },
  ];
  return {
    mode: modeResult.mode,
    defaultToHover,
    hoverToActive,
    ratio,
    checks,
    passed: checks.every(({ pass }) => pass),
  };
}

function pairedQuality(modes) {
  const light = candidate(modes.light.values.primary);
  const dark = candidate(modes.dark.values.primary);
  const hueDrift = hueDistance(light.oklch.h, dark.oklch.h);
  const chromaDifference = Math.abs(light.oklch.c - dark.oklch.c);
  const lightnessGap = dark.oklch.l - light.oklch.l;
  const crossModeChecks = [
    maximumQualityCheck({
      id: "pair.primary-hue-drift",
      label: "Primary hue drift",
      value: hueDrift,
      maximum: V2_POLICY.crossMode.maximumHueDrift,
      unit: "°",
    }),
    maximumQualityCheck({
      id: "pair.primary-chroma-difference",
      label: "Primary chroma difference",
      value: chromaDifference,
      maximum: V2_POLICY.crossMode.maximumChromaDifference,
      unit: "ΔC",
    }),
    rangeQualityCheck({
      id: "pair.primary-lightness-gap",
      label: "Dark/light primary lightness gap",
      value: lightnessGap,
      range: V2_POLICY.crossMode.lightnessGap,
      unit: "ΔL",
    }),
  ];
  const states = {
    light: stateProgression(modes.light),
    dark: stateProgression(modes.dark),
  };
  const checks = [
    ...crossModeChecks,
    ...states.light.checks,
    ...states.dark.checks,
  ];
  return {
    intent:
      "Review whether both modes preserve one brand identity and whether interaction states advance at a balanced pace.",
    authority: "provisional",
    crossMode: {
      hueDrift,
      chromaDifference,
      lightnessGap,
      checks: crossModeChecks,
    },
    states,
    checks,
    passed: checks.every(({ pass }) => pass),
  };
}

function sourceUsageAlternatives(input, modes) {
  if (!Object.values(modes).some((mode) => mode.adaptations.largeBrandShift)) {
    return null;
  }
  const byMode = Object.fromEntries(
    Object.entries(modes).map(([mode, result]) => {
      const sourceText = chooseSharedText([input.hex]);
      const sourceLabelLc = Math.abs(apcaContrast(sourceText, input.hex));
      const outlineContrast = Math.min(
        contrastRatio(input.hex, result.values.background),
        contrastRatio(input.hex, result.values.surface),
      );
      return [
        mode,
        {
          background: result.values.background,
          foreground: result.values.foreground,
          filled: {
            color: result.values.primary,
            hover: result.values["primary hover"],
            active: result.values["primary active"],
            text: result.values["primary text"],
            safe: true,
            note: "Generated fill selected by the complete palette policy.",
          },
          outline: {
            color: input.hex,
            text: input.hex,
            contrast: outlineContrast,
            safe: outlineContrast >= V2_POLICY.primary.focusContrast,
            note:
              outlineContrast >= V2_POLICY.primary.focusContrast
                ? "Source color can identify an outline control on both foundations."
                : "Source color is too weak for a required outline on one foundation.",
          },
          brandFaithful: {
            color: input.hex,
            text: sourceText,
            lc: sourceLabelLc,
            safe: sourceLabelLc >= V2_POLICY.primary.labelLc,
            note:
              sourceLabelLc >= V2_POLICY.primary.labelLc
                ? "Source fill supports the selected black-or-white label."
                : "Source fill does not support the current label target.",
          },
        },
      ];
    }),
  );
  return {
    intent:
      "Expose usage trade-offs when the generated primary moves far from the supplied brand color.",
    source: input.hex,
    modes: byMode,
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
      classification === "achromatic"
        ? 0
        : Math.min(V2_POLICY.primary.chromaCap, rawInput.c),
  };
  const baselineModes = {
    light: modePalette(inputColor, "light"),
    dark: modePalette(inputColor, "dark"),
  };
  const pairSelection = selectModePair(inputColor, baselineModes);
  const { modes, quality } = pairSelection;
  const sourceAlternatives = sourceUsageAlternatives(inputColor, modes);
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
    quality,
    pairDecision: pairSelection.decision,
    sourceAlternatives,
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
