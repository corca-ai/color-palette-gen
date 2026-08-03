import {
  contrastRatio,
  formatOklch,
  hexToRgb,
  rgbToOklch,
} from "./color-math.js";
import { hueDistance } from "./harmony.js";
import { CONTRAST_CONTRACTS } from "./palette-config.js";

function tokenMap(tokens) {
  return Object.fromEntries(
    tokens.map(([color, functionName]) => [functionName, color]),
  );
}

export function buildConstraintReport(result) {
  const tokens = tokenMap(result.tokens);
  const checks = [];
  const addCheck = (check) => checks.push(check);
  const addContrastContract = (contract) => {
    const target =
      result.input.vibe === "high contrast" && contract.highContrastTarget
        ? contract.highContrastTarget
        : contract.target;
    const ratios = contract.backgrounds.map((backgroundName) => ({
      backgroundName,
      ratio: contrastRatio(
        tokens[contract.foreground],
        tokens[backgroundName],
      ),
    }));
    const actual = Math.min(...ratios.map(({ ratio }) => ratio));
    addCheck({
      token: contract.foreground,
      category: "contrast",
      kind: contract.kind,
      label: contract.label,
      status: actual >= target ? "pass" : "fail",
      target: `≥ ${target.toFixed(1)}:1`,
      actual: `${actual.toFixed(2)}:1`,
      explanation: ratios
        .map(
          ({ backgroundName, ratio }) =>
            `${backgroundName} ${ratio.toFixed(2)}:1`,
        )
        .join(" · "),
    });
  };
  CONTRAST_CONTRACTS.forEach(addContrastContract);

  result.tokens.forEach(([, functionName]) => {
    const artifact = result.artifacts[functionName];
    const adjusted = artifact.diagnostic.adjusted;
    addCheck({
      token: functionName,
      category: "gamut",
      label: "sRGB output gamut",
      status: adjusted ? "adjusted" : "pass",
      target: "Inside sRGB",
      actual: adjusted ? "Passed after chroma reduction" : "Inside sRGB",
      explanation: adjusted
        ? `${formatOklch(artifact.candidate.value)} → ${formatOklch(artifact.output.srgb.oklch)}`
        : "No gamut correction was required.",
    });
  });

  const defaultOklch = rgbToOklch(hexToRgb(tokens["primary button default"]));
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
        actual < 0.005 ? "fail" : actual < target * 0.85 ? "adjusted" : "pass",
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
