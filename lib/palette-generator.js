import {
  clamp,
  contrastLabel,
  contrastRatio,
  formatOklch,
  hexToRgb,
  oklchToHex,
  rgbToOklch,
  solveOklchContrast,
} from "./color-math.js";
import { REQUIRED_FUNCTIONS } from "./palette-config.js";
import { resolvePaletteInput } from "./palette-engine.js";

function createTrace(functionName, source) {
  return {
    function: functionName,
    source,
    recipe: { source, operations: [] },
    steps: [],
    warnings: [],
  };
}

function addStep(trace, stage, message, before = "", after = "") {
  trace.steps.push({ stage, message, before, after });
  if (stage !== "final") {
    trace.recipe.operations.push({
      index: trace.recipe.operations.length + 1,
      type: stage,
      rationale: message,
      input: before || null,
      output: after || null,
    });
  }
}

function attachColorArtifact(trace, candidate, mapped) {
  trace.artifact = {
    candidate: {
      space: "oklch",
      value: { ...candidate },
    },
    output: {
      srgb: {
        hex: mapped.hex,
        oklch: { ...mapped.color },
      },
    },
    diagnostic: {
      gamut: { ...mapped.mapping },
      adjusted: mapped.adjusted,
    },
  };
}

function gamutMessage(mapped, fallback) {
  if (!mapped.adjusted) return fallback;
  return `Reduced chroma by ${(mapped.mapping.chromaReductionRatio * 100).toFixed(1)}% to fit inside sRGB.`;
}

function createToken(name, color, source, message, traces) {
  const trace = createTrace(name, source);
  addStep(trace, "derive", message, "", formatOklch(color));
  const mapped = oklchToHex(color);
  attachColorArtifact(trace, color, mapped);
  addStep(
    trace,
    "gamut",
    gamutMessage(mapped, "Candidate already fits inside sRGB."),
    formatOklch(color),
    formatOklch(mapped.color),
  );
  addStep(
    trace,
    "final",
    `Exported the resolved color for “${name}”.`,
    formatOklch(mapped.color),
    mapped.hex,
  );
  traces[name] = trace;
  return [mapped.hex, name];
}

function createContrastToken(
  name,
  candidate,
  backgrounds,
  target,
  source,
  message,
  traces,
  direction = "nearest",
) {
  const solved = solveOklchContrast({
    color: candidate,
    against: backgrounds,
    target,
    direction,
  });
  const trace = createTrace(name, source);
  attachColorArtifact(trace, candidate, solved);
  addStep(trace, "derive", message, "", formatOklch(candidate));
  addStep(
    trace,
    "contrast",
    `${solved.ratio.toFixed(2)}:1 minimum across ${solved.backgrounds.join(", ")} — ${contrastLabel(solved.ratio)}.`,
    solved.backgrounds.join(", "),
    `${solved.hex} · ${solved.ratio.toFixed(2)}:1`,
  );
  addStep(
    trace,
    "gamut",
    gamutMessage(solved, "Resolved color already fits inside sRGB."),
    formatOklch(candidate),
    formatOklch(solved.color),
  );
  addStep(trace, "final", `Resolved “${name}”.`, "", solved.hex);
  if (!solved.passed) {
    trace.warnings.push(
      `CONTRAST_UNRESOLVED: ${name} reached ${solved.ratio.toFixed(2)}:1 of the ${target.toFixed(1)}:1 target.`,
    );
  }
  traces[name] = trace;
  return [solved.hex, name];
}

function createTextToken(name, backgrounds, target, primary, traces) {
  const candidate = {
    l: name === "main text" ? 0.42 : 0.56,
    c: name === "main text" ? 0.012 : 0.018,
    h: primary.h,
  };
  return createContrastToken(
    name,
    candidate,
    backgrounds,
    target,
    "derived from surface contrast",
    `Searched OKLCH lightness for the closest dark text reaching ${target.toFixed(1)}:1 across every declared surface.`,
    traces,
    "darker",
  );
}

