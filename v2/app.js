import { isHex, normalizeHex } from "../lib/color-math.js";
import { generatePaletteV2, serializeModeCss } from "./lib/palette.js";
import { serializeReferenceTokens } from "./lib/reference-export.js";
import { EVALUATION_INPUTS } from "./lib/evaluation-inputs.js";
import {
  loadEvaluationRecords,
  loadHoverEvaluationRecords,
  saveEvaluationRecords,
  saveHoverEvaluationRecords,
} from "./lib/evaluation-store.js";
import {
  HOVER_EVALUATION_SCHEMA,
  HOVER_SPECIMEN,
  hoverEvaluationEvidence,
  hoverEvaluationKey,
  normalizeHoverEvaluation,
} from "./lib/hover-evaluation.js";
import { createPaletteRuntime } from "./lib/palette-runtime.js";
import {
  evaluatePrimaryActionSemantics,
  formatSemanticCounts,
} from "./lib/semantic-model.js";
import {
  appliedExampleView,
  colorCoordinates,
  escapeHtml,
  paletteView,
} from "./lib/view.js";

const form = document.querySelector("#v2-form");
const picker = document.querySelector("#v2-picker");
const primaryInput = document.querySelector("#v2-primary");
const error = document.querySelector("#v2-error");
const palettes = document.querySelector("#palettes");
const examples = document.querySelector("#examples");
const relationships = document.querySelector("#relationships");
const checks = document.querySelector("#checks");
const quality = document.querySelector("#quality");
const gallery = document.querySelector("#gallery");
const galleryPanel = document.querySelector("#gallery-panel");
const sourceAlternatives = document.querySelector("#source-alternatives");
const ratingsFile = document.querySelector("#ratings-file");
const foundationMap = document.querySelector("#foundation-map");
const focusSpecimens = document.querySelector("#focus-specimens");
const paletteTitle = document.querySelector("#palette-title");
const validationSummary = document.querySelector("#validation-summary");
const toast = document.querySelector("#toast");
const calculationStatus = document.querySelector("#calculation-status");
const semanticMap = document.querySelector("#semantic-map");
const modeButtons = [...document.querySelectorAll("[data-result-mode]")];
let currentResult;
const RESULT_MODE_STORAGE_KEY = "color-lab-v2-result-mode";
let storedResultMode;
try {
  storedResultMode = localStorage.getItem(RESULT_MODE_STORAGE_KEY);
} catch {
  storedResultMode = null;
}
let resultMode = ["light", "dark", "compare"].includes(storedResultMode)
  ? storedResultMode
  : "light";
const paletteRuntime = createPaletteRuntime();
const FOUNDATION_ROLES = [
  "background",
  "surface",
  "raised surface",
  "muted surface",
  "border",
  "input border",
];
const galleryResults = new Map();
let evaluationRecords = loadEvaluationRecords();
let hoverEvaluationRecords = loadHoverEvaluationRecords();

function currentHoverEvaluation() {
  if (!currentResult) return null;
  return normalizeHoverEvaluation(
    hoverEvaluationRecords[
      hoverEvaluationKey(
        currentResult.input.primary,
        currentResult.policyVersion,
      )
    ],
  );
}

function visibleModes() {
  return resultMode === "compare" ? ["light", "dark"] : [resultMode];
}

function syncResultMode() {
  document.body.dataset.resultMode = resultMode;
  for (const button of modeButtons) {
    const selected = button.dataset.resultMode === resultMode;
    button.setAttribute("aria-pressed", String(selected));
  }
}

function renderPalettes() {
  palettes.innerHTML = visibleModes()
    .map((mode) => paletteView(currentResult.modes[mode]))
    .join("");
}

function renderExamples() {
  const review = currentHoverEvaluation();
  examples.innerHTML = visibleModes()
    .map((mode) =>
      appliedExampleView(currentResult.modes[mode], review?.modes[mode]),
    )
    .join("");

  for (const button of examples.querySelectorAll(".reference-primary-demo")) {
    const output = button.parentElement.querySelector("output");
    const state = {
      focused: false,
      pointerInside: false,
      pressed: false,
      saved: false,
    };
    const renderState = () => {
      output.value = state.pressed
        ? "Pressed"
        : state.saved
          ? "Saved"
          : state.pointerInside
            ? "Hover"
            : state.focused
              ? "Focus"
              : "Default";
    };
    button.addEventListener("pointerenter", () => {
      state.pointerInside = true;
      state.saved = false;
      renderState();
    });
    button.addEventListener("pointerleave", () => {
      state.pointerInside = false;
      state.pressed = false;
      renderState();
    });
    button.addEventListener("pointerdown", () => {
      state.pressed = true;
      state.saved = false;
      renderState();
    });
    button.addEventListener("pointerup", () => {
      state.pressed = false;
      renderState();
    });
    button.addEventListener("focus", () => {
      state.focused = true;
      renderState();
    });
    button.addEventListener("blur", () => {
      state.focused = false;
      state.pressed = false;
      state.saved = false;
      renderState();
    });
    button.addEventListener("keydown", (event) => {
      if (event.key === " " || event.key === "Enter") {
        state.pressed = true;
        state.saved = false;
        renderState();
      }
    });
    button.addEventListener("keyup", (event) => {
      if (event.key === " " || event.key === "Enter") {
        state.pressed = false;
        renderState();
      }
    });
    button.addEventListener("click", () => {
      state.pressed = false;
      state.saved = true;
      renderState();
    });
  }

  for (const button of examples.querySelectorAll(
    ".reference-destructive-demo",
  )) {
    const feedback = button.closest(".reference-feedback");
    const title = feedback.querySelector("strong");
    const description = feedback.querySelector("small");
    button.addEventListener("click", () => {
      const moved = feedback.dataset.moved !== "true";
      feedback.dataset.moved = String(moved);
      title.textContent = moved ? "Moved to Trash" : "Destructive action";
      description.textContent = moved
        ? "The local specimen changed state. Nothing was persisted."
        : "Semantic red remains separate from brand action.";
      button.textContent = moved ? "Undo move" : "Move to Trash";
    });
  }
}

