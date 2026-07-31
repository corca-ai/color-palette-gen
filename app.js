const VIBES = {
  balanced: {
    chromaScale: 1,
    surfaceTint: 0.02,
    stateLightnessStep: 0.05,
    borderEmphasis: 0.08,
  },
  calm: {
    chromaScale: 0.78,
    surfaceTint: 0.03,
    stateLightnessStep: 0.035,
    borderEmphasis: 0.06,
  },
  soft: {
    chromaScale: 0.72,
    surfaceTint: 0.08,
    stateLightnessStep: 0.025,
    borderEmphasis: 0.04,
  },
  energetic: {
    chromaScale: 1.12,
    surfaceTint: 0.02,
    stateLightnessStep: 0.07,
    borderEmphasis: 0.1,
  },
  "high contrast": {
    chromaScale: 1,
    surfaceTint: 0,
    stateLightnessStep: 0.08,
    borderEmphasis: 0.14,
  },
};

const REQUIRED_FUNCTIONS = [
  "background",
  "surface",
  "main text",
  "secondary text",
  "border",
  "primary button default",
  "primary button hover",
  "primary button active",
  "primary button text",
  "focus ring",
];

const FUNCTION_TO_VAR = {
  background: "--color-background",
  surface: "--color-surface",
  "main text": "--color-main-text",
  "secondary text": "--color-secondary-text",
  border: "--color-border",
  "primary button default": "--color-primary-button",
  "primary button hover": "--color-primary-button-hover",
  "primary button active": "--color-primary-button-active",
  "primary button text": "--color-primary-button-text",
  "focus ring": "--color-focus-ring",
  "secondary accent": "--color-secondary-accent",
  "secondary accent soft": "--color-secondary-accent-soft",
  "secondary accent text": "--color-secondary-accent-text",
  "decorative accent": "--color-decorative-accent",
  "decorative accent soft": "--color-decorative-accent-soft",
  "decorative accent text": "--color-decorative-accent-text",
};

const form = document.querySelector("#palette-form");
const primaryInput = document.querySelector("#primary-color");
const primaryPicker = document.querySelector("#primary-picker");
const secondaryInput = document.querySelector("#secondary-color");
const secondaryPicker = document.querySelector("#secondary-picker");
const additionalInput = document.querySelector("#additional-color");
const additionalPicker = document.querySelector("#additional-picker");
const primaryError = document.querySelector("#primary-error");
const paletteList = document.querySelector("#palette-list");
const stateGrid = document.querySelector("#state-grid");
const debugNav = document.querySelector("#debug-nav");
const tracePanel = document.querySelector("#trace-panel");
const debugSummary = document.querySelector("#debug-summary");
const resultTitle = document.querySelector("#result-title");
const resultCount = document.querySelector("#result-count");
const resultStatus = document.querySelector("#result-status");
const debugCount = document.querySelector("#debug-count");
const adjustmentCount = document.querySelector("#adjustment-count");
const adjustmentsList = document.querySelector("#adjustments-list");
const lineageCanvas = document.querySelector("#lineage-canvas");
const toast = document.querySelector("#toast");

let currentResult;
let activeDebugFunction = "primary button default";

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function isHex(value) {
  return /^#[0-9a-f]{6}$/i.test(value.trim());
}

function normalizeHex(value) {
  return value.trim().toUpperCase();
}

function hexToRgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return {
    r: ((value >> 16) & 255) / 255,
    g: ((value >> 8) & 255) / 255,
    b: (value & 255) / 255,
  };
}

