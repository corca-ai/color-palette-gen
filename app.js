import {
  contrastLabel,
  contrastRatio,
  hexToRgb,
  inGamut,
  isHex,
  normalizeHex,
  oklchDifference,
  oklchToHex,
  oklchToRawRgb,
  relativeLuminance,
  rgbToOklch,
} from "./lib/color-math.js";
import {
  CONTRAST_CONTRACTS,
  HARMONY_CANDIDATES,
  VIBES,
} from "./lib/palette-config.js";
import {
  completeHarmonyColor,
  deriveHarmonyColor,
  hueDistance,
} from "./lib/harmony.js";
import { buildConstraintReport } from "./lib/constraints.js";
import { generatePalette } from "./lib/palette-generator.js";
import {
  FUNCTION_TO_VAR,
  serializeCss,
  serializeDebug,
  serializeTokens,
} from "./lib/output-format.js";
import { axisMarkerPosition, parseMeasurement } from "./lib/debug-visual.js";

const form = document.querySelector("#palette-form");
const primaryInput = document.querySelector("#primary-color");
const primaryPicker = document.querySelector("#primary-picker");
const secondaryInput = document.querySelector("#secondary-color");
const secondaryPicker = document.querySelector("#secondary-picker");
const additionalInput = document.querySelector("#additional-color");
const additionalPicker = document.querySelector("#additional-picker");
const primaryError = document.querySelector("#primary-error");
const paletteList = document.querySelector("#palette-list");
const stateGrid = document.querySelector("#state-grid");
const buttonHierarchyGrid = document.querySelector("#button-hierarchy-grid");
const buttonUsageGrid = document.querySelector("#button-usage-grid");
const debugNav = document.querySelector("#debug-nav");
const tracePanel = document.querySelector("#trace-panel");
const debugSummary = document.querySelector("#debug-summary");
const resultTitle = document.querySelector("#result-title");
const resultCount = document.querySelector("#result-count");
const resultStatus = document.querySelector("#result-status");
const debugCount = document.querySelector("#debug-count");
const adjustmentCount = document.querySelector("#adjustment-count");
const adjustmentsList = document.querySelector("#adjustments-list");
const lineageCanvas = document.querySelector("#lineage-canvas");
const harmonyOptions = document.querySelector("#harmony-options");
const floatingHarmonyOptions = document.querySelector(
  "#floating-harmony-options",
);
const harmonySwitcherNote = document.querySelector("#harmony-switcher-note");
const hueRelationshipCard = document.querySelector("#hue-relationship-card");
const constraintSummary = document.querySelector("#constraint-summary");
const constraintChapters = document.querySelector("#constraint-chapters");
const constraintBackButton = document.querySelector("#constraint-back-button");
const constraintCurrentView = document.querySelector(
  "#constraint-current-view",
);
const constraintCorrectionsOnly = document.querySelector(
  "#constraint-corrections-only",
);
const constraintSkipButton = document.querySelector("#constraint-skip-button");
const constraintCertificate = document.querySelector("#constraint-certificate");
const toast = document.querySelector("#toast");

let currentResult;
let currentConstraintReport;
let activeDebugFunction = "primary button default";
let activeConstraintFunction = "main text";
let activeHarmonyId = "default";
let activeConstraintSelection = { kind: "overview" };
let correctionsOnly = false;

function tokenMap(tokens) {
  return Object.fromEntries(
    tokens.map(([color, functionName]) => [functionName, color]),
  );
}

function applyCssVariables(tokens) {
  for (const [color, functionName] of tokens) {
    const variable = FUNCTION_TO_VAR[functionName];
    if (variable) document.documentElement.style.setProperty(variable, color);
  }
  if (!tokens.some(([, name]) => name === "secondary accent")) {
    document.documentElement.style.setProperty(
      "--color-secondary-accent",
      tokenMap(tokens)["primary button default"],
    );
  }
  if (!tokens.some(([, name]) => name === "decorative accent")) {
    document.documentElement.style.setProperty(
      "--color-decorative-accent",
      tokenMap(tokens)["primary button default"],
    );
  }
}

function applyDeclaredUsageContracts() {
  document.querySelectorAll("[data-color-usage]").forEach((element) => {
    const contract = CONTRAST_CONTRACTS.find(
      ({ id }) => id === element.dataset.colorUsage,
    );
    if (!contract || contract.backgrounds.length !== 1) return;
    const foregroundVariable = FUNCTION_TO_VAR[contract.foreground];
    const backgroundVariable = FUNCTION_TO_VAR[contract.backgrounds[0]];
    if (!foregroundVariable || !backgroundVariable) return;
    element.style.color = `var(${foregroundVariable})`;
    element.style.backgroundColor = `var(${backgroundVariable})`;
  });
}

function titleForColor(hex) {
  const { h } = rgbToOklch(hexToRgb(hex));
  if (h < 15 || h >= 345) return "Red";
  if (h < 45) return "Vermilion";
  if (h < 75) return "Orange";
  if (h < 110) return "Yellow";
  if (h < 165) return "Green";
  if (h < 205) return "Teal";
  if (h < 255) return "Blue";
  if (h < 300) return "Violet";
  return "Magenta";
}

function renderPalette(result) {
  paletteList.innerHTML = result.tokens
    .map(
      ([color, functionName]) => `
        <button class="palette-row" type="button" data-inspect-function="${functionName}">
          <span class="palette-swatch" style="background:${color}"></span>
          <span>
            <span class="palette-role">${functionName}</span>
            <span class="palette-source">${result.traces[functionName].source}</span>
          </span>
          <span class="palette-hex">${color}</span>
        </button>
      `,
    )
    .join("");

  paletteList.querySelectorAll("[data-inspect-function]").forEach((button) => {
    button.addEventListener("click", () => {
      activeDebugFunction = button.dataset.inspectFunction;
      activeConstraintFunction = button.dataset.inspectFunction;
      openInspector(result, activeConstraintFunction);
    });
  });
}

function renderStates(result) {
  const tokens = tokenMap(result.tokens);
  const foreground = tokens["primary button text"];
  const states = [
    ["Default", tokens["primary button default"], ""],
    ["Hover", tokens["primary button hover"], ""],
    ["Active", tokens["primary button active"], ""],
    ["Focus", tokens["primary button default"], "focus"],
  ];

  stateGrid.innerHTML = states
    .map(([label, color, className]) => {
      const ratio = contrastRatio(foreground, color);
      return `
        <article class="state-card ${className}">
          <div class="state-preview" style="background:${tokens.background}">
            <button type="button" data-preview-only style="background:${color}">Continue</button>
          </div>
          <div class="state-details">
            <strong>${label}</strong>
            <code>${color}</code>
            <span>${ratio.toFixed(2)}:1 · ${contrastLabel(ratio)}</span>
          </div>
        </article>
      `;
    })
    .join("");

  const provenanceLine = (functionName) => `
    <li>
      <i style="background:${tokens[functionName]}"></i>
      <span>${functionName}</span>
      <code>${tokens[functionName]}</code>
    </li>
  `;

  buttonHierarchyGrid.innerHTML = `
    <article class="button-role-card">
      <div class="button-role-meta">
        <span class="button-role-kind generated">Generated role</span>
        <h5>Primary action</h5>
        <p>The dominant action uses dedicated button and interaction-state functions.</p>
      </div>
      <div class="button-role-preview">
        <button class="lab-primary-button" type="button" data-preview-only>
          Publish palette
        </button>
      </div>
      <ul class="button-token-list">
        ${provenanceLine("primary button default")}
        ${provenanceLine("primary button hover")}
        ${provenanceLine("primary button active")}
        ${provenanceLine("primary button text")}
        ${provenanceLine("focus ring")}
      </ul>
    </article>
    <article class="button-role-card" id="states-secondary-family">
      <div class="button-role-meta">
        <span class="button-role-kind composed">Composed example</span>
        <h5>Secondary action</h5>
        <p>A supporting action composed from the secondary accent family—not a generated button role.</p>
      </div>
      <div class="button-role-preview">
        <button class="lab-secondary-button" type="button" data-preview-only>
          Save draft
        </button>
      </div>
      <ul class="button-token-list">
        ${provenanceLine("secondary accent soft")}
        ${provenanceLine("secondary accent text")}
        ${provenanceLine("secondary accent")}
      </ul>
    </article>
    <article class="button-role-card">
      <div class="button-role-meta">
        <span class="button-role-kind composed">Composed example</span>
        <h5>Quiet action</h5>
        <p>A low-emphasis control composed from foundation roles for cancel or dismiss actions.</p>
      </div>
      <div class="button-role-preview">
        <button class="lab-quiet-button" type="button" data-preview-only>
          Cancel
        </button>
      </div>
      <ul class="button-token-list">
        ${provenanceLine("surface")}
        ${provenanceLine("border control")}
        ${provenanceLine("main text")}
        ${provenanceLine("focus ring")}
      </ul>
    </article>
  `;

  buttonUsageGrid.innerHTML = `
    <article class="button-usage-card page-context">
      <span class="button-context-label">Page background</span>
      <div>
        <p>Palette ready</p>
        <h5>Publish this color system?</h5>
        <span>The hierarchy should remain obvious before either action is used.</span>
      </div>
      <div class="button-usage-actions">
        <button class="lab-secondary-button" type="button" data-preview-only>Save draft</button>
        <button class="lab-primary-button" type="button" data-preview-only>Publish palette</button>
      </div>
    </article>
    <article class="button-usage-card surface-context">
      <span class="button-context-label">Surface toolbar</span>
      <div>
        <p>3 colors selected</p>
        <h5>Apply harmony candidate</h5>
        <span>Quiet and dominant actions share a compact working context.</span>
      </div>
      <div class="button-usage-actions">
        <button class="lab-quiet-button" type="button" data-preview-only>Cancel</button>
        <button class="lab-primary-button compact" type="button" data-preview-only>Apply</button>
      </div>
    </article>
  `;
}

function renderColorAxis({ label, candidate, output, maximum, format }) {
  const tolerance = label === "Hue" ? 0.1 : 0.0005;
  const unchanged = Math.abs(candidate - output) < tolerance;
  return `
    <div class="color-axis">
      <div class="color-axis-heading">
        <strong>${label}</strong>
        <span class="${unchanged ? "is-locked" : "is-changed"}">${unchanged ? "Preserved" : "Adjusted"}</span>
      </div>
      <div class="color-axis-track">
        <span class="color-axis-range" style="--axis-from:${axisMarkerPosition(candidate, maximum)}%;--axis-to:${axisMarkerPosition(output, maximum)}%"></span>
        <i class="color-axis-marker candidate" style="left:${axisMarkerPosition(candidate, maximum)}%" aria-hidden="true"></i>
        <i class="color-axis-marker output" style="left:${axisMarkerPosition(output, maximum)}%" aria-hidden="true"></i>
      </div>
      <div class="color-axis-values">
        <span><i class="candidate-dot"></i>Intent ${format(candidate)}</span>
        <span><i class="output-dot"></i>Output ${format(output)}</span>
      </div>
    </div>
  `;
}