function renderRelationships() {
  const modes = visibleModes();
  const relationshipForModes = (label, description, roles) => {
    const sequence = (mode) => {
      const values = currentResult.modes[mode].values;
      return `<div class="mode-sequence"><span>${mode}</span>${roles.map((role) => `<i style="background:${values[role]}" title="${role} · ${values[role]}"></i>`).join("")}</div>`;
    };
    return `<article class="relationship-row"><div><strong>${label}</strong><small>${description}</small></div>${modes.map(sequence).join("")}</article>`;
  };
  relationships.innerHTML = `<article class="input-source"><span>Input primary · ${currentResult.source.classification}</span><i style="background:${currentResult.input.primary}"></i><strong>${currentResult.input.primary}</strong><small>${colorCoordinates(currentResult.input.primary)}</small><p>${currentResult.source.policy}</p></article>
    <div class="relationship-list">
      ${relationshipForModes("Foundation", "Background → surface → muted surface", ["background", "surface", "muted surface"])}
      ${relationshipForModes("Content", "Primary and supporting text", ["foreground", "muted text"])}
      ${relationshipForModes("Brand", "Default → hover → active", ["primary", "primary hover", "primary active"])}
      ${relationshipForModes("Boundary", "Subtle → interactive", ["border", "input border"])}
      ${relationshipForModes("Feedback", "Brand action → destructive action", ["primary", "destructive"])}
    </div>`;
}

function foundationTrackMarker(mode, role, value, kind, axis, domain) {
  if (!value) return "";
  const coordinate = axis === "lightness" ? value.oklch.l : value.oklch.c;
  const span = domain[1] - domain[0] || 1;
  const x = Math.max(1, Math.min(99, ((coordinate - domain[0]) / span) * 100));
  const title = `${role} · ${kind} · ${value.hex} · L ${value.oklch.l.toFixed(3)} C ${value.oklch.c.toFixed(4)}`;
  if (kind === "target") {
    return `<i class="decision-marker target" style="left:${x}%" title="${title}"></i>`;
  }
  return `<button class="decision-marker ${kind}" type="button" data-mode="${mode}" data-role="${role}" data-kind="${kind}" data-axis="${axis}" style="left:${x}%;--node-color:${value.hex}" title="${title}" aria-label="Open ${kind} ${role} candidate on ${axis}, ${value.hex}"></button>`;
}

function foundationTrack(mode, role, decision, axis) {
  const domain = decision.searchDomain[axis];
  const precision = axis === "lightness" ? 3 : 4;
  const label = axis === "lightness" ? "Lightness L" : "Tint chroma C";
  const lane = (laneLabel, value, kind) =>
    `<div class="decision-track-lane ${kind}"><span>${laneLabel}</span><div>${foundationTrackMarker(mode, role, value, kind, axis, domain)}</div></div>`;
  return `<div class="decision-track ${axis}"><header><strong>${label}</strong><span>${domain[0].toFixed(precision)} → ${domain[1].toFixed(precision)}</span></header><div class="decision-track-lanes">
    ${lane("Target", decision.target, "target")}
    ${lane("Chosen", decision.selected, "selected")}
    ${lane("Closest failed", decision.alternatives.nearestRejected, "rejected")}
    ${lane("Another pass", decision.alternatives.nextPassing, "passing")}
  </div><footer><span>${domain[0].toFixed(precision)}</span><span>${axis === "lightness" ? `step ${decision.searchDomain.lightnessStep.toFixed(3)}` : "neutral → tint cap"}</span><span>${domain[1].toFixed(precision)}</span></footer></div>`;
}