function rgbToHex({ r, g, b }) {
  const channel = (value) =>
    Math.round(clamp(value) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`.toUpperCase();
}

function srgbToLinear(value) {
  return value <= 0.04045
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(value) {
  return value <= 0.0031308
    ? 12.92 * value
    : 1.055 * value ** (1 / 2.4) - 0.055;
}

function rgbToOklch({ r, g, b }) {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const lRoot = Math.cbrt(l);
  const mRoot = Math.cbrt(m);
  const sRoot = Math.cbrt(s);

  const L =
    0.2104542553 * lRoot +
    0.793617785 * mRoot -
    0.0040720468 * sRoot;
  const a =
    1.9779984951 * lRoot -
    2.428592205 * mRoot +
    0.4505937099 * sRoot;
  const bValue =
    0.0259040371 * lRoot +
    0.7827717662 * mRoot -
    0.808675766 * sRoot;

  const C = Math.sqrt(a * a + bValue * bValue);
  let H = (Math.atan2(bValue, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { l: L, c: C, h: C < 0.0001 ? 0 : H };
}

function oklchToRawRgb({ l, c, h }) {
  const angle = (h * Math.PI) / 180;
  const a = c * Math.cos(angle);
  const b = c * Math.sin(angle);

  const lRoot = l + 0.3963377774 * a + 0.2158037573 * b;
  const mRoot = l - 0.1055613458 * a - 0.0638541728 * b;
  const sRoot = l - 0.0894841775 * a - 1.291485548 * b;

  const linearL = lRoot ** 3;
  const linearM = mRoot ** 3;
  const linearS = sRoot ** 3;

  return {
    r: linearToSrgb(
      4.0767416621 * linearL -
        3.3077115913 * linearM +
        0.2309699292 * linearS,
    ),
    g: linearToSrgb(
      -1.2684380046 * linearL +
        2.6097574011 * linearM -
        0.3413193965 * linearS,
    ),
    b: linearToSrgb(
      -0.0041960863 * linearL -
        0.7034186147 * linearM +
        1.707614701 * linearS,
    ),
  };
}

function inGamut(rgb) {
  return Object.values(rgb).every((channel) => channel >= 0 && channel <= 1);
}

function mapToSrgb(color) {
  const raw = oklchToRawRgb(color);
  if (inGamut(raw)) {
    return { color, rgb: raw, adjusted: false };
  }

  let low = 0;
  let high = color.c;
  for (let index = 0; index < 24; index += 1) {
    const mid = (low + high) / 2;
    const candidate = { ...color, c: mid };
    if (inGamut(oklchToRawRgb(candidate))) low = mid;
    else high = mid;
  }
  const mapped = { ...color, c: low };
  return { color: mapped, rgb: oklchToRawRgb(mapped), adjusted: true };
}

function oklchToHex(color) {
  const mapped = mapToSrgb(color);
  return { ...mapped, hex: rgbToHex(mapped.rgb) };
}

function relativeLuminance(hex) {
  const rgb = hexToRgb(hex);
  return (
    0.2126 * srgbToLinear(rgb.r) +
    0.7152 * srgbToLinear(rgb.g) +
    0.0722 * srgbToLinear(rgb.b)
  );
}

function contrastRatio(first, second) {
  const lum1 = relativeLuminance(first);
  const lum2 = relativeLuminance(second);
  return (
    (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05)
  );
}

function contrastLabel(ratio) {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  return "Fail";
}

function formatOklch(color) {
  return `oklch(${(color.l * 100).toFixed(1)}% ${color.c.toFixed(3)} ${color.h.toFixed(1)})`;
}

function createTrace(functionName, source) {
  return {
    function: functionName,
    source,
    steps: [],
    warnings: [],
  };
}

function addStep(trace, stage, message, before = "", after = "") {
  trace.steps.push({ stage, message, before, after });
}

function tokenFromOklch(functionName, color, source, traces, message) {
  const trace = createTrace(functionName, source);
  addStep(
    trace,
    "derive",
    message,
    "",
    formatOklch(color),
  );
  const mapped = oklchToHex(color);
  addStep(
    trace,
    "gamut",
    mapped.adjusted
      ? "Reduced chroma until the color fit inside sRGB."
      : "Candidate already fits inside sRGB.",
    formatOklch(color),
    formatOklch(mapped.color),
  );
  addStep(
    trace,
    "final",
    `Exported the resolved color for “${functionName}”.`,
    formatOklch(mapped.color),
    mapped.hex,
  );
  traces[functionName] = trace;
  return [mapped.hex, functionName];
}

function findNeutralForContrast(backgroundHex, target, darker) {
  let low = 0;
  let high = 1;
  for (let index = 0; index < 30; index += 1) {
    const middle = (low + high) / 2;
    const candidate = oklchToHex({ l: middle, c: 0, h: 0 }).hex;
    const passes = contrastRatio(candidate, backgroundHex) >= target;
    if (darker === passes) low = middle;
    else high = middle;
  }
  return darker ? low : high;
}

function makeTextToken(functionName, backgroundHex, target, primary, traces) {
  const lightness = findNeutralForContrast(backgroundHex, target, true);
  const tint = functionName === "main text" ? 0.012 : 0.018;
  const candidate = { l: lightness - 0.012, c: tint, h: primary.h };
  const trace = createTrace(functionName, "derived from background contrast");
  addStep(
    trace,
    "derive",
    `Searched for the lightest dark text that reaches ${target.toFixed(1)}:1 against the background.`,
    backgroundHex,
    formatOklch(candidate),
  );
  const mapped = oklchToHex(candidate);
  const ratio = contrastRatio(mapped.hex, backgroundHex);
  addStep(
    trace,
    "contrast",
    `${ratio.toFixed(2)}:1 against ${backgroundHex} — ${contrastLabel(ratio)}.`,
    mapped.hex,
    `${ratio.toFixed(2)}:1`,
  );
  addStep(
    trace,
    "gamut",
    mapped.adjusted
      ? "Reduced chroma to fit inside sRGB."
      : "Candidate already fits inside sRGB.",
    formatOklch(candidate),
    formatOklch(mapped.color),
  );
  addStep(trace, "final", `Resolved “${functionName}”.`, "", mapped.hex);
  traces[functionName] = trace;
  return [mapped.hex, functionName];
}

function chooseButtonText(backgrounds, traces) {
  const candidates = ["#FFFFFF", "#000000"];
  const scores = candidates.map((candidate) => ({
    hex: candidate,
    ratios: backgrounds.map((background) =>
      contrastRatio(candidate, background),
    ),
  }));
  const selected = scores.sort(
    (a, b) => Math.min(...b.ratios) - Math.min(...a.ratios),
  )[0];

  const trace = createTrace(
    "primary button text",
    "black / white contrast comparison",
  );
  for (const score of scores) {
    addStep(
      trace,
      "contrast",
      `${score.hex} minimum contrast across button states: ${Math.min(...score.ratios).toFixed(2)}:1.`,
      backgrounds.join(", "),
      score.ratios.map((ratio) => `${ratio.toFixed(2)}:1`).join(", "),
    );
  }
  addStep(
    trace,
    "final",
    `Selected the text color with the strongest worst-case contrast across all states.`,
    "",
    selected.hex,
  );
  if (Math.min(...selected.ratios) < 4.5) {
    trace.warnings.push(
      "BUTTON_TEXT_CONTRAST: No shared black or white foreground reaches 4.5:1 in every state.",
    );
  }
  traces["primary button text"] = trace;
  return { token: [selected.hex, "primary button text"], scores };
}

function deriveButtonStates(primary, defaultHex, params, traces) {
  const stateTarget = 4.5;
  const blackDefault = contrastRatio("#000000", defaultHex);
  const whiteDefault = contrastRatio("#FFFFFF", defaultHex);
  const preferDarker =
    whiteDefault >= stateTarget || whiteDefault > blackDefault;
  const direction = preferDarker ? -1 : 1;

  const makeState = (name, multiplier) => {
    const desiredStep = params.stateLightnessStep * multiplier;
    let appliedStep = desiredStep;
    let mapped;
    let ratio;
    let attempts = 0;

    while (attempts < 30) {
      const candidate = {
        l: clamp(primary.l + direction * appliedStep, 0.08, 0.96),
        c: primary.c * params.chromaScale,
        h: primary.h,
      };
      mapped = oklchToHex(candidate);
      const foreground =
        contrastRatio("#FFFFFF", mapped.hex) >
        contrastRatio("#000000", mapped.hex)
          ? "#FFFFFF"
          : "#000000";
      ratio = contrastRatio(foreground, mapped.hex);

      const sharesDefaultForeground =
        (blackDefault >= whiteDefault && foreground === "#000000") ||
        (whiteDefault > blackDefault && foreground === "#FFFFFF");
      if (ratio >= stateTarget && sharesDefaultForeground) break;

      appliedStep *= 0.84;
      attempts += 1;
    }

    const trace = createTrace(name, "primary color");
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
      `The ${params.name} vibe requested a ${(desiredStep * 100).toFixed(1)} point lightness step.`,
      `step ${desiredStep.toFixed(3)}`,
      `step ${appliedStep.toFixed(3)}`,
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
      mapped.adjusted
        ? "Reduced chroma to keep the state inside sRGB."
        : "State already fits inside sRGB.",
      "",
      mapped.hex,
    );
    if (appliedStep < desiredStep * 0.85) {
      trace.warnings.push(
        `STATE_STEP_REDUCED: Reduced the requested lightness step from ${desiredStep.toFixed(3)} to ${appliedStep.toFixed(3)} to preserve a shared readable foreground.`,
      );
    }
    addStep(trace, "final", `Resolved “${name}”.`, "", mapped.hex);
    traces[name] = trace;
    return [mapped.hex, name];
  };

  return [
    makeState("primary button hover", 0.62),
    makeState("primary button active", 1),
  ];
}

function addAccentFamily({
  inputHex,
  prefix,
  source,
  params,
  tokens,
  traces,
}) {
  const base = rgbToOklch(hexToRgb(inputHex));
  const accentName = `${prefix} accent`;
  const softName = `${prefix} accent soft`;
  const textName = `${prefix} accent text`;

  const accent = tokenFromOklch(
    accentName,
    { ...base, c: base.c * params.chromaScale },
    source,
    traces,
    `Preserved the supplied hue as the ${prefix} family anchor.`,
  );
  tokens.push(accent);

  const soft = tokenFromOklch(
    softName,
    {
      l: params.name === "high contrast" ? 0.965 : 0.94,
      c: Math.min(0.055, base.c * (params.name === "soft" ? 0.2 : 0.13)),
      h: base.h,
    },
    accentName,
    traces,
    `Turned the ${prefix} anchor into a low-chroma tinted surface.`,
  );
  tokens.push(soft);

  const textTrace = createTrace(textName, `${accentName} + ${softName}`);
  const textChroma = Math.min(0.14, base.c * 0.58);
  let textLightness = Math.min(base.l, 0.5);
  let textCandidate = oklchToHex({
    l: textLightness,
    c: textChroma,
    h: base.h,
  });
  let ratio = contrastRatio(textCandidate.hex, soft[0]);

  while (ratio < 4.5 && textLightness > 0.12) {
    textLightness -= 0.012;
    textCandidate = oklchToHex({
      l: textLightness,
      c: textChroma,
      h: base.h,
    });
    ratio = contrastRatio(textCandidate.hex, soft[0]);
  }

  addStep(
    textTrace,
    "derive",
    `Kept the supplied hue and searched downward in lightness for readable text on the soft surface.`,
    formatOklch(base),
    formatOklch(textCandidate.color),
  );
  addStep(
    textTrace,
    "contrast",
    `${ratio.toFixed(2)}:1 against ${soft[0]} — ${contrastLabel(ratio)}.`,
    `${textCandidate.hex} / ${soft[0]}`,
    `${ratio.toFixed(2)}:1`,
  );
  addStep(
    textTrace,
    "gamut",
    textCandidate.adjusted
      ? "Reduced chroma to keep the readable text inside sRGB."
      : "Readable text already fits inside sRGB.",
    "",
    formatOklch(textCandidate.color),
  );
  addStep(
    textTrace,
    "final",
    `Resolved “${textName}”.`,
    "",
    textCandidate.hex,
  );
  if (ratio < 4.5) {
    textTrace.warnings.push(
      `ACCENT_TEXT_CONTRAST: Could not reach 4.5:1 for ${textName}.`,
    );
  }
  traces[textName] = textTrace;
  tokens.push([textCandidate.hex, textName]);
}

function generatePalette(input) {
  const params = { ...VIBES[input.vibe], name: input.vibe };
  const primaryRgb = hexToRgb(input.primary);
  const primary = rgbToOklch(primaryRgb);
  const traces = {};
  const warnings = [];
  const tokens = [];

  const backgroundCandidate = {
    l: input.vibe === "high contrast" ? 0.99 : 0.975,
    c: primary.c * params.surfaceTint * 0.32,
    h: primary.h,
  };
  const background = tokenFromOklch(
    "background",
    backgroundCandidate,
    "primary color + vibe",
    traces,
    `Created a near-white canvas with ${(params.surfaceTint * 100).toFixed(0)}% surface tint intent.`,
  );
  tokens.push(background);

  tokens.push(
    tokenFromOklch(
      "surface",
      {
        l: 1,
        c: primary.c * params.surfaceTint * 0.08,
        h: primary.h,
      },
      "background",
      traces,
      "Raised the surface above the tinted page background.",
    ),
  );

  const textTarget = input.vibe === "high contrast" ? 10.5 : 8;
  const secondaryTarget = input.vibe === "high contrast" ? 7 : 4.7;
  tokens.push(
    makeTextToken(
      "main text",
      background[0],
      textTarget,
      primary,
      traces,
    ),
  );
  tokens.push(
    makeTextToken(
      "secondary text",
      background[0],
      secondaryTarget,
      primary,
      traces,
    ),
  );

  tokens.push(
    tokenFromOklch(
      "border",
      {
        l: clamp(0.91 - params.borderEmphasis * 0.42, 0.75, 0.94),
        c: primary.c * Math.max(params.surfaceTint, 0.018) * 0.85,
        h: primary.h,
      },
      "surface + vibe",
      traces,
      `Applied ${params.borderEmphasis.toFixed(2)} border emphasis without turning every boundary into a red alert.`,
    ),
  );

  const primaryTrace = createTrace(
    "primary button default",
    "user primary",
  );
  addStep(
    primaryTrace,
    "input",
    "Preserved the explicit user color as the first button candidate.",
    input.rawPrimary,
    input.primary,
  );
  addStep(
    primaryTrace,
    "convert",
    "Converted sRGB to OKLCH for perceptual calculations.",
    input.primary,
    formatOklch(primary),
  );
  const defaultColor = oklchToHex({
    ...primary,
    c: primary.c * params.chromaScale,
  });
  addStep(
    primaryTrace,
    "vibe",
    `${params.name} applied a ${params.chromaScale.toFixed(2)} chroma scale.`,
    formatOklch(primary),
    formatOklch(defaultColor.color),
  );
  addStep(
    primaryTrace,
    "contrast",
    `White: ${contrastRatio("#FFFFFF", defaultColor.hex).toFixed(2)}:1. Black: ${contrastRatio("#000000", defaultColor.hex).toFixed(2)}:1.`,
    defaultColor.hex,
    "Foreground selection happens after state generation.",
  );
  addStep(
    primaryTrace,
    "gamut",
    defaultColor.adjusted
      ? "Reduced chroma to fit the primary button inside sRGB."
      : "Primary button fits inside sRGB.",
    "",
    defaultColor.hex,
  );
  addStep(
    primaryTrace,
    "final",
    "Resolved the default primary button background.",
    "",
    defaultColor.hex,
  );
  traces["primary button default"] = primaryTrace;
  tokens.push([defaultColor.hex, "primary button default"]);

  const states = deriveButtonStates(
    defaultColor.color,
    defaultColor.hex,
    params,
    traces,
  );
  tokens.push(...states);

  const buttonText = chooseButtonText(
    [defaultColor.hex, states[0][0], states[1][0]],
    traces,
  );
  tokens.push(buttonText.token);

  const focusCandidate = {
    l: primary.l > 0.62 ? primary.l - 0.18 : primary.l + 0.2,
    c: primary.c * 0.72,
    h: primary.h,
  };
  const focusToken = tokenFromOklch(
    "focus ring",
    focusCandidate,
    "primary color",
    traces,
    "Shifted lightness and reduced chroma so the focus ring remains related to primary without merging into the button.",
  );
  const focusBackgroundRatio = contrastRatio(focusToken[0], background[0]);
  addStep(
    traces["focus ring"],
    "contrast",
    `Focus ring contrast against the page background is ${focusBackgroundRatio.toFixed(2)}:1.`,
    `${focusToken[0]} / ${background[0]}`,
    `${focusBackgroundRatio.toFixed(2)}:1`,
  );
  if (focusBackgroundRatio < 3) {
    traces["focus ring"].warnings.push(
      "FOCUS_RING_CONTRAST: Focus ring is below the 3:1 internal target against the page background.",
    );
  }
  tokens.push(focusToken);

  if (input.secondary) {
    addAccentFamily({
      inputHex: input.secondary,
      prefix: "secondary",
      source: "user secondary",
      params,
      tokens,
      traces,
    });
  }

  if (input.additional) {
    addAccentFamily({
      inputHex: input.additional,
      prefix: "decorative",
      source: "user additional",
      params,
      tokens,
      traces,
    });
  }

  Object.values(traces).forEach((trace) => warnings.push(...trace.warnings));

  const missing = REQUIRED_FUNCTIONS.filter(
    (name) => !tokens.some(([, functionName]) => functionName === name),
  );
  if (missing.length) {
    warnings.push(`MISSING_FUNCTIONS: ${missing.join(", ")}`);
  }

  return {
    input,
    params,
    primary,
    tokens,
    traces,
    warnings,
  };
}

function tokenMap(tokens) {
  return Object.fromEntries(
    tokens.map(([color, functionName]) => [functionName, color]),
  );
}

function applyCssVariables(tokens) {
  for (const [color, functionName] of tokens) {
    const variable = FUNCTION_TO_VAR[functionName];
    if (variable) document.documentElement.style.setProperty(variable, color);
  }
  if (!tokens.some(([, name]) => name === "secondary accent")) {
    document.documentElement.style.setProperty(
      "--color-secondary-accent",
      tokenMap(tokens)["primary button default"],
    );
  }
  if (!tokens.some(([, name]) => name === "decorative accent")) {
    document.documentElement.style.setProperty(
      "--color-decorative-accent",
      tokenMap(tokens)["primary button default"],
    );
  }
}

function titleForColor(hex) {
  const { h } = rgbToOklch(hexToRgb(hex));
  if (h < 15 || h >= 345) return "Red";
  if (h < 45) return "Vermilion";
  if (h < 75) return "Orange";
  if (h < 110) return "Yellow";
  if (h < 165) return "Green";
  if (h < 205) return "Teal";
  if (h < 255) return "Blue";
  if (h < 300) return "Violet";
  return "Magenta";
}

function renderPalette(result) {
  paletteList.innerHTML = result.tokens
    .map(
      ([color, functionName]) => `
        <button class="palette-row" type="button" data-debug-function="${functionName}">
          <span class="palette-swatch" style="background:${color}"></span>
          <span>
            <span class="palette-role">${functionName}</span>
            <span class="palette-source">${result.traces[functionName].source}</span>
          </span>
          <span class="palette-hex">${color}</span>
        </button>
      `,
    )
    .join("");

  paletteList.querySelectorAll("[data-debug-function]").forEach((button) => {
    button.addEventListener("click", () => {
      activeDebugFunction = button.dataset.debugFunction;
      activateTab("debug");
      renderDebug(result);
    });
  });
}

function renderStates(result) {
  const tokens = tokenMap(result.tokens);
  const foreground = tokens["primary button text"];
  const states = [
    ["Default", tokens["primary button default"], ""],
    ["Hover", tokens["primary button hover"], ""],
    ["Active", tokens["primary button active"], ""],
    ["Focus", tokens["primary button default"], "focus"],
  ];

  stateGrid.innerHTML = states
    .map(([label, color, className]) => {
      const ratio = contrastRatio(foreground, color);
      return `
        <article class="state-card ${className}">
          <div class="state-preview" style="background:${tokens.background}">
            <button type="button" style="background:${color}">Continue</button>
          </div>
          <div class="state-details">
            <strong>${label}</strong>
            <code>${color}</code>
            <span>${ratio.toFixed(2)}:1 · ${contrastLabel(ratio)}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderDebug(result) {
  const adjustedCount = Object.values(result.traces).filter((trace) =>
    trace.steps.some(
      (step) =>
        step.stage === "gamut" &&
        step.message.toLowerCase().includes("reduced"),
    ),
  ).length;

  debugSummary.innerHTML = `
    <dl>
      <dt>Input</dt><dd>${result.input.primary}</dd>
      <dt>Vibe</dt><dd>${result.input.vibe}</dd>
      <dt>Roles</dt><dd>${result.tokens.length}</dd>
      <dt>Gamut maps</dt><dd>${adjustedCount}</dd>
      <dt>Warnings</dt><dd>${result.warnings.length}</dd>
    </dl>
  `;

  debugNav.innerHTML = result.tokens
    .map(
      ([color, functionName]) => `
        <button type="button" class="${functionName === activeDebugFunction ? "active" : ""}" data-trace="${functionName}">
          <span>${functionName}</span>
          <span class="debug-nav-swatch" style="background:${color}"></span>
        </button>
      `,
    )
    .join("");

  debugNav.querySelectorAll("[data-trace]").forEach((button) => {
    button.addEventListener("click", () => {
      activeDebugFunction = button.dataset.trace;
      renderDebug(result);
    });
  });

  const trace = result.traces[activeDebugFunction] ??
    result.traces[result.tokens[0][1]];
  const finalColor = tokenMap(result.tokens)[trace.function];
  tracePanel.innerHTML = `
    <div class="trace-heading">
      <div>
        <p class="eyebrow">Generation trace</p>
        <h3>${trace.function}</h3>
      </div>
      <code>${finalColor}</code>
    </div>
    ${trace.steps
      .map(
        (step) => `
          <div class="trace-step">
            <span class="trace-stage">${step.stage}</span>
            <div>
              <div class="trace-message">${step.message}</div>
              ${
                step.before || step.after
                  ? `<div class="trace-values">${step.before}${step.before && step.after ? "\n→ " : ""}${step.after}</div>`
                  : ""
              }
            </div>
          </div>
        `,
      )
      .join("")}
    ${trace.warnings
      .map((warning) => `<div class="trace-warning">${warning}</div>`)
      .join("")}
  `;
}

function getAdjustments(result) {
  const adjustments = [];

  for (const [functionName, trace] of Object.entries(result.traces)) {
    const color = tokenMap(result.tokens)[functionName];

    for (const step of trace.steps) {
      const changed = step.before && step.after && step.before !== step.after;
      const gamutAdjustment =
        step.stage === "gamut" &&
        step.message.toLowerCase().includes("reduced");
      const vibeAdjustment =
        step.stage === "vibe" &&
        changed &&
        !step.message.includes("1.00 chroma scale");

      if (gamutAdjustment || vibeAdjustment) {
        adjustments.push({
          functionName,
          color,
          kind: gamutAdjustment ? "gamut mapping" : "vibe adjustment",
          message: step.message,
          before: step.before,
          after: step.after,
          warnings: [],
        });
      }
    }

    for (const warning of trace.warnings) {
      const related = adjustments.find(
        (adjustment) => adjustment.functionName === functionName,
      );
      if (related) {
        related.warnings.push(warning);
      } else {
        adjustments.push({
          functionName,
          color,
          kind: "constraint adjustment",
          message:
            "A requested relationship was relaxed to preserve a stronger constraint.",
          before: "",
          after: "",
          warnings: [warning],
        });
      }
    }
  }

  return adjustments;
}

function renderAdjustments(result) {
  const adjustments = getAdjustments(result);
  adjustmentCount.textContent = String(adjustments.length);

  if (!adjustments.length) {
    adjustmentsList.innerHTML = `
      <div class="adjustments-empty">
        <strong>No automatic corrections</strong>
        <p>Every candidate fit the current vibe, contrast, and sRGB constraints as requested.</p>
      </div>
    `;
    return;
  }

  adjustmentsList.innerHTML = adjustments
    .map(
      (adjustment) => `
        <article class="adjustment-card">
          <div class="adjustment-card-header">
            <div>
              <h4>${adjustment.functionName}</h4>
              <span class="adjustment-kind">${adjustment.kind}</span>
            </div>
            <span class="adjustment-swatch" style="background:${adjustment.color}"></span>
          </div>
          <p class="adjustment-reason">${adjustment.message}</p>
          ${
            adjustment.before || adjustment.after
              ? `<div class="adjustment-delta">${adjustment.before}${adjustment.before && adjustment.after ? "\n→ " : ""}${adjustment.after}</div>`
              : ""
          }
          ${adjustment.warnings
            .map(
              (warning) =>
                `<div class="adjustment-warning">${warning}</div>`,
            )
            .join("")}
        </article>
      `,
    )
    .join("");
}

function renderLineage(result) {
  const theme = {
    background: oklchToHex({
      l: 0.18,
      c: Math.min(0.055, result.primary.c * 0.2 * result.params.chromaScale),
      h: result.primary.h,
    }).hex,
    node: oklchToHex({
      l: 0.235,
      c: Math.min(0.04, result.primary.c * 0.14 * result.params.chromaScale),
      h: result.primary.h,
    }).hex,
    nodeHover: oklchToHex({
      l: 0.285,
      c: Math.min(0.045, result.primary.c * 0.16 * result.params.chromaScale),
      h: result.primary.h,
    }).hex,
    nodeBorder: oklchToHex({
      l: 0.44,
      c: Math.min(0.055, result.primary.c * 0.18),
      h: result.primary.h,
    }).hex,
    line: oklchToHex({
      l: 0.56,
      c: Math.min(0.045, result.primary.c * 0.12),
      h: result.primary.h,
    }).hex,
    muted: oklchToHex({
      l: 0.72,
      c: Math.min(0.025, result.primary.c * 0.08),
      h: result.primary.h,
    }).hex,
  };
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty("--lineage-bg", theme.background);
  rootStyle.setProperty("--lineage-node-bg", theme.node);
  rootStyle.setProperty("--lineage-node-hover", theme.nodeHover);
  rootStyle.setProperty("--lineage-node-border", theme.nodeBorder);
  rootStyle.setProperty("--lineage-line", theme.line);
  rootStyle.setProperty("--lineage-muted", theme.muted);

  const tokens = tokenMap(result.tokens);
  const nodeWidth = 174;
  const nodeHeight = 48;

  const nodes = [
    {
      id: "primary",
      label: "User primary",
      value: result.input.primary,
      color: result.input.primary,
      x: 18,
      y: 152,
      type: "input",
    },
    {
      id: "background",
      label: "Background",
      value: tokens.background,
      color: tokens.background,
      x: 316,
      y: 30,
      type: "derived",
      functionName: "background",
    },
    {
      id: "border",
      label: "Border",
      value: tokens.border,
      color: tokens.border,
      x: 316,
      y: 98,
      type: "derived",
      functionName: "border",
    },
    {
      id: "button",
      label: "Button default",
      value: tokens["primary button default"],
      color: tokens["primary button default"],
      x: 316,
      y: 166,
      type: "derived",
      functionName: "primary button default",
    },
    {
      id: "focus",
      label: "Focus ring",
      value: tokens["focus ring"],
      color: tokens["focus ring"],
      x: 316,
      y: 234,
      type: "derived",
      functionName: "focus ring",
    },
    {
      id: "mainText",
      label: "Main text",
      value: tokens["main text"],
      color: tokens["main text"],
      x: 650,
      y: 18,
      type: "constraint",
      functionName: "main text",
    },
    {
      id: "secondaryText",
      label: "Secondary text",
      value: tokens["secondary text"],
      color: tokens["secondary text"],
      x: 650,
      y: 86,
      type: "constraint",
      functionName: "secondary text",
    },
    {
      id: "hover",
      label: "Button hover",
      value: tokens["primary button hover"],
      color: tokens["primary button hover"],
      x: 650,
      y: 154,
      type: "derived",
      functionName: "primary button hover",
    },
    {
      id: "active",
      label: "Button active",
      value: tokens["primary button active"],
      color: tokens["primary button active"],
      x: 650,
      y: 222,
      type: "derived",
      functionName: "primary button active",
    },
    {
      id: "buttonText",
      label: "Button text",
      value: tokens["primary button text"],
      color: tokens["primary button text"],
      x: 988,
      y: 188,
      type: "constraint",
      functionName: "primary button text",
    },
  ];

  if (tokens["secondary accent"]) {
    nodes.push(
      {
        id: "secondaryInput",
        label: "User secondary",
        value: result.input.secondary,
        color: result.input.secondary,
        x: 18,
        y: 292,
        type: "input",
      },
      {
        id: "secondary",
        label: "Secondary accent",
        value: tokens["secondary accent"],
        color: tokens["secondary accent"],
        x: 316,
        y: 292,
        type: "derived",
        functionName: "secondary accent",
      },
      {
        id: "secondarySoft",
        label: "Secondary soft",
        value: tokens["secondary accent soft"],
        color: tokens["secondary accent soft"],
        x: 650,
        y: 292,
        type: "derived",
        functionName: "secondary accent soft",
      },
      {
        id: "secondaryAccentText",
        label: "Secondary text",
        value: tokens["secondary accent text"],
        color: tokens["secondary accent text"],
        x: 988,
        y: 292,
        type: "constraint",
        functionName: "secondary accent text",
      },
    );
  }

  if (tokens["decorative accent"]) {
    nodes.push(
      {
        id: "additionalInput",
        label: "User additional",
        value: result.input.additional,
        color: result.input.additional,
        x: 18,
        y: 376,
        type: "input",
      },
      {
        id: "decorative",
        label: "Decorative accent",
        value: tokens["decorative accent"],
        color: tokens["decorative accent"],
        x: 316,
        y: 376,
        type: "derived",
        functionName: "decorative accent",
      },
      {
        id: "decorativeSoft",
        label: "Decorative soft",
        value: tokens["decorative accent soft"],
        color: tokens["decorative accent soft"],
        x: 650,
        y: 376,
        type: "derived",
        functionName: "decorative accent soft",
      },
      {
        id: "decorativeAccentText",
        label: "Decorative text",
        value: tokens["decorative accent text"],
        color: tokens["decorative accent text"],
        x: 988,
        y: 376,
        type: "constraint",
        functionName: "decorative accent text",
      },
    );
  }

  const byId = Object.fromEntries(nodes.map((node) => [node.id, node]));
  const edges = [
    ["primary", "background", "tint", false],
    ["primary", "border", "muted tint", false],
    ["primary", "button", "preserve", false],
    ["primary", "focus", "shift L · C", false],
    ["background", "mainText", "8:1 target", true],
    ["background", "secondaryText", "4.7:1 target", true],
    ["button", "hover", "state step", false],
    ["button", "active", "state step", false],
    ["button", "buttonText", "contrast", true],
    ["hover", "buttonText", "contrast", true],
    ["active", "buttonText", "contrast", true],
  ];
  if (byId.secondaryInput) {
    edges.push(["secondaryInput", "secondary", "preserve", false]);
    edges.push(["secondary", "secondarySoft", "tint", false]);
    edges.push([
      "secondarySoft",
      "secondaryAccentText",
      "4.5:1 target",
      true,
    ]);
  }
  if (byId.additionalInput) {
    edges.push(["additionalInput", "decorative", "preserve", false]);
    edges.push(["decorative", "decorativeSoft", "tint", false]);
    edges.push([
      "decorativeSoft",
      "decorativeAccentText",
      "4.5:1 target",
      true,
    ]);
  }

  const pathFor = (from, to) => {
    const startX = from.x + nodeWidth;
    const startY = from.y + nodeHeight / 2;
    const endX = to.x;
    const endY = to.y + nodeHeight / 2;
    const curve = Math.max(46, (endX - startX) * 0.46);
    return `M ${startX} ${startY} C ${startX + curve} ${startY}, ${endX - curve} ${endY}, ${endX} ${endY}`;
  };

  lineageCanvas.innerHTML = `
    <svg viewBox="0 0 1180 ${byId.additionalInput ? 450 : byId.secondaryInput ? 366 : 318}" role="img" aria-labelledby="lineage-svg-title lineage-svg-desc">
      <title id="lineage-svg-title">Color influence graph</title>
      <desc id="lineage-svg-desc">The primary input influences foundations, which are transformed into semantic color roles. Dashed lines indicate contrast constraints.</desc>
      <text class="lineage-column-label" x="18" y="12">Input</text>
      <text class="lineage-column-label" x="316" y="12">Foundations</text>
      <text class="lineage-column-label" x="650" y="12">Derived roles</text>
      <text class="lineage-column-label" x="988" y="170">Shared decision</text>
      ${edges
        .map(([fromId, toId, label, constraint]) => {
          const from = byId[fromId];
          const to = byId[toId];
          const labelX = (from.x + nodeWidth + to.x) / 2;
          const labelY = (from.y + to.y) / 2 + nodeHeight / 2 - 5;
          return `
            <path class="lineage-edge ${constraint ? "constraint" : ""}" d="${pathFor(from, to)}"></path>
            <text class="lineage-edge-label" x="${labelX}" y="${labelY}" text-anchor="middle">${label}</text>
          `;
        })
        .join("")}
      ${nodes
        .map(
          (node) => `
            <g
              class="lineage-node ${node.type}"
              transform="translate(${node.x} ${node.y})"
              tabindex="${node.functionName ? "0" : "-1"}"
              role="${node.functionName ? "button" : "img"}"
              ${node.functionName ? `data-lineage-function="${node.functionName}" aria-label="Inspect ${node.label}"` : `aria-label="${node.label} ${node.value}"`}
            >
              <rect class="node-body" width="${nodeWidth}" height="${nodeHeight}" rx="2"></rect>
              <rect class="node-swatch" x="10" y="10" width="28" height="28" rx="1" style="fill:${node.color}"></rect>
              <text class="node-title" x="49" y="21">${node.label}</text>
              <text class="node-value" x="49" y="35">${node.value}</text>
            </g>
          `,
        )
        .join("")}
    </svg>
  `;

  lineageCanvas
    .querySelectorAll("[data-lineage-function]")
    .forEach((node) => {
      const openTrace = () => {
        activeDebugFunction = node.dataset.lineageFunction;
        activateTab("debug");
        renderDebug(result);
        document.querySelector(".workspace").scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
          block: "start",
        });
      };
      node.addEventListener("click", openTrace);
      node.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openTrace();
        }
      });
    });
}