function renderHueWheel(result, functionName) {
  const sourceName = functionName.startsWith("secondary")
    ? "secondary"
    : functionName.startsWith("decorative")
      ? "additional"
      : null;
  if (!sourceName) return "";

  const source = result.supportingColors[sourceName];
  const artifact = result.artifacts[functionName];
  if (!source || !artifact) return "";

  const primaryHue = result.primary.h;
  const outputHue = artifact.output.srgb.oklch.h;
  const pointForHue = (hue, radius = 48) => {
    const angle = ((hue - 90) * Math.PI) / 180;
    return {
      x: 70 + Math.cos(angle) * radius,
      y: 70 + Math.sin(angle) * radius,
    };
  };
  const primaryPoint = pointForHue(primaryHue);
  const outputPoint = pointForHue(outputHue);

  return `
    <section class="debug-visual-card hue-wheel-card">
      <div class="debug-visual-heading">
        <div>
          <p class="eyebrow">Hue relationship</p>
          <h4>${source.isDerived ? result.params.harmony : "Explicit supporting color"}</h4>
        </div>
        <span class="visual-status ${source.isDerived ? "pass" : "locked"}">${source.isDerived ? source.edgeLabel : "User hue · locked"}</span>
      </div>
      <div class="mini-hue-layout">
        <svg class="mini-hue-wheel" viewBox="0 0 140 140" role="img" aria-label="Primary hue ${primaryHue.toFixed(1)} degrees connected to ${sourceName} hue ${outputHue.toFixed(1)} degrees">
          <foreignObject x="15" y="15" width="110" height="110">
            <div xmlns="http://www.w3.org/1999/xhtml" class="mini-hue-spectrum"></div>
          </foreignObject>
          <line x1="${primaryPoint.x}" y1="${primaryPoint.y}" x2="${outputPoint.x}" y2="${outputPoint.y}"></line>
          <circle class="hue-point primary" cx="${primaryPoint.x}" cy="${primaryPoint.y}" r="6" style="fill:${result.input.primary}"></circle>
          <circle class="hue-point output" cx="${outputPoint.x}" cy="${outputPoint.y}" r="7" style="fill:${artifact.output.srgb.hex}"></circle>
          <text x="${primaryPoint.x}" y="${primaryPoint.y - 10}" text-anchor="middle">P</text>
          <text x="${outputPoint.x}" y="${outputPoint.y - 11}" text-anchor="middle">${sourceName === "secondary" ? "S" : "A"}</text>
        </svg>
        <dl class="hue-wheel-values">
          <div><dt>Primary</dt><dd>H ${primaryHue.toFixed(1)}°</dd></div>
          <div><dt>${sourceName}</dt><dd>H ${outputHue.toFixed(1)}°</dd></div>
          <div><dt>Rule</dt><dd>${source.relation ?? "Explicit input takes priority over automatic harmony."}</dd></div>
        </dl>
      </div>
    </section>
  `;
}

function renderContrastMeter(functionName) {
  const checks =
    currentConstraintReport?.checks.filter(
      (check) => check.token === functionName && check.category === "contrast",
    ) ?? [];
  return checks
    .map((check) => {
      const actual = parseMeasurement(check.actual);
      const target = parseMeasurement(check.target);
      const maximum = Math.max(12, actual + 1);
      return `
        <section class="debug-visual-card contrast-card">
          <div class="debug-visual-heading">
            <div><p class="eyebrow">Contrast constraint</p><h4>${check.label}</h4></div>
            <span class="visual-status ${check.status}">${check.actual}</span>
          </div>
          <div class="contrast-meter" style="--target:${axisMarkerPosition(target, maximum)}%;--actual:${axisMarkerPosition(actual, maximum)}%">
            <span class="contrast-fail-zone"></span>
            <i class="contrast-threshold"></i>
            <i class="contrast-result"></i>
          </div>
          <div class="contrast-scale"><span>1:1</span><span>Required ${check.target}</span><span>${maximum.toFixed(0)}:1</span></div>
          <p class="visual-explanation">${check.explanation}</p>
        </section>
      `;
    })
    .join("");
}