function foundationRoleRow(mode, role) {
  const decision = currentResult.modes[mode].decisions[role];
  const selected = decision.selected;
  const rejected = decision.alternatives.nearestRejected;
  const passing = decision.alternatives.nextPassing;
  const alternatives = [rejected, passing].filter(Boolean).length;
  const failedRule = rejected?.constraintResults?.find(({ passed }) => !passed);
  const ruleCount = selected.constraintResults?.length ?? 0;
  const targetDistance = selected.objectiveResults?.[0]?.value ?? 0;
  const explanation =
    targetDistance < 0.0005
      ? `The recipe target ${decision.target.hex} passed every rule, so no correction was needed.`
      : `The recipe target required correction. ${selected.hex} is the closest candidate that passed every rule.`;
  return `<div class="foundation-role-row">
    <header class="foundation-role-label"><span>${role}</span><strong><i style="background:${selected.hex}"></i>${selected.hex}</strong><small>Chosen L ${selected.oklch.l.toFixed(3)} · C ${selected.oklch.c.toFixed(4)}</small></header>
    <div class="foundation-role-tracks">${foundationTrack(mode, role, decision, "lightness")}${foundationTrack(mode, role, decision, "chroma")}</div>
    <div class="foundation-role-result"><strong>${explanation}</strong><span>Passed ${ruleCount}/${ruleCount} required rules · ${decision.candidateCount} candidates checked</span>${failedRule ? `<em>Closest failed option: ${failedRule.label} — ${failedRule.reasons?.[0] ?? "required condition missed"}</em>` : ""}<small>${alternatives} comparison candidates shown; click a marker for full evidence.</small></div>
  </div>`;
}

function foundationMode(mode) {
  const result = currentResult.modes[mode];
  const rows = FOUNDATION_ROLES.map((role) =>
    foundationRoleRow(mode, role),
  ).join("");
  const textDecision = (role) => {
    const decision = result.decisions[role];
    return `<div><span>${role}</span><i style="background:${decision.selected.hex}"></i><strong>${decision.selected.hex}</strong><small>${decision.selected.objectiveResults?.[0]?.value.toFixed(1) ?? "–"} Lc weakest</small></div>`;
  };
  return `<article class="foundation-map-card"><header><span>${mode} mode</span><strong>${FOUNDATION_ROLES.reduce((count, role) => count + result.decisions[role].candidateCount, 0)} total candidates checked</strong></header><p class="foundation-reading-guide"><strong>Read each role independently.</strong> Every lightness axis is zoomed to that role's actual search range. Chroma always runs from neutral to the calm tint cap.</p><div class="foundation-rows">${rows}</div><div class="foundation-legend"><span><i class="target"></i>Recipe target</span><span><i class="selected"></i>Chosen</span><span><i class="rejected"></i>Closest failed</span><span><i class="passing"></i>Another passing option</span></div><div class="binary-heading"><strong>Text choice is separate</strong><span>Black and white are compared by their weakest APCA contrast.</span></div><div class="binary-text">${textDecision("primary text")}${textDecision("destructive text")}</div></article>`;
}

function renderFoundationMap() {
  foundationMap.innerHTML = visibleModes().map(foundationMode).join("");
}

function focusSpecimen(mode) {
  const values = currentResult.modes[mode].values;
  const decision = currentResult.modes[mode].decisions["focus ring"];
  const item = (label, background, foreground, text) =>
    `<div class="focus-target" style="background:${background};color:${foreground};--focus:${values["focus ring"]};--focus-gap:${values.background}"><span>${label}</span><button style="background:${background};color:${foreground}">${text}</button><button class="focused" style="background:${background};color:${foreground}">${text}</button></div>`;
  return `<article class="focus-card" style="background:${values.background};color:${values.foreground}"><header><span>${mode}</span><strong>${values["focus ring"]}</strong><small>${decision.candidateCount} candidates</small></header><div class="focus-targets">${item("Background", values.background, values.foreground, "Neutral")}${item("Surface", values.surface, values.foreground, "Surface")}${item("Primary", values.primary, values["primary text"], "Continue")}${item("Destructive", values.destructive, values["destructive text"], "Delete")}</div></article>`;
}

function renderFocusSpecimens() {
  focusSpecimens.innerHTML = visibleModes().map(focusSpecimen).join("");
}

function qualityValue(check) {
  const value = check.unit === "ordered" ? "ordered" : check.value.toFixed(3);
  const target =
    check.unit === "ordered"
      ? "required"
      : Array.isArray(check.target)
        ? `${check.target[0].toFixed(2)}–${check.target[1].toFixed(2)}`
        : `${check.direction === "minimum" ? "≥" : "≤"} ${check.target}`;
  return { value: `${value}${check.unit.startsWith("°") ? "°" : ""}`, target };
}

function qualityCheck(check) {
  const display = qualityValue(check);
  return `<li class="${check.pass ? "pass" : "review"}"><i>${check.pass ? "✓" : "!"}</i><span><strong>${check.label}</strong><small>${check.authority} · target ${display.target}</small></span><b>${display.value}</b></li>`;
}