function renderResult(result) {
  currentResult = result;
  applyCssVariables(result.tokens);
  renderLineage(result);
  renderPalette(result);
  renderStates(result);
  renderAdjustments(result);
  renderDebug(result);

  document.querySelector("#secondary-accent-use").hidden =
    !result.tokens.some(([, name]) => name === "secondary accent");
  document.querySelector("#decorative-accent-use").hidden =
    !result.tokens.some(([, name]) => name === "decorative accent");
  document.querySelector("#secondary-family-card").hidden =
    !result.tokens.some(([, name]) => name === "secondary accent");
  document.querySelector("#decorative-family-card").hidden =
    !result.tokens.some(([, name]) => name === "decorative accent");
  document.querySelector("#form-secondary-action").hidden =
    !result.tokens.some(([, name]) => name === "secondary accent");
  document.querySelector("#form-decorative-note").hidden =
    !result.tokens.some(([, name]) => name === "decorative accent");
  document.querySelector("#states-secondary-family").hidden =
    !result.tokens.some(([, name]) => name === "secondary accent");
  document.querySelector("#states-decorative-family").hidden =
    !result.tokens.some(([, name]) => name === "decorative accent");
  document.querySelector("#accent-context-grid").hidden =
    !result.tokens.some(
      ([, name]) =>
        name === "secondary accent" || name === "decorative accent",
    );

  resultTitle.textContent = `${titleForColor(result.input.primary)} · ${
    result.input.vibe[0].toUpperCase() + result.input.vibe.slice(1)
  }`;
  resultCount.textContent = `${result.tokens.length} roles`;
  debugCount.textContent = String(result.warnings.length);

  resultStatus.classList.toggle("has-warning", result.warnings.length > 0);
  resultStatus.lastChild.textContent =
    result.warnings.length > 0
      ? ` ${result.warnings.length} adjustment${result.warnings.length === 1 ? "" : "s"}`
      : " All checks pass";
}

