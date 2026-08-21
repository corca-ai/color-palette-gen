import {
  CONTEXTUAL_REVIEW_COHORTS,
  buildContextualDestructiveSeparationReviewCase,
  contextualReviewCohort,
} from "./lib/contextual-destructive-separation-review.js";

const cohortTabs = document.querySelector("#cohort-tabs");
const cohortDescription = document.querySelector("#cohort-description");
const casePicker = document.querySelector("#case-picker");
const comparison = document.querySelector("#comparison");
const caseTitle = document.querySelector("#case-title");
const sourceChip = document.querySelector("#source-chip");
const casePosition = document.querySelector("#case-position");
const previousCase = document.querySelector("#previous-case");
const nextCase = document.querySelector("#next-case");

let activeCohort = CONTEXTUAL_REVIEW_COHORTS.separation;
let activeIndex = 0;

function format(value, digits = 3) {
  return Number(value).toFixed(digits);
}

function stateRow(family) {
  return `<div class="state-row" aria-label="Default, Hover, Pressed colors">
    ${[
      ["Default", family.default],
      ["Hover", family.hover],
      ["Pressed", family.active],
    ]
      .map(
        ([label, color]) =>
          `<span style="--state-color:${color};--state-text:${family.text}"><i>${label}</i><code>${color}</code></span>`,
      )
      .join("")}
  </div>`;
}

function actionSpecimen(title, family, kind) {
  const label = kind === "primary" ? "Continue" : "Delete project";
  return `<article class="action-specimen">
    <header><span>${title}</span><strong>${family.direction.id}</strong></header>
    <button class="live-action ${kind}" type="button" style="--action-default:${family.default};--action-hover:${family.hover};--action-active:${family.active};--action-text:${family.text}">${label}</button>
    ${stateRow(family)}
    <p>L ${family.direction.levels.map((value) => format(value)).join(" → ")} · text ${family.text}</p>
  </article>`;
}

function verdict(label, evidence, valueLabel = "ΔE") {
  return `<div class="metric ${evidence.pass ? "pass" : "warn"}">
    <span>${label}</span>
    <strong>${format(evidence.value)} <small>/ ${format(evidence.target)} ${valueLabel}</small></strong>
    <em>${evidence.pass ? "passes current review" : "review warning retained"}</em>
  </div>`;
}

function armCard(arm, mode) {
  const evidence = arm.modes[mode];
  const style = Object.entries(evidence.values)
    .filter(([role]) => ["background", "surface", "foreground"].includes(role))
    .map(([role, value]) => `--mode-${role.replaceAll(" ", "-")}:${value}`)
    .join(";");
  return `<article class="arm-card ${arm.id}" style="${style}">
    <header class="arm-title">
      <div><span>${arm.label}</span><strong>${mode}</strong></div>
      <code>${arm.policyVersion}${arm.id === "candidate" ? " · adopted" : " · historical replay"}</code>
    </header>
    <div class="resting-pair">
      ${actionSpecimen("Routine Primary", evidence.primary, "primary")}
      ${actionSpecimen("Destructive confirmation", evidence.destructive, "destructive")}
    </div>
    <div class="metric-grid">
      ${verdict("Primary ↔ Destructive", evidence.separation)}
      ${verdict("Primary ↔ source", evidence.sourceFidelity)}
    </div>
    <details>
      <summary>자동 검토 범위 보기</summary>
      <dl>
        <div><dt>Mode contracts</dt><dd>${evidence.contractsPassed ? "pass" : "fail"}</dd></div>
        <div><dt>Result contracts</dt><dd>${arm.contractsPassed ? "pass" : "fail"}</dd></div>
        <div><dt>Quality review</dt><dd>${arm.qualityReviewPassed ? "pass" : "has findings"}</dd></div>
        <div><dt>Semantic model</dt><dd>${arm.semanticModelSatisfied ? "satisfied" : "unsatisfied"}</dd></div>
      </dl>
    </details>
  </article>`;
}

function modeComparison(result, mode) {
  return `<section class="mode-comparison ${mode}">
    <header><span>${mode === "light" ? "Light mode · secondary check" : "Dark mode · primary comparison"}</span><p>${mode === "light" ? "Both versions darken; v16 moves separation from generation eligibility to retained review." : "Adopted v16 families become lighter; previous v15 families became darker."}</p></header>
    <div>${armCard(result.current, mode)}${armCard(result.candidate, mode)}</div>
  </section>`;
}

function renderCase() {
  const input = activeCohort.inputs[activeIndex];
  comparison.setAttribute("aria-busy", "true");
  const result = buildContextualDestructiveSeparationReviewCase(input);
  caseTitle.textContent = `${input} 결과 비교`;
  sourceChip.innerHTML = `<i style="--source:${input}"></i><span><small>Original input</small><strong>${input}</strong></span>`;
  casePosition.textContent = `${activeIndex + 1} / ${activeCohort.inputs.length}`;
  const lightSeparationRegression =
    result.current.modes.light.separation.pass &&
    !result.candidate.modes.light.separation.pass;
  comparison.innerHTML = `${modeComparison(result, "dark")}${
    lightSeparationRegression
      ? `<details class="light-secondary"><summary>이 입력은 Light에서도 새 분리 경고가 있다 · 보조 비교 열기</summary>${modeComparison(result, "light")}</details>`
      : '<p class="light-omission">Light에는 이 실험으로 새로 생긴 분리 경고가 없어 비교에서 제외했다.</p>'
  }`;
  comparison.setAttribute("aria-busy", "false");
  for (const button of casePicker.querySelectorAll("button")) {
    button.setAttribute(
      "aria-selected",
      String(button.dataset.input === input),
    );
  }
}

function renderPicker() {
  cohortDescription.textContent = activeCohort.description;
  casePicker.innerHTML = activeCohort.inputs
    .map(
      (input) =>
        `<button type="button" role="option" data-input="${input}" aria-selected="false"><i style="--case-color:${input}"></i><span>${input}</span></button>`,
    )
    .join("");
  for (const button of casePicker.querySelectorAll("button")) {
    button.addEventListener("click", () => {
      activeIndex = activeCohort.inputs.indexOf(button.dataset.input);
      renderCase();
    });
  }
  renderCase();
}

for (const cohort of Object.values(CONTEXTUAL_REVIEW_COHORTS)) {
  const button = document.createElement("button");
  button.type = "button";
  button.role = "tab";
  button.dataset.cohort = cohort.id;
  button.innerHTML = `<strong>${cohort.label}</strong><span>${cohort.inputs.length} inputs</span>`;
  button.addEventListener("click", () => {
    activeCohort = contextualReviewCohort(cohort.id);
    activeIndex = 0;
    for (const tab of cohortTabs.querySelectorAll("button")) {
      tab.setAttribute(
        "aria-selected",
        String(tab.dataset.cohort === cohort.id),
      );
    }
    renderPicker();
  });
  cohortTabs.append(button);
}

previousCase.addEventListener("click", () => {
  activeIndex =
    (activeIndex - 1 + activeCohort.inputs.length) % activeCohort.inputs.length;
  renderCase();
});
nextCase.addEventListener("click", () => {
  activeIndex = (activeIndex + 1) % activeCohort.inputs.length;
  renderCase();
});

cohortTabs.querySelector("button").click();
