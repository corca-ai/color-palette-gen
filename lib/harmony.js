import { clamp, hexToRgb, oklchToHex, rgbToOklch } from "./color-math.js";

export function hueDistance(first, second) {
  const difference = Math.abs(first - second) % 360;
  return Math.min(difference, 360 - difference);
}

export function signedHueDistance(from, to) {
  return ((to - from + 540) % 360) - 180;
}

function mappedHarmonyColor(primary, params, hue, chromaMultiplier = 1) {
  const l =
    params.name === "soft"
      ? clamp(primary.l + 0.06, 0.58, 0.78)
      : params.name === "high contrast"
        ? clamp(1 - primary.l * 0.38, 0.54, 0.74)
        : clamp(primary.l, 0.54, 0.72);
  const c =
    Math.min(0.24, Math.max(0.075, primary.c * params.derivedChromaScale)) *
    chromaMultiplier;
  return oklchToHex({ l, c, h: hue });
}

export function deriveHarmonyColor(primary, params, offset, role) {
  const targetHue = (primary.h + offset + 360) % 360;
  const mapped = mappedHarmonyColor(primary, params, targetHue);
  return {
    hex: mapped.hex,
    source: `${params.name} vibe · ${params.harmony}`,
    relation: `${offset > 0 ? "+" : ""}${offset}° from primary for ${role}`,
    edgeLabel: `${offset > 0 ? "+" : ""}${offset}°`,
    targetHue,
    derivationMode: "primary-template",
    oklch: mapped.color,
    adjusted: mapped.adjusted,
  };
}

export function completeHarmonyColor(primary, secondaryHex, params) {
  const secondary = rgbToOklch(hexToRgb(secondaryHex));
  const secondaryOffset = signedHueDistance(primary.h, secondary.h);
  const harmony = params.harmony;
  const idealOffsets = harmony.includes("monochromatic")
    ? [0]
    : harmony.includes("triadic")
      ? [120, 240]
      : harmony.includes("complementary") && !harmony.includes("split")
        ? [180]
        : params.hueOffsets;
  const relationError = Math.min(
    ...idealOffsets.map((offset) =>
      hueDistance(secondary.h, (primary.h + offset + 360) % 360),
    ),
  );
  let targetHue;
  let relation;
  let edgeLabel;
  let chromaMultiplier = 1;

  if (harmony.includes("monochromatic")) {
    targetHue = primary.h;
    chromaMultiplier = 0.62;
    relation = "Kept primary hue; the third role varies lightness and chroma.";
    edgeLabel = "same H · vary L/C";
  } else if (harmony.includes("analogous")) {
    const offset = -secondaryOffset;
    targetHue = (primary.h + offset + 360) % 360;
    relation = `Mirrored user secondary (${secondaryOffset >= 0 ? "+" : ""}${secondaryOffset.toFixed(1)}°) across primary.`;
    edgeLabel = `mirror ${offset >= 0 ? "+" : ""}${offset.toFixed(0)}°`;
  } else if (harmony.includes("triadic")) {
    const arms = [120, 240].map((offset) => ({
      offset,
      hue: (primary.h + offset) % 360,
    }));
    const occupied =
      hueDistance(secondary.h, arms[0].hue) <=
      hueDistance(secondary.h, arms[1].hue)
        ? 0
        : 1;
    const arm = arms[occupied === 0 ? 1 : 0];
    targetHue = arm.hue;
    edgeLabel = `complete ${signedHueDistance(primary.h, targetHue).toFixed(0)}°`;
    relation = `Used the triadic arm opposite the one nearest user secondary.`;
  } else if (harmony.includes("split complement")) {
    const arms = params.hueOffsets.map((offset) => ({
      offset,
      hue: (primary.h + offset + 360) % 360,
    }));
    const occupied =
      hueDistance(secondary.h, arms[0].hue) <=
      hueDistance(secondary.h, arms[1].hue)
        ? 0
        : 1;
    const arm = arms[occupied === 0 ? 1 : 0];
    targetHue = arm.hue;
    edgeLabel = `complete ${signedHueDistance(primary.h, targetHue).toFixed(0)}°`;
    relation = `Used the split arm opposite the one nearest user secondary.`;
  } else if (harmony.includes("complementary")) {
    targetHue = secondary.h;
    chromaMultiplier = 0.62;
    relation =
      "Reused secondary hue; the third role varies lightness and chroma.";
    edgeLabel = "reuse H · vary L/C";
  } else {
    const hues = params.hueOffsets.map(
      (offset) => (primary.h + offset + 360) % 360,
    );
    targetHue =
      hueDistance(secondary.h, hues[0]) > hueDistance(secondary.h, hues[1])
        ? hues[0]
        : hues[1];
    relation = "Selected the configured position furthest from user secondary.";
    edgeLabel = `complete ${signedHueDistance(primary.h, targetHue).toFixed(0)}°`;
  }

  const mapped = mappedHarmonyColor(
    primary,
    params,
    targetHue,
    chromaMultiplier,
  );
  return {
    hex: mapped.hex,
    source: `${params.name} vibe · ${params.harmony} · pair completion`,
    relation,
    edgeLabel,
    targetHue,
    derivationMode: "primary-secondary-completion",
    secondaryOffset,
    relationError,
    oklch: mapped.color,
    adjusted: mapped.adjusted,
  };
}