function pairOption(label, pair, selectedPair) {
  if (!pair) return "";
  const sameAsSelected =
    pair.light === selectedPair.light && pair.dark === selectedPair.dark;
  return `<article class="pair-option ${label === "Selected" ? "selected" : ""}"><header><span>${label}</span>${sameAsSelected && label !== "Selected" ? `<small>Same as selected</small>` : ""}</header><div class="pair-swatches"><i style="background:${pair.light}"><b>${pair.light}</b></i><i style="background:${pair.dark}"><b>${pair.dark}</b></i></div><dl><div><dt>Quality misses</dt><dd>${pair.qualityMisses}</dd></div><div><dt>Worst source ΔE</dt><dd>${pair.maximumSourceDistance.toFixed(3)}</dd></div><div><dt>Hue drift</dt><dd>${pair.hueDrift.toFixed(2)}°</dd></div><div><dt>Lightness gap</dt><dd>${pair.lightnessGap.toFixed(3)}</dd></div></dl></article>`;
}

function renderQuality() {
  const result = currentResult.quality;
  const pair = currentResult.pairDecision;
  const modes = visibleModes();
  const checksForModes = (items) =>
    items.filter(({ id }) => modes.some((mode) => id.includes(`.${mode}.`)));
  const sourceChecks = checksForModes(result.sourceChecks);
  const semanticChecks = checksForModes(result.semanticChecks);
  const pairedReview =
    resultMode === "compare"
      ? `<aside class="pair-decision"><span>${pair.strategy}</span><strong>${pair.candidateCount} sampled pairs compared</strong><p>${pair.ranking.join(" → ")}</p><code>${pair.selected.light} / ${pair.selected.dark}</code></aside><div class="pair-comparison">${pairOption("Selected", pair.selected, pair.selected)}${pairOption("Next ranked", pair.alternatives.nextRanked, pair.selected)}${pairOption("Source fidelity", pair.alternatives.sourceFidelity, pair.selected)}${pairOption("Review boundary", pair.alternatives.qualityRejected, pair.selected)}</div><article><header><span>Cross-mode primary</span><strong>${result.crossMode.checks.filter(({ pass }) => pass).length}/${result.crossMode.checks.length} signals</strong></header><ul>${result.crossMode.checks.map(qualityCheck).join("")}</ul></article>`
      : `<aside class="mode-review-note"><strong>${resultMode} review</strong><span>Cross-mode identity and pair ranking are available in Compare.</span></aside>`;
  const semanticModel = evaluatePrimaryActionSemantics(
    currentResult.modes,
    currentResult.quality,
    hoverEvaluationEvidence(
      currentHoverEvaluation(),
      currentResult.input.primary,
      currentResult.policyVersion,
    ),
  );
  const semanticIntent = `<article class="semantic-intent-review"><header><span>Declared design intent</span><strong>${formatSemanticCounts(semanticModel.counts)}</strong></header><ul>${semanticModel.evaluations.map((item) => `<li class="${item.status === "satisfied" ? "pass" : "review"}"><i>${item.status === "satisfied" ? "✓" : item.status === "unsatisfied" ? "×" : "?"}</i><span><strong>${item.statement}</strong><small>${item.kind} · ${item.authority}</small><em>${item.reason}</em></span><b>${item.status}</b></li>`).join("")}</ul></article>`;
  const hoverDiagnostics = currentResult.hoverDiagnostics;
  const diagnosticPair = (mode, context, name, label) => {
    const pair = hoverDiagnostics.modes[mode].pairs[name];
    const signal = pair.contexts[context];
    const direction = signal.change > 0 ? "↗" : signal.change < 0 ? "↘" : "→";
    return `<li><i>${direction}</i><span><strong>${mode} · ${context} · ${label}</strong><small>Oklab ΔE ${pair.oklabDeltaE.toFixed(3)} · CIEDE2000 ${pair.ciede2000.toFixed(2)}</small><em>Context contrast ${signal.contrast[0].toFixed(2)} → ${signal.contrast[1].toFixed(2)} · signed change ${signal.change.toFixed(2)}</em></span><b>diagnostic</b></li>`;
  };
  const diagnosticFlags = hoverDiagnostics.structuralFlags.length
    ? ` Structural flags: ${hoverDiagnostics.structuralFlags.join(", ")}.`
    : " No structural flags; perceptual risk remains unclassified.";
  const diagnosticCard = `<article class="hover-diagnostic-review"><header><span>Hover risk diagnostics</span><strong>${hoverDiagnostics.reviewPriority} priority</strong></header><p>${hoverDiagnostics.interpretation}${diagnosticFlags}</p><ul>${modes.flatMap((mode) => [diagnosticPair(mode, "surface", "defaultToHover", "default → hover"), diagnosticPair(mode, "surface", "hoverToActive", "hover → active"), diagnosticPair(mode, "background", "defaultToHover", "default → hover")]).join("")}</ul></article>`;
  quality.innerHTML = `${semanticIntent}${diagnosticCard}${pairedReview}<article><header><span>Independent source fidelity</span><strong>${sourceChecks.filter(({ pass }) => pass).length}/${sourceChecks.length} signals</strong></header><ul>${sourceChecks.map(qualityCheck).join("")}</ul></article><article><header><span>Semantic ambiguity</span><strong>${semanticChecks.filter(({ pass }) => pass).length}/${semanticChecks.length} signals</strong></header><ul>${semanticChecks.map(qualityCheck).join("")}</ul></article>${modes
    .map((mode) => {
      const state = result.states[mode];
      return `<article><header><span>${mode} state pacing</span><strong>${state.passed ? "Balanced" : "Review"}</strong></header><div class="state-interval"><i style="flex:${state.defaultToHover}"></i><i style="flex:${state.hoverToActive}"></i></div><p>Default → hover <b>${state.defaultToHover.toFixed(3)}</b><br>Hover → active <b>${state.hoverToActive.toFixed(3)}</b></p><ul>${state.checks.map(qualityCheck).join("")}</ul></article>`;
    })
    .join("")}${["destructive", "warning"]
    .flatMap((family) =>
      modes.map((mode) => {
        const state = result.feedbackStates[family][mode];
        return `<article><header><span>${mode} ${family} pacing</span><strong>${state.passed ? "Balanced" : "Review"}</strong></header><div class="state-interval"><i style="flex:${state.defaultToHover}"></i><i style="flex:${state.hoverToActive}"></i></div><p>Default → hover <b>${state.defaultToHover.toFixed(3)}</b><br>Hover → active <b>${state.hoverToActive.toFixed(3)}</b></p><ul>${state.checks.map(qualityCheck).join("")}</ul></article>`;
      }),
    )
    .join("")}`;
  renderSourceAlternatives();
}

