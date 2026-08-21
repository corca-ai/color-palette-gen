import {
  hexToRgb,
  isHex,
  normalizeHex,
  oklchToHex,
  rgbToOklch,
} from "../lib/color-math.js";
import { generatePaletteV2 } from "./lib/palette.js";
import { V2_POLICY } from "./lib/policy.js";

const form = document.querySelector("#cap-demo-form");
const picker = document.querySelector("#cap-demo-picker");
const input = document.querySelector("#cap-demo-hex");
const error = document.querySelector("#cap-demo-error");
const pipeline = document.querySelector("#cap-pipeline");
const hueGrid = document.querySelector("#cap-hue-grid");
const gamutStrip = document.querySelector("#gamut-strip");
const PICKER_RENDER_DELAY_MS = 220;
let pickerRenderTimer;

function coordinateText({ l, c, h }) {
  return `L ${l.toFixed(3)} · C ${c.toFixed(3)} · H ${h.toFixed(1)}°`;
}

function colorStage({ label, note, hex, coordinates, tag }) {
  return `<article class="color-stage">
    <div class="stage-swatch" style="--stage-color:${hex}"></div>
    <small>${tag}</small><strong>${label}</strong><code>${hex}</code>
    <span>${coordinateText(coordinates)}</span><p>${note}</p>
  </article>`;
}

function renderCapPipeline(value) {
  const sourceHex = normalizeHex(value);
  const source = rgbToOklch(hexToRgb(sourceHex));
  const requestedC = Math.min(source.c, V2_POLICY.primary.chromaCap);
  const sameLightness = oklchToHex({ ...source, c: requestedC });
  const result = generatePaletteV2({ primary: sourceHex });
  const lightHex = result.modes.light.values.primary;
  const darkHex = result.modes.dark.values.primary;
  const light = { value: lightHex, oklch: rgbToOklch(hexToRgb(lightHex)) };
  const dark = { value: darkHex, oklch: rgbToOklch(hexToRgb(darkHex)) };
  const wasCapped = source.c > V2_POLICY.primary.chromaCap;

  pipeline.innerHTML = [
    colorStage({
      tag: "1 · PRESERVED",
      label: "Brand source",
      hex: sourceHex,
      coordinates: source,
      note: "입력 원본. export와 provenance에 그대로 남는다.",
    }),
    colorStage({
      tag: "2 · REQUESTED",
      label: wasCapped ? "Capped chroma" : "Source chroma retained",
      hex: sameLightness.hex,
      coordinates: sameLightness.color,
      note: wasCapped
        ? `source C ${source.c.toFixed(3)}에서 생성용 상한 ${V2_POLICY.primary.chromaCap.toFixed(2)}로 낮춘 같은-L 미리보기.`
        : `source C가 ${V2_POLICY.primary.chromaCap.toFixed(2)} 이하라 chroma를 줄이지 않았다.`,
    }),
    colorStage({
      tag: "3 · LIGHT MODE",
      label: "Generated Primary",
      hex: light.value,
      coordinates: light.oklch,
      note: "Light range에서 states와 shared label을 완성하고 source에 가장 가까운 후보.",
    }),
    colorStage({
      tag: "4 · DARK MODE",
      label: "Generated Primary",
      hex: dark.value,
      coordinates: dark.oklch,
      note: "Dark range에서 같은 전체 family 조건을 통과한 별도 후보.",
    }),
  ].join("");
}

function renderHueGrid() {
  hueGrid.innerHTML = Array.from({ length: 12 }, (_, index) => index * 30)
    .map((hue) => {
      const rendered = oklchToHex({ l: 0.62, c: 0.15, h: hue });
      return `<article><div style="--stage-color:${rendered.hex}"></div><strong>H ${hue}°</strong><span>${rendered.hex}</span><small>actual C ${rendered.color.c.toFixed(3)}${rendered.adjusted ? " · mapped" : ""}</small></article>`;
    })
    .join("");
}

function renderGamutStrip() {
  gamutStrip.innerHTML = [0.03, 0.08, 0.15, 0.22, 0.3]
    .map((chroma) => {
      const rendered = oklchToHex({ l: 0.62, c: chroma, h: 30 });
      const reduction = chroma - rendered.color.c;
      return `<article><div style="--stage-color:${rendered.hex}"></div><strong>requested C ${chroma.toFixed(2)}</strong><span>actual C ${rendered.color.c.toFixed(3)}</span><small>${rendered.adjusted ? `sRGB 밖 · −${reduction.toFixed(3)}` : "sRGB 안 · 변화 없음"}</small></article>`;
    })
    .join("");
}

function submit(value) {
  if (!isHex(value)) {
    error.textContent = "#RRGGBB 형식의 hex를 입력하세요.";
    return;
  }
  error.textContent = "";
  const normalized = normalizeHex(value);
  input.value = normalized;
  picker.value = normalized;
  renderCapPipeline(normalized);
}

function queuePickerRender(value) {
  const normalized = normalizeHex(value);
  input.value = normalized;
  error.textContent = "";
  clearTimeout(pickerRenderTimer);
  pickerRenderTimer = setTimeout(() => {
    pickerRenderTimer = undefined;
    renderCapPipeline(normalized);
  }, PICKER_RENDER_DELAY_MS);
}

function commitPickerValue(value) {
  clearTimeout(pickerRenderTimer);
  pickerRenderTimer = undefined;
  submit(value);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  clearTimeout(pickerRenderTimer);
  submit(input.value);
});
picker.addEventListener("input", () => queuePickerRender(picker.value));
picker.addEventListener("change", () => commitPickerValue(picker.value));

renderHueGrid();
renderGamutStrip();
renderCapPipeline(input.value);
