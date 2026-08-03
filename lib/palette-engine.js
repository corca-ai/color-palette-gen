import { hexToRgb, isHex, normalizeHex, rgbToOklch } from "./color-math.js";
import { HARMONY_CANDIDATES, VIBES } from "./palette-config.js";
import { completeHarmonyColor, deriveHarmonyColor } from "./harmony.js";

export function resolvePaletteParams(
  vibeName = "balanced",
  harmonyId = "default",
) {
  const name = VIBES[vibeName] ? vibeName : "balanced";
  const candidates = HARMONY_CANDIDATES[name];
  const selected =
    candidates.find((candidate) => candidate.id === harmonyId) ?? candidates[0];
  return {
    ...VIBES[name],
    name,
    requestedVibe: vibeName,
    vibeDefaulted: name !== vibeName,
    harmony: selected.label.toLowerCase(),
    hueOffsets: selected.offsets,
    harmonyId: selected.id,
  };
}

function normalizeOptionalHex(value, fieldName) {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || !isHex(value)) {
    throw new TypeError(`${fieldName} must be a six-digit hex color.`);
  }
  return normalizeHex(value);
}

export function normalizePaletteInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("Palette input must be an object.");
  }

  if (typeof input.primary !== "string" || !isHex(input.primary)) {
    throw new TypeError("primary must be a six-digit hex color.");
  }

  const additionalColors =
    input.additionalColors ??
    (input.additional == null ? [] : [input.additional]);
  if (!Array.isArray(additionalColors)) {
    throw new TypeError("additionalColors must be an array of hex colors.");
  }

  const vibe =
    input.vibe == null || String(input.vibe).trim() === ""
      ? "balanced"
      : String(input.vibe).trim().toLowerCase();

  return {
    rawPrimary: input.rawPrimary ?? input.primary,
    primary: normalizeHex(input.primary),
    secondary: normalizeOptionalHex(input.secondary, "secondary"),
    additionalColors: additionalColors.map((color, index) => {
      if (typeof color !== "string" || !isHex(color)) {
        throw new TypeError(
          `additionalColors[${index}] must be a six-digit hex color.`,
        );
      }
      return normalizeHex(color);
    }),
    vibe,
    harmonyId:
      typeof input.harmonyId === "string" ? input.harmonyId : "default",
  };
}

export function resolveSupportingColors(input, primary, params) {
  const additionalInput =
    input.additionalColors?.[0] ?? input.additional ?? null;
  const secondary = input.secondary
    ? {
        hex: input.secondary,
        source: "user secondary",
        relation: null,
        isDerived: false,
      }
    : {
        ...deriveHarmonyColor(
          primary,
          params,
          params.hueOffsets[0],
          "secondary",
        ),
        isDerived: true,
      };

  const additional = additionalInput
    ? {
        hex: additionalInput,
        source: "user additional",
        relation: null,
        isDerived: false,
      }
    : {
        ...(input.secondary
          ? completeHarmonyColor(primary, input.secondary, params)
          : deriveHarmonyColor(
              primary,
              params,
              params.hueOffsets[1],
              "additional",
            )),
        isDerived: true,
      };

  return { secondary, additional };
}

export function resolvePaletteInput(input) {
  const normalizedInput = normalizePaletteInput(input);
  const params = resolvePaletteParams(
    normalizedInput.vibe,
    normalizedInput.harmonyId,
  );
  const primary = rgbToOklch(hexToRgb(normalizedInput.primary));
  return {
    input: normalizedInput,
    params,
    primary,
    supportingColors: resolveSupportingColors(normalizedInput, primary, params),
  };
}
