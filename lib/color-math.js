export const SRGB_GAMUT_EPSILON = 1e-7;

export function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function isHex(value) {
  return /^#[0-9a-f]{6}$/i.test(value.trim());
}

export function normalizeHex(value) {
  return value.trim().toUpperCase();
}

export function hexToRgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return {
    r: ((value >> 16) & 255) / 255,
    g: ((value >> 8) & 255) / 255,
    b: (value & 255) / 255,
  };
}

export function rgbToHex({ r, g, b }) {
  const channel = (value) =>
    Math.round(clamp(value) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`.toUpperCase();
}

export function srgbToLinear(value) {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function linearToSrgb(value) {
  return value <= 0.0031308
    ? 12.92 * value
    : 1.055 * value ** (1 / 2.4) - 0.055;
}

export function rgbToOklch({ r, g, b }) {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const lRoot = Math.cbrt(l);
  const mRoot = Math.cbrt(m);
  const sRoot = Math.cbrt(s);

  const L = 0.2104542553 * lRoot + 0.793617785 * mRoot - 0.0040720468 * sRoot;
  const a = 1.9779984951 * lRoot - 2.428592205 * mRoot + 0.4505937099 * sRoot;
  const bValue =
    0.0259040371 * lRoot + 0.7827717662 * mRoot - 0.808675766 * sRoot;

  const C = Math.sqrt(a * a + bValue * bValue);
  let H = (Math.atan2(bValue, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { l: L, c: C, h: C < 0.0001 ? 0 : H };
}

export function oklchToRawRgb({ l, c, h }) {
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
      4.0767416621 * linearL - 3.3077115913 * linearM + 0.2309699292 * linearS,
    ),
    g: linearToSrgb(
      -1.2684380046 * linearL + 2.6097574011 * linearM - 0.3413193965 * linearS,
    ),
    b: linearToSrgb(
      -0.0041960863 * linearL - 0.7034186147 * linearM + 1.707614701 * linearS,
    ),
  };
}

export function inGamut(rgb, epsilon = SRGB_GAMUT_EPSILON) {
  return Object.values(rgb).every(
    (channel) => channel >= -epsilon && channel <= 1 + epsilon,
  );
}

export function mapToSrgb(color) {
  const raw = oklchToRawRgb(color);
  if (inGamut(raw)) {
    return {
      color,
      rgb: raw,
      adjusted: false,
      mapping: {
        sourceSpace: "srgb",
        chromaBefore: color.c,
        chromaAfter: color.c,
        chromaReduction: 0,
        chromaReductionRatio: 0,
        lightnessDelta: 0,
        hueDelta: 0,
      },
    };
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
  const chromaReduction = color.c - mapped.c;
  return {
    color: mapped,
    rgb: oklchToRawRgb(mapped),
    adjusted: true,
    mapping: {
      sourceSpace: "outside-srgb",
      chromaBefore: color.c,
      chromaAfter: mapped.c,
      chromaReduction,
      chromaReductionRatio: color.c === 0 ? 0 : chromaReduction / color.c,
      lightnessDelta: mapped.l - color.l,
      hueDelta: mapped.h - color.h,
    },
  };
}

export function oklchToHex(color) {
  const mapped = mapToSrgb(color);
  return { ...mapped, hex: rgbToHex(mapped.rgb) };
}

export function relativeLuminance(hex) {
  const rgb = hexToRgb(hex);
  return (
    0.2126 * srgbToLinear(rgb.r) +
    0.7152 * srgbToLinear(rgb.g) +
    0.0722 * srgbToLinear(rgb.b)
  );
}

export function contrastRatio(first, second) {
  const lum1 = relativeLuminance(first);
  const lum2 = relativeLuminance(second);
  return (Math.max(lum1, lum2) + 0.05) / (Math.min(lum1, lum2) + 0.05);
}

function minimumContrast(hex, backgrounds) {
  return Math.min(
    ...backgrounds.map((background) => contrastRatio(hex, background)),
  );
}

/**
 * Finds the smallest OKLCH lightness change that satisfies a contrast target.
 * Every candidate is gamut-mapped and rounded to the exported 8-bit sRGB value
 * before its contrast is evaluated.
 */
export function solveOklchContrast({
  color,
  against,
  target,
  direction = "nearest",
  minLightness = 0,
  maxLightness = 1,
}) {
  const backgrounds = Array.isArray(against) ? against : [against];
  if (!backgrounds.length || backgrounds.some((value) => !isHex(value))) {
    throw new TypeError(
      "solveOklchContrast requires one or more hex backgrounds",
    );
  }
  if (!(target >= 1 && Number.isFinite(target))) {
    throw new RangeError(
      "solveOklchContrast target must be a finite ratio of at least 1",
    );
  }

  const startLightness = clamp(color.l, minLightness, maxLightness);
  const evaluate = (lightness) => {
    const mapped = oklchToHex({ ...color, l: lightness });
    return {
      ...mapped,
      ratio: minimumContrast(mapped.hex, backgrounds),
      passed: minimumContrast(mapped.hex, backgrounds) >= target,
    };
  };
  const original = evaluate(startLightness);
  if (original.passed) {
    return {
      ...original,
      target,
      backgrounds,
      strategy: "unchanged",
      lightnessDelta: original.color.l - color.l,
    };
  }

  const searchDarker = () => {
    const endpoint = evaluate(minLightness);
    if (!endpoint.passed) return null;
    let passing = minLightness;
    let failing = startLightness;
    for (let index = 0; index < 32; index += 1) {
      const middle = (passing + failing) / 2;
      if (evaluate(middle).passed) passing = middle;
      else failing = middle;
    }
    return evaluate(passing);
  };
  const searchLighter = () => {
    const endpoint = evaluate(maxLightness);
    if (!endpoint.passed) return null;
    let failing = startLightness;
    let passing = maxLightness;
    for (let index = 0; index < 32; index += 1) {
      const middle = (failing + passing) / 2;
      if (evaluate(middle).passed) passing = middle;
      else failing = middle;
    }
    return evaluate(passing);
  };

  const candidates = [];
  if (direction !== "lighter") candidates.push(searchDarker());
  if (direction !== "darker") candidates.push(searchLighter());
  const selected = candidates
    .filter(Boolean)
    .sort(
      (first, second) =>
        Math.abs(first.color.l - startLightness) -
        Math.abs(second.color.l - startLightness),
    )[0];

  if (selected) {
    return {
      ...selected,
      target,
      backgrounds,
      strategy: "lightness",
      lightnessDelta: selected.color.l - color.l,
    };
  }

  const fallbacks = ["#000000", "#FFFFFF"]
    .map((hex) => ({ hex, ratio: minimumContrast(hex, backgrounds) }))
    .sort((first, second) => second.ratio - first.ratio);
  const fallback = fallbacks[0];
  const fallbackColor = rgbToOklch(hexToRgb(fallback.hex));
  const mapped = oklchToHex(fallbackColor);
  return {
    ...mapped,
    ratio: fallback.ratio,
    passed: fallback.ratio >= target,
    target,
    backgrounds,
    strategy: "neutral-fallback",
    lightnessDelta: fallbackColor.l - color.l,
  };
}

export function contrastLabel(ratio) {
  if (ratio >= 7) return "AAA";
  if (ratio >= 4.5) return "AA";
  return "Fail";
}

export function formatOklch(color) {
  return `oklch(${(color.l * 100).toFixed(1)}% ${color.c.toFixed(3)} ${color.h.toFixed(1)})`;
}