function renderButtonStateSequence(result, functionName) {
  if (!functionName.startsWith("primary button")) return "";
  const names = [
    "primary button default",
    "primary button hover",
    "primary button active",
  ];
  return `
    <section class="debug-visual-card state-sequence-card">
      <div class="debug-visual-heading">
        <div><p class="eyebrow">Interaction sequence</p><h4>One hue, stepped lightness</h4></div>
        <span class="visual-status locked">Hue locked</span>
      </div>
      <div class="state-sequence">
        ${names
          .map((name, index) => {
            const artifact = result.artifacts[name];
            const color = artifact.output.srgb.hex;
            const oklch = artifact.output.srgb.oklch;
            const nextArtifact = result.artifacts[names[index + 1]];
            const difference = nextArtifact
              ? oklchDifference(oklch, nextArtifact.output.srgb.oklch)
              : null;
            return `
            <div class="state-sequence-item ${name === functionName ? "is-selected" : ""}">
              <span class="state-sequence-swatch" style="background:${color}"></span>
              <strong>${["Default", "Hover", "Active"][index]}</strong>
              <code>${color}</code>
              <small>L ${(oklch.l * 100).toFixed(1)}% · H ${oklch.h.toFixed(1)}°</small>
            </div>
            ${
              difference
                ? `<span class="state-sequence-arrow" aria-label="Perceptual change delta E ${difference.deltaE.toFixed(3)}">
                    <b>→</b>
                    <small>ΔE ${difference.deltaE.toFixed(3)}</small>
                    <small>ΔL ${difference.deltaL.toFixed(3)}</small>
                  </span>`
                : ""
            }
          `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function renderArtifactVisuals(result, functionName) {
  const artifact = result.artifacts[functionName];
  const candidate = artifact.candidate.value;
  const output = artifact.output.srgb.oklch;
  const gamut = artifact.diagnostic.gamut;
  return `
    <div class="debug-visual-grid">
      <section class="debug-visual-card axis-card">
        <div class="debug-visual-heading">
          <div><p class="eyebrow">OKLCH transformation</p><h4>What moved—and what stayed fixed</h4></div>
          <span class="visual-status ${artifact.diagnostic.adjusted ? "adjusted" : "pass"}">${artifact.diagnostic.adjusted ? "Gamut adjusted" : "No gamut change"}</span>
        </div>
        <div class="color-axes">
          ${renderColorAxis({ label: "Lightness", candidate: candidate.l, output: output.l, maximum: 1, format: (value) => `${(value * 100).toFixed(1)}%` })}
          ${renderColorAxis({ label: "Chroma", candidate: candidate.c, output: output.c, maximum: Math.max(0.4, candidate.c, output.c), format: (value) => value.toFixed(4) })}
          ${renderColorAxis({ label: "Hue", candidate: candidate.h, output: output.h, maximum: 360, format: (value) => `${value.toFixed(1)}°` })}
        </div>
        <div class="constraint-chips">
          <span class="${Math.abs(gamut.lightnessDelta) < 0.0005 ? "pass" : "adjusted"}">L ${Math.abs(gamut.lightnessDelta) < 0.0005 ? "preserved" : "shifted"}</span>
          <span class="${gamut.chromaReductionRatio > 0 ? "adjusted" : "pass"}">C ${gamut.chromaReductionRatio > 0 ? `−${(gamut.chromaReductionRatio * 100).toFixed(1)}%` : "preserved"}</span>
          <span class="${Math.abs(gamut.hueDelta) < 0.1 ? "pass" : "adjusted"}">H ${Math.abs(gamut.hueDelta) < 0.1 ? "preserved" : `shifted ${gamut.hueDelta.toFixed(1)}°`}</span>
        </div>
      </section>
      ${renderHueWheel(result, functionName)}
      ${renderButtonStateSequence(result, functionName)}
      ${renderContrastMeter(functionName)}
    </div>
  `;
}

function renderDebug(result) {
  const adjustedCount = Object.values(result.artifacts).filter(
    (artifact) => artifact.diagnostic.adjusted,
  ).length;

  debugSummary.innerHTML = `
    <dl>
      <dt>Input</dt><dd>${result.input.primary}</dd>
      <dt>Vibe</dt><dd>${
        result.params.vibeDefaulted
          ? `${result.input.vibe} → ${result.params.name}`
          : result.params.name
      }</dd>
      <dt>Harmony</dt><dd>${result.params.harmony}</dd>
      <dt>Roles</dt><dd>${result.tokens.length}</dd>
      <dt>Gamut maps</dt><dd>${adjustedCount}</dd>
      <dt>Warnings</dt><dd>${result.warnings.length}</dd>
    </dl>
  `;

  debugNav.innerHTML = result.tokens
    .map(
      ([color, functionName]) => `
        <button type="button" class="${functionName === activeDebugFunction ? "active" : ""}" data-trace="${functionName}">
          <span>${functionName}</span>
          <span class="debug-nav-swatch" style="background:${color}"></span>
        </button>
      `,
    )
    .join("");

  debugNav.querySelectorAll("[data-trace]").forEach((button) => {
    button.addEventListener("click", () => {
      activeDebugFunction = button.dataset.trace;
      activeConstraintFunction = button.dataset.trace;
      renderDebug(result);
      if (constraintCertificate.classList.contains("is-open")) {
        renderConstraintCertificate(
          result,
          currentConstraintReport,
          activeConstraintFunction,
        );
      }
    });
  });

  const trace =
    result.traces[activeDebugFunction] ?? result.traces[result.tokens[0][1]];
  const finalColor = tokenMap(result.tokens)[trace.function];
  tracePanel.innerHTML = `
    <div class="trace-heading">
      <div>
        <p class="eyebrow">Generation trace</p>
        <h3>${trace.function}</h3>
      </div>
      <code>${finalColor}</code>
    </div>
    ${renderArtifactVisuals(result, trace.function)}
    <section class="recipe-card" aria-labelledby="recipe-title">
      <div class="debug-visual-heading">
        <div><p class="eyebrow">Structured recipe</p><h4 id="recipe-title">Source and recorded operations</h4></div>
        <span class="visual-status locked">${trace.recipe.operations.length} operations</span>
      </div>
      <div class="recipe-source"><span>Source</span><strong>${trace.recipe.source}</strong></div>
      <ol class="recipe-operations">
        ${trace.recipe.operations
          .map(
            (operation) => `
              <li>
                <span class="recipe-index">${String(operation.index).padStart(2, "0")}</span>
                <div>
                  <strong>${operation.type}</strong>
                  <p>${operation.rationale}</p>
                  ${operation.input || operation.output ? `<code>${operation.input ?? "—"} → ${operation.output ?? "—"}</code>` : ""}
                </div>
              </li>`,
          )
          .join("")}
      </ol>
    </section>
    <details class="trace-details">
      <summary>
        <span>Detailed calculation trace</span>
        <small>${trace.steps.length} recorded steps</small>
      </summary>
      <div class="trace-details-body">
        ${trace.steps
          .map(
            (step) => `
              <div class="trace-step">
                <span class="trace-stage">${step.stage}</span>
                <div>
                  <div class="trace-message">${step.message}</div>
                  ${
                    step.before || step.after
                      ? `<div class="trace-values">${step.before}${step.before && step.after ? "\n→ " : ""}${step.after}</div>`
                      : ""
                  }
                </div>
              </div>
            `,
          )
          .join("")}
        ${trace.warnings
          .map((warning) => `<div class="trace-warning">${warning}</div>`)
          .join("")}
      </div>
    </details>
  `;
}

function getAdjustments(result) {
  const adjustments = [];

  for (const [functionName, trace] of Object.entries(result.traces)) {
    const color = tokenMap(result.tokens)[functionName];

    for (const step of trace.steps) {
      const changed = step.before && step.after && step.before !== step.after;
      const gamutAdjustment =
        step.stage === "gamut" &&
        step.message.toLowerCase().includes("reduced");
      const vibeAdjustment =
        step.stage === "vibe" &&
        changed &&
        !step.message.includes("1.00 chroma scale");

      if (gamutAdjustment || vibeAdjustment) {
        adjustments.push({
          functionName,
          color,
          kind: gamutAdjustment ? "gamut mapping" : "vibe adjustment",
          message: step.message,
          before: step.before,
          after: step.after,
          warnings: [],
        });
      }
    }

    for (const warning of trace.warnings) {
      const related = adjustments.find(
        (adjustment) => adjustment.functionName === functionName,
      );
      if (related) {
        related.warnings.push(warning);
      } else {
        adjustments.push({
          functionName,
          color,
          kind: "constraint adjustment",
          message:
            "A requested relationship was relaxed to preserve a stronger constraint.",
          before: "",
          after: "",
          warnings: [warning],
        });
      }
    }
  }

  return adjustments;
}

function renderAdjustments(result) {
  const adjustments = getAdjustments(result);
  adjustmentCount.textContent = String(adjustments.length);

  if (!adjustments.length) {
    adjustmentsList.innerHTML = `
      <div class="adjustments-empty">
        <strong>No automatic corrections</strong>
        <p>Every candidate fit the current vibe, contrast, and sRGB constraints as requested.</p>
      </div>
    `;
    return;
  }

  adjustmentsList.innerHTML = adjustments
    .map(
      (adjustment) => `
        <article class="adjustment-card">
          <div class="adjustment-card-header">
            <div>
              <h4>${adjustment.functionName}</h4>
              <span class="adjustment-kind">${adjustment.kind}</span>
            </div>
            <span class="adjustment-swatch" style="background:${adjustment.color}"></span>
          </div>
          <p class="adjustment-reason">${adjustment.message}</p>
          ${
            adjustment.before || adjustment.after
              ? `<div class="adjustment-delta">${adjustment.before}${adjustment.before && adjustment.after ? "\n→ " : ""}${adjustment.after}</div>`
              : ""
          }
          ${adjustment.warnings
            .map(
              (warning) => `<div class="adjustment-warning">${warning}</div>`,
            )
            .join("")}
        </article>
      `,
    )
    .join("");
}

function renderHarmonyOptions(result) {
  const candidates = HARMONY_CANDIDATES[result.params.name];
  const additionalInput = result.input.additionalColors[0] ?? null;
  const lockedCount =
    Number(Boolean(result.input.secondary)) + Number(Boolean(additionalInput));

  harmonySwitcherNote.textContent =
    lockedCount === 2
      ? "Both supporting hues are user-locked; candidates share the same hues."
      : lockedCount === 1
        ? "One supporting hue is user-locked; the other follows the candidate."
        : "Both supporting hues are derived from the selected candidate.";

  const optionsMarkup = candidates
    .map((candidate, index) => {
      const candidateParams = {
        ...VIBES[result.params.name],
        name: result.params.name,
        harmony: candidate.label.toLowerCase(),
        hueOffsets: candidate.offsets,
      };
      const secondary = result.input.secondary
        ? result.input.secondary
        : deriveHarmonyColor(
            result.primary,
            candidateParams,
            candidate.offsets[0],
            "secondary",
          ).hex;
      const additional = additionalInput
        ? additionalInput
        : result.input.secondary
          ? completeHarmonyColor(
              result.primary,
              result.input.secondary,
              candidateParams,
            ).hex
          : deriveHarmonyColor(
              result.primary,
              candidateParams,
              candidate.offsets[1],
              "additional",
            ).hex;
      const selected = candidate.id === result.params.harmonyId;

      return `
        <button
          type="button"
          class="harmony-option"
          role="radio"
          aria-checked="${selected}"
          tabindex="${selected ? "0" : "-1"}"
          data-harmony-id="${candidate.id}"
          data-harmony-index="${index}"
        >
          <span class="harmony-icon" aria-hidden="true">
            <i style="background:${result.input.primary}"></i>
            <i style="background:${secondary}"></i>
            <i style="background:${additional}"></i>
          </span>
          <span>
            <span class="harmony-option-label">${candidate.label}</span>
            <span class="harmony-option-offset">${candidate.offsets
              .map((offset) => `${offset > 0 ? "+" : ""}${offset}°`)
              .join(" / ")}</span>
          </span>
        </button>
      `;
    })
    .join("");

  harmonyOptions.innerHTML = optionsMarkup;
  floatingHarmonyOptions.innerHTML = optionsMarkup;

  const selectCandidate = (button) => {
    activeHarmonyId = button.dataset.harmonyId;
    renderResult(
      generatePalette({
        ...result.input,
        harmonyId: activeHarmonyId,
      }),
    );
  };

  [harmonyOptions, floatingHarmonyOptions].forEach((container) => {
    const optionButtons = [...container.querySelectorAll("[data-harmony-id]")];
    optionButtons.forEach((button, index) => {
      button.addEventListener("click", () => selectCandidate(button));
      button.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
          return;
        }
        event.preventDefault();
        let nextIndex = index;
        if (event.key === "ArrowRight") {
          nextIndex = (index + 1) % optionButtons.length;
        }
        if (event.key === "ArrowLeft") {
          nextIndex = (index - 1 + optionButtons.length) % optionButtons.length;
        }
        if (event.key === "Home") nextIndex = 0;
        if (event.key === "End") nextIndex = optionButtons.length - 1;
        optionButtons[nextIndex].focus();
        selectCandidate(optionButtons[nextIndex]);
      });
    });
  });
}

function harmonyExplanation(harmony) {
  if (harmony.includes("monochromatic")) {
    return "Keeps one hue and creates distinction through lightness and chroma.";
  }
  if (harmony.includes("triadic")) {
    return "Places three hues roughly 120° apart to create distinct color roles.";
  }
  if (harmony.includes("split complement")) {
    return "Uses the two hues beside the direct opposite, keeping contrast while reducing a head-on clash.";
  }
  if (harmony.includes("complementary")) {
    return "Places a supporting hue opposite the primary for the strongest hue separation.";
  }
  if (harmony.includes("analogous")) {
    return "Selects nearby hues to favor continuity and a closely related color family.";
  }
  return "Uses explicit hue offsets to position supporting colors around the primary.";
}

function huePoint(hue, radius = 39) {
  const radians = (hue * Math.PI) / 180;
  return {
    x: 50 + Math.sin(radians) * radius,
    y: 50 - Math.cos(radians) * radius,
  };
}

function renderHueRelationship(result) {
  const secondary = result.supportingColors.secondary;
  const additional = result.supportingColors.additional;
  const additionalInput = result.input.additionalColors[0] ?? null;
  const harmonyComparisons = HARMONY_CANDIDATES[result.params.name].map(
    (candidate) => {
      const candidateParams = {
        ...VIBES[result.params.name],
        name: result.params.name,
        harmony: candidate.label.toLowerCase(),
        hueOffsets: candidate.offsets,
      };
      const secondaryHex = result.input.secondary
        ? result.input.secondary
        : deriveHarmonyColor(
            result.primary,
            candidateParams,
            candidate.offsets[0],
            "secondary",
          ).hex;
      const additionalHex = additionalInput
        ? additionalInput
        : result.input.secondary
          ? completeHarmonyColor(
              result.primary,
              result.input.secondary,
              candidateParams,
            ).hex
          : deriveHarmonyColor(
              result.primary,
              candidateParams,
              candidate.offsets[1],
              "additional",
            ).hex;
      return {
        ...candidate,
        selected: candidate.id === result.params.harmonyId,
        colors: [secondaryHex, additionalHex],
        hues: [secondaryHex, additionalHex].map(
          (hex) => rgbToOklch(hexToRgb(hex)).h,
        ),
      };
    },
  );
  const alternativeHueMarks = harmonyComparisons
    .filter(({ selected }) => !selected)
    .flatMap((candidate) =>
      candidate.hues.map((hue, index) => ({
        candidate: candidate.label,
        color: candidate.colors[index],
        point: huePoint(hue, 43),
      })),
    );
  const hues = [
    {
      key: "P",
      label: "Primary",
      hex: result.input.primary,
      hue: result.primary.h,
      relation: "Input anchor",
    },
    {
      key: "S",
      label: "Secondary",
      hex: secondary.hex,
      hue: rgbToOklch(hexToRgb(secondary.hex)).h,
      relation: secondary.isDerived
        ? secondary.relation
        : "User input · automatic relation bypassed",
    },
    {
      key: "A",
      label: "Additional",
      hex: additional.hex,
      hue: rgbToOklch(hexToRgb(additional.hex)).h,
      relation: additional.isDerived
        ? additional.relation
        : "User input · automatic relation bypassed",
    },
  ];
  const points = hues.map((color, index) => {
    const overlapCount = hues
      .slice(0, index)
      .filter((previous) => hueDistance(previous.hue, color.hue) < 8).length;
    return {
      ...color,
      point: huePoint(color.hue, 39 - overlapCount * 8),
    };
  });
  const derivedCount =
    Number(secondary.isDerived) + Number(additional.isDerived);
  const policyStatus =
    derivedCount === 2
      ? "Both supporting hues follow this rule."
      : !secondary.isDerived && additional.isDerived
        ? "Secondary is locked by user input; additional completes the relationship formed with primary."
        : secondary.isDerived && !additional.isDerived
          ? "Additional is locked by user input; secondary follows the selected template."
          : "Both supporting hues are locked by user input, so this rule does not move them.";

  hueRelationshipCard.innerHTML = `
    <div class="hue-card-copy">
      <p class="eyebrow">Hue relationship</p>
      <h3 id="hue-relationship-title">How supporting hues are chosen.</h3>
      <p>
        A color wheel maps hue onto a 0–360° circle.
        <strong>${result.params.harmony}</strong> is the active placement rule.
        ${harmonyExplanation(result.params.harmony)}
      </p>
      <div class="hue-policy-status">
        ${policyStatus}
      </div>
      <p class="hue-card-limit">
        Hue chooses a direction, not the final color. Role, vibe, contrast, and
        sRGB checks adjust lightness and chroma afterward.
      </p>
    </div>
    <div class="hue-wheel-panel">
      <div class="hue-wheel" aria-label="Current hues positioned on a color wheel">
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <g class="harmony-alternative-marks">
            ${alternativeHueMarks
              .map(
                ({ candidate, color, point }) => `
                  <line class="alternative-underlay" x1="50" y1="50" x2="${point.x}" y2="${point.y}"></line>
                  <line class="alternative-line" x1="50" y1="50" x2="${point.x}" y2="${point.y}"></line>
                  <circle cx="${point.x}" cy="${point.y}" r="1.8" style="fill:${color}">
                    <title>${candidate}</title>
                  </circle>
                `,
              )
              .join("")}
          </g>
          <polyline
            class="hue-relation-underlay"
            points="${points.map(({ point }) => `${point.x},${point.y}`).join(" ")} ${points[0].point.x},${points[0].point.y}"
          ></polyline>
          <polyline
            class="hue-relation-line"
            points="${points.map(({ point }) => `${point.x},${point.y}`).join(" ")} ${points[0].point.x},${points[0].point.y}"
          ></polyline>
        </svg>
        ${points
          .map(
            ({ key, label, hex, hue, point }) => `
              <span
                class="hue-wheel-point"
                style="--point-x:${point.x}%;--point-y:${point.y}%;--point-color:${hex}"
                title="${label}: ${hue.toFixed(1)}°"
              >${key}</span>
            `,
          )
          .join("")}
        <span class="hue-wheel-center">H</span>
      </div>
      <div class="hue-equations">
        ${hues
          .map(
            ({ key, label, hex, hue, relation }) => `
              <div>
                <span class="hue-equation-key" style="background:${hex}">${key}</span>
                <span>
                  <strong>${label} · H ${hue.toFixed(1)}°</strong>
                  <small>${relation}</small>
                </span>
              </div>
            `,
          )
          .join("")}
      </div>
      <div class="hue-comparison-list" aria-label="Compared harmony candidates">
        ${harmonyComparisons
          .map(
            (candidate) => `
              <div class="${candidate.selected ? "selected" : ""}">
                <span class="hue-comparison-swatches" aria-hidden="true">
                  <i style="background:${result.input.primary}"></i>
                  <i style="background:${candidate.colors[0]}"></i>
                  <i style="background:${candidate.colors[1]}"></i>
                </span>
                <span><strong>${candidate.label}</strong><small>${candidate.selected ? "Selected relationship" : "Not selected"}</small></span>
              </div>
            `,
          )
          .join("")}
      </div>
    </div>
  `;
}

function constraintStatusLabel(status) {
  return {
    pass: "Passed",
    adjusted: "Adjusted",
    fail: "Failed",
  }[status];
}

function renderConstraintCertificate(result, report, functionName) {
  const checks = report.checks.filter((check) => check.token === functionName);
  const color = tokenMap(result.tokens)[functionName];
  const trace = result.traces[functionName];
  const resolvedChecks =
    checks.length > 0
      ? checks
      : [
          {
            status: "pass",
            category: "role",
            label: "Semantic role resolved",
            target: "Export a valid role color",
            actual: color,
            explanation:
              "This token has no additional measurable condition beyond its documented derivation.",
          },
        ];

  constraintCertificate.innerHTML = `
    <div class="certificate-heading">
      <div>
        <span class="certificate-kicker">Token inspector</span>
        <h4>${functionName}</h4>
      </div>
      <div class="certificate-heading-actions">
        <span class="certificate-swatch" style="background:${color}"></span>
        <button type="button" class="certificate-close" aria-label="Close token inspector">×</button>
      </div>
    </div>
    <h5 class="certificate-section-title">Conditions</h5>
    <div class="certificate-checks">
      ${resolvedChecks
        .map(
          (check) => `
            <article class="certificate-check ${check.status}">
              <div class="certificate-check-heading">
                <span class="constraint-mark" aria-hidden="true"></span>
                <strong>${check.label}</strong>
                <span>${constraintStatusLabel(check.status)}</span>
              </div>
              <dl>
                <div><dt>Target</dt><dd>${check.target}</dd></div>
                <div><dt>Actual</dt><dd>${check.actual}</dd></div>
              </dl>
              <p>${check.explanation}</p>
            </article>
          `,
        )
        .join("")}
    </div>
    <h5 class="certificate-section-title">Derivation</h5>
    <ol class="certificate-trace">
      ${(trace?.recipe.operations ?? [])
        .map(
          (operation) => `
            <li>
              <span>${operation.type}</span>
              <div>
                <strong>${operation.rationale}</strong>
                ${
                  operation.input || operation.output
                    ? `<code>${operation.input ?? "—"} → ${operation.output ?? "—"}</code>`
                    : ""
                }
              </div>
            </li>
          `,
        )
        .join("")}
    </ol>
  `;
  constraintCertificate
    .querySelector(".certificate-close")
    .addEventListener("click", closeInspector);
}

function openInspector(result, functionName, report = currentConstraintReport) {
  activeConstraintFunction = functionName;
  activeDebugFunction = functionName;
  renderConstraintCertificate(result, report, functionName);
  renderDebug(result);
  constraintCertificate.classList.add("is-open");
  constraintCertificate.setAttribute("aria-hidden", "false");
}

function closeInspector() {
  constraintCertificate.classList.remove("is-open");
  constraintCertificate.setAttribute("aria-hidden", "true");
}

function constraintStatusSummary(checks) {
  const failed = checks.filter((check) => check.status === "fail").length;
  const adjusted = checks.filter((check) => check.status === "adjusted").length;
  return {
    failed,
    adjusted,
    status: failed > 0 ? "fail" : adjusted > 0 ? "adjusted" : "pass",
  };
}

function gamutExportUnchanged(check) {
  if (
    check.category !== "gamut" ||
    !check.metrics?.candidate ||
    !check.metrics?.output
  )
    return false;
  return (
    oklchToHex(check.metrics.candidate).hex.toUpperCase() ===
    oklchToHex(check.metrics.output).hex.toUpperCase()
  );
}

function decisionJourney(check) {
  const decision = check.decision;
  if (!decision) return "";
  const matchedRelation =
    check.category === "relation" &&
    decision.resolved.color &&
    relationTargetMatchesActual(check, decision.resolved.color);
  const exportUnchangedGamut = gamutExportUnchanged(check);
  const modeLabel = decision.mode.toUpperCase();
  const connector = decision.mode === "validated" ? "validated" : "changed";
  const delta = decision.delta
    ? `ΔL ${decision.delta.deltaL.toFixed(3)} · ΔC ${decision.delta.deltaC.toFixed(3)} · ΔH ${decision.delta.deltaH.toFixed(1)}° · ΔE ${decision.delta.deltaE.toFixed(3)}`
    : "";
  return `
    <div class="decision-journey ${decision.mode}">
      <div class="decision-mode-row">
        <span class="decision-mode">${modeLabel}</span>
      </div>
      ${
        exportUnchangedGamut
          ? `<div class="decision-compact-path matched">
               <div>
                 <i class="decision-swatch" style="background:${decision.resolved.color}"></i>
                 <span><small>Export unchanged</small><strong>${decision.resolved.color}</strong></span>
               </div>
             </div>`
          : matchedRelation
            ? `<div class="decision-compact-path matched">
               <div>
                 <i class="decision-swatch" style="background:${decision.resolved.color}"></i>
                 <span><small>Resolved relation</small><strong>Target matched · ${decision.resolved.label}</strong></span>
               </div>
             </div>`
            : `<div class="decision-compact-path">
               <div>
                 ${decision.candidate.color ? `<i class="decision-swatch" style="background:${decision.candidate.color}"></i>` : ""}
                 <span><small>Candidate</small><strong>${decision.candidate.label}</strong></span>
               </div>
               <span aria-hidden="true">→</span>
               <div>
                 ${decision.resolved.color ? `<i class="decision-swatch" style="background:${decision.resolved.color}"></i>` : ""}
                 <span><small>Resolved</small><strong>${decision.resolved.label}</strong></span>
               </div>
             </div>`
      }
      <details class="decision-details">
        <summary>Full decision path</summary>
        <div class="decision-flow">
          <div class="decision-step intent">
            <span>01 Intent</span>
            <strong>${decision.intent}</strong>
          </div>
          <i class="decision-connector ${connector}" aria-hidden="true"></i>
          <div class="decision-step candidate">
            <span>02 Candidate</span>
            ${decision.candidate.color ? `<i class="decision-swatch" style="background:${decision.candidate.color}"></i>` : ""}
            <strong>${decision.candidate.label}</strong>
            ${Number.isFinite(decision.candidate.value) ? `<small>${decision.candidate.value.toFixed(2)}:1</small>` : ""}
          </div>
          <i class="decision-connector ${connector}" aria-hidden="true"></i>
          <div class="decision-step action">
            <span>03 Decision</span>
            <strong>${modeLabel}</strong>
            <small>${decision.axis}</small>
          </div>
          <i class="decision-connector ${connector}" aria-hidden="true"></i>
          <div class="decision-step resolved">
            <span>04 Resolved</span>
            ${decision.resolved.color ? `<i class="decision-swatch" style="background:${decision.resolved.color}"></i>` : ""}
            <strong>${decision.resolved.label}</strong>
            ${Number.isFinite(decision.resolved.value) ? `<small>${decision.resolved.value.toFixed(2)}:1</small>` : ""}
          </div>
        </div>
        ${
          decision.choices
            ? `<div class="decision-choices" aria-label="Compared candidates">
                ${decision.choices
                  .map(
                    ({ color, value }) => `
                      <span class="${color === decision.resolved.color ? "selected" : ""}">
                        <i style="background:${color}"></i>
                        <strong>${color}</strong>
                        <small>${value.toFixed(2)}:1</small>
                      </span>
                    `,
                  )
                  .join("")}
              </div>`
            : ""
        }
        <div class="decision-rationale">
          <p>${decision.optimization}</p>
          <span>${decision.lockedAxes.length ? `${decision.lockedAxes.map((axis) => `${axis} locked`).join(" · ")} · ` : ""}${delta || decision.axis}</span>
        </div>
      </details>
    </div>
  `;
}

const REGION_WIDTH = 360;
const REGION_HEIGHT = 190;
const REGION_MARGIN = { left: 34, right: 14, top: 14, bottom: 28 };
const REGION_MAX_CHROMA = 0.4;
const regionFieldCache = new Map();
const regionBoundaryCache = new Map();
const polarFieldCache = new Map();

function cacheResult(cache, key, create) {
  if (!key) return create();
  if (cache.has(key)) return cache.get(key);
  if (cache.size >= 80) cache.clear();
  const value = create();
  cache.set(key, value);
  return value;
}

function regionX(lightness) {
  return (
    REGION_MARGIN.left +
    lightness * (REGION_WIDTH - REGION_MARGIN.left - REGION_MARGIN.right)
  );
}

function regionY(chroma) {
  return (
    REGION_HEIGHT -
    REGION_MARGIN.bottom -
    (chroma / REGION_MAX_CHROMA) *
      (REGION_HEIGHT - REGION_MARGIN.top - REGION_MARGIN.bottom)
  );
}

function sampledChromaBoundary(hue, predicate = () => true, cacheKey = null) {
  return cacheResult(regionBoundaryCache, cacheKey, () => {
    const points = [];
    const lightnessSteps = 192;
    const coarseChromaSteps = 48;
    const accepts = (color) => {
      const raw = oklchToRawRgb(color);
      return inGamut(raw) && predicate(oklchToHex(color).hex, color);
    };
    for (let index = 0; index <= lightnessSteps; index += 1) {
      const lightness = 0.02 + (index / lightnessSteps) * 0.96;
      let maximum = null;
      for (let step = 0; step <= coarseChromaSteps; step += 1) {
        const chroma = (step / coarseChromaSteps) * REGION_MAX_CHROMA;
        const color = { l: lightness, c: chroma, h: hue };
        if (accepts(color)) maximum = chroma;
      }
      let upper =
        maximum === null || maximum >= REGION_MAX_CHROMA
          ? null
          : Math.min(
              REGION_MAX_CHROMA,
              maximum + REGION_MAX_CHROMA / coarseChromaSteps,
            );
      if (maximum !== null && upper !== null) {
        let lower = maximum;
        for (let refinement = 0; refinement < 14; refinement += 1) {
          const chroma = (lower + upper) / 2;
          if (accepts({ l: lightness, c: chroma, h: hue })) lower = chroma;
          else upper = chroma;
        }
        maximum = lower;
      }
      points.push(maximum !== null ? { lightness, chroma: maximum } : null);
    }
    return points;
  });
}

function regionCurvePath(points) {
  let startsSegment = true;
  return points
    .map((point) => {
      if (!point) {
        startsSegment = true;
        return "";
      }
      const command = `${startsSegment ? "M" : "L"} ${regionX(point.lightness)} ${regionY(point.chroma)}`;
      startsSegment = false;
      return command;
    })
    .join(" ");
}

function regionPoint(color, kind) {
  if (!color) return "";
  const x = regionX(color.l);
  const y = regionY(color.c);
  const fill = oklchToHex(color).hex;
  if (kind === "candidate") {
    const path = `M ${x} ${y - 3.5} L ${x + 3.5} ${y} L ${x} ${y + 3.5} L ${x - 3.5} ${y} Z`;
    return `<g class="region-point candidate"><path class="marker-halo" d="${path}"></path><path class="marker-color" style="fill:${fill}" d="${path}"></path></g>`;
  }
  const path = `M ${x} ${y - 4.5} L ${x + 4} ${y + 3.5} L ${x - 4} ${y + 3.5} Z`;
  return `
    <g class="region-point resolved"><path class="marker-halo" d="${path}"></path><path class="marker-color" style="fill:${fill}" d="${path}"></path></g>
  `;
}

function regionAlternativePoint(color) {
  if (!color) return "";
  const x = regionX(color.l);
  const y = regionY(color.c);
  const fill = oklchToHex(color).hex;
  const path = `M ${x - 3.5} ${y - 3.5} H ${x + 3.5} V ${y + 3.5} H ${x - 3.5} Z`;
  return `<g class="region-point alternative"><path class="marker-halo" d="${path}"></path><path class="marker-color" style="fill:${fill}" d="${path}"></path></g>`;
}

function lcFieldDataUrl(hue, predicate = () => true, cacheKey = null) {
  return cacheResult(regionFieldCache, cacheKey, () => {
    const canvas = document.createElement("canvas");
    canvas.width = 624;
    canvas.height = 296;
    const context = canvas.getContext("2d");
    const image = context.createImageData(canvas.width, canvas.height);
    for (let y = 0; y < canvas.height; y += 1) {
      const chroma = (1 - y / (canvas.height - 1)) * REGION_MAX_CHROMA;
      for (let x = 0; x < canvas.width; x += 1) {
        const lightness = x / (canvas.width - 1);
        const color = { l: lightness, c: chroma, h: hue };
        const raw = oklchToRawRgb(color);
        const gamut = inGamut(raw);
        const feasible = gamut && predicate(oklchToHex(color).hex, color);
        const offset = (y * canvas.width + x) * 4;
        const source = gamut ? raw : { r: 0.065, g: 0.06, b: 0.055 };
        const visibility = feasible ? 1 : gamut ? 0.2 : 1;
        const base = gamut ? 0.065 : 0;
        image.data[offset] = Math.round((source.r * visibility + base) * 255);
        image.data[offset + 1] = Math.round(
          (source.g * visibility + base) * 255,
        );
        image.data[offset + 2] = Math.round(
          (source.b * visibility + base) * 255,
        );
        image.data[offset + 3] = 255;
      }
    }
    context.putImageData(image, 0, 0);
    return canvas.toDataURL();
  });
}

function regionColorKey(color, kind, label) {
  if (!color) return "";
  const display = oklchToHex(color).hex;
  return `
    <div class="region-color-key ${kind}">
      <span class="region-key-marker" aria-hidden="true"></span>
      <span class="region-key-swatch" style="background:${display}"></span>
      <span><strong>${label}</strong><small>${display} · L ${color.l.toFixed(3)} C ${color.c.toFixed(3)}</small></span>
    </div>
  `;
}

function lcRegionMap({
  hue,
  predicate,
  candidate,
  resolved,
  label,
  feasibleLabel,
  boundaries = [],
  alternatives = [],
  cacheKey = null,
  exportUnchanged = false,
}) {
  const boundary = sampledChromaBoundary(
    hue,
    predicate,
    cacheKey ? `${cacheKey}:aggregate-boundary` : null,
  );
  const boundaryLayers = boundaries.map((item) => ({
    ...item,
    points: sampledChromaBoundary(hue, item.predicate, item.cacheKey),
  }));
  const field = lcFieldDataUrl(
    hue,
    predicate,
    cacheKey ? `${cacheKey}:field` : null,
  );
  const candidatePoint = candidate
    ? `${regionX(candidate.l)},${regionY(candidate.c)}`
    : null;
  const resolvedPoint = resolved
    ? `${regionX(resolved.l)},${regionY(resolved.c)}`
    : null;
  const unchanged =
    candidate &&
    resolved &&
    oklchDifference(candidate, resolved).deltaE < 0.0005;
  const coincident =
    candidate &&
    resolved &&
    Math.hypot(
      regionX(candidate.l) - regionX(resolved.l),
      regionY(candidate.c) - regionY(resolved.c),
    ) < 14;
  return `
    <figure class="feasible-region-figure">
      <svg viewBox="0 0 ${REGION_WIDTH} ${REGION_HEIGHT}" role="img" aria-label="${label}">
        <image class="region-color-field" href="${field}" x="${REGION_MARGIN.left}" y="${REGION_MARGIN.top}" width="${REGION_WIDTH - REGION_MARGIN.left - REGION_MARGIN.right}" height="${REGION_HEIGHT - REGION_MARGIN.top - REGION_MARGIN.bottom}" preserveAspectRatio="none"></image>
        <g class="region-grid">
          <line x1="${regionX(0.25)}" x2="${regionX(0.25)}" y1="${REGION_MARGIN.top}" y2="${REGION_HEIGHT - REGION_MARGIN.bottom}"></line>
          <line x1="${regionX(0.5)}" x2="${regionX(0.5)}" y1="${REGION_MARGIN.top}" y2="${REGION_HEIGHT - REGION_MARGIN.bottom}"></line>
          <line x1="${regionX(0.75)}" x2="${regionX(0.75)}" y1="${REGION_MARGIN.top}" y2="${REGION_HEIGHT - REGION_MARGIN.bottom}"></line>
          <line x1="${REGION_MARGIN.left}" x2="${REGION_WIDTH - REGION_MARGIN.right}" y1="${regionY(0.1)}" y2="${regionY(0.1)}"></line>
          <line x1="${REGION_MARGIN.left}" x2="${REGION_WIDTH - REGION_MARGIN.right}" y1="${regionY(0.2)}" y2="${regionY(0.2)}"></line>
          <line x1="${REGION_MARGIN.left}" x2="${REGION_WIDTH - REGION_MARGIN.right}" y1="${regionY(0.3)}" y2="${regionY(0.3)}"></line>
        </g>
        ${boundaryLayers
          .map(
            (item, index) =>
              `<path class="region-constraint-boundary ${item.limiting ? "limiting" : ""}" style="--boundary-color:${item.color}" d="${regionCurvePath(item.points)}" data-boundary-index="${index}"></path>`,
          )
          .join("")}
        ${boundaryLayers.length ? "" : `<path class="region-boundary aggregate" d="${regionCurvePath(boundary)}"></path>`}
        ${candidatePoint && resolvedPoint && !coincident ? `<path class="region-movement" d="M ${candidatePoint} L ${resolvedPoint}"></path>` : ""}
        ${alternatives.map(({ color }) => regionAlternativePoint(color)).join("")}
        ${coincident ? regionPoint(resolved, "resolved") : `${regionPoint(candidate, "candidate")}${regionPoint(resolved, "resolved")}`}
        <g class="region-axis-labels">
          <text x="${REGION_WIDTH / 2}" y="${REGION_HEIGHT - 4}" text-anchor="middle">OKLCH lightness →</text>
          <text x="10" y="${REGION_HEIGHT / 2}" transform="rotate(-90 10 ${REGION_HEIGHT / 2})" text-anchor="middle">Chroma →</text>
        </g>
      </svg>
      <div class="region-color-keys">
        ${exportUnchanged ? regionColorKey(resolved, "unchanged", "Export unchanged") : unchanged ? regionColorKey(resolved, "unchanged", "Candidate = resolved") : `${regionColorKey(candidate, "candidate", "Candidate")}${regionColorKey(resolved, "resolved", "Resolved")}`}
        ${alternatives
          .map(({ color, label: alternativeLabel }) =>
            regionColorKey(color, "alternative", alternativeLabel),
          )
          .join("")}
      </div>
      ${
        boundaryLayers.length
          ? `<div class="region-constraint-legend">${boundaryLayers
              .map(
                (item, index) =>
                  `<span class="${item.limiting ? "limiting" : ""}"><i style="--boundary-color:${item.color}"></i>${index + 1}. ${item.label}${item.limiting ? " · limiting" : ""}</span>`,
              )
              .join("")}</div>`
          : ""
      }
      <figcaption><span><i></i>${feasibleLabel}</span><span>${coincident && !unchanged && !exportUnchanged ? "Markers coincide at this scale · " : ""}Dimmed = rejected · Fixed H ${hue.toFixed(1)}°</span></figcaption>
    </figure>
  `;
}

function contrastSelectionPlane(check) {
  const target = check.metrics.target;
  const backgrounds = check.metrics.pairs;
  const choices = check.decision.choices;
  const selectedColor = check.decision.resolved.color;
  const plot = (value) => 24 + value * 142;
  const darkBoundary = [];
  const lightBoundary = [];
  for (let index = 0; index <= 32; index += 1) {
    const background = index / 32;
    darkBoundary.push({
      background,
      foreground: Math.max(0, (background + 0.05) / target - 0.05),
    });
    lightBoundary.push({
      background,
      foreground: Math.min(1, target * (background + 0.05) - 0.05),
    });
  }
  const line = (items) =>
    items
      .map(
        ({ foreground, background }, index) =>
          `${index ? "L" : "M"} ${plot(foreground)} ${166 - background * 142}`,
      )
      .join(" ");
  const choiceMarker = (choice, background, backgroundIndex) => {
    const foregroundLuminance = relativeLuminance(choice.color);
    const backgroundLuminance = relativeLuminance(background.background);
    const x = plot(foregroundLuminance);
    const y = 166 - backgroundLuminance * 142;
    const selected = choice.color === selectedColor;
    const path = selected
      ? `M ${x} ${y - 4.5} L ${x + 4} ${y + 3.5} L ${x - 4} ${y + 3.5} Z`
      : `M ${x} ${y - 3.5} L ${x + 3.5} ${y} L ${x} ${y + 3.5} L ${x - 3.5} ${y} Z`;
    const labelX = x + (foregroundLuminance > 0.5 ? -6 : 6);
    return `<g class="region-point ${selected ? "resolved" : "candidate"}"><path class="marker-halo" d="${path}"></path><path class="marker-color" style="fill:${choice.color}" d="${path}"></path><text class="contrast-choice-label" x="${labelX}" y="${y - 7}" text-anchor="${foregroundLuminance > 0.5 ? "end" : "start"}">${backgroundIndex + 1}</text></g>`;
  };
  return `
    <figure class="feasible-region-figure contrast-plane">
      <svg viewBox="0 0 190 190" role="img" aria-label="Foreground and background luminance combinations meeting ${target.toFixed(1)} to 1">
        <rect class="contrast-plane-bg" x="24" y="24" width="142" height="142"></rect>
        <path class="region-feasible" d="${line(darkBoundary)} L 24 24 L 24 166 Z"></path>
        <path class="region-feasible" d="${line(lightBoundary)} L 166 24 L 166 166 Z"></path>
        <path class="contrast-boundary" d="${line(darkBoundary)}"></path>
        <path class="contrast-boundary" d="${line(lightBoundary)}"></path>
        ${choices
          .flatMap((choice) =>
            backgrounds.map((background, index) =>
              choiceMarker(choice, background, index),
            ),
          )
          .join("")}
        <g class="region-axis-labels">
          <text x="95" y="186" text-anchor="middle">Foreground luminance →</text>
          <text x="9" y="95" transform="rotate(-90 9 95)" text-anchor="middle">Background luminance →</text>
        </g>
      </svg>
      <div class="region-color-keys selection-choices">
        ${choices
          .map((choice) => {
            const selected = choice.color === selectedColor;
            return regionColorKey(
              rgbToOklch(hexToRgb(choice.color)),
              selected ? "resolved" : "candidate",
              `${selected ? "Selected" : "Not selected"} · worst ${choice.value.toFixed(2)}:1`,
            );
          })
          .join("")}
      </div>
      <figcaption><span><i></i>Contrast ≥ ${target.toFixed(1)}:1 regions beyond the curves</span><span>Numbers match declared backgrounds</span></figcaption>
    </figure>
  `;
}

function polarPoint(hue, chroma, radius = 70) {
  const angle = (hue * Math.PI) / 180;
  const distance = Math.min(1, chroma / REGION_MAX_CHROMA) * radius;
  return {
    x: 95 + Math.sin(angle) * distance,
    y: 95 - Math.cos(angle) * distance,
  };
}

function relationTargetMatchesActual(check, color) {
  if (check.category !== "relation" || !color) return false;
  const actual = rgbToOklch(hexToRgb(color));
  const targetColor = oklchToHex({
    ...actual,
    h: check.metrics.targetHue,
  }).hex;
  return (
    targetColor.toUpperCase() === color.toUpperCase() ||
    check.metrics.targetHue.toFixed(1) === check.metrics.actualHue.toFixed(1)
  );
}

function polarFieldDataUrl(lightness) {
  const cacheKey = `polar:${lightness.toFixed(4)}`;
  return cacheResult(polarFieldCache, cacheKey, () => {
    const canvas = document.createElement("canvas");
    canvas.width = 284;
    canvas.height = 284;
    const context = canvas.getContext("2d");
    const image = context.createImageData(canvas.width, canvas.height);
    const radius = canvas.width / 2;
    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        const dx = x + 0.5 - radius;
        const dy = y + 0.5 - radius;
        const distance = Math.hypot(dx, dy);
        const offset = (y * canvas.width + x) * 4;
        if (distance > radius) {
          image.data[offset + 3] = 0;
          continue;
        }
        const hue = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
        const chroma = (distance / radius) * REGION_MAX_CHROMA;
        const raw = oklchToRawRgb({ l: lightness, c: chroma, h: hue });
        const gamut = inGamut(raw);
        const source = gamut ? raw : { r: 0.065, g: 0.06, b: 0.055 };
        image.data[offset] = Math.round(source.r * 255);
        image.data[offset + 1] = Math.round(source.g * 255);
        image.data[offset + 2] = Math.round(source.b * 255);
        image.data[offset + 3] = 255;
      }
    }
    context.putImageData(image, 0, 0);
    return canvas.toDataURL();
  });
}

function polarGamutMap(check, color) {
  const actual = rgbToOklch(hexToRgb(color));
  const targetMatchesActual = relationTargetMatchesActual(check, color);
  const points = [];
  for (let hue = 0; hue < 360; hue += 6) {
    let low = 0;
    let high = REGION_MAX_CHROMA;
    for (let index = 0; index < 18; index += 1) {
      const mid = (low + high) / 2;
      if (inGamut(oklchToRawRgb({ l: actual.l, c: mid, h: hue }))) low = mid;
      else high = mid;
    }
    points.push(polarPoint(hue, low));
  }
  const target = polarPoint(check.metrics.targetHue, actual.c);
  const actualPoint = polarPoint(actual.h, actual.c);
  const field = polarFieldDataUrl(actual.l);
  const wedgeStart = polarPoint(
    check.metrics.targetHue - check.metrics.tolerance,
    REGION_MAX_CHROMA,
  );
  const wedgeEnd = polarPoint(
    check.metrics.targetHue + check.metrics.tolerance,
    REGION_MAX_CHROMA,
  );
  return `
    <figure class="feasible-region-figure polar-region">
      <svg viewBox="0 0 190 190" role="img" aria-label="Hue and chroma gamut at lightness ${actual.l.toFixed(3)}">
        <circle class="polar-frame" cx="95" cy="95" r="70"></circle>
        <image class="polar-color-field" href="${field}" x="24" y="24" width="142" height="142"></image>
        <path class="region-boundary" d="${points.map(({ x, y }, index) => `${index ? "L" : "M"} ${x} ${y}`).join(" ")} Z"></path>
        <path class="target-sector" d="M 95 95 L ${wedgeStart.x} ${wedgeStart.y} A 70 70 0 0 1 ${wedgeEnd.x} ${wedgeEnd.y} Z"></path>
        ${targetMatchesActual ? "" : `<path class="region-movement validated" d="M ${target.x} ${target.y} L ${actualPoint.x} ${actualPoint.y}"></path>`}
        <g class="region-point resolved"><path class="marker-halo" d="M ${actualPoint.x} ${actualPoint.y - 4.5} L ${actualPoint.x + 4} ${actualPoint.y + 3.5} L ${actualPoint.x - 4} ${actualPoint.y + 3.5} Z"></path><path class="marker-color" style="fill:${color}" d="M ${actualPoint.x} ${actualPoint.y - 4.5} L ${actualPoint.x + 4} ${actualPoint.y + 3.5} L ${actualPoint.x - 4} ${actualPoint.y + 3.5} Z"></path></g>
        <text class="polar-center-label" x="95" y="99" text-anchor="middle">H × C</text>
      </svg>
      <div class="region-color-keys">
        ${
          targetMatchesActual
            ? regionColorKey(actual, "unchanged", "Target matched")
            : `${regionColorKey({ ...actual, h: check.metrics.targetHue }, "candidate", "Target relation")}
               ${regionColorKey(actual, "resolved", "Actual color")}`
        }
      </div>
      <figcaption><span><i></i>Reproducible sRGB region</span><span>Fixed L ${actual.l.toFixed(3)}</span></figcaption>
    </figure>
  `;
}

function contrastConstraintVisual(check) {
  const { target, pairs } = check.metrics;
  const map =
    check.decision.mode === "selected"
      ? contrastSelectionPlane(check)
      : (() => {
          const candidate = rgbToOklch(
            hexToRgb(check.decision.candidate.color),
          );
          const resolved = rgbToOklch(hexToRgb(check.decision.resolved.color));
          const boundaryColors = ["#B7A7FF", "#FFB077", "#72D8C2", "#F08BA8"];
          const alternatives = (check.decision.solutions ?? [])
            .filter(({ selected }) => !selected)
            .map((solution) => ({
              color: solution.color,
              label: `${solution.direction === "lighter" ? "Lighter" : "Darker"} ${solution.available ? "solution" : "endpoint"} · ${solution.available ? (solution.eligible ? "not nearest" : "rejected by role policy") : `fails at ${solution.ratio.toFixed(2)}:1`}`,
            }));
          const contrastCacheKey = `contrast:${candidate.h.toFixed(3)}:${target}:${pairs.map(({ background }) => background).join(",")}`;
          return lcRegionMap({
            hue: candidate.h,
            predicate: (color) =>
              pairs.every(
                ({ background }) => contrastRatio(color, background) >= target,
              ),
            candidate,
            resolved,
            label: `Lightness and chroma combinations meeting ${target.toFixed(1)} to 1 contrast`,
            feasibleLabel: `sRGB colors meeting ≥ ${target.toFixed(1)}:1 on every declared background`,
            cacheKey: contrastCacheKey,
            boundaries: pairs.map((pair, index) => ({
              label: pair.backgroundName,
              color: boundaryColors[index % boundaryColors.length],
              limiting:
                pair.backgroundName === check.metrics.limitingBackground,
              predicate: (color) =>
                contrastRatio(color, pair.background) >= target,
              cacheKey: `${contrastCacheKey}:background:${pair.background}`,
            })),
            alternatives,
          });
        })();
  return `
    <div class="constraint-visual-summary">
      <div class="constraint-pair-list">
        ${pairs
          .map(
            (pair, index) => `
              <div class="constraint-pair">
                <span class="constraint-pair-sample" style="color:${pair.foreground};background:${pair.background}">Aa</span>
                <span><strong><b>${index + 1}</b>${pair.ratio.toFixed(2)}:1</strong><small>on ${pair.backgroundName}</small></span>
              </div>
            `,
          )
          .join("")}
      </div>
    </div>
    ${map}
  `;
}

function gamutConstraintVisual(check, color) {
  const candidate = check.metrics.candidate;
  const output = check.metrics.output;
  const boundary = check.metrics.boundary;
  const delta = output.c - candidate.c;
  const exportUnchanged = gamutExportUnchanged(check);
  return `
    <div class="constraint-visual-summary">
      <div class="gamut-swatches ${exportUnchanged ? "unchanged" : ""}">
        ${
          exportUnchanged
            ? `<span class="gamut-swatch" style="background:${color}"></span>
               <span><strong>Export unchanged · ${color}</strong><small>C ${candidate.c.toFixed(3)} → ${output.c.toFixed(3)} · ΔC ${delta.toFixed(3)}</small></span>`
            : `<span class="gamut-swatch candidate" style="background:${oklchToHex(candidate).hex}"></span>
               <span aria-hidden="true">→</span>
               <span class="gamut-swatch" style="background:${color}"></span>
               <span><strong>${check.status === "adjusted" ? "Chroma reduced" : "Candidate retained"}</strong><small>ΔC ${delta.toFixed(3)} · L and H preserved</small></span>`
        }
      </div>
    </div>
    ${lcRegionMap({
      hue: candidate.h,
      candidate,
      resolved: output,
      label: `sRGB lightness and chroma gamut at hue ${candidate.h.toFixed(1)} degrees`,
      feasibleLabel: "Reproducible sRGB colors",
      cacheKey: `gamut:${candidate.h.toFixed(3)}`,
      exportUnchanged,
    })}
    <p class="region-data-note">At candidate L ${candidate.l.toFixed(3)}, the sRGB edge is C ${boundary.toFixed(3)}.</p>
  `;
}

function relationConstraintVisual(check, color) {
  const { actualHue, targetHue, tolerance, deviation } = check.metrics;
  const targetMatchesActual = relationTargetMatchesActual(check, color);
  return `
    <div class="constraint-visual-summary">
      <dl class="relation-values">
        ${
          targetMatchesActual
            ? `<div><dt>Hue</dt><dd>${actualHue.toFixed(1)}°</dd></div>
               <div><dt>Status</dt><dd>Matches target · tolerance ± ${tolerance.toFixed(1)}°</dd></div>`
            : `<div><dt>Target</dt><dd>${targetHue.toFixed(1)}° ± ${tolerance.toFixed(1)}°</dd></div>
               <div><dt>Actual</dt><dd>${actualHue.toFixed(1)}°</dd></div>
               <div><dt>Deviation</dt><dd>${deviation.toFixed(1)}°</dd></div>`
        }
      </dl>
    </div>
    ${polarGamutMap(check, color)}
  `;
}

function stateConstraintVisual(check, color, result) {
  const delta = Math.abs(check.metrics.deltaL);
  const target = check.targetValue;
  const tokens = tokenMap(result.tokens);
  const origin = rgbToOklch(hexToRgb(tokens["primary button default"]));
  const resolved = rgbToOklch(hexToRgb(color));
  const direction = Math.sign(check.metrics.deltaL) || -1;
  const candidate = {
    l: Math.min(1, Math.max(0, origin.l + direction * target)),
    c: origin.c,
    h: origin.h,
  };
  const foreground = tokens["primary button text"];
  return `
    <div class="constraint-visual-summary state-summary">
      <span class="state-color-preview" style="background:${color}"></span>
      <p class="region-data-note">Default L ${origin.l.toFixed(3)} · requested ΔL ${target.toFixed(3)} · resolved ΔL ${delta.toFixed(3)}</p>
    </div>
    ${lcRegionMap({
      hue: origin.h,
      predicate: (mapped, candidateColor) =>
        contrastRatio(foreground, mapped) >= 4.5 &&
        Math.abs(candidateColor.l - origin.l) >= target * 0.85,
      candidate,
      resolved,
      label: `State colors meeting contrast and requested lightness distinction`,
      feasibleLabel: `sRGB + text contrast + ΔL ≥ ${(target * 0.85).toFixed(3)}`,
      cacheKey: `state:${origin.h.toFixed(3)}:${foreground}:${target.toFixed(4)}:${origin.l.toFixed(4)}`,
    })}
  `;
}

function constraintVisual(check, result) {
  const color = tokenMap(result.tokens)[check.token];
  if (check.category === "contrast") return contrastConstraintVisual(check);
  if (check.category === "gamut") return gamutConstraintVisual(check, color);
  if (check.category === "relation")
    return relationConstraintVisual(check, color);
  return stateConstraintVisual(check, color, result);
}

function constraintCardMarkup(check, result) {
  const exportUnchanged = gamutExportUnchanged(check);
  return `
    <article class="constraint-visual-card ${check.status}">
      <div class="constraint-card-heading">
        <div>
          <span class="constraint-token-name">${check.token}</span>
          <h5>${check.label}</h5>
          ${check.usage ? `<span class="constraint-usage">Used by ${check.usage}</span>` : ""}
        </div>
        <span class="constraint-result-label ${check.status}">
          <span class="constraint-mark" aria-hidden="true"></span>
          ${exportUnchanged ? "Normalized" : constraintStatusLabel(check.status)}
        </span>
      </div>
      ${decisionJourney(check)}
      <div class="constraint-visual-stage ${check.category}">
        ${constraintVisual(check, result)}
      </div>
      <p class="constraint-explanation">${exportUnchanged ? "The internal chroma was reduced to fit sRGB, but the exported 8-bit HEX color did not change." : check.explanation}</p>
      <button type="button" class="constraint-inspect-button" data-constraint-token="${check.token}">
        Full calculation <span aria-hidden="true">→</span>
      </button>
    </article>
  `;
}

function renderConstraintMap(
  result,
  report = currentConstraintReport ?? buildConstraintReport(result),
) {
  const categories = [
    [
      "contrast",
      "Contrast",
      "Foreground and background pairs measured against their readability target.",
    ],
    [
      "gamut",
      "sRGB gamut",
      "Candidate chroma compared with the color that can be exported to sRGB.",
    ],
    [
      "relation",
      "Hue relation",
      "Actual supporting hues positioned against the selected harmony target.",
    ],
    [
      "state",
      "State distinction",
      "Interaction colors measured against the lightness step requested by the vibe.",
    ],
  ];

  constraintSummary.innerHTML = categories
    .map(([category, label]) => {
      const categoryChecks = report.checks.filter(
        (check) => check.category === category,
      );
      const { failed, adjusted, status } =
        constraintStatusSummary(categoryChecks);
      return `
        <button
          type="button"
          class="constraint-summary-item ${status} ${activeConstraintSelection.kind === "category" && activeConstraintSelection.category === category ? "active" : ""}"
          data-constraint-category="${category}"
          aria-label="Show only ${label} checks"
          aria-pressed="${activeConstraintSelection.kind === "category" && activeConstraintSelection.category === category}"
        >
          <span class="constraint-mark" aria-hidden="true"></span>
          <span>
            <strong>${label}</strong>
            <small>${categoryChecks.length - failed}/${categoryChecks.length} met${adjusted ? ` · ${adjusted} adjusted` : ""}</small>
          </span>
        </button>
      `;
    })
    .join("");

  const categoryMeta = Object.fromEntries(
    categories.map(([category, label, description]) => [
      category,
      { label, description },
    ]),
  );
  let title = "Overview";
  let detailMarkup = `<div class="constraint-overview-message">
    <span class="constraint-overview-mark" aria-hidden="true">↓</span>
    <div><strong>Select a category, lineage node, or connection.</strong><p>Categories browse checks. Nodes show every check for one token. Connections explain one derivation relationship.</p></div>
  </div>`;

  if (activeConstraintSelection.kind === "category") {
    const { category } = activeConstraintSelection;
    const meta = categoryMeta[category];
    title = meta.label;
    let checks = report.checks.filter((check) => check.category === category);
    if (correctionsOnly)
      checks = checks.filter((check) => check.status !== "pass");
    detailMarkup = `
      <section class="constraint-check-index">
        <div class="constraint-index-heading"><h4>${meta.label}</h4><p>${meta.description}</p></div>
        <div class="constraint-check-list">
          ${
            checks.length
              ? checks
                  .map((check) => {
                    const checkIndex = report.checks.indexOf(check);
                    const matchedRelation =
                      check.category === "relation" &&
                      relationTargetMatchesActual(
                        check,
                        tokenMap(result.tokens)[check.token],
                      );
                    return `<button type="button" class="constraint-check-row ${check.status}" data-constraint-check="${checkIndex}">
              <span class="constraint-mark" aria-hidden="true"></span>
              <span><strong>${check.token}</strong><small>${check.label}</small></span>
              <span><strong>${matchedRelation ? "Target matched" : check.actual}</strong><small>${matchedRelation ? check.actual : `Target ${check.target}`}</small></span>
              <span aria-hidden="true">→</span>
            </button>`;
                  })
                  .join("")
              : `<p class="constraint-empty-state">No corrections in this category.</p>`
          }
        </div>
      </section>`;
  }

  if (activeConstraintSelection.kind === "token") {
    title = activeConstraintSelection.token;
    let checks = report.checks.filter(
      (check) => check.token === activeConstraintSelection.token,
    );
    if (correctionsOnly)
      checks = checks.filter((check) => check.status !== "pass");
    detailMarkup = checks.length
      ? `<div class="constraint-card-grid contextual">${checks.map((check) => constraintCardMarkup(check, result)).join("")}</div>`
      : `<p class="constraint-empty-state">No ${correctionsOnly ? "corrections" : "measured checks"} for this token.</p>`;
  }

  if (activeConstraintSelection.kind === "check") {
    const check = report.checks[activeConstraintSelection.index];
    title = `${categoryMeta[check.category].label} / ${check.token}`;
    detailMarkup = `<div class="constraint-card-grid contextual single">${constraintCardMarkup(check, result)}</div>`;
  }

  if (activeConstraintSelection.kind === "edge") {
    const edge = activeConstraintSelection;
    title = `${edge.fromLabel} → ${edge.toLabel}`;
    detailMarkup = `<article class="lineage-edge-detail">
      <div class="edge-detail-colors"><i style="background:${edge.fromColor}"></i><span>→</span><i style="background:${edge.toColor}"></i></div>
      <div><span class="constraint-token-name">Relationship</span><h4>${edge.label}</h4><p>${edge.constraint ? "This connection applies a measured constraint." : "This connection derives the target role from its source."}</p><code>${edge.fromLabel} ${edge.fromValue} → ${edge.toLabel} ${edge.toValue}</code></div>
    </article>`;
  }

  if (activeConstraintSelection.kind === "source") {
    title = activeConstraintSelection.label;
    detailMarkup = `<article class="lineage-edge-detail"><div class="edge-detail-colors"><i style="background:${activeConstraintSelection.color}"></i></div><div><span class="constraint-token-name">Source node</span><h4>${activeConstraintSelection.label}</h4><p>This source influences the connected roles shown in the graph. Select one of its outgoing connections to inspect that relationship.</p><code>${activeConstraintSelection.value}</code></div></article>`;
  }

  constraintCurrentView.textContent = title;
  constraintBackButton.disabled = activeConstraintSelection.kind === "overview";
  constraintBackButton.textContent =
    activeConstraintSelection.kind === "check" &&
    activeConstraintSelection.parentCategory
      ? `← ${categoryMeta[activeConstraintSelection.parentCategory].label}`
      : "← All constraints";
  constraintCorrectionsOnly.checked = correctionsOnly;
  constraintCorrectionsOnly.disabled = !["category", "token"].includes(
    activeConstraintSelection.kind,
  );
  constraintChapters.innerHTML = detailMarkup;

  constraintChapters
    .querySelectorAll("[data-constraint-token]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        openInspector(result, button.dataset.constraintToken, report);
      });
    });

  constraintSummary
    .querySelectorAll("[data-constraint-category]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        activeConstraintSelection = {
          kind: "category",
          category: button.dataset.constraintCategory,
        };
        clearLineageSelection();
        renderConstraintMap(result, report);
      });
    });

  constraintChapters
    .querySelectorAll("[data-constraint-check]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        activeConstraintSelection = {
          kind: "check",
          index: Number(button.dataset.constraintCheck),
          parentCategory: activeConstraintSelection.category,
        };
        renderConstraintMap(result, report);
      });
    });

  constraintBackButton.onclick = () => {
    activeConstraintSelection =
      activeConstraintSelection.kind === "check" &&
      activeConstraintSelection.parentCategory
        ? {
            kind: "category",
            category: activeConstraintSelection.parentCategory,
          }
        : { kind: "overview" };
    clearLineageSelection();
    renderConstraintMap(result, report);
  };

  constraintCorrectionsOnly.onchange = () => {
    correctionsOnly = constraintCorrectionsOnly.checked;
    renderConstraintMap(result, report);
  };

  constraintSkipButton.onclick = () => {
    document.querySelector(".workspace").scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  };

  return report;
}

function clearLineageSelection() {
  lineageCanvas
    ?.querySelectorAll(".is-selected")
    .forEach((element) => element.classList.remove("is-selected"));
}

function renderLineage(result) {
  document.querySelector("#lineage-strategy").textContent =
    `Harmony: ${result.params.harmony} · ${result.params.hueOffsets
      .map((offset) => `${offset > 0 ? "+" : ""}${offset}°`)
      .join(" / ")}`;

  const tokens = tokenMap(result.tokens);
  const theme = {
    background: tokens.background,
    node: tokens.surface,
    nodeHover: tokens["secondary accent soft"] ?? tokens.background,
    nodeBorder: tokens.border,
    line: tokens["border control"],
    muted: tokens["secondary text"],
    text: tokens["main text"],
    focus: tokens["focus ring"],
    primary: tokens["primary button default"],
    secondary: tokens["secondary accent"] ?? tokens["primary button default"],
  };
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty("--lineage-bg", theme.background);
  rootStyle.setProperty("--lineage-node-bg", theme.node);
  rootStyle.setProperty("--lineage-node-hover", theme.nodeHover);
  rootStyle.setProperty("--lineage-node-border", theme.nodeBorder);
  rootStyle.setProperty("--lineage-line", theme.line);
  rootStyle.setProperty("--lineage-muted", theme.muted);
  rootStyle.setProperty("--lineage-text", theme.text);
  rootStyle.setProperty("--lineage-focus", theme.focus);
  rootStyle.setProperty("--lineage-primary", theme.primary);
  rootStyle.setProperty("--lineage-secondary", theme.secondary);
  const nodeWidth = 174;
  const nodeHeight = 48;

  const nodes = [
    {
      id: "primary",
      label: "User primary",
      value: result.input.primary,
      color: result.input.primary,
      x: 18,
      y: 152,
      type: "input",
    },
    {
      id: "background",
      label: "Background",
      value: tokens.background,
      color: tokens.background,
      x: 316,
      y: 30,
      type: "derived",
      functionName: "background",
    },
    {
      id: "border",
      label: "Border",
      value: tokens.border,
      color: tokens.border,
      x: 316,
      y: 98,
      type: "derived",
      functionName: "border",
    },
    {
      id: "button",
      label: "Button default",
      value: tokens["primary button default"],
      color: tokens["primary button default"],
      x: 316,
      y: 166,
      type: "derived",
      functionName: "primary button default",
    },
    {
      id: "focus",
      label: "Focus ring",
      value: tokens["focus ring"],
      color: tokens["focus ring"],
      x: 316,
      y: 234,
      type: "derived",
      functionName: "focus ring",
    },
    {
      id: "mainText",
      label: "Main text",
      value: tokens["main text"],
      color: tokens["main text"],
      x: 650,
      y: 18,
      type: "constraint",
      functionName: "main text",
    },
    {
      id: "secondaryText",
      label: "Secondary text",
      value: tokens["secondary text"],
      color: tokens["secondary text"],
      x: 650,
      y: 86,
      type: "constraint",
      functionName: "secondary text",
    },
    {
      id: "hover",
      label: "Button hover",
      value: tokens["primary button hover"],
      color: tokens["primary button hover"],
      x: 650,
      y: 154,
      type: "derived",
      functionName: "primary button hover",
    },
    {
      id: "active",
      label: "Button active",
      value: tokens["primary button active"],
      color: tokens["primary button active"],
      x: 650,
      y: 222,
      type: "derived",
      functionName: "primary button active",
    },
    {
      id: "buttonText",
      label: "Button text",
      value: tokens["primary button text"],
      color: tokens["primary button text"],
      x: 988,
      y: 188,
      type: "constraint",
      functionName: "primary button text",
    },
  ];

  if (tokens["secondary accent"]) {
    const secondarySource = result.supportingColors.secondary;
    nodes.push(
      {
        id: "secondaryInput",
        label: secondarySource.isDerived
          ? "Derived secondary"
          : "User secondary",
        value: secondarySource.hex,
        color: secondarySource.hex,
        x: 18,
        y: 292,
        type: "input",
      },
      {
        id: "secondary",
        label: "Secondary accent",
        value: tokens["secondary accent"],
        color: tokens["secondary accent"],
        x: 316,
        y: 292,
        type: "derived",
        functionName: "secondary accent",
      },
      {
        id: "secondarySoft",
        label: "Secondary soft",
        value: tokens["secondary accent soft"],
        color: tokens["secondary accent soft"],
        x: 650,
        y: 292,
        type: "derived",
        functionName: "secondary accent soft",
      },
      {
        id: "secondaryAccentText",
        label: "Secondary text",
        value: tokens["secondary accent text"],
        color: tokens["secondary accent text"],
        x: 988,
        y: 292,
        type: "constraint",
        functionName: "secondary accent text",
      },
    );
  }

  if (tokens["decorative accent"]) {
    const additionalSource = result.supportingColors.additional;
    nodes.push(
      {
        id: "additionalInput",
        label:
          additionalSource.derivationMode === "primary-secondary-completion"
            ? "Primary + secondary"
            : additionalSource.isDerived
              ? "Derived additional"
              : "User additional",
        value:
          additionalSource.derivationMode === "primary-secondary-completion"
            ? "pair completion"
            : additionalSource.hex,
        color: additionalSource.hex,
        x: 18,
        y: 376,
        type: "input",
      },
      {
        id: "decorative",
        label: "Decorative accent",
        value: tokens["decorative accent"],
        color: tokens["decorative accent"],
        x: 316,
        y: 376,
        type: "derived",
        functionName: "decorative accent",
      },
      {
        id: "decorativeSoft",
        label: "Decorative soft",
        value: tokens["decorative accent soft"],
        color: tokens["decorative accent soft"],
        x: 650,
        y: 376,
        type: "derived",
        functionName: "decorative accent soft",
      },
      {
        id: "decorativeAccentText",
        label: "Decorative text",
        value: tokens["decorative accent text"],
        color: tokens["decorative accent text"],
        x: 988,
        y: 376,
        type: "constraint",
        functionName: "decorative accent text",
      },
    );
  }

  const byId = Object.fromEntries(nodes.map((node) => [node.id, node]));
  const edges = [
    ["primary", "background", "tint", false],
    ["primary", "border", "muted tint", false],
    ["primary", "button", "preserve", false],
    ["primary", "focus", "shift L · C", false],
    ["background", "mainText", "8:1 target", true],
    ["background", "secondaryText", "4.7:1 target", true],
    ["button", "hover", "state step", false],
    ["button", "active", "state step", false],
    ["button", "buttonText", "contrast", true],
    ["hover", "buttonText", "contrast", true],
    ["active", "buttonText", "contrast", true],
  ];
  if (byId.secondaryInput) {
    edges.push([
      "secondaryInput",
      "secondary",
      result.supportingColors.secondary.isDerived
        ? result.supportingColors.secondary.edgeLabel
        : "preserve",
      false,
    ]);
    edges.push(["secondary", "secondarySoft", "tint", false]);
    edges.push(["secondarySoft", "secondaryAccentText", "4.5:1 target", true]);
  }
  if (byId.additionalInput) {
    edges.push([
      "additionalInput",
      "decorative",
      result.supportingColors.additional.isDerived
        ? result.supportingColors.additional.edgeLabel
        : "preserve",
      false,
    ]);
    edges.push(["decorative", "decorativeSoft", "tint", false]);
    edges.push([
      "decorativeSoft",
      "decorativeAccentText",
      "4.5:1 target",
      true,
    ]);
  }

  const pathFor = (from, to) => {
    const startX = from.x + nodeWidth;
    const startY = from.y + nodeHeight / 2;
    const endX = to.x;
    const endY = to.y + nodeHeight / 2;
    const curve = Math.max(46, (endX - startX) * 0.46);
    return `M ${startX} ${startY} C ${startX + curve} ${startY}, ${endX - curve} ${endY}, ${endX} ${endY}`;
  };

  lineageCanvas.innerHTML = `
    <svg viewBox="0 0 1180 ${byId.additionalInput ? 450 : byId.secondaryInput ? 366 : 318}" role="img" aria-labelledby="lineage-svg-title lineage-svg-desc">
      <title id="lineage-svg-title">Color influence graph</title>
      <desc id="lineage-svg-desc">The primary input influences foundations, which are transformed into semantic color roles. Dashed lines indicate contrast constraints.</desc>
      <defs>
        ${edges
          .map(([fromId, toId], edgeIndex) => {
            const from = byId[fromId];
            const to = byId[toId];
            return `<linearGradient id="lineage-gradient-${edgeIndex}" gradientUnits="userSpaceOnUse" x1="${from.x + nodeWidth}" y1="${from.y + nodeHeight / 2}" x2="${to.x}" y2="${to.y + nodeHeight / 2}"><stop offset="0" stop-color="${from.color}"/><stop offset="1" stop-color="${to.color}"/></linearGradient>`;
          })
          .join("")}
      </defs>
      <text class="lineage-column-label" x="18" y="12">Input</text>
      <text class="lineage-column-label" x="316" y="12">Foundations</text>
      <text class="lineage-column-label" x="650" y="12">Derived roles</text>
      <text class="lineage-column-label" x="988" y="170">Shared decision</text>
      ${edges
        .map(([fromId, toId, label, constraint], edgeIndex) => {
          const from = byId[fromId];
          const to = byId[toId];
          const labelX = (from.x + nodeWidth + to.x) / 2;
          const labelY = (from.y + to.y) / 2 + nodeHeight / 2 - 5;
          return `
            <g class="lineage-edge-control" tabindex="0" role="button" data-lineage-edge="${edgeIndex}" aria-label="Inspect ${from.label} to ${to.label}: ${label}">
              <path class="lineage-edge-hit" d="${pathFor(from, to)}"></path>
              <path class="lineage-edge-underlay ${constraint ? "constraint" : ""}" d="${pathFor(from, to)}"></path>
              <path class="lineage-edge ${constraint ? "constraint" : ""}" style="stroke:url(#lineage-gradient-${edgeIndex})" d="${pathFor(from, to)}"></path>
              <text class="lineage-edge-label" x="${labelX}" y="${labelY}" text-anchor="middle">${label}</text>
            </g>
          `;
        })
        .join("")}
      ${nodes
        .map(
          (node) => `
            <g
              class="lineage-node ${node.type}"
              transform="translate(${node.x} ${node.y})"
              tabindex="0"
              role="button"
              data-lineage-node="${node.id}"
              aria-label="Inspect ${node.label}"
              style="--node-color:${node.color}"
            >
              <rect class="node-body" width="${nodeWidth}" height="${nodeHeight}" rx="2"></rect>
              <rect class="node-swatch" x="10" y="10" width="28" height="28" rx="1" style="fill:${node.color}"></rect>
              <text class="node-title" x="49" y="21">${node.label}</text>
              <text class="node-value" x="49" y="35">${node.value}</text>
            </g>
          `,
        )
        .join("")}
    </svg>
  `;

  lineageCanvas.querySelectorAll("[data-lineage-node]").forEach((element) => {
    const selectNode = () => {
      const node = byId[element.dataset.lineageNode];
      clearLineageSelection();
      element.classList.add("is-selected");
      activeConstraintSelection = node.functionName
        ? { kind: "token", token: node.functionName }
        : {
            kind: "source",
            label: node.label,
            value: node.value,
            color: node.color,
          };
      renderConstraintMap(result, currentConstraintReport);
      document.querySelector(".constraint-map").scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    };
    element.addEventListener("click", selectNode);
    element.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectNode();
      }
    });
  });

  lineageCanvas.querySelectorAll("[data-lineage-edge]").forEach((element) => {
    const selectEdge = () => {
      const [fromId, toId, label, constraint] =
        edges[Number(element.dataset.lineageEdge)];
      const from = byId[fromId];
      const to = byId[toId];
      clearLineageSelection();
      element.classList.add("is-selected");
      activeConstraintSelection = {
        kind: "edge",
        label,
        constraint,
        fromLabel: from.label,
        fromValue: from.value,
        fromColor: from.color,
        toLabel: to.label,
        toValue: to.value,
        toColor: to.color,
      };
      renderConstraintMap(result, currentConstraintReport);
      document.querySelector(".constraint-map").scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
    };
    element.addEventListener("click", selectEdge);
    element.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectEdge();
      }
    });
  });
}

function renderResult(result) {
  currentResult = result;
  applyCssVariables(result.tokens);
  applyDeclaredUsageContracts();
  renderHarmonyOptions(result);
  renderHueRelationship(result);
  currentConstraintReport = buildConstraintReport(result);
  renderConstraintMap(result, currentConstraintReport);
  renderLineage(result);
  if (constraintCertificate.classList.contains("is-open")) {
    openInspector(result, activeConstraintFunction, currentConstraintReport);
  }
  renderPalette(result);
  renderStates(result);
  renderAdjustments(result);
  renderDebug(result);

  document.querySelector("#secondary-accent-use").hidden = !result.tokens.some(
    ([, name]) => name === "secondary accent",
  );
  document.querySelector("#decorative-accent-use").hidden = !result.tokens.some(
    ([, name]) => name === "decorative accent",
  );
  document.querySelector("#secondary-family-card").hidden = !result.tokens.some(
    ([, name]) => name === "secondary accent",
  );
  document.querySelector("#decorative-family-card").hidden =
    !result.tokens.some(([, name]) => name === "decorative accent");
  document.querySelector("#form-secondary-action").hidden = !result.tokens.some(
    ([, name]) => name === "secondary accent",
  );
  document.querySelector("#form-decorative-note").hidden = !result.tokens.some(
    ([, name]) => name === "decorative accent",
  );
  document.querySelector("#states-secondary-family").hidden =
    !result.tokens.some(([, name]) => name === "secondary accent");

  resultTitle.textContent = `${titleForColor(result.input.primary)} · ${
    result.params.name[0].toUpperCase() + result.params.name.slice(1)
  }`;
  resultCount.textContent = `${result.tokens.length} roles`;
  debugCount.textContent = String(result.warnings.length);

  resultStatus.classList.toggle("has-warning", result.warnings.length > 0);
  resultStatus.lastChild.textContent =
    result.warnings.length > 0
      ? ` ${result.warnings.length} adjustment${result.warnings.length === 1 ? "" : "s"}`
      : " Targets met";
}

function readInput() {
  const primary = normalizeHex(primaryInput.value);
  const secondaryRaw = document.querySelector("#secondary-color").value.trim();
  const additionalRaw = document
    .querySelector("#additional-color")
    .value.trim();
  const vibe = form.elements.vibe.value;

  [primaryInput, secondaryInput, additionalInput].forEach((input) =>
    input.removeAttribute("aria-invalid"),
  );

  if (!isHex(primary)) {
    primaryError.textContent = "Use a six-digit hex color, such as #FF0000.";
    primaryInput.setAttribute("aria-invalid", "true");
    return null;
  }

  for (const [label, value] of [
    ["Secondary", secondaryRaw],
    ["Additional", additionalRaw],
  ]) {
    if (value && !isHex(value)) {
      primaryError.textContent = `${label} must be a six-digit hex color.`;
      const invalidInput =
        label === "Secondary" ? secondaryInput : additionalInput;
      invalidInput.setAttribute("aria-invalid", "true");
      return null;
    }
  }

  primaryError.textContent = "";
  primaryInput.removeAttribute("aria-invalid");
  return {
    rawPrimary: primaryInput.value,
    primary,
    secondary: secondaryRaw ? normalizeHex(secondaryRaw) : null,
    additionalColors: additionalRaw ? [normalizeHex(additionalRaw)] : [],
    vibe: VIBES[vibe] ? vibe : "balanced",
    harmonyId: activeHarmonyId,
  };
}

function activateTab(name) {
  const tabs = [...document.querySelectorAll('.tabs [role="tab"]')];
  tabs.forEach((tab) => {
    const selected = tab.id === `tab-${name}`;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    document.querySelector(`#panel-${tab.id.replace("tab-", "")}`).hidden =
      !selected;
  });
}

