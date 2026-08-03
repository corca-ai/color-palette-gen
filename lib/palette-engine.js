import { hexToRgb, rgbToOklch } from "./color-math.js";
import { HARMONY_CANDIDATES, VIBES } from "./palette-config.js";
import { completeHarmonyColor, deriveHarmonyColor } from "./harmony.js";

export function resolvePaletteParams(vibeName, harmonyId = "default") {
  const name = VIBES[vibeName] ? vibeName : "balanced";
  const candidates = HARMONY_CANDIDATES[name];
  const selected =
    candidates.find((candidate) => candidate.id === harmonyId) ??
    candidates[0];
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

export function resolveSupportingColors(input, primary, params) {
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

  const additional = input.additional
    ? {
        hex: input.additional,
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
  const params = resolvePaletteParams(input.vibe, input.harmonyId);
  const primary = rgbToOklch(hexToRgb(input.primary));
  return {
    params,
    primary,
    supportingColors: resolveSupportingColors(input, primary, params),
  };
}