function createButtonStates(primary, defaultHex, params, traces) {
  const whiteDefault = contrastRatio("#FFFFFF", defaultHex);
  const blackDefault = contrastRatio("#000000", defaultHex);
  const direction = whiteDefault >= 4.5 || whiteDefault > blackDefault ? -1 : 1;
  return [
    ["primary button hover", 0.62],
    ["primary button active", 1],
  ].map(([name, multiplier]) => {
    const requested = params.stateLightnessStep * multiplier;
    let applied = requested;
    let mapped;
    let ratio;
    for (let attempts = 0; attempts < 30; attempts += 1) {
      mapped = oklchToHex({
        l: clamp(primary.l + direction * applied, 0.08, 0.96),
        c: primary.c * params.chromaScale,
        h: primary.h,
      });
      const foreground =
        contrastRatio("#FFFFFF", mapped.hex) >
        contrastRatio("#000000", mapped.hex)
          ? "#FFFFFF"
          : "#000000";
      ratio = contrastRatio(foreground, mapped.hex);
      const shared =
        blackDefault >= whiteDefault
          ? foreground === "#000000"
          : foreground === "#FFFFFF";
      if (ratio >= 4.5 && shared) break;
      applied *= 0.84;
    }
    const trace = createTrace(name, "primary color");
    attachColorArtifact(
      trace,
      {
        l: clamp(primary.l + direction * applied, 0.08, 0.96),
        c: primary.c * params.chromaScale,
        h: primary.h,
      },
      mapped,
    );
    addStep(
      trace,
      "input",
      "Started with the normalized primary color.",
      "",
      `${defaultHex} · ${formatOklch(primary)}`,
    );
    addStep(
      trace,
      "vibe",
      `The ${params.name} vibe requested a ${(requested * 100).toFixed(1)} point lightness step.`,
      `step ${requested.toFixed(3)}`,
      `step ${applied.toFixed(3)}`,
    );
    addStep(
      trace,
      "derive",
      `Moved lightness ${direction < 0 ? "down" : "up"} while preserving the primary hue.`,
      formatOklch(primary),
      formatOklch(mapped.color),
    );
    addStep(
      trace,
      "contrast",
      `Best black/white foreground contrast is ${ratio.toFixed(2)}:1.`,
      mapped.hex,
      `${ratio.toFixed(2)}:1 · ${contrastLabel(ratio)}`,
    );
    addStep(
      trace,
      "gamut",
      gamutMessage(mapped, "State already fits inside sRGB."),
      "",
      mapped.hex,
    );
    if (applied < requested * 0.85)
      trace.warnings.push(
        `STATE_STEP_REDUCED: Reduced the requested lightness step from ${requested.toFixed(3)} to ${applied.toFixed(3)} to preserve a shared readable foreground.`,
      );
    addStep(trace, "final", `Resolved “${name}”.`, "", mapped.hex);
    traces[name] = trace;
    return [mapped.hex, name];
  });
}

function createButtonText(backgrounds, traces) {
  const scores = ["#FFFFFF", "#000000"]
    .map((hex) => ({
      hex,
      ratios: backgrounds.map((background) => contrastRatio(hex, background)),
    }))
    .sort((a, b) => Math.min(...b.ratios) - Math.min(...a.ratios));
  const trace = createTrace(
    "primary button text",
    "black / white contrast comparison",
  );
  const selectedOklch = rgbToOklch(hexToRgb(scores[0].hex));
  attachColorArtifact(trace, selectedOklch, oklchToHex(selectedOklch));
  scores.forEach((score) =>
    addStep(
      trace,
      "contrast",
      `${score.hex} minimum contrast across button states: ${Math.min(...score.ratios).toFixed(2)}:1.`,
      backgrounds.join(", "),
      score.ratios.map((ratio) => `${ratio.toFixed(2)}:1`).join(", "),
    ),
  );
  addStep(
    trace,
    "final",
    "Selected the text color with the strongest worst-case contrast across all states.",
    "",
    scores[0].hex,
  );
  if (Math.min(...scores[0].ratios) < 4.5)
    trace.warnings.push(
      "BUTTON_TEXT_CONTRAST: No shared black or white foreground reaches 4.5:1 in every state.",
    );
  traces["primary button text"] = trace;
  return [scores[0].hex, "primary button text"];
}

