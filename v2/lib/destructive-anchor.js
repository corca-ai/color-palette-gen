import { MODE_RECIPE } from "./roles.js";
import { hueDistance } from "./runtime.js";

export const DESTRUCTIVE_ANCHOR_STRATEGIES = Object.freeze({
  CURRENT_SOURCE_BAND: "current-source-band",
  FIXED_DEFAULT: "fixed-default-anchor",
});

export const DESTRUCTIVE_ANCHOR_POLICY = Object.freeze({
  redHue: 27,
  conflictRadiusDegrees: 38,
  comparison: "strictly-less-than",
  achromaticSourcesExcluded: true,
  anchors: Object.freeze(
    Object.fromEntries(
      Object.entries(MODE_RECIPE).map(([mode, recipe]) => [
        mode,
        Object.freeze({
          default: recipe.destructive,
          sourceBandAlternative: recipe.conflictingDestructive,
        }),
      ]),
    ),
  ),
});

export function destructiveAnchorDecision({
  input,
  mode,
  strategy = DESTRUCTIVE_ANCHOR_STRATEGIES.CURRENT_SOURCE_BAND,
}) {
  if (!Object.values(DESTRUCTIVE_ANCHOR_STRATEGIES).includes(strategy)) {
    throw new TypeError(
      `Unsupported destructive anchor strategy: ${strategy}.`,
    );
  }
  const recipe = MODE_RECIPE[mode];
  if (!recipe) throw new TypeError(`Unsupported mode: ${mode}.`);
  const sourceHueDistance = hueDistance(
    input.h,
    DESTRUCTIVE_ANCHOR_POLICY.redHue,
  );
  const sourceBandApplicable =
    input.classification !== "achromatic" &&
    sourceHueDistance < DESTRUCTIVE_ANCHOR_POLICY.conflictRadiusDegrees;
  const usesSourceBandAlternative =
    strategy === DESTRUCTIVE_ANCHOR_STRATEGIES.CURRENT_SOURCE_BAND &&
    sourceBandApplicable;
  return {
    strategy,
    sourceBandApplicable,
    sourceHueDistance,
    usesSourceBandAlternative,
    preferredLightness: usesSourceBandAlternative
      ? recipe.conflictingDestructive
      : recipe.destructive,
  };
}
