import { V2_POLICY } from "./policy.js";
import {
  apcaContrast,
  candidate,
  chooseSharedText,
  contrastRatio,
  distance,
  hueDistance,
} from "./runtime.js";

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

function minimumQualityCheck({ id, label, value, minimum, unit = "" }) {
  return {
    id,
    label,
    value,
    target: minimum,
    unit,
    direction: "minimum",
    pass: value >= minimum,
    authority: "provisional",
  };
}

function stateProgression(modeResult, family = "primary") {
  const values = modeResult.values;
  const primary = candidate(values[family]);
  const hover = candidate(values[`${family} hover`]);
  const active = candidate(values[`${family} active`]);
  const defaultToHover = distance(primary, hover);
  const hoverToActive = distance(hover, active);
  const ratio = hoverToActive / defaultToHover;
  const direction =
    family === "primary"
      ? V2_POLICY.state.direction[modeResult.mode]
      : Math.sign(hover.oklch.l - primary.oklch.l);
  const monotonic =
    direction < 0
      ? primary.oklch.l > hover.oklch.l && hover.oklch.l > active.oklch.l
      : primary.oklch.l < hover.oklch.l && hover.oklch.l < active.oklch.l;
  const checks = [
    rangeQualityCheck({
      id: `${modeResult.mode}.${family}.state.interval-ratio`,
      label: `${family} hover → active interval balance`,
      value: ratio,
      range: V2_POLICY.state.progressionRatio,
      unit: "× hover interval",
    }),
    {
      id: `${modeResult.mode}.${family}.state.monotonic-lightness`,
      label: `${family} monotonic state direction`,
      value: monotonic ? 1 : 0,
      target: 1,
      unit: "ordered",
      pass: monotonic,
      authority: "product-policy",
    },
  ];
  return {
    mode: modeResult.mode,
    family,
    defaultToHover,
    hoverToActive,
    ratio,
    checks,
    passed: checks.every(({ pass }) => pass),
  };
}

export function pairedQuality(modes) {
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
  const feedbackStates = Object.fromEntries(
    ["destructive", "warning"].map((family) => [
      family,
      {
        light: stateProgression(modes.light, family),
        dark: stateProgression(modes.dark, family),
      },
    ]),
  );
  const checks = [
    ...crossModeChecks,
    ...states.light.checks,
    ...states.dark.checks,
    ...Object.values(feedbackStates).flatMap((family) => [
      ...family.light.checks,
      ...family.dark.checks,
    ]),
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
    feedbackStates,
    checks,
    passed: checks.every(({ pass }) => pass),
  };
}

export function independentPaletteReview(input, modes, structuralQuality) {
  const source = candidate(input.hex);
  const sourceChecks = ["light", "dark"].map((mode) =>
    maximumQualityCheck({
      id: `review.${mode}.source-fidelity`,
      label: `${mode} action source distance`,
      value: distance(source, candidate(modes[mode].values.primary)),
      maximum: V2_POLICY.primary.maximumSourceDistance,
      unit: "ΔE",
    }),
  );
  const semanticChecks = ["light", "dark"].flatMap((mode) => {
    const values = modes[mode].values;
    const primary = candidate(values.primary);
    const destructive = candidate(values.destructive);
    const warning = candidate(values.warning);
    const hueCheck = (id, label, first, second) => {
      const chromatic =
        first.oklch.c >= V2_POLICY.semanticReview.chromaFloor &&
        second.oklch.c >= V2_POLICY.semanticReview.chromaFloor;
      return minimumQualityCheck({
        id,
        label,
        value: chromatic ? hueDistance(first.oklch.h, second.oklch.h) : 180,
        minimum: V2_POLICY.semanticReview.minimumHueSeparation,
        unit: chromatic ? "°" : "° · achromatic exemption",
      });
    };
    return [
      hueCheck(
        `review.${mode}.primary-destructive-hue`,
        `${mode} primary ↔ destructive hue`,
        primary,
        destructive,
      ),
      hueCheck(
        `review.${mode}.primary-warning-hue`,
        `${mode} primary ↔ warning hue`,
        primary,
        warning,
      ),
    ];
  });
  const checks = [
    ...structuralQuality.checks,
    ...sourceChecks,
    ...semanticChecks,
  ];
  return {
    ...structuralQuality,
    intent:
      "Independently review source fidelity, cross-mode identity, and state pacing after pair selection.",
    sourceChecks,
    semanticChecks,
    checks,
    passed: checks.every(({ pass }) => pass),
  };
}

export function sourceUsageAlternatives(input, modes) {
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
            safe: outlineContrast >= V2_POLICY.primary.boundaryContrast,
            note:
              outlineContrast >= V2_POLICY.primary.boundaryContrast
                ? "Source color can identify an outline control on both foundations."
                : "Source color is too weak for a required outline on one foundation.",
          },
          brandFaithful: {
            color: input.hex,
            text: sourceText,
            border: result.values["primary border"],
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
    recommendation: {
      statefulAction: "Generated fill",
      sourceFaithfulAction: Object.values(byMode).every(
        ({ outline }) => outline.safe,
      )
        ? "Source outline"
        : Object.values(byMode).every(({ brandFaithful }) => brandFaithful.safe)
          ? "Source fill with generated boundary"
          : "No source-faithful action is safe in both modes",
      rationale:
        "Generated fill is the only option with a complete state family; source-faithful options are base-state alternatives.",
    },
  };
}
