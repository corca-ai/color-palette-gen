import {
  hexToRgb,
  isHex,
  normalizeHex,
  rgbToOklch,
} from "../lib/color-math.js";
import { generatePaletteV2, serializeModeCss } from "./lib/palette.js";
import { serializeCrakenTokens } from "./lib/craken.js";

const GROUPS = [
  {
    name: "Foundation",
    roles: ["background", "surface", "raised surface", "muted surface"],
  },
  { name: "Content", roles: ["foreground", "muted text"] },
  { name: "Boundary", roles: ["border", "input border"] },
  {
    name: "Brand",
    roles: [
      "primary",
      "primary hover",
      "primary active",
      "primary text",
      "focus ring",
    ],
  },
  {
    name: "Feedback",
    roles: [
      "destructive",
      "destructive hover",
      "destructive active",
      "destructive text",
      "warning",
      "warning hover",
      "warning active",
      "warning text",
    ],
  },
  {
    name: "Utility",
    roles: [
      "selection",
      "selection text",
      "disabled background",
      "disabled text",
      "disabled border",
      "popover",
      "popover text",
    ],
  },
];

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
let currentResult;
let workerSequence = 0;
const pendingCalculations = new Map();
const resultCache = new Map();
const paletteWorker =
  typeof Worker === "undefined"
    ? null
    : new Worker(new URL("./palette-worker.js", import.meta.url), {
        type: "module",
      });

paletteWorker?.addEventListener("message", ({ data }) => {
  const pending = pendingCalculations.get(data.id);
  if (!pending) return;
  pendingCalculations.delete(data.id);
  if (data.error) pending.reject(new Error(data.error));
  else pending.resolve(data);
});

