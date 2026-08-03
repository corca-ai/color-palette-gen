import {
  contrastRatio,
  hexToRgb,
  rgbToOklch,
} from "./color-math.js";
import { hueDistance } from "./harmony.js";

function tokenMap(tokens) {
  return Object.fromEntries(
    tokens.map(([color, functionName]) => [functionName, color]),
  );
}

export function buildConstraintReport(result) {
  const tokens = tokenMap(result.tokens);
  const checks = [];
  const addCheck = (check) => checks.push(check);
  const addContrastCheck = (
    token,
    foreground,
    background,
    target,
    label,
  ) => {
    const actual = contrastRatio(foreground, background);
    addCheck({
      token,
      category: "contrast",
      label,
      status: actual >= target ? "pass" : "fail",
      target: `≥ ${target.toFixed(1)}:1`,
      actual: `${actual.toFixed(2)}:1`,
      explanation: `${foreground} against ${background}`,
    });
  };

  addContrastCheck(
    "main text",
    tokens["main text"],
    tokens.background,
    result.input.vibe === "high contrast" ? 10.5 : 8,
    "Primary reading contrast",
  );
  addContrastCheck(
    "secondary text",
    tokens["secondary text"],
    tokens.background,
    result.input.vibe === "high contrast" ? 7 : 4.7,
    "Secondary reading contrast",
  );
  addContrastCheck(
    "focus ring",
    tokens["focus ring"],
    tokens.background,
    3,
    "Focus indicator contrast",
  );

  const buttonBackgrounds = [
    tokens["primary button default"],
    tokens["primary button hover"],
    tokens["primary button active"],
  ];
  const buttonRatios = buttonBackgrounds.map((background) =>
    contrastRatio(tokens["primary button text"], background),
  );
  const buttonMinimum = Math.min(...buttonRatios);
  addCheck({
    token: "primary button text",
    category: "contrast",
    label: "Shared button text contrast",
    status: buttonMinimum >= 4.5 ? "pass" : "fail",
    target: "≥ 4.5:1 in every state",
    actual: `${buttonMinimum.toFixed(2)}:1 minimum`,
    explanation: buttonRatios
      .map(
        (ratio, index) =>
          `${["default", "hover", "active"][index]} ${ratio.toFixed(2)}:1`,
      )
      .join(" · "),
  });

  [
    ["secondary accent text", "secondary accent soft"],
    ["decorative accent text", "decorative accent soft"],
  ].forEach(([foregroundName, backgroundName]) => {
    if (!tokens[foregroundName] || !tokens[backgroundName]) return;
    addContrastCheck(
      foregroundName,
      tokens[foregroundName],
      tokens[backgroundName],
      4.5,
      "Accent text contrast",
    );
  });

  result.tokens.forEach(([, functionName]) => {
    const gamutStep = result.traces[functionName]?.steps.find(
      (step) => step.stage === "gamut",
    );
    const adjusted = Boolean(
      gamutStep && /reduced chroma/i.test(gamutStep.message),
    );
    addCheck({
      token: functionName,
      category: "gamut",
      label: "sRGB output gamut",
      status: adjusted ? "adjusted" : "pass",
      target: "Inside sRGB",
      actual: adjusted ? "Passed after chroma reduction" : "Inside sRGB",
      explanation: adjusted
        ? `${gamutStep.before} → ${gamutStep.after}`
        : "No gamut correction was required.",
    });
  });

  const defaultOklch = rgbToOklch(
    hexToRgb(tokens["primary button default"]),
  );
  [
    ["primary button hover", 0.62],
    ["primary button active", 1],
  ].forEach(([functionName, multiplier]) => {
    const stateOklch = rgbToOklch(hexToRgb(tokens[functionName]));
    const actual = Math.abs(stateOklch.l - defaultOklch.l);
    const target = result.params.stateLightnessStep * multiplier;
    addCheck({
      token: functionName,
      category: "state",
      label: "Interaction lightness step",
      status:
        actual < 0.005
          ? "fail"
          : actual < target * 0.85
            ? "adjusted"
            : "pass",
      target: `ΔL ${target.toFixed(3)}`,
      actual: `ΔL ${actual.toFixed(3)}`,
      explanation:
        actual < target * 0.85
          ? "The requested vibe step was reduced to preserve one readable button foreground."
          : "Hue is preserved while lightness creates the interaction distinction.",
    });
  });

  [
    ["secondary accent", "secondary"],
    ["decorative accent", "additional"],
  ].forEach(([tokenName, sourceName]) => {
    const source = result.supportingColors[sourceName];
    if (!source || !tokens[tokenName]) return;
    const actualHue = rgbToOklch(hexToRgb(tokens[tokenName])).h;
    const expectedHue = source.isDerived
      ? source.targetHue
      : rgbToOklch(hexToRgb(source.hex)).h;
    const difference = hueDistance(actualHue, expectedHue);
    addCheck({
      token: tokenName,
      category: "relation",
      label: source.isDerived
        ? `${result.params.harmony} hue relation`
        : "User color preservation",
      status: difference <= 1.5 ? "pass" : "fail",
      target: source.isDerived
        ? `H ${expectedHue.toFixed(1)}° · ${source.edgeLabel}`
        : `Preserve H ${expectedHue.toFixed(1)}°`,
      actual: `H ${actualHue.toFixed(1)}°`,
      explanation: source.isDerived
        ? `${source.relation} Gamut mapping may only reduce chroma.`
        : "Explicit user input takes priority over the automatic harmony candidate.",
    });
  });

  const completedAdditional = result.supportingColors.additional;
  if (
    result.input.secondary &&
    completedAdditional.derivationMode === "primary-secondary-completion"
  ) {
    const error = completedAdditional.relationError;
    addCheck({
      token: "secondary accent",
      category: "relation",
      label: "User pair harmony fit",
      status: error <= 15 ? "pass" : "adjusted",
      target: "≤ 15° from a selected harmony arm",
      actual: `${error.toFixed(1)}° deviation`,
      explanation:
        error <= 15
          ? "The supplied secondary already fits the selected hue relationship."
          : "The supplied secondary is preserved. Additional completes the nearest valid side, but the overall relationship is reported as relaxed.",
    });
  }

  return { checks };
}