function addAccentFamily(
  anchor,
  prefix,
  params,
  tokens,
  traces,
  readingSurfaces,
) {
  const base = rgbToOklch(hexToRgb(anchor.hex));
  const accentName = `${prefix} accent`;
  const softName = `${prefix} accent soft`;
  const textName = `${prefix} accent text`;
  tokens.push(
    createToken(
      accentName,
      { ...base, c: base.c * params.chromaScale },
      anchor.source,
      anchor.relation
        ? `Selected this hue through the ${params.harmony} rule: ${anchor.relation}.`
        : `Preserved the user-supplied hue as the ${prefix} family anchor.`,
      traces,
    ),
  );
  const soft = createToken(
    softName,
    {
      l: params.name === "high contrast" ? 0.965 : 0.94,
      c: Math.min(0.055, base.c * (params.name === "soft" ? 0.2 : 0.13)),
      h: base.h,
    },
    accentName,
    `Turned the ${prefix} anchor into a low-chroma tinted surface.`,
    traces,
  );
  tokens.push(soft);
  const chroma = Math.min(0.14, base.c * 0.58);
  tokens.push(
    createContrastToken(
      textName,
      { l: Math.min(base.l, 0.5), c: chroma, h: base.h },
      [soft[0], ...readingSurfaces],
      4.5,
      `${accentName} + ${softName}`,
      "Kept the supplied hue and searched OKLCH lightness for readable text on the soft surface.",
      traces,
      "darker",
    ),
  );
}