function alternativeMode(mode, alternatives) {
  const item = (name, value) => {
    const swatchStyle =
      name === "Source outline"
        ? `background:transparent;border-color:${value.color};color:${value.text}`
        : `background:${value.color};color:${value.text}${value.border ? `;border-color:${value.border}` : ""}`;
    const component = value.hover
      ? `<div class="usage-buttons"><button style="background:${value.color};color:${value.text}">Default</button><button style="background:${value.hover};color:${value.text}">Hover</button><button style="background:${value.active};color:${value.text}">Active</button></div>`
      : `<button class="usage-base" style="${swatchStyle}">${name}</button>`;
    return `<div class="usage-option ${value.safe ? "safe" : "unsafe"}"><span>${name}<b>${value.safe ? (value.hover ? "Complete family" : "Base viable") : "Not recommended"}</b></span>${component}<strong>${value.color}</strong><small>${value.note}${value.hover ? "" : " Interaction states are not generated for this alternative."}</small></div>`;
  };
  return `<article style="background:${alternatives.background};color:${alternatives.foreground}"><header><span>${mode}</span><strong>Source-shift alternatives</strong></header>${item("Generated fill", alternatives.filled)}${item("Source outline", alternatives.outline)}${item("Source fill", alternatives.brandFaithful)}</article>`;
}

function renderSourceAlternatives() {
  const alternatives = currentResult.sourceAlternatives;
  if (!alternatives) {
    sourceAlternatives.innerHTML = "";
    return;
  }
  sourceAlternatives.innerHTML = `<header><span>Large source shift</span><p>${alternatives.intent}</p><aside><strong>Stateful action</strong> ${alternatives.recommendation.statefulAction}<br><strong>Source-faithful option</strong> ${alternatives.recommendation.sourceFaithfulAction}<small>${alternatives.recommendation.rationale}</small></aside></header><div>${visibleModes()
    .map((mode) => alternativeMode(mode, alternatives.modes[mode]))
    .join("")}</div>`;
}

function galleryCard(result) {
  const light = result.modes.light.values;
  const dark = result.modes.dark.values;
  const passed = result.quality.checks.filter(({ pass }) => pass).length;
  const record = evaluationRecords[result.input.primary] ?? {};
  const pairKey = `${light.primary}/${dark.primary}`;
  const convergesWith = [...galleryResults.values()]
    .filter(
      (other) =>
        other.input.primary !== result.input.primary &&
        `${other.modes.light.values.primary}/${other.modes.dark.values.primary}` ===
          pairKey,
    )
    .map((other) => other.input.primary);
  const ratingButton = (rating) =>
    `<button type="button" data-rating="${rating}" aria-pressed="${record.rating === rating}">${rating}</button>`;
  return `<article class="gallery-card" data-primary="${result.input.primary}"><button class="gallery-load" type="button" data-action="load"><span class="gallery-source"><i style="background:${result.input.primary}"></i><strong>${result.input.primary}</strong></span><span class="gallery-pair"><i style="background:${light.background}"><b style="background:${light.primary}"></b><em style="background:${light["primary hover"]}"></em><small style="background:${light["primary active"]}"></small></i><i style="background:${dark.background}"><b style="background:${dark.primary}"></b><em style="background:${dark["primary hover"]}"></em><small style="background:${dark["primary active"]}"></small></i></span><span class="gallery-result ${result.quality.passed ? "pass" : "review"}">${passed}/${result.quality.checks.length} independent review signals · Inspect</span>${convergesWith.length ? `<span class="gallery-convergence">Same action pair as ${convergesWith.join(", ")}</span>` : ""}</button><div class="gallery-rating" aria-label="Designer rating">${ratingButton("Prefer")}${ratingButton("Acceptable")}${ratingButton("Reject")}</div><details class="gallery-note"><summary>Add note</summary><textarea rows="2" placeholder="What feels right or wrong?">${escapeHtml(record.note ?? "")}</textarea></details></article>`;
}

