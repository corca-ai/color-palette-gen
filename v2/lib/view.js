import { hexToRgb, rgbToOklch } from "../../lib/color-math.js";

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
  return `<details class="swatch" data-mode="${mode}" data-role="${role}"${role === "primary" ? " open" : ""}><summary><div class="swatch-color" style="background:${color}"></div><div class="swatch-copy"><strong>${role}</strong><code>${color}</code><small>${colorCoordinates(color)}</small></div><span class="why-label">Why?</span></summary>${decisionView(decision)}</details>`;
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
    <div class="palette-groups">${GROUPS.map((group) => `<section class="color-group"><h3>${group.name}</h3><div class="swatch-grid">${group.roles.map((role) => swatch(values[role], role, modeResult.decisions[role], modeResult.mode)).join("")}</div></section>`).join("")}</div>
  </article>`;
}

function exampleStyle(modeResult) {
  return modeResult.tokens
    .map(([color, role]) => `--sample-${role.replaceAll(" ", "-")}:${color}`)
    .join(";");
}

export function appliedExampleView(modeResult) {
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
