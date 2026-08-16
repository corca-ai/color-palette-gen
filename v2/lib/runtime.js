import {
  clamp,
  contrastRatio as rawContrastRatio,
  hexToRgb,
  oklchDifference,
  oklchToHex,
  rgbToOklch,
} from "../../lib/color-math.js";
import { apcaContrast as rawApcaContrast } from "./apca.js";
import { V2_POLICY } from "./policy.js";

const coordinateCache = new Map();
const contrastCache = new Map();
const apcaCache = new Map();
export const foundationCache = new Map();
export const paletteCache = new Map();

export function boundedSet(cache, key, value, limit = 5000) {
  if (cache.size >= limit) cache.clear();
  cache.set(key, value);
  return value;
}

export function contrastRatio(first, second) {
  const key = [first, second].sort().join("/");
  return (
    contrastCache.get(key) ??
    boundedSet(contrastCache, key, rawContrastRatio(first, second))
  );
}

export function apcaContrast(foreground, background) {
  const key = `${foreground}/${background}`;
  return (
    apcaCache.get(key) ??
    boundedSet(apcaCache, key, rawApcaContrast(foreground, background))
  );
}

export function classifyInput(input) {
  if (input.c < 0.015) return "achromatic";
  if (input.c < 0.06) return "subdued";
  return "chromatic";
}

export function hueDistance(first, second) {
  const value = Math.abs(first - second) % 360;
  return Math.min(value, 360 - value);
}

export function tone({ l, c, h }) {
  return oklchToHex({ l: clamp(l), c: Math.max(0, c), h }).hex;
}

export function candidate(hex, parameters = {}) {
  const coordinates =
    coordinateCache.get(hex) ??
    boundedSet(coordinateCache, hex, rgbToOklch(hexToRgb(hex)));
  return { hex, oklch: coordinates, parameters };
}

export function neutralTone(input, lightness, tintScale = 0) {
  const tint =
    input.classification === "achromatic"
      ? 0
      : Math.min(V2_POLICY.neutral.tintCap, input.brandChroma * tintScale);
  return tone({ l: lightness, c: tint, h: input.h });
}

export function neutralCandidate(input, lightness, tintScale) {
  return candidate(neutralTone(input, lightness, tintScale), {
    lightness,
    tintScale,
  });
}

export function brandTone(input, lightness, chromaScale = 1) {
  return tone({
    l: lightness,
    c: input.brandChroma * chromaScale,
    h: input.h,
  });
}

export function brandCandidate(input, lightness) {
  return candidate(brandTone(input, lightness), { lightness });
}

export function stateCandidate(base, lightness) {
  return candidate(tone({ l: lightness, c: base.oklch.c, h: base.oklch.h }), {
    lightness,
  });
}

export function destructiveTone(lightness, hue = 27) {
  return tone({ l: lightness, c: 0.19, h: hue });
}

export function chooseSharedText(backgrounds) {
  return ["#000000", "#FFFFFF"]
    .map((color) => ({
      color,
      minimum: Math.min(
        ...backgrounds.map((background) =>
          Math.abs(apcaContrast(color, background)),
        ),
      ),
    }))
    .sort((a, b) => b.minimum - a.minimum)[0].color;
}

export function distance(first, second) {
  return oklchDifference(first.oklch, second.oklch).deltaE;
}

export function bindRule(policy, group, id, evaluate) {
  const definition = policy[group].find((rule) => rule.id === id);
  if (!definition) throw new Error(`${policy.id} does not declare ${id}.`);
  return { definition, evaluate };
}

export function stableTieBreaker(policy) {
  return [
    bindRule(policy, "tieBreakers", "stable.hex-order", (item) => item.hex),
  ];
}