async function renderGallery() {
  if (!galleryResults.size) {
    const response = await fetch(
      new URL("./evaluation-palettes.json", import.meta.url),
    );
    if (!response.ok) throw new Error("Evaluation palettes unavailable.");
    const payload = await response.json();
    for (const result of payload.results) {
      galleryResults.set(result.input.primary, result);
    }
  }
  gallery.innerHTML = EVALUATION_INPUTS.map((primary) =>
    galleryCard(galleryResults.get(primary)),
  ).join("");
}

function semanticMarker(decision, role, kind) {
  const value =
    kind === "selected"
      ? decision.selected
      : decision.alternatives[
          kind === "rejected" ? "nearestRejected" : "nextPassing"
        ];
  if (!value) return "";
  const x =
    role === "warning"
      ? Math.max(0, Math.min(100, ((value.oklch.h - 60) / 60) * 100))
      : Math.min(100, (value.oklch.c / 0.08) * 100);
  const y = value.oklch.l * 100;
  return `<i class="${kind}" style="left:${x}%;bottom:${y}%;--marker-color:${value.hex}" title="${kind}: ${value.hex} · L ${value.oklch.l.toFixed(3)} C ${value.oklch.c.toFixed(3)} H ${value.oklch.h.toFixed(1)}°"></i>`;
}

function semanticCloud(decision, role) {
  return (decision.searchPlot ?? [])
    .map((value) => {
      const x =
        role === "warning"
          ? Math.max(0, Math.min(100, ((value.oklch.h - 60) / 60) * 100))
          : Math.min(100, (value.oklch.c / 0.08) * 100);
      return `<b class="${value.passed ? "feasible" : "infeasible"}" style="left:${x}%;bottom:${value.oklch.l * 100}%;--candidate-color:${value.hex}"></b>`;
    })
    .join("");
}

function renderSemanticMaps() {
  semanticMap.innerHTML = visibleModes()
    .flatMap((mode) =>
      ["warning", "selection"].map((role) => {
        const decision = currentResult.modes[mode].decisions[role];
        const axes =
          role === "warning"
            ? "amber hue 60° → 120° · lightness ↑"
            : "chroma 0 → 0.08 · lightness ↑";
        return `<article><header><span>${mode}</span><strong>${role}</strong><small>${axes}</small></header><div class="semantic-plot ${role}">${semanticCloud(decision, role)}${semanticMarker(decision, role, "selected")}${semanticMarker(decision, role, "rejected")}${semanticMarker(decision, role, "passing")}</div><footer><span><i class="feasible"></i>passing space</span><span><i class="infeasible"></i>rejected space</span><span><i class="selected"></i>selected</span><span><i class="rejected"></i>best-ranked rejected</span><span><i class="passing"></i>next passing</span></footer></article>`;
      }),
    )
    .join("");
}

function checkValue(check) {
  if (check.kind === "text") {
    return {
      value: `${check.lc.toFixed(1)} Lc`,
      target: `target |${check.target}| · ${check.typography}`,
    };
  }
  if (check.metric === "WCAG contrast") {
    return {
      value: `${check.value.toFixed(2)}:1`,
      target: `target ${check.target}:1 · non-text`,
    };
  }
  return {
    value: `ΔE ${check.value.toFixed(3)}`,
    target: `target ${check.target.toFixed(3)} · perceptual separation`,
  };
}

function renderChecks() {
  const modes = visibleModes();
  const allChecks = modes.flatMap((mode) => currentResult.modes[mode].checks);
  const passed = allChecks.filter((check) => check.pass).length;
  validationSummary.textContent = `${passed} of ${allChecks.length} palette contracts met`;
  checks.innerHTML = modes
    .map(
      (mode) =>
        `<section><h3>${mode}</h3>${currentResult.modes[mode].checks
          .map((check) => {
            const label = checkValue(check);
            return `<div class="check-row ${check.pass ? "pass" : "fail"}"><span><strong>${check.role}</strong><small>${check.metric}</small></span><span><b>${label.value}</b><small>${label.target}</small></span></div>`;
          })
          .join("")}</section>`,
    )
    .join("");
}

