import {
  contrastRatio,
  formatOklch,
  hexToRgb,
  inGamut,
  oklchDifference,
  oklchToHex,
  oklchToRawRgb,
  rgbToOklch,
} from "./color-math.js";
import { hueDistance } from "./harmony.js";
import { CONTRAST_CONTRACTS } from "./palette-config.js";

function maxSrgbChroma({ l, h }) {
  let low = 0;
  let high = 0.5;
  for (let index = 0; index < 26; index += 1) {
    const mid = (low + high) / 2;
    if (inGamut(oklchToRawRgb({ l, c: mid, h }))) low = mid;
    else high = mid;
  }
  return low;
}

function tokenMap(tokens) {
  return Object.fromEntries(
    tokens.map(([color, functionName]) => [functionName, color]),
  );
}

function contrastDecision(result, contract, tokens, target) {
  const selectedRoles = new Set([
    "primary button text",
    "secondary accent on-color",
    "decorative accent on-color",
  ]);
  const resolvedHex = tokens[contract.foreground];
  if (selectedRoles.has(contract.foreground)) {
    const choices = ["#FFFFFF", "#000000"].map((color) => ({
      color,
      value: Math.min(
        ...contract.backgrounds.map((background) =>
          contrastRatio(color, tokens[background]),
        ),
      ),
    }));
    return {
      mode: "selected",
      intent: contract.usage,
      candidate: { label: `${choices.length} permitted foregrounds` },
      resolved: {
        label: resolvedHex,
        color: resolvedHex,
        value: Math.min(
          ...choices
            .filter(({ color }) => color === resolvedHex)
            .map(({ value }) => value),
        ),
      },
      choices,
      changed: false,
      axis: "Discrete black / white choice",
      lockedAxes: [],
      optimization:
        "Select the permitted foreground with the strongest worst-case contrast.",
    };
  }

  const artifact = result.artifacts[contract.foreground];
  const candidateColor = artifact.candidate.value;
  const candidateHex = oklchToHex(candidateColor).hex;
  const outputColor = artifact.output.srgb.oklch;
  const delta = oklchDifference(candidateColor, outputColor);
  const candidateRatio = Math.min(
    ...contract.backgrounds.map((background) =>
      contrastRatio(candidateHex, tokens[background]),
    ),
  );
  return {
    mode: "solved",
    intent: contract.usage,
    candidate: {
      label: candidateHex,
      color: candidateHex,
      value: candidateRatio,
    },
    resolved: {
      label: resolvedHex,
      color: resolvedHex,
      value: Math.min(
        ...contract.backgrounds.map((background) =>
          contrastRatio(resolvedHex, tokens[background]),
        ),
      ),
    },
    changed: candidateHex !== resolvedHex,
    axis: "OKLCH lightness",
    lockedAxes: ["C", "H"],
    delta,
    optimization: `Find the nearest exported sRGB color reaching at least ${target.toFixed(1)}:1.`,
    solutions: artifact.diagnostic.contrast?.solutions ?? [],
  };
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
      ratio: contrastRatio(tokens[contract.foreground], tokens[backgroundName]),
    }));
    const actual = Math.min(...ratios.map(({ ratio }) => ratio));
    const limitingBackground = ratios.reduce((lowest, current) =>
      current.ratio < lowest.ratio ? current : lowest,
    ).backgroundName;
    addCheck({
      token: contract.foreground,
      category: "contrast",
      kind: contract.kind,
      label: contract.label,
      usage: contract.usage,
      decision: contrastDecision(result, contract, tokens, target),
      status: actual >= target ? "pass" : "fail",
      target: `≥ ${target.toFixed(1)}:1`,
      actual: `${actual.toFixed(2)}:1`,
      metrics: {
        actual,
        target,
        limitingBackground,
        pairs: ratios.map(({ backgroundName, ratio }) => ({
          backgroundName,
          background: tokens[backgroundName],
          foreground: tokens[contract.foreground],
          ratio,
        })),
      },
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
      decision: {
        mode: adjusted ? "mapped" : "validated",
        intent:
          "Export a valid sRGB color without changing its intended hue or lightness.",
        candidate: {
          label: formatOklch(artifact.candidate.value),
        },
        resolved: {
          label: artifact.output.srgb.hex,
          color: artifact.output.srgb.hex,
        },
        changed: adjusted,
        axis: adjusted ? "OKLCH chroma" : "No color change",
        lockedAxes: ["L", "H"],
        delta: oklchDifference(
          artifact.candidate.value,
          artifact.output.srgb.oklch,
        ),
        optimization: adjusted
          ? "Reduce chroma only until the color reaches the sRGB boundary."
          : "Validate the candidate; no correction is applied.",
      },
      metrics: {
        candidate: artifact.candidate.value,
        output: artifact.output.srgb.oklch,
        boundary: maxSrgbChroma(artifact.candidate.value),
      },
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
    const difference = oklchDifference(defaultOklch, stateOklch);
    const actual = Math.abs(difference.deltaL);
    const target = result.params.stateLightnessStep * multiplier;
    addCheck({
      token: functionName,
      category: "state",
      label: "Interaction lightness step",
      status:
        actual < 0.005 ? "fail" : actual < target * 0.85 ? "adjusted" : "pass",
      target: `ΔL ${target.toFixed(3)}`,
      actual: `ΔE ${difference.deltaE.toFixed(3)} · ΔL ${difference.deltaL.toFixed(3)} · ΔC ${difference.deltaC.toFixed(3)} · ΔH ${difference.deltaH.toFixed(1)}°`,
      decision: {
        mode: "heuristic",
        intent: `${result.params.name} requests a visible interaction-state step.`,
        candidate: { label: `Requested ΔL ${target.toFixed(3)}` },
        resolved: {
          label: `${tokens[functionName]} · actual ΔL ${actual.toFixed(3)}`,
          color: tokens[functionName],
        },
        changed: actual < target * 0.999,
        axis: "OKLCH lightness",
        lockedAxes: ["H"],
        delta: difference,
        optimization:
          "Apply the vibe step, reducing it only when a shared readable button foreground requires relaxation.",
      },
      metrics: difference,
      targetValue: target,
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
      decision: {
        mode: "validated",
        intent: source.isDerived
          ? `Preserve the ${result.params.harmony} placement rule.`
          : "Preserve the explicit user hue.",
        candidate: { label: `Target H ${expectedHue.toFixed(1)}°` },
        resolved: {
          label: `${tokens[tokenName]} · H ${actualHue.toFixed(1)}°`,
          color: tokens[tokenName],
        },
        changed: false,
        axis: "Hue relationship check",
        lockedAxes: [],
        optimization:
          "Validate the resolved hue; this check does not modify the color.",
      },
      metrics: {
        actualHue,
        targetHue: expectedHue,
        tolerance: 1.5,
        deviation: difference,
      },
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
      token: "decorative accent",
      category: "relation",
      label: "User pair harmony fit",
      status: error <= 15 ? "pass" : "adjusted",
      target: "≤ 15° from a selected harmony arm",
      actual: `${error.toFixed(1)}° deviation`,
      decision: {
        mode: "validated",
        intent:
          "Measure the user-supplied pair against the selected harmony arms.",
        candidate: {
          label: `Target H ${completedAdditional.targetHue.toFixed(1)}°`,
        },
        resolved: {
          label: `${tokens["decorative accent"]} · ${error.toFixed(1)}° deviation`,
          color: tokens["decorative accent"],
        },
        changed: false,
        axis: "Hue relationship check",
        lockedAxes: [],
        optimization: "Report the fit without overriding explicit user input.",
      },
      metrics: {
        actualHue: rgbToOklch(hexToRgb(tokens["decorative accent"])).h,
        targetHue: completedAdditional.targetHue,
        tolerance: 15,
        deviation: error,
      },
      explanation:
        error <= 15
          ? "The supplied secondary already fits the selected hue relationship."
          : "The supplied secondary is preserved. Additional completes the nearest valid side, but the overall relationship is reported as relaxed.",
    });
  }

  return { checks };
}