function readInput() {
  const primary = normalizeHex(primaryInput.value);
  const secondaryRaw = document.querySelector("#secondary-color").value.trim();
  const additionalRaw = document
    .querySelector("#additional-color")
    .value.trim();
  const vibe = form.elements.vibe.value;

  if (!isHex(primary)) {
    primaryError.textContent = "Use a six-digit hex color, such as #FF0000.";
    primaryInput.setAttribute("aria-invalid", "true");
    return null;
  }

  for (const [label, value] of [
    ["Secondary", secondaryRaw],
    ["Additional", additionalRaw],
  ]) {
    if (value && !isHex(value)) {
      primaryError.textContent = `${label} must be a six-digit hex color.`;
      return null;
    }
  }

  primaryError.textContent = "";
  primaryInput.removeAttribute("aria-invalid");
  return {
    rawPrimary: primaryInput.value,
    primary,
    secondary: secondaryRaw ? normalizeHex(secondaryRaw) : null,
    additional: additionalRaw ? normalizeHex(additionalRaw) : null,
    vibe: VIBES[vibe] ? vibe : "balanced",
  };
}

function activateTab(name) {
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  tabs.forEach((tab) => {
    const selected = tab.id === `tab-${name}`;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    document.querySelector(`#panel-${tab.id.replace("tab-", "")}`).hidden =
      !selected;
  });
}

