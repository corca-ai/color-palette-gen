import {
  contrastLabel,
  contrastRatio,
  hexToRgb,
  isHex,
  normalizeHex,
  oklchToHex,
  rgbToOklch,
} from "./lib/color-math.js";
import { HARMONY_CANDIDATES, VIBES } from "./lib/palette-config.js";
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
const constraintMatrixBody = document.querySelector("#constraint-matrix-body");
const constraintCertificate = document.querySelector("#constraint-certificate");
const toast = document.querySelector("#toast");

let currentResult;
let currentConstraintReport;
let activeDebugFunction = "primary button default";
let activeConstraintFunction = "main text";
let activeConstraintCategory = null;
let activeHarmonyId = "default";

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
            return `
            <div class="state-sequence-item ${name === functionName ? "is-selected" : ""}">
              <span class="state-sequence-swatch" style="background:${color}"></span>
              <strong>${["Default", "Hover", "Active"][index]}</strong>
              <code>${color}</code>
              <small>L ${(oklch.l * 100).toFixed(1)}% · H ${oklch.h.toFixed(1)}°</small>
            </div>
            ${index < names.length - 1 ? '<span class="state-sequence-arrow">→</span>' : ""}
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
          <polyline
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
      ${(trace?.steps ?? [])
        .map(
          (step) => `
            <li>
              <span>${step.stage}</span>
              <div>
                <strong>${step.message}</strong>
                ${
                  step.before || step.after
                    ? `<code>${step.before}${step.before && step.after ? " → " : ""}${step.after}</code>`
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

function renderConstraintMap(result) {
  const report = buildConstraintReport(result);
  const categories = [
    ["contrast", "Contrast"],
    ["gamut", "sRGB gamut"],
    ["relation", "Hue relation"],
    ["state", "State distinction"],
  ];

  constraintSummary.innerHTML = categories
    .map(([category, label]) => {
      const categoryChecks = report.checks.filter(
        (check) => check.category === category,
      );
      const failed = categoryChecks.filter(
        (check) => check.status === "fail",
      ).length;
      const adjusted = categoryChecks.filter(
        (check) => check.status === "adjusted",
      ).length;
      const status = failed > 0 ? "fail" : adjusted > 0 ? "adjusted" : "pass";
      return `
        <button
          type="button"
          class="constraint-summary-item ${status}${activeConstraintCategory === category ? " active" : ""}"
          data-constraint-category="${category}"
          aria-pressed="${activeConstraintCategory === category}"
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

  const matrixCategories = ["contrast", "gamut", "relation", "state"];
  const renderMatrixRows = () => {
    const visibleChecks = activeConstraintCategory
      ? report.checks.filter(
          (check) => check.category === activeConstraintCategory,
        )
      : report.checks;
    const matrixTokens = [
      ...new Set(visibleChecks.map((check) => check.token)),
    ];
    constraintMatrixBody.innerHTML = matrixTokens
      .map((functionName) => {
        const cells = matrixCategories
          .map((category) => {
            const matchingChecks = report.checks.filter(
              (item) =>
                item.token === functionName && item.category === category,
            );
            if (matchingChecks.length === 0) {
              return '<td class="constraint-empty">—</td>';
            }
            const severity = { pass: 0, adjusted: 1, fail: 2 };
            const check = [...matchingChecks].sort(
              (first, second) =>
                severity[second.status] - severity[first.status],
            )[0];
            const cellValue =
              matchingChecks.length > 1
                ? `${matchingChecks.length} checks · ${constraintStatusLabel(check.status)}`
                : check.actual;
            return `
              <td>
                <span class="matrix-result ${check.status}">
                  <span class="constraint-mark" aria-hidden="true"></span>
                  ${cellValue}
                </span>
              </td>
            `;
          })
          .join("");
        return `
          <tr>
            <th scope="row">
              <button type="button" data-constraint-token="${functionName}">
                ${functionName}
              </button>
            </th>
            ${cells}
          </tr>
        `;
      })
      .join("");

    constraintMatrixBody
      .querySelectorAll("[data-constraint-token]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          openInspector(result, button.dataset.constraintToken, report);
        });
      });
  };

  renderMatrixRows();

  constraintSummary
    .querySelectorAll("[data-constraint-category]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        activeConstraintCategory =
          activeConstraintCategory === button.dataset.constraintCategory
            ? null
            : button.dataset.constraintCategory;
        constraintSummary
          .querySelectorAll("[data-constraint-category]")
          .forEach((summaryButton) => {
            const selected =
              summaryButton.dataset.constraintCategory ===
              activeConstraintCategory;
            summaryButton.classList.toggle("active", selected);
            summaryButton.setAttribute("aria-pressed", String(selected));
          });
        renderMatrixRows();
      });
    });

  return report;
}

function renderLineage(result) {
  document.querySelector("#lineage-strategy").textContent =
    `Harmony: ${result.params.harmony} · ${result.params.hueOffsets
      .map((offset) => `${offset > 0 ? "+" : ""}${offset}°`)
      .join(" / ")}`;

  const theme = {
    background: oklchToHex({
      l: 0.18,
      c: Math.min(0.055, result.primary.c * 0.2 * result.params.chromaScale),
      h: result.primary.h,
    }).hex,
    node: oklchToHex({
      l: 0.235,
      c: Math.min(0.04, result.primary.c * 0.14 * result.params.chromaScale),
      h: result.primary.h,
    }).hex,
    nodeHover: oklchToHex({
      l: 0.285,
      c: Math.min(0.045, result.primary.c * 0.16 * result.params.chromaScale),
      h: result.primary.h,
    }).hex,
    nodeBorder: oklchToHex({
      l: 0.44,
      c: Math.min(0.055, result.primary.c * 0.18),
      h: result.primary.h,
    }).hex,
    line: oklchToHex({
      l: 0.56,
      c: Math.min(0.045, result.primary.c * 0.12),
      h: result.primary.h,
    }).hex,
    muted: oklchToHex({
      l: 0.72,
      c: Math.min(0.025, result.primary.c * 0.08),
      h: result.primary.h,
    }).hex,
  };
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty("--lineage-bg", theme.background);
  rootStyle.setProperty("--lineage-node-bg", theme.node);
  rootStyle.setProperty("--lineage-node-hover", theme.nodeHover);
  rootStyle.setProperty("--lineage-node-border", theme.nodeBorder);
  rootStyle.setProperty("--lineage-line", theme.line);
  rootStyle.setProperty("--lineage-muted", theme.muted);

  const tokens = tokenMap(result.tokens);
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
      <text class="lineage-column-label" x="18" y="12">Input</text>
      <text class="lineage-column-label" x="316" y="12">Foundations</text>
      <text class="lineage-column-label" x="650" y="12">Derived roles</text>
      <text class="lineage-column-label" x="988" y="170">Shared decision</text>
      ${edges
        .map(([fromId, toId, label, constraint]) => {
          const from = byId[fromId];
          const to = byId[toId];
          const labelX = (from.x + nodeWidth + to.x) / 2;
          const labelY = (from.y + to.y) / 2 + nodeHeight / 2 - 5;
          return `
            <path class="lineage-edge ${constraint ? "constraint" : ""}" d="${pathFor(from, to)}"></path>
            <text class="lineage-edge-label" x="${labelX}" y="${labelY}" text-anchor="middle">${label}</text>
          `;
        })
        .join("")}
      ${nodes
        .map(
          (node) => `
            <g
              class="lineage-node ${node.type}"
              transform="translate(${node.x} ${node.y})"
              tabindex="${node.functionName ? "0" : "-1"}"
              role="${node.functionName ? "button" : "img"}"
              ${node.functionName ? `data-lineage-function="${node.functionName}" aria-label="Inspect ${node.label}"` : `aria-label="${node.label} ${node.value}"`}
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

  lineageCanvas.querySelectorAll("[data-lineage-function]").forEach((node) => {
    const openTrace = () => {
      openInspector(
        result,
        node.dataset.lineageFunction,
        currentConstraintReport,
      );
    };
    node.addEventListener("click", openTrace);
    node.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openTrace();
      }
    });
  });
}

function renderResult(result) {
  currentResult = result;
  applyCssVariables(result.tokens);
  renderHarmonyOptions(result);
  renderHueRelationship(result);
  currentConstraintReport = renderConstraintMap(result);
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
      : " All checks pass";
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
  document.querySelector(".constraint-map").scrollIntoView({
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
