import { buildWarningAppearanceReviewCase } from "./lib/warning-appearance-review.js";
import { WARNING_APPEARANCE_INPUTS } from "./lib/warning-appearance-experiment.js";

const inputTabs = document.querySelector("#warning-input-tabs");
const comparison = document.querySelector("#warning-comparison");
const inputTitle = document.querySelector("#warning-input-title");
let activeInput = WARNING_APPEARANCE_INPUTS[0];

function number(value, digits = 3) {
  return Number(value).toFixed(digits);
}

function familyStrip(family) {
  return `<div class="warning-family-strip" aria-label="Default, Hover, Pressed">
    ${[
      ["Default", family.default],
      ["Hover", family.hover],
      ["Pressed", family.active],
    ]
      .map(
        ([label, color]) =>
          `<span style="--warning-fill:${color};--warning-text:${family.text}"><b>${label}</b><code>${color}</code></span>`,
      )
      .join("")}
  </div>`;
}

function armCard(arm, context) {
  const { family, rendered, candidates } = arm.inspection;
  return `<article class="warning-arm" data-arm="${arm.id}" style="--mode-background:${context.background};--mode-surface:${context.surface};--mode-muted:${context.mutedSurface};--mode-text:${context.foreground};--warning-default:${family.default};--warning-hover:${family.hover};--warning-active:${family.active};--warning-label:${family.text}">
    <header><div><small>${arm.shortLabel}</small><h3>${arm.label}</h3></div>${arm.id === "current" ? "<em>Production</em>" : arm.matchesCurrentRenderedFamily ? "<em>Same rendered result</em>" : "<em>Diagnostic</em>"}</header>
    <p class="arm-question">${arm.question}</p>
    <div class="warning-specimen">
      <div class="warning-copy"><i>!</i><span><strong>결제 정보를 확인해 주세요</strong><small>계속하기 전에 누락된 항목이 있습니다.</small></span></div>
      <button type="button">Review warning</button>
    </div>
    ${familyStrip(family)}
    <dl class="warning-metrics">
      <div><dt>실제 OKLCH</dt><dd>L ${number(rendered.oklch.l)} · C ${number(rendered.oklch.c)} · h ${number(rendered.oklch.h, 1)}°</dd></div>
      <div><dt>가장 약한 글자 대비</dt><dd>${number(rendered.minimumTextContrast, 2)}:1</dd></div>
      <div><dt>Primary / Destructive 거리</dt><dd>${number(rendered.primaryDistance)} / ${number(rendered.destructiveDistance)}</dd></div>
      <div><dt>통과 default 후보</dt><dd>${candidates.passing} / ${candidates.total}</dd></div>
    </dl>
  </article>`;
}

function render() {
  const result = buildWarningAppearanceReviewCase(activeInput);
  inputTitle.innerHTML = `<i style="--source:${activeInput}"></i><span><small>Original Primary</small><strong>${activeInput}</strong></span>`;
  comparison.innerHTML = result.arms
    .map((arm) => armCard(arm, result.context))
    .join("");
  for (const button of inputTabs.querySelectorAll("button")) {
    button.setAttribute(
      "aria-selected",
      String(button.dataset.input === activeInput),
    );
  }
}

for (const input of WARNING_APPEARANCE_INPUTS) {
  const button = document.createElement("button");
  button.type = "button";
  button.role = "tab";
  button.dataset.input = input;
  button.innerHTML = `<i style="--source:${input}"></i><span>${input}</span>`;
  button.addEventListener("click", () => {
    activeInput = input;
    render();
  });
  inputTabs.append(button);
}

render();