document.querySelectorAll('[role="tab"]').forEach((tab, index, tabs) => {
  tab.addEventListener("click", () => activateTab(tab.id.replace("tab-", "")));
  tab.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    let nextIndex = index;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft")
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabs.length - 1;
    tabs[nextIndex].focus();
    activateTab(tabs[nextIndex].id.replace("tab-", ""));
  });
});

primaryPicker.addEventListener("input", () => {
  primaryInput.value = primaryPicker.value.toUpperCase();
});

primaryInput.addEventListener("input", () => {
  if (isHex(primaryInput.value)) {
    primaryPicker.value = primaryInput.value;
    primaryError.textContent = "";
  }
});

function connectOptionalColorPicker(textInput, colorPicker) {
  colorPicker.addEventListener("input", () => {
    textInput.value = colorPicker.value.toUpperCase();
    colorPicker.classList.remove("is-empty");
  });

  textInput.addEventListener("input", () => {
    const value = textInput.value.trim();
    colorPicker.classList.toggle("is-empty", !value);
    if (isHex(value)) colorPicker.value = value;
  });
}

connectOptionalColorPicker(secondaryInput, secondaryPicker);
connectOptionalColorPicker(additionalInput, additionalPicker);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const input = readInput();
  if (!input) return;
  renderResult(generatePalette(input));
  document.querySelector(".workspace").scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
    block: "start",
  });
});

document.querySelector("#copy-output").addEventListener("click", async () => {
  if (!currentResult) return;
  const value = JSON.stringify(currentResult.tokens, null, 2);
  try {
    await navigator.clipboard.writeText(value);
    toast.textContent = "Output copied";
  } catch {
    toast.textContent = "Clipboard unavailable";
  }
  toast.classList.add("visible");
  window.setTimeout(() => toast.classList.remove("visible"), 1600);
});

const initialInput = readInput();
if (initialInput) renderResult(generatePalette(initialInput));