function render(result) {
  currentResult = result;
  paletteTitle.textContent = `${result.input.primary} · ${resultMode === "compare" ? "Light and dark" : `${resultMode[0].toUpperCase()}${resultMode.slice(1)}`}`;
  renderPalettes();
  renderExamples();
  renderRelationships();
  renderFoundationMap();
  renderSemanticMaps();
  renderFocusSpecimens();
  renderQuality();
  renderChecks();
}

picker.addEventListener("input", () => {
  primaryInput.value = picker.value.toUpperCase();
});
primaryInput.addEventListener("input", () => {
  if (isHex(primaryInput.value)) {
    picker.value = primaryInput.value;
    error.textContent = "";
    primaryInput.removeAttribute("aria-invalid");
  }
});
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!isHex(primaryInput.value)) {
    error.textContent = "Use a six-digit hex color, such as #507096.";
    primaryInput.setAttribute("aria-invalid", "true");
    return;
  }
  error.textContent = "";
  primaryInput.removeAttribute("aria-invalid");
  const primary = normalizeHex(primaryInput.value);
  const submit = form.querySelector('button[type="submit"]');
  submit.disabled = true;
  form.setAttribute("aria-busy", "true");
  calculationStatus.textContent = "Calculating in a background worker…";
  try {
    const calculated = await paletteRuntime.calculate(primary);
    paletteRuntime.remember(calculated.result);
    render(calculated.result);
    calculationStatus.textContent = calculated.cached
      ? "Ready · reused cached result"
      : `Ready · calculated in ${calculated.duration.toFixed(1)} ms off the UI thread`;
  } catch (calculationError) {
    error.textContent = calculationError.message;
  } finally {
    submit.disabled = false;
    form.removeAttribute("aria-busy");
  }
});

document.querySelector("#copy-css").addEventListener("click", async () => {
  const css = ["light", "dark"]
    .map((mode) => serializeModeCss(currentResult.modes[mode]))
    .join("\n\n");
  try {
    await navigator.clipboard.writeText(css);
    toast.textContent = "Light and dark palette CSS copied";
  } catch {
    toast.textContent = "Clipboard unavailable";
  }
  toast.classList.add("visible");
  window.setTimeout(() => toast.classList.remove("visible"), 1600);
});

document
  .querySelector("#copy-reference")
  .addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(
        JSON.stringify(serializeReferenceTokens(currentResult), null, 2),
      );
      toast.textContent = "Reference token JSON copied";
    } catch {
      toast.textContent = "Clipboard unavailable";
    }
    toast.classList.add("visible");
    window.setTimeout(() => toast.classList.remove("visible"), 1600);
  });

function updateHoverEvaluation(mode, change) {
  const key = hoverEvaluationKey(
    currentResult.input.primary,
    currentResult.policyVersion,
  );
  const existing = currentHoverEvaluation();
  hoverEvaluationRecords[key] = {
    schema: HOVER_EVALUATION_SCHEMA,
    input: currentResult.input.primary,
    policyVersion: currentResult.policyVersion,
    specimen: HOVER_SPECIMEN,
    modes: {
      light: { ...(existing?.modes.light ?? {}) },
      dark: { ...(existing?.modes.dark ?? {}) },
      [mode]: { ...(existing?.modes[mode] ?? {}), ...change },
    },
  };
  saveHoverEvaluationRecords(hoverEvaluationRecords);
}

examples.addEventListener("click", (event) => {
  const judgment = event.target.closest("[data-hover-judgment]");
  if (!judgment) return;
  const fieldset = judgment.closest("[data-hover-mode]");
  const previous = currentHoverEvaluation()?.modes[fieldset.dataset.hoverMode];
  updateHoverEvaluation(fieldset.dataset.hoverMode, {
    judgment: judgment.dataset.hoverJudgment,
    ...(previous?.judgment !== judgment.dataset.hoverJudgment
      ? { note: "" }
      : {}),
  });
  renderExamples();
  renderQuality();
});

examples.addEventListener("change", (event) => {
  if (!event.target.matches(".hover-review textarea")) return;
  const fieldset = event.target.closest("[data-hover-mode]");
  updateHoverEvaluation(fieldset.dataset.hoverMode, {
    note: event.target.value.trim(),
  });
  renderQuality();
});

gallery.addEventListener("click", async (event) => {
  const card = event.target.closest("[data-primary]");
  if (!card) return;
  if (event.target.closest('[data-action="load"]')) {
    primaryInput.value = card.dataset.primary;
    picker.value = card.dataset.primary;
    calculationStatus.textContent =
      "Loading the full inspector in a background worker…";
    const calculated = await paletteRuntime.calculate(card.dataset.primary);
    paletteRuntime.remember(calculated.result);
    render(calculated.result);
    calculationStatus.textContent = calculated.cached
      ? "Ready · reused cached result"
      : `Ready · calculated in ${calculated.duration.toFixed(1)} ms off the UI thread`;
    return;
  }
  const rating = event.target.closest("[data-rating]");
  if (!rating) return;
  evaluationRecords[card.dataset.primary] = {
    ...(evaluationRecords[card.dataset.primary] ?? {}),
    rating: rating.dataset.rating,
    policyVersion: galleryResults.get(card.dataset.primary).policyVersion,
  };
  saveEvaluationRecords(evaluationRecords);
  card
    .querySelectorAll("[data-rating]")
    .forEach((button) =>
      button.setAttribute("aria-pressed", button === rating ? "true" : "false"),
    );
});

