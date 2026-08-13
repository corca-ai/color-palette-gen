import { hexToRgb, srgbToLinear } from "../../lib/color-math.js";

const degrees = (radians) => (radians * 180) / Math.PI;
const radians = (value) => (value * Math.PI) / 180;

export function hexToLab(hex) {
  const { r, g, b } = hexToRgb(hex);
  const linear = [r, g, b].map(srgbToLinear);
  const x =
    (0.4124564 * linear[0] + 0.3575761 * linear[1] + 0.1804375 * linear[2]) /
    0.95047;
  const y =
    0.2126729 * linear[0] + 0.7151522 * linear[1] + 0.072175 * linear[2];
  const z =
    (0.0193339 * linear[0] + 0.119192 * linear[1] + 0.9503041 * linear[2]) /
    1.08883;
  const transform = (value) =>
    value > 216 / 24389 ? Math.cbrt(value) : (841 / 108) * value + 4 / 29;
  const fx = transform(x);
  const fy = transform(y);
  const fz = transform(z);
  return { l: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

// ISO/CIE 11664-6 CIEDE2000 with unit parametric factors.
export function ciede2000(first, second) {
  const c1 = Math.hypot(first.a, first.b);
  const c2 = Math.hypot(second.a, second.b);
  const meanC = (c1 + c2) / 2;
  const g = 0.5 * (1 - Math.sqrt(meanC ** 7 / (meanC ** 7 + 25 ** 7)));
  const a1 = (1 + g) * first.a;
  const a2 = (1 + g) * second.a;
  const adjustedC1 = Math.hypot(a1, first.b);
  const adjustedC2 = Math.hypot(a2, second.b);
  const hue = (a, b) => {
    const value = degrees(Math.atan2(b, a));
    return value < 0 ? value + 360 : value;
  };
  const h1 = hue(a1, first.b);
  const h2 = hue(a2, second.b);
  const deltaL = second.l - first.l;
  const deltaC = adjustedC2 - adjustedC1;
  let deltaH = h2 - h1;
  if (adjustedC1 * adjustedC2 === 0) deltaH = 0;
  else if (deltaH > 180) deltaH -= 360;
  else if (deltaH < -180) deltaH += 360;
  const deltaBigH =
    2 * Math.sqrt(adjustedC1 * adjustedC2) * Math.sin(radians(deltaH / 2));
  const meanL = (first.l + second.l) / 2;
  const adjustedMeanC = (adjustedC1 + adjustedC2) / 2;
  let meanH = h1 + h2;
  if (adjustedC1 * adjustedC2 === 0) meanH = h1 + h2;
  else if (Math.abs(h1 - h2) <= 180) meanH /= 2;
  else if (meanH < 360) meanH = (meanH + 360) / 2;
  else meanH = (meanH - 360) / 2;
  const t =
    1 -
    0.17 * Math.cos(radians(meanH - 30)) +
    0.24 * Math.cos(radians(2 * meanH)) +
    0.32 * Math.cos(radians(3 * meanH + 6)) -
    0.2 * Math.cos(radians(4 * meanH - 63));
  const sl =
    1 + (0.015 * (meanL - 50) ** 2) / Math.sqrt(20 + (meanL - 50) ** 2);
  const sc = 1 + 0.045 * adjustedMeanC;
  const sh = 1 + 0.015 * adjustedMeanC * t;
  const rotation = 30 * Math.exp(-(((meanH - 275) / 25) ** 2));
  const rc = 2 * Math.sqrt(adjustedMeanC ** 7 / (adjustedMeanC ** 7 + 25 ** 7));
  const rt = -rc * Math.sin(radians(2 * rotation));
  const l = deltaL / sl;
  const c = deltaC / sc;
  const h = deltaBigH / sh;
  return Math.sqrt(l * l + c * c + h * h + rt * c * h);
}

export function hexCiede2000(first, second) {
  return ciede2000(hexToLab(first), hexToLab(second));
}