document.querySelectorAll('.tabs [role="tab"]').forEach((tab, index, tabs) => {
  tab.addEventListener("click", () => activateTab(tab.id.replace("tab-", "")));
  tab.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    let nextIndex = index;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
    if (event.key === "ArrowLeft")
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = tabs.length - 1;
    tabs[nextIndex].focus();
    activateTab(tabs[nextIndex].id.replace("tab-", ""));
  });
});

primaryPicker.addEventListener("input", () => {
  primaryInput.value = primaryPicker.value.toUpperCase();
});

primaryInput.addEventListener("input", () => {
  if (isHex(primaryInput.value)) {
    primaryPicker.value = primaryInput.value;
    primaryError.textContent = "";
  }
});

function connectOptionalColorPicker(textInput, colorPicker) {
  colorPicker.addEventListener("input", () => {
    textInput.value = colorPicker.value.toUpperCase();
    colorPicker.classList.remove("is-empty");
  });

  textInput.addEventListener("input", () => {
    const value = textInput.value.trim();
    colorPicker.classList.toggle("is-empty", !value);
    if (isHex(value)) colorPicker.value = value;
  });
}

connectOptionalColorPicker(secondaryInput, secondaryPicker);
connectOptionalColorPicker(additionalInput, additionalPicker);

function updateFloatingHarmonyDock() {
  const originalOptionsRect = harmonyOptions.getBoundingClientRect();
  const shouldFloat = originalOptionsRect.top <= 12;

  floatingHarmonyOptions.style.setProperty(
    "--floating-harmony-left",
    `${originalOptionsRect.left}px`,
  );
  floatingHarmonyOptions.style.setProperty(
    "--floating-harmony-width",
    `${originalOptionsRect.width}px`,
  );

  floatingHarmonyOptions.classList.toggle("is-visible", shouldFloat);
  floatingHarmonyOptions.setAttribute("aria-hidden", String(!shouldFloat));
}