gallery.addEventListener("change", (event) => {
  if (!event.target.matches("textarea")) return;
  const card = event.target.closest("[data-primary]");
  evaluationRecords[card.dataset.primary] = {
    ...(evaluationRecords[card.dataset.primary] ?? {}),
    note: event.target.value.trim(),
    policyVersion: galleryResults.get(card.dataset.primary).policyVersion,
  };
  saveEvaluationRecords(evaluationRecords);
});

document.querySelector("#export-ratings").addEventListener("click", () => {
  const payload = {
    schema: "color-lab-evaluation-1",
    exportedAt: new Date().toISOString(),
    records: evaluationRecords,
  };
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "color-lab-v2-evaluations.json";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
});

document
  .querySelector("#import-ratings")
  .addEventListener("click", () => ratingsFile.click());

ratingsFile.addEventListener("change", async () => {
  const file = ratingsFile.files?.[0];
  if (!file) return;
  try {
    const payload = JSON.parse(await file.text());
    if (payload.schema !== "color-lab-evaluation-1" || !payload.records) {
      throw new TypeError("Unsupported evaluation file.");
    }
    const allowedRatings = new Set(["Prefer", "Acceptable", "Reject"]);
    evaluationRecords = Object.fromEntries(
      Object.entries(payload.records)
        .filter(([primary, record]) => isHex(primary) && record)
        .map(([primary, record]) => [
          normalizeHex(primary),
          {
            ...(allowedRatings.has(record.rating)
              ? { rating: record.rating }
              : {}),
            ...(typeof record.note === "string"
              ? { note: record.note.slice(0, 1000) }
              : {}),
            ...(typeof record.policyVersion === "string"
              ? { policyVersion: record.policyVersion }
              : {}),
          },
        ]),
    );
    saveEvaluationRecords(evaluationRecords);
    renderGallery();
    toast.textContent = "Evaluation JSON imported";
  } catch {
    toast.textContent = "Could not import this evaluation file";
  }
  toast.classList.add("visible");
  window.setTimeout(() => toast.classList.remove("visible"), 1600);
  ratingsFile.value = "";
});

galleryPanel.addEventListener("toggle", () => {
  if (galleryPanel.open && !gallery.childElementCount) {
    gallery.innerHTML = `<p class="gallery-loading">Loading precomputed evaluation palettes…</p>`;
    window.requestAnimationFrame(() => {
      renderGallery().catch(() => {
        gallery.innerHTML = `<p class="gallery-loading">Precomputed evaluation set unavailable.</p>`;
      });
    });
  }
});

foundationMap.addEventListener("click", (event) => {
  const node = event.target.closest(".decision-marker:is(button)");
  if (!node) return;
  foundationMap
    .querySelectorAll(".decision-marker.active")
    .forEach((item) => item.classList.remove("active"));
  node.classList.add("active");
  const swatch = document.querySelector(
    `.swatch[data-mode="${node.dataset.mode}"][data-role="${node.dataset.role}"]`,
  );
  if (!swatch) return;
  document
    .querySelectorAll(".decision-candidate.graph-target")
    .forEach((candidate) => candidate.classList.remove("graph-target"));
  swatch.closest(".color-group")?.setAttribute("open", "");
  swatch.open = true;
  const candidate = swatch.querySelector(
    `[data-candidate-kind="${node.dataset.kind}"]`,
  );
  candidate?.closest(".decision-more")?.setAttribute("open", "");
  candidate?.classList.add("graph-target");
  swatch.scrollIntoView({ behavior: "smooth", block: "center" });
});

palettes.addEventListener("click", (event) => {
  const summary = event.target.closest(".swatch > summary");
  if (!summary) return;
  const swatch = summary.parentElement;
  foundationMap
    .querySelectorAll(".decision-marker.active")
    .forEach((node) => node.classList.remove("active"));
  const node = foundationMap.querySelector(
    `.decision-marker.selected[data-mode="${swatch.dataset.mode}"][data-role="${swatch.dataset.role}"]`,
  );
  node?.classList.add("active");
});

for (const button of modeButtons) {
  button.addEventListener("click", () => {
    const nextMode = button.dataset.resultMode;
    if (nextMode === resultMode) return;
    resultMode = nextMode;
    try {
      localStorage.setItem(RESULT_MODE_STORAGE_KEY, resultMode);
    } catch {
      // Mode switching still works when browser storage is unavailable.
    }
    syncResultMode();
    if (currentResult) render(currentResult);
  });
}

syncResultMode();
const initialResult = generatePaletteV2({ primary: primaryInput.value });
paletteRuntime.remember(initialResult);
render(initialResult);
