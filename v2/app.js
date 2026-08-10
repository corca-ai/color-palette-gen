import {
  hexToRgb,
  isHex,
  normalizeHex,
  rgbToOklch,
} from "../lib/color-math.js";
import { generatePaletteV2, serializeModeCss } from "./lib/palette.js";

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
  { name: "Feedback", roles: ["destructive", "destructive text"] },
];

const form = document.querySelector("#v2-form");
const picker = document.querySelector("#v2-picker");
const primaryInput = document.querySelector("#v2-primary");
const error = document.querySelector("#v2-error");
const palettes = document.querySelector("#palettes");
const examples = document.querySelector("#examples");
const relationships = document.querySelector("#relationships");
const checks = document.querySelector("#checks");
const paletteTitle = document.querySelector("#palette-title");
const validationSummary = document.querySelector("#validation-summary");
const toast = document.querySelector("#toast");
let currentResult;

function colorValues(tokens) {
  return Object.fromEntries(tokens.map(([color, role]) => [role, color]));
}

function colorCoordinates(hex) {
  const { l, c, h } = rgbToOklch(hexToRgb(hex));
  return `L ${Math.round(l * 100)} · C ${c.toFixed(3)} · H ${h.toFixed(1)}°`;
}

function candidateView(label, value) {
  if (!value) return "";
  return `<div class="decision-candidate"><span>${label}</span><i style="background:${value.hex}"></i><strong>${value.hex}</strong><small>${value.reasons.join(" ")}</small></div>`;
}

function decisionView(decision) {
  return `<div class="decision-detail">
    <div class="decision-intent"><span>${decision.strategy} · ${decision.candidateCount} candidate${decision.candidateCount === 1 ? "" : "s"}</span><p>${decision.intent}</p></div>
    <div class="decision-candidates">
      ${candidateView("Selected", decision.selected)}
      ${candidateView("Closest rejected", decision.alternatives.nearestRejected)}
      ${candidateView("Next passing", decision.alternatives.nextPassing)}
    </div>
    <div class="decision-evidence"><span>Rule provenance</span>${decision.evidence.map((item) => `<a href="${item.url}" target="_blank" rel="noreferrer"><b>${item.class}</b>${item.label}</a>`).join("")}</div>
  </div>`;
}

function swatch(color, role, decision) {
  return `<details class="swatch"${role === "primary" ? " open" : ""}><summary><div class="swatch-color" style="background:${color}"></div><div class="swatch-copy"><strong>${role}</strong><code>${color}</code><small>${colorCoordinates(color)}</small></div><span class="why-label">Why?</span></summary>${decisionView(decision)}</details>`;
}

function palette(modeResult) {
  const values = colorValues(modeResult.tokens);
  const uniqueColors = new Set(modeResult.tokens.map(([color]) => color)).size;
  return `<article class="palette ${modeResult.mode}">
    <header class="palette-header"><div><span>${modeResult.mode} palette</span><strong>${modeResult.tokens.length} roles · ${uniqueColors} unique colors</strong></div><i style="background:${values.primary}" aria-label="Primary ${values.primary}"></i></header>
    <div class="palette-strip" aria-hidden="true">${modeResult.tokens
      .filter(([, role]) => !role.includes("text") && role !== "focus ring")
      .map(([color]) => `<i style="background:${color}"></i>`)
      .join("")}</div>
    <div class="palette-groups">${GROUPS.map((group) => `<section class="color-group"><h3>${group.name}</h3><div class="swatch-grid">${group.roles.map((role) => swatch(values[role], role, modeResult.decisions[role])).join("")}</div></section>`).join("")}</div>
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
          <div class="craken-messages">
            <article><i>AK</i><div><p><strong>Alex Kim</strong><small>10:24</small></p><span>Does the generated palette preserve the Craken hierarchy in both modes?</span></div></article>
            <article><i>CL</i><div><p><strong>Color Lab</strong><small>10:26</small></p><span>Foundation, interaction states, focus, and feedback are rendered from the same semantic output.</span><em>Palette ready</em></div></article>
          </div>
          <form class="craken-composer"><label><span>Message #design-review</span><textarea rows="2" readonly>Review the generated colors…</textarea></label><div><button type="button" class="craken-secondary">Attach</button><button type="button" class="craken-primary">Send</button></div></form>
        </div>
      </section>
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
form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!isHex(primaryInput.value)) {
    error.textContent = "Use a six-digit hex color, such as #507096.";
    primaryInput.setAttribute("aria-invalid", "true");
    return;
  }
  error.textContent = "";
  primaryInput.removeAttribute("aria-invalid");
  render(generatePaletteV2({ primary: normalizeHex(primaryInput.value) }));
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

render(generatePaletteV2({ primary: primaryInput.value }));