window.addEventListener("scroll", updateFloatingHarmonyDock, {
  passive: true,
});
window.addEventListener("resize", updateFloatingHarmonyDock);
updateFloatingHarmonyDock();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  activeHarmonyId = "default";
  const input = readInput();
  if (!input) return;
  renderResult(generatePalette(input));
  activateTab("content");
  document.querySelector(".lineage-section").scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth",
    block: "start",
  });
});

async function copyResult(value, successMessage) {
  try {
    await navigator.clipboard.writeText(value);
    toast.textContent = successMessage;
  } catch {
    toast.textContent = "Clipboard unavailable";
  }
  toast.classList.add("visible");
  window.setTimeout(() => toast.classList.remove("visible"), 1600);
}

document.querySelector("#copy-output").addEventListener("click", () => {
  if (!currentResult) return;
  copyResult(serializeTokens(currentResult.tokens), "Token output copied");
});

document.querySelector("#copy-css").addEventListener("click", () => {
  if (!currentResult) return;
  copyResult(serializeCss(currentResult.tokens), "CSS variables copied");
});

document.querySelector("#copy-debug").addEventListener("click", () => {
  if (!currentResult) return;
  copyResult(
    serializeDebug(currentResult, currentConstraintReport),
    "Debug output copied",
  );
});

document.addEventListener("click", (event) => {
  if (!event.target.closest("[data-preview-only]")) return;
  event.preventDefault();
  toast.textContent = "Preview only · no action performed";
  toast.classList.add("visible");
  window.setTimeout(() => toast.classList.remove("visible"), 1600);
});

document.querySelectorAll("[data-preview-form]").forEach((previewForm) => {
  previewForm.addEventListener("submit", (event) => {
    event.preventDefault();
    toast.textContent = "Preview only · nothing was submitted";
    toast.classList.add("visible");
    window.setTimeout(() => toast.classList.remove("visible"), 1600);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeInspector();
});

const initialInput = readInput();
if (initialInput) renderResult(generatePalette(initialInput));
