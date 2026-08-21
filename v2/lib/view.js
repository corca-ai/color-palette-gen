import { hexToRgb, rgbToOklch } from "../../lib/color-math.js";
import { secondaryActionPresentationForMode } from "./action-presentation.js";

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
      "brand source",
      "primary",
      "primary hover",
      "primary active",
      "primary text",
      "primary border",
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

const ROLE_LABELS = {
  "brand source": "Original input",
};

function roleLabel(role) {
  return ROLE_LABELS[role] ?? role;
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function colorValues(tokens) {
  return Object.fromEntries(tokens.map(([color, role]) => [role, color]));
}

export function colorCoordinates(hex) {
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
      ${alias ? "" : `<div class="decision-candidates">${candidateView("Selected · full rules", decision.selected, true)}${candidateView("Best-ranked rejected", decision.alternatives.nearestRejected, false, "rejected")}${candidateView("Next passing", decision.alternatives.nextPassing, false, "passing")}</div>`}
      <div class="decision-evidence"><span>Rule provenance</span>${decision.evidence.map((item) => `<a href="${item.url}" target="_blank" rel="noreferrer"><b>${item.class}</b>${item.label}</a>`).join("")}</div>
    </details>
  </div>`;
}

function swatch(color, role, decision, mode) {
  return `<details class="swatch" data-mode="${mode}" data-role="${role}"><summary><div class="swatch-color" style="background:${color}"></div><div class="swatch-copy"><strong>${roleLabel(role)}</strong><code>${color}</code><small>${colorCoordinates(color)}</small></div><span class="why-label">Why?</span></summary>${decisionView(decision)}</details>`;
}

export function paletteView(modeResult) {
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
    <div class="palette-groups">${GROUPS.map((group) => `<details class="color-group"><summary><span>${group.name}</span><i>${group.roles.map((role) => `<b style="background:${values[role]}" title="${roleLabel(role)}"></b>`).join("")}</i><small>${group.roles.length} roles</small></summary><div class="swatch-grid">${group.roles.map((role) => swatch(values[role], role, modeResult.decisions[role], modeResult.mode)).join("")}</div></details>`).join("")}</div>
  </article>`;
}

function exampleStyle(modeResult) {
  const secondary = secondaryActionPresentationForMode(modeResult);
  return [
    ...modeResult.tokens.map(
      ([color, role]) => `--sample-${role.replaceAll(" ", "-")}:${color}`,
    ),
    `--sample-secondary-action:${secondary.values.default}`,
    `--sample-secondary-action-hover:${secondary.values.hover}`,
    `--sample-secondary-action-active:${secondary.values.active}`,
    `--sample-secondary-action-text:${secondary.values.text}`,
    `--sample-secondary-action-border:${secondary.values.border}`,
  ].join(";");
}

const SAMPLE_SCENARIO_LABELS = Object.freeze({
  workspace: "Workspace",
  "routine-actions": "Routine actions",
  "destructive-confirmation": "Destructive confirmation",
  "feedback-selection": "Feedback & selection",
  "form-focus": "Form & focus",
});

export const SAMPLE_ROLE_COVERAGE = Object.freeze({
  provenanceOnly: Object.freeze(["brand source"]),
  scenarios: Object.freeze({
    workspace: Object.freeze([
      "background",
      "surface",
      "raised surface",
      "muted surface",
      "foreground",
      "muted text",
      "border",
      "input border",
    ]),
    "routine-actions": Object.freeze([
      "primary",
      "primary hover",
      "primary active",
      "primary text",
      "primary border",
    ]),
    "destructive-confirmation": Object.freeze([
      "destructive",
      "destructive hover",
      "destructive active",
      "destructive text",
    ]),
    "feedback-selection": Object.freeze([
      "warning",
      "warning hover",
      "warning active",
      "warning text",
      "selection",
      "selection text",
    ]),
    "form-focus": Object.freeze([
      "focus ring",
      "disabled background",
      "disabled text",
      "disabled border",
      "popover",
      "popover text",
    ]),
  }),
});

function workspaceScenario() {
  return `<section class="reference-shell">
    <aside class="reference-sidebar">
      <div class="reference-workspace"><i>C</i><span><strong>Color Lab</strong><small>Example workspace</small></span></div>
      <nav aria-label="reference specimen navigation">
        <a class="selected"><span>◫</span>General<b>3</b></a>
        <a><span>◇</span>Design review</a>
        <a><span>⌁</span>Files</a>
      </nav>
      <button class="reference-secondary" tabindex="-1" aria-disabled="true">＋ New conversation</button>
    </aside>
    <div class="reference-main">
      <header class="reference-channel"><div><strong># design-review</strong><small>Palette application check</small></div><button tabindex="-1" aria-disabled="true">•••</button></header>
      <div class="reference-messages">
        <article><i>AK</i><div><p><strong>Alex Kim</strong><small>10:24</small></p><span>Does the generated palette preserve the application hierarchy in both modes?</span></div></article>
        <article><i>CL</i><div><p><strong>Color Lab</strong><small>10:26</small></p><span>Foundation, content, and navigation roles share one generated palette.</span><em>Palette ready</em></div></article>
      </div>
      <form class="reference-composer"><label><span>Message #design-review</span><textarea rows="2" readonly tabindex="-1">Review the generated colors…</textarea></label><div><button type="button" class="reference-secondary" tabindex="-1" aria-disabled="true">Attach</button><button type="button" class="reference-primary" tabindex="-1" aria-disabled="true">Send</button></div></form>
    </div>
  </section>`;
}

function routineActionsScenario(actionPresentation) {
  return `<section class="reference-scenario-card reference-actions-card" data-action-presentation="${actionPresentation.strategy}">
    <div><p class="reference-kicker">Project settings</p><h3>Save general settings?</h3><p>Your ordinary action remains the only filled button. Destructive stays visually distinct and lower-emphasis.</p></div>
    <div class="reference-action-example">
      <div class="reference-primary-playground"><button type="button" class="reference-primary-demo">Save changes</button><p><span>Primary state</span><output>Default</output></p></div>
      <button type="button" class="reference-destructive-outline">Delete project</button>
    </div>
  </section>`;
}

function destructiveConfirmationScenario(actionPresentation) {
  const presentationCopy =
    "Delete is the sole filled action in this confirmation group; Cancel stays secondary.";
  return `<section class="reference-scenario-card reference-confirmation-card">
    <div class="reference-danger-mark">!</div>
    <div><p class="reference-kicker">Permanent action</p><h3>Move this project to Trash?</h3><p>This removes the project for everyone. You can restore it from Trash for 30 days.</p></div>
    <footer class="reference-feedback" data-action-presentation="${actionPresentation.strategy}" data-secondary-state-policy="confirmation-secondary-state-family-v1" data-presentation-copy="${presentationCopy}"><span><strong>Confirmation required</strong><small>${presentationCopy}</small></span><div class="reference-feedback-actions"><button type="button" class="reference-cancel-demo">Cancel</button><button type="button" class="reference-destructive-demo">Move to Trash</button></div></footer>
  </section>`;
}

function feedbackSelectionScenario() {
  return `<section class="reference-scenario-card">
    <p class="reference-kicker">System feedback and selected content</p>
    <aside class="reference-warning"><strong>Review required</strong><span>This palette has a pending accessibility decision.</span></aside>
    <div class="reference-warning-playground"><button type="button" class="reference-warning-demo">Review warning</button><p><span>Interactive Warning family</span><b class="default">Default</b><b class="hover">Hover</b><b class="active">Pressed</b></p></div>
    <div class="reference-messages reference-selection-list">
      <article><i>AK</i><div><p><strong>Unselected result</strong><small>Default surface</small></p><span>Standard content remains on the application surface.</span></div></article>
      <article class="selected-message"><i>DS</i><div><p><strong>Selected result</strong><small>Selection fill</small></p><span>Selected content uses the generated selection background and text pair.</span></div></article>
    </div>
  </section>`;
}

function formFocusScenario() {
  return `<section class="reference-scenario-card reference-form-scenario">
    <div><p class="reference-kicker">Form boundaries and focus</p><h3>Create a review request</h3><p>Tab through the controls to inspect input borders, text contrast, and the shared focus ring.</p></div>
    <form>
      <label><span>Title</span><input value="Palette review" aria-label="Review title"></label>
      <label><span>Summary</span><textarea rows="3" aria-label="Review summary">Check Light and Dark component states.</textarea></label>
      <label><span>Reviewer · assigned after creation</span><input value="Not assigned" aria-label="Assigned reviewer" disabled></label>
      <aside class="reference-popover" role="note"><strong>Focus tip</strong><span>Use Tab to inspect the generated focus ring.</span><button type="button">Got it</button></aside>
      <div><button type="button" class="reference-secondary">Cancel</button><button type="button" class="reference-primary">Create request</button></div>
    </form>
  </section>`;
}

function sampleScenarioView(scenario, actionPresentation) {
  if (scenario === "routine-actions") {
    return routineActionsScenario(actionPresentation);
  }
  if (scenario === "destructive-confirmation") {
    return destructiveConfirmationScenario(actionPresentation);
  }
  if (scenario === "feedback-selection") return feedbackSelectionScenario();
  if (scenario === "form-focus") return formFocusScenario();
  return workspaceScenario();
}

export function appliedExampleView(
  modeResult,
  actionPresentation,
  scenario = "workspace",
) {
  const label =
    SAMPLE_SCENARIO_LABELS[scenario] ?? SAMPLE_SCENARIO_LABELS.workspace;
  return `<article class="example ${modeResult.mode}" style="${exampleStyle(modeResult)}" data-sample-panel="${scenario}">
    <header class="example-header"><strong>${label} · ${modeResult.mode}</strong><span>Generated semantic roles in context</span></header>
    <div class="example-canvas">${sampleScenarioView(scenario, actionPresentation)}</div>
  </article>`;
}