const EVALUATION_INPUTS = [
  "#FF0000",
  "#F97316",
  "#F2C230",
  "#00A878",
  "#00A7C4",
  "#507096",
  "#2563EB",
  "#6633FF",
  "#D946EF",
  "#777777",
  "#000000",
  "#FFFFFF",
];
const EVALUATION_STORAGE_KEY = "color-lab-v2-evaluations";
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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function loadEvaluationRecords() {
  try {
    return JSON.parse(localStorage.getItem(EVALUATION_STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
}

function saveEvaluationRecords() {
  try {
    localStorage.setItem(
      EVALUATION_STORAGE_KEY,
      JSON.stringify(evaluationRecords),
    );
    return true;
  } catch {
    return false;
  }
}

function colorValues(tokens) {
  return Object.fromEntries(tokens.map(([color, role]) => [role, color]));
}

function colorCoordinates(hex) {
  const { l, c, h } = rgbToOklch(hexToRgb(hex));
  return `L ${Math.round(l * 100)} · C ${c.toFixed(3)} · H ${h.toFixed(1)}°`;
}

function constraintView(value, selected) {
  const results = selected
    ? (value.constraintResults ?? [])
    : (value.constraintResults ?? []).filter(({ passed }) => !passed);
  if (!results.length) {
    return `<small class="candidate-summary pass">✓ All must-pass rules satisfied</small>`;
  }
  return `<ul class="candidate-rules">${results
    .map(
      (rule) =>
        `<li class="${rule.passed ? "pass" : "fail"}"><b>${rule.passed ? "✓" : "×"}</b><span>${rule.label}</span><em>${rule.reasons?.[0] ?? ""}</em></li>`,
    )
    .join("")}</ul>`;
}

function candidateView(
  label,
  value,
  selected = false,
  kind = "",
  showRules = true,
) {
  if (!value) return "";
  const score = value.objectiveResults?.[0];
  const passedRules = (value.constraintResults ?? []).filter(
    ({ passed }) => passed,
  ).length;
  return `<div class="decision-candidate" data-candidate-kind="${kind}"><span>${label}</span><i style="background:${value.hex}"></i><strong>${value.hex}</strong>${score ? `<em>${score.label}: ${typeof score.value === "number" ? score.value.toFixed(3) : score.value}</em>` : ""}${showRules ? constraintView(value, selected) : `<small class="candidate-summary pass">✓ ${passedRules} must-pass rule${passedRules === 1 ? "" : "s"}</small>`}</div>`;
}

function policyView(policy) {
  if (!policy) return "";
  const group = (label, rules) =>
    `<div><span>${label}</span>${rules
      .map(
        (rule, index) =>
          `<b><i>${index + 1}</i><span>${rule.label}<small>${rule.authority}</small></span></b>`,
      )
      .join("")}</div>`;
  return `<div class="decision-policy"><header><span>Selection order</span><small>Reject first, optimize second, resolve exact ties last.</small></header>${group("Must pass", policy.constraints)}${group("Then optimize", policy.objectives)}${group("Exact ties", policy.tieBreakers)}</div>`;
}

function decisionView(decision) {
  const alias = decision.strategy === "semantic alias";
  return `<div class="decision-detail">
    <div class="decision-intent"><span>${decision.strategy} · ${decision.candidateCount} candidate${decision.candidateCount === 1 ? "" : "s"}</span><p>${decision.intent}</p></div>
    ${alias ? `<div class="alias-callout"><strong>No new color calculated</strong><span>Reuses ${decision.aliases.join(", ")} because the current application contract does not require independent differentiation.</span></div>` : candidateView("Selected", decision.selected, true, "selected", false)}
    <details class="decision-more"><summary>${alias ? "View provenance" : "Compare alternatives and rules"}</summary>
      ${policyView(decision.policy)}
      ${alias ? "" : `<div class="decision-candidates">${candidateView("Selected · full rules", decision.selected, true)}${candidateView("Closest rejected", decision.alternatives.nearestRejected, false, "rejected")}${candidateView("Next passing", decision.alternatives.nextPassing, false, "passing")}</div>`}
      <div class="decision-evidence"><span>Rule provenance</span>${decision.evidence.map((item) => `<a href="${item.url}" target="_blank" rel="noreferrer"><b>${item.class}</b>${item.label}</a>`).join("")}</div>
    </details>
  </div>`;
}

function swatch(color, role, decision, mode) {
  return `<details class="swatch" data-mode="${mode}" data-role="${role}"${role === "primary" ? " open" : ""}><summary><div class="swatch-color" style="background:${color}"></div><div class="swatch-copy"><strong>${role}</strong><code>${color}</code><small>${colorCoordinates(color)}</small></div><span class="why-label">Why?</span></summary>${decisionView(decision)}</details>`;
}

function palette(modeResult) {
  const values = colorValues(modeResult.tokens);
  const uniqueColors = new Set(modeResult.tokens.map(([color]) => color)).size;
  const shift = modeResult.adaptations.largeBrandShift
    ? `<mark>Large source shift · ΔE ${modeResult.adaptations.primarySourceDistance.toFixed(3)}</mark>`
    : "";
  return `<article class="palette ${modeResult.mode}">
    <header class="palette-header"><div><span>${modeResult.mode} palette</span><strong>${modeResult.tokens.length} roles · ${uniqueColors} unique colors</strong>${shift}</div><i style="background:${values.primary}" aria-label="Primary ${values.primary}"></i></header>
    <div class="palette-strip" aria-hidden="true">${modeResult.tokens
      .filter(([, role]) => !role.includes("text") && role !== "focus ring")
      .map(([color]) => `<i style="background:${color}"></i>`)
      .join("")}</div>
    <div class="palette-groups">${GROUPS.map((group) => `<section class="color-group"><h3>${group.name}</h3><div class="swatch-grid">${group.roles.map((role) => swatch(values[role], role, modeResult.decisions[role], modeResult.mode)).join("")}</div></section>`).join("")}</div>
  </article>`;
}

function renderPalettes() {
  palettes.innerHTML = ["light", "dark"]
    .map((mode) => palette(currentResult.modes[mode]))
    .join("");
}

function exampleStyle(modeResult) {
  return modeResult.tokens
    .map(([color, role]) => `--sample-${role.replaceAll(" ", "-")}:${color}`)
    .join(";");
}

function appliedExample(modeResult) {
  return `<article class="example ${modeResult.mode}" style="${exampleStyle(modeResult)}">
    <header class="example-header"><strong>Craken · ${modeResult.mode}</strong><span>Generated palette compatibility</span></header>
    <div class="example-canvas">
      <div class="craken-coverage"><span>Foundation</span><span>Navigation</span><span>Messages</span><span>Composer</span></div>
      <section class="craken-state-specimen">
        <header><strong>Primary button</strong><small>Normal, forced pseudo-state, and focus in one scan</small></header>
        <div class="craken-state-grid">
          <div><span>Normal</span><button>✓ Save</button></div>
          <div><span>Hover</span><button class="hover">✓ Save</button></div>
          <div><span>Active</span><button class="active">✓ Save</button></div>
          <div><span>Focus</span><button class="focused">✓ Save</button></div>
        </div>
        <div class="craken-semantic-grid">
          <button class="warning">Review warning</button>
          <button class="destructive">Delete workspace</button>
          <button class="destructive hover">Delete · hover</button>
          <button class="destructive active">Delete · active</button>
          <button class="disabled" disabled>Unavailable</button>
        </div>
      </section>
      <section class="craken-shell">
        <aside class="craken-sidebar">
          <div class="craken-workspace"><i>C</i><span><strong>Color Lab</strong><small>Craken workspace</small></span></div>
          <nav aria-label="Craken specimen navigation">
            <a class="selected"><span>◫</span>General<b>3</b></a>
            <a><span>◇</span>Design review</a>
            <a><span>⌁</span>Files</a>
          </nav>
          <button class="craken-secondary">＋ New conversation</button>
        </aside>
        <div class="craken-main">
          <header class="craken-channel"><div><strong># design-review</strong><small>Palette integration check</small></div><button>•••</button></header>
          <aside class="craken-warning"><strong>Review required</strong><span>This palette has a pending accessibility decision.</span></aside>
          <div class="craken-messages">
            <article><i>AK</i><div><p><strong>Alex Kim</strong><small>10:24</small></p><span>Does the generated palette preserve the Craken hierarchy in both modes?</span></div></article>
            <article><i>CL</i><div><p><strong>Color Lab</strong><small>10:26</small></p><span>Foundation, interaction states, focus, and feedback are rendered from the same semantic output.</span><em>Palette ready</em></div></article>
            <article class="selected-message"><i>DS</i><div><p><strong>Design system</strong><small>10:28</small></p><span>Selected content uses a restrained brand tint with readable text.</span></div></article>
          </div>
          <form class="craken-composer"><label><span>Message #design-review</span><textarea rows="2" readonly>Review the generated colors…</textarea></label><div><button type="button" class="craken-secondary">Attach</button><button type="button" class="craken-primary">Send</button></div></form>
        </div>
      </section>
      <aside class="craken-popover"><strong>Palette actions</strong><button>Copy CSS</button><button>Export tokens</button></aside>
      <footer class="craken-feedback"><span><strong>Destructive feedback</strong><small>Semantic red remains separate from brand action.</small></span><button>Move to Trash</button></footer>
    </div>
  </article>`;
}

function renderExamples() {
  examples.innerHTML = ["light", "dark"]
    .map((mode) => appliedExample(currentResult.modes[mode]))
    .join("");
}

function relationshipRow(label, description, roles) {
  const light = currentResult.modes.light.values;
  const dark = currentResult.modes.dark.values;
  const sequence = (mode, values) =>
    `<div class="mode-sequence"><span>${mode}</span>${roles.map((role) => `<i style="background:${values[role]}" title="${role} · ${values[role]}"></i>`).join("")}</div>`;
  return `<article class="relationship-row"><div><strong>${label}</strong><small>${description}</small></div>${sequence("Light", light)}${sequence("Dark", dark)}</article>`;
}

function renderRelationships() {
  relationships.innerHTML = `<article class="input-source"><span>Input primary · ${currentResult.source.classification}</span><i style="background:${currentResult.input.primary}"></i><strong>${currentResult.input.primary}</strong><small>${colorCoordinates(currentResult.input.primary)}</small><p>${currentResult.source.policy}</p></article>
    <div class="relationship-list">
      ${relationshipRow("Foundation", "Background → surface → muted surface", ["background", "surface", "muted surface"])}
      ${relationshipRow("Content", "Primary and supporting text", ["foreground", "muted text"])}
      ${relationshipRow("Brand", "Default → hover → active", ["primary", "primary hover", "primary active"])}
      ${relationshipRow("Boundary", "Subtle → interactive", ["border", "input border"])}
      ${relationshipRow("Feedback", "Brand action → destructive action", ["primary", "destructive"])}
    </div>`;
}

function foundationMarker(mode, role, value, kind, labelOffset = 0) {
  if (!value) return "";
  const x = Math.max(1, Math.min(99, value.oklch.l * 100));
  const y = Math.max(3, Math.min(96, (value.oklch.c / 0.012) * 100));
  const title = `${role} · ${kind} · ${value.hex} · L ${value.oklch.l.toFixed(3)} C ${value.oklch.c.toFixed(4)}`;
  return `<button class="foundation-node ${kind}" type="button" data-mode="${mode}" data-role="${role}" data-kind="${kind}" style="left:${x}%;bottom:${y}%;--node-color:${value.hex};--label-offset:${labelOffset}px" title="${title}">${kind === "selected" ? `<span>${role}</span>` : ""}</button>`;
}

function foundationMode(mode) {
  const result = currentResult.modes[mode];
  const markers = FOUNDATION_ROLES.map((role, index) => {
    const decision = result.decisions[role];
    return `${foundationMarker(mode, role, decision.selected, "selected", (index % 3) * 10)}${foundationMarker(mode, role, decision.alternatives.nearestRejected, "rejected")}${foundationMarker(mode, role, decision.alternatives.nextPassing, "passing")}`;
  }).join("");
  const textDecision = (role) => {
    const decision = result.decisions[role];
    return `<div><span>${role}</span><i style="background:${decision.selected.hex}"></i><strong>${decision.selected.hex}</strong><small>${decision.selected.objectiveResults?.[0]?.value.toFixed(1) ?? "–"} Lc weakest</small></div>`;
  };
  return `<article class="foundation-map-card"><header><span>${mode}</span><strong>${FOUNDATION_ROLES.reduce((count, role) => count + result.decisions[role].candidateCount, 0)} candidates evaluated</strong></header><div class="foundation-plot"><span class="axis-y">Tint chroma</span><span class="axis-x">OKLCH lightness →</span><div class="tint-limit">Calm tint limit</div>${markers}</div><div class="foundation-legend"><span><i class="selected"></i>Selected</span><span><i class="rejected"></i>Closest rejected</span><span><i class="passing"></i>Next passing</span></div><div class="binary-text">${textDecision("primary text")}${textDecision("destructive text")}</div></article>`;
}

function renderFoundationMap() {
  foundationMap.innerHTML = ["light", "dark"].map(foundationMode).join("");
}

function focusSpecimen(mode) {
  const values = currentResult.modes[mode].values;
  const decision = currentResult.modes[mode].decisions["focus ring"];
  const item = (label, background, foreground, text) =>
    `<div class="focus-target" style="background:${background};color:${foreground};--focus:${values["focus ring"]};--focus-gap:${values.background}"><span>${label}</span><button style="background:${background};color:${foreground}">${text}</button><button class="focused" style="background:${background};color:${foreground}">${text}</button></div>`;
  return `<article class="focus-card" style="background:${values.background};color:${values.foreground}"><header><span>${mode}</span><strong>${values["focus ring"]}</strong><small>${decision.candidateCount} candidates</small></header><div class="focus-targets">${item("Background", values.background, values.foreground, "Neutral")}${item("Surface", values.surface, values.foreground, "Surface")}${item("Primary", values.primary, values["primary text"], "Continue")}${item("Destructive", values.destructive, values["destructive text"], "Delete")}</div></article>`;
}

function renderFocusSpecimens() {
  focusSpecimens.innerHTML = ["light", "dark"].map(focusSpecimen).join("");
}

function qualityValue(check) {
  const value = check.unit === "ordered" ? "ordered" : check.value.toFixed(3);
  const target =
    check.unit === "ordered"
      ? "required"
      : Array.isArray(check.target)
        ? `${check.target[0].toFixed(2)}–${check.target[1].toFixed(2)}`
        : `≤ ${check.target}`;
  return { value: `${value}${check.unit === "°" ? "°" : ""}`, target };
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
  quality.innerHTML = `<aside class="pair-decision"><span>${pair.strategy}</span><strong>${pair.candidateCount} pairs compared</strong><p>${pair.ranking.join(" → ")}</p><code>${pair.selected.light} / ${pair.selected.dark}</code></aside><div class="pair-comparison">${pairOption("Selected", pair.selected, pair.selected)}${pairOption("Next ranked", pair.alternatives.nextRanked, pair.selected)}${pairOption("Source fidelity", pair.alternatives.sourceFidelity, pair.selected)}${pairOption("Quality boundary", pair.alternatives.qualityRejected, pair.selected)}</div><article><header><span>Cross-mode primary</span><strong>${result.crossMode.checks.filter(({ pass }) => pass).length}/${result.crossMode.checks.length} objectives</strong></header><ul>${result.crossMode.checks.map(qualityCheck).join("")}</ul></article>${[
    "light",
    "dark",
  ]
    .map((mode) => {
      const state = result.states[mode];
      return `<article><header><span>${mode} state pacing</span><strong>${state.passed ? "Balanced" : "Review"}</strong></header><div class="state-interval"><i style="flex:${state.defaultToHover}"></i><i style="flex:${state.hoverToActive}"></i></div><p>Default → hover <b>${state.defaultToHover.toFixed(3)}</b><br>Hover → active <b>${state.hoverToActive.toFixed(3)}</b></p><ul>${state.checks.map(qualityCheck).join("")}</ul></article>`;
    })
    .join("")}`;
  renderSourceAlternatives();
}

function alternativeMode(mode, alternatives) {
  const item = (name, value) => {
    const swatchStyle =
      name === "Source outline"
        ? `background:transparent;border-color:${value.color};color:${value.text}`
        : `background:${value.color};color:${value.text}`;
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
  sourceAlternatives.innerHTML = `<header><span>Large source shift</span><p>${alternatives.intent}</p></header><div>${["light", "dark"].map((mode) => alternativeMode(mode, alternatives.modes[mode])).join("")}</div>`;
}

function galleryCard(result) {
  const light = result.modes.light.values;
  const dark = result.modes.dark.values;
  const passed = result.quality.checks.filter(({ pass }) => pass).length;
  const record = evaluationRecords[result.input.primary] ?? {};
  const ratingButton = (rating) =>
    `<button type="button" data-rating="${rating}" aria-pressed="${record.rating === rating}">${rating}</button>`;
  return `<article class="gallery-card" data-primary="${result.input.primary}"><button class="gallery-load" type="button" data-action="load"><span class="gallery-source"><i style="background:${result.input.primary}"></i><strong>${result.input.primary}</strong></span><span class="gallery-pair"><i style="background:${light.background}"><b style="background:${light.primary}"></b><em style="background:${light["primary hover"]}"></em><small style="background:${light["primary active"]}"></small></i><i style="background:${dark.background}"><b style="background:${dark.primary}"></b><em style="background:${dark["primary hover"]}"></em><small style="background:${dark["primary active"]}"></small></i></span><span class="gallery-result ${result.quality.passed ? "pass" : "review"}">${passed}/${result.quality.checks.length} quality objectives · Inspect</span></button><div class="gallery-rating" aria-label="Designer rating">${ratingButton("Prefer")}${ratingButton("Acceptable")}${ratingButton("Reject")}</div><details class="gallery-note"><summary>Add note</summary><textarea rows="2" placeholder="What feels right or wrong?">${escapeHtml(record.note ?? "")}</textarea></details></article>`;
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

function semanticMarker(decision, kind) {
  const value =
    kind === "selected"
      ? decision.selected
      : decision.alternatives[
          kind === "rejected" ? "nearestRejected" : "nextPassing"
        ];
  if (!value) return "";
  return `<i class="${kind}" style="left:${value.oklch.l * 100}%;bottom:${Math.min(100, value.oklch.c / 0.2) * 100}%;--marker-color:${value.hex}" title="${kind}: ${value.hex}"></i>`;
}

function renderSemanticMaps() {
  semanticMap.innerHTML = ["light", "dark"]
    .flatMap((mode) =>
      ["warning", "selection"].map((role) => {
        const decision = currentResult.modes[mode].decisions[role];
        return `<article><header><span>${mode}</span><strong>${role}</strong><small>L → · chroma ↑</small></header><div class="semantic-plot">${semanticMarker(decision, "selected")}${semanticMarker(decision, "rejected")}${semanticMarker(decision, "passing")}</div><footer><span><i class="selected"></i>selected</span><span><i class="rejected"></i>rejected</span><span><i class="passing"></i>next passing</span></footer></article>`;
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
  const allChecks = ["light", "dark"].flatMap(
    (mode) => currentResult.modes[mode].checks,
  );
  const passed = allChecks.filter((check) => check.pass).length;
  validationSummary.textContent = `${passed} of ${allChecks.length} palette contracts met`;
  checks.innerHTML = ["light", "dark"]
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
  paletteTitle.textContent = `${result.input.primary} · Light and dark`;
  renderPalettes();
  renderExamples();
  renderRelationships();
  renderFoundationMap();
  renderSemanticMaps();
  renderFocusSpecimens();
  renderQuality();
  renderChecks();
}

function calculatePalette(primary) {
  if (resultCache.has(primary)) {
    return Promise.resolve({
      result: resultCache.get(primary),
      duration: 0,
      cached: true,
    });
  }
  if (!paletteWorker) {
    const startedAt = performance.now();
    return Promise.resolve({
      result: generatePaletteV2({ primary }),
      duration: performance.now() - startedAt,
      cached: false,
    });
  }
  const id = ++workerSequence;
  return new Promise((resolve, reject) => {
    pendingCalculations.set(id, { resolve, reject });
    paletteWorker.postMessage({ id, primary });
  });
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
    const calculated = await calculatePalette(primary);
    resultCache.set(primary, calculated.result);
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

document.querySelector("#copy-craken").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(
      JSON.stringify(serializeCrakenTokens(currentResult), null, 2),
    );
    toast.textContent = "Craken token JSON copied";
  } catch {
    toast.textContent = "Clipboard unavailable";
  }
  toast.classList.add("visible");
  window.setTimeout(() => toast.classList.remove("visible"), 1600);
});

gallery.addEventListener("click", async (event) => {
  const card = event.target.closest("[data-primary]");
  if (!card) return;
  if (event.target.closest('[data-action="load"]')) {
    primaryInput.value = card.dataset.primary;
    picker.value = card.dataset.primary;
    calculationStatus.textContent =
      "Loading the full inspector in a background worker…";
    const calculated = await calculatePalette(card.dataset.primary);
    resultCache.set(card.dataset.primary, calculated.result);
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
  saveEvaluationRecords();
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
  saveEvaluationRecords();
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
    saveEvaluationRecords();
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
    gallery.innerHTML = `<p class="gallery-loading">Calculating 12 paired palettes…</p>`;
    window.requestAnimationFrame(() => {
      renderGallery().catch(() => {
        gallery.innerHTML = `<p class="gallery-loading">Precomputed evaluation set unavailable.</p>`;
      });
    });
  }
});

foundationMap.addEventListener("click", (event) => {
  const node = event.target.closest(".foundation-node");
  if (!node) return;
  foundationMap
    .querySelectorAll(".foundation-node.active")
    .forEach((item) => item.classList.remove("active"));
  node.classList.add("active");
  const swatch = document.querySelector(
    `.swatch[data-mode="${node.dataset.mode}"][data-role="${node.dataset.role}"]`,
  );
  if (!swatch) return;
  document
    .querySelectorAll(".decision-candidate.graph-target")
    .forEach((candidate) => candidate.classList.remove("graph-target"));
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
    .querySelectorAll(".foundation-node.active")
    .forEach((node) => node.classList.remove("active"));
  const node = foundationMap.querySelector(
    `.foundation-node.selected[data-mode="${swatch.dataset.mode}"][data-role="${swatch.dataset.role}"]`,
  );
  node?.classList.add("active");
});

const initialResult = generatePaletteV2({ primary: primaryInput.value });
resultCache.set(initialResult.input.primary, initialResult);
render(initialResult);