export function generatePalette(sourceInput) {
  const { input, params, primary, supportingColors } =
    resolvePaletteInput(sourceInput);
  const tokens = [];
  const traces = {};
  const background = createToken(
    "background",
    {
      l: input.vibe === "high contrast" ? 0.99 : 0.975,
      c: primary.c * params.surfaceTint * 0.32,
      h: primary.h,
    },
    "primary color + vibe",
    `Created a near-white canvas with ${(params.surfaceTint * 100).toFixed(0)}% surface tint intent.`,
    traces,
  );
  tokens.push(background);
  const surface = createToken(
    "surface",
    { l: 1, c: primary.c * params.surfaceTint * 0.08, h: primary.h },
    "background",
    "Raised the surface above the tinted page background.",
    traces,
  );
  tokens.push(surface);
  const readingSurfaces = [background[0], surface[0]];
  tokens.push(
    createTextToken(
      "main text",
      readingSurfaces,
      input.vibe === "high contrast" ? 10.5 : 8,
      primary,
      traces,
    ),
  );
  tokens.push(
    createTextToken(
      "secondary text",
      readingSurfaces,
      input.vibe === "high contrast" ? 7 : 4.7,
      primary,
      traces,
    ),
  );
  tokens.push(
    createToken(
      "border",
      {
        l: clamp(0.91 - params.borderEmphasis * 0.42, 0.75, 0.94),
        c: primary.c * Math.max(params.surfaceTint, 0.018) * 0.85,
        h: primary.h,
      },
      "surface + vibe",
      `Applied ${params.borderEmphasis.toFixed(2)} border emphasis without turning every boundary into an alert.`,
      traces,
    ),
  );
  tokens.push(
    createContrastToken(
      "border control",
      { l: 0.72, c: Math.min(0.035, primary.c * 0.18), h: primary.h },
      [surface[0]],
      3,
      "surface + accessibility contract",
      "Created a control boundary and searched darker lightness until it reached 3:1 against the surface.",
      traces,
      "darker",
    ),
  );

  const defaultMapped = oklchToHex({
    ...primary,
    c: primary.c * params.chromaScale,
  });
  const primaryTrace = createTrace("primary button default", "user primary");
  attachColorArtifact(
    primaryTrace,
    {
      ...primary,
      c: primary.c * params.chromaScale,
    },
    defaultMapped,
  );
  addStep(
    primaryTrace,
    "input",
    "Preserved the explicit user color as the first button candidate.",
    input.rawPrimary ?? input.primary,
    input.primary,
  );
  addStep(
    primaryTrace,
    "convert",
    "Converted sRGB to OKLCH for perceptual calculations.",
    input.primary,
    formatOklch(primary),
  );
  addStep(
    primaryTrace,
    "vibe",
    `${params.name} applied a ${params.chromaScale.toFixed(2)} chroma scale.`,
    formatOklch(primary),
    formatOklch(defaultMapped.color),
  );
  addStep(
    primaryTrace,
    "contrast",
    `White: ${contrastRatio("#FFFFFF", defaultMapped.hex).toFixed(2)}:1. Black: ${contrastRatio("#000000", defaultMapped.hex).toFixed(2)}:1.`,
    defaultMapped.hex,
    "Foreground selection happens after state generation.",
  );
  addStep(
    primaryTrace,
    "gamut",
    gamutMessage(defaultMapped, "Primary button fits inside sRGB."),
    "",
    defaultMapped.hex,
  );
  addStep(
    primaryTrace,
    "final",
    "Resolved the default primary button background.",
    "",
    defaultMapped.hex,
  );
  traces["primary button default"] = primaryTrace;
  tokens.push([defaultMapped.hex, "primary button default"]);
  const states = createButtonStates(
    defaultMapped.color,
    defaultMapped.hex,
    params,
    traces,
  );
  tokens.push(...states);
  tokens.push(
    createButtonText([defaultMapped.hex, states[0][0], states[1][0]], traces),
  );

  const focusCandidate = {
    l: primary.l > 0.62 ? primary.l - 0.18 : primary.l + 0.2,
    c: primary.c * 0.72,
    h: primary.h,
  };
  const focus = createContrastToken(
    "focus ring",
    focusCandidate,
    readingSurfaces,
    3,
    "primary color + accessibility contract",
    "Derived a hue-related focus indicator and searched for 3:1 across page and raised surfaces.",
    traces,
  );
  tokens.push(focus);

  addAccentFamily(
    supportingColors.secondary,
    "secondary",
    params,
    tokens,
    traces,
    readingSurfaces,
  );
  addAccentFamily(
    supportingColors.additional,
    "decorative",
    params,
    tokens,
    traces,
    readingSurfaces,
  );
  const warnings = Object.values(traces).flatMap((trace) => trace.warnings);
  if (params.vibeDefaulted) {
    warnings.unshift(
      `UNSUPPORTED_VIBE: “${params.requestedVibe}” was normalized to “${params.name}”.`,
    );
  }
  if (input.additionalColors.length > 1) {
    warnings.push(
      `ADDITIONAL_COLORS_TRUNCATED: This prototype uses the first of ${input.additionalColors.length} additional colors.`,
    );
  }
  const missing = REQUIRED_FUNCTIONS.filter(
    (name) => !tokens.some(([, tokenName]) => tokenName === name),
  );
  if (missing.length) warnings.push(`MISSING_FUNCTIONS: ${missing.join(", ")}`);
  const artifacts = Object.fromEntries(
    tokens.map(([, name]) => [name, traces[name].artifact]),
  );
  return {
    input,
    params,
    primary,
    supportingColors,
    tokens,
    artifacts,
    traces,
    warnings,
  };
}
