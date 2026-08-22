const BOTH_MODES = Object.freeze(["light", "dark"]);
const FILL_STATES = Object.freeze(["default", "hover", "active"]);

export const SAMPLE_INSPECTION_SOURCE_KINDS = Object.freeze([
  "semantic-declaration",
  "policy-rule",
  "presentation-policy",
  "owner-document",
  "authored-presentation-question",
]);

export const SAMPLE_INSPECTION_COMPOSITIONS = Object.freeze([
  "native-context",
  "aligned-native-contexts",
]);

export const SAMPLE_AUTHORED_PRESENTATION_QUESTIONS = Object.freeze({
  "action-default-emphasis-v1":
    "Which resting action appears unexpectedly stronger or weaker for its context?",
});

export const SAMPLE_SCENARIOS = Object.freeze([
  Object.freeze({ id: "workspace", label: "Workspace", kind: "situation" }),
  Object.freeze({
    id: "routine-actions",
    label: "Routine actions",
    kind: "situation",
  }),
  Object.freeze({
    id: "destructive-confirmation",
    label: "Destructive confirmation",
    kind: "situation",
  }),
  Object.freeze({
    id: "feedback-selection",
    label: "Feedback & selection",
    kind: "situation",
  }),
  Object.freeze({ id: "form-focus", label: "Form & focus", kind: "situation" }),
  Object.freeze({
    id: "edge-matrix",
    label: "Edge matrix",
    kind: "inspection-board",
  }),
]);

export const SAMPLE_PROVENANCE_ONLY_ROLES = Object.freeze(["brand source"]);

function binding(role, selector) {
  return Object.freeze({ role, selector });
}

function obligation(definition) {
  return Object.freeze({
    ...definition,
    composition: definition.composition ?? "native-context",
    inspectionVerdictAuthority: "none",
    modes: BOTH_MODES,
    contexts: Object.freeze(definition.contexts),
    fillStates: Object.freeze(definition.fillStates),
    roleBindings: Object.freeze(definition.roleBindings),
    derivedBindings: Object.freeze(definition.derivedBindings ?? []),
  });
}

export const SAMPLE_INSPECTION_OBLIGATIONS = Object.freeze([
  obligation({
    id: "foundation-hierarchy",
    sourceKind: "semantic-declaration",
    sourceId: "foundation-hierarchy-ordered",
    scenarioId: "workspace",
    contexts: ["nested-workspace-surfaces"],
    fillStates: ["default"],
    focus: false,
    inspectionQuestion:
      "What hierarchy do the selected foundation surfaces form when rendered together?",
    roleBindings: [
      binding("background", ".reference-shell"),
      binding("surface", ".reference-sidebar"),
      binding("raised surface", ".reference-channel"),
      binding("muted surface", ".reference-sidebar nav a.selected"),
      binding("foreground", ".reference-messages article"),
      binding("muted text", ".reference-channel small"),
      binding("border", ".reference-shell"),
    ],
  }),
  obligation({
    id: "foundation-text",
    sourceKind: "semantic-declaration",
    sourceId: "foundation-text-targets-pass",
    scenarioId: "workspace",
    contexts: ["body-on-background", "content-on-surface", "muted-content"],
    fillStates: ["default"],
    focus: false,
    inspectionQuestion:
      "How does foundation text appear in each authored background context?",
    roleBindings: [
      binding("background", ".reference-shell"),
      binding("surface", ".reference-sidebar"),
      binding("foreground", ".reference-messages article"),
      binding("muted text", ".reference-channel small"),
    ],
  }),
  obligation({
    id: "input-boundary",
    sourceKind: "policy-rule",
    sourceId: "foundation.boundary-contrast",
    scenarioId: "form-focus",
    contexts: ["editable-control-on-surface"],
    fillStates: ["default"],
    focus: true,
    inspectionQuestion: "Does the input boundary remain visible on Surface?",
    roleBindings: [
      binding("surface", ".reference-form-scenario"),
      binding("input border", ".reference-form-scenario input"),
      binding("foreground", ".reference-form-scenario input"),
    ],
  }),
  obligation({
    id: "primary-family",
    sourceKind: "policy-rule",
    sourceId: "primary.generated-family",
    scenarioId: "routine-actions",
    contexts: ["ordinary-filled-action"],
    fillStates: FILL_STATES,
    focus: true,
    inspectionQuestion:
      "Does Primary preserve one readable interactive family?",
    roleBindings: [
      binding("primary", ".reference-primary-demo"),
      binding("primary hover", ".reference-primary-demo"),
      binding("primary active", ".reference-primary-demo"),
      binding("primary text", ".reference-primary-demo"),
      binding("primary border", ".reference-primary-demo"),
    ],
  }),
  obligation({
    id: "primary-shared-label",
    sourceKind: "semantic-declaration",
    sourceId: "shared-label-readable",
    scenarioId: "routine-actions",
    contexts: ["ordinary-filled-action"],
    fillStates: FILL_STATES,
    focus: false,
    inspectionQuestion:
      "Does one Primary label remain readable through every fill state?",
    roleBindings: [
      binding("primary", ".reference-primary-demo"),
      binding("primary hover", ".reference-primary-demo"),
      binding("primary active", ".reference-primary-demo"),
      binding("primary text", ".reference-primary-demo"),
    ],
  }),
  obligation({
    id: "primary-distinct-states",
    sourceKind: "semantic-declaration",
    sourceId: "states-distinct",
    scenarioId: "routine-actions",
    contexts: ["ordinary-filled-action"],
    fillStates: FILL_STATES,
    focus: false,
    inspectionQuestion:
      "What visual differences appear among the three technically distinct Primary fills?",
    roleBindings: [
      binding("primary", ".reference-primary-demo"),
      binding("primary hover", ".reference-primary-demo"),
      binding("primary active", ".reference-primary-demo"),
    ],
  }),
  obligation({
    id: "primary-state-progression",
    sourceKind: "semantic-declaration",
    sourceId: "active-continues-beyond-hover",
    scenarioId: "routine-actions",
    contexts: ["ordinary-filled-action"],
    fillStates: FILL_STATES,
    focus: false,
    inspectionQuestion:
      "Does Active continue beyond Hover in the mode-owned direction?",
    roleBindings: [
      binding("primary", ".reference-primary-demo"),
      binding("primary hover", ".reference-primary-demo"),
      binding("primary active", ".reference-primary-demo"),
    ],
  }),
  obligation({
    id: "destructive-family",
    sourceKind: "policy-rule",
    sourceId: "state.minimum-separation",
    scenarioId: "destructive-confirmation",
    contexts: ["confirmation-filled-action"],
    fillStates: FILL_STATES,
    focus: true,
    inspectionQuestion:
      "Does Destructive remain coherent in its filled confirmation context?",
    roleBindings: [
      binding("destructive", ".reference-destructive-demo"),
      binding("destructive hover", ".reference-destructive-demo"),
      binding("destructive active", ".reference-destructive-demo"),
      binding("destructive text", ".reference-destructive-demo"),
    ],
  }),
  obligation({
    id: "destructive-label",
    sourceKind: "semantic-declaration",
    sourceId: "feedback-destructive-label-targets-pass",
    scenarioId: "destructive-confirmation",
    contexts: ["confirmation-filled-action"],
    fillStates: FILL_STATES,
    focus: false,
    inspectionQuestion:
      "Does the Destructive label remain readable in every state?",
    roleBindings: [
      binding("destructive", ".reference-destructive-demo"),
      binding("destructive hover", ".reference-destructive-demo"),
      binding("destructive active", ".reference-destructive-demo"),
      binding("destructive text", ".reference-destructive-demo"),
    ],
  }),
  obligation({
    id: "warning-family",
    sourceKind: "policy-rule",
    sourceId: "state.shared-label",
    scenarioId: "feedback-selection",
    contexts: ["warning-status-and-action"],
    fillStates: FILL_STATES,
    focus: true,
    inspectionQuestion:
      "Does Warning keep one label across its interactive family?",
    roleBindings: [
      binding("warning", ".reference-warning-demo"),
      binding("warning hover", ".reference-warning-demo"),
      binding("warning active", ".reference-warning-demo"),
      binding("warning text", ".reference-warning-demo"),
    ],
  }),
  obligation({
    id: "warning-label",
    sourceKind: "semantic-declaration",
    sourceId: "feedback-warning-label-targets-pass",
    scenarioId: "feedback-selection",
    contexts: ["warning-status-and-action"],
    fillStates: FILL_STATES,
    focus: false,
    inspectionQuestion:
      "Does the Warning label remain readable in every state?",
    roleBindings: [
      binding("warning", ".reference-warning-demo"),
      binding("warning hover", ".reference-warning-demo"),
      binding("warning active", ".reference-warning-demo"),
      binding("warning text", ".reference-warning-demo"),
    ],
  }),
  obligation({
    id: "selection-pair",
    sourceKind: "semantic-declaration",
    sourceId: "selection-text-target-passes",
    scenarioId: "feedback-selection",
    contexts: ["selected-row-beside-unselected-content"],
    fillStates: ["default"],
    focus: false,
    inspectionQuestion: "How readable does selected text appear on Selection?",
    roleBindings: [
      binding("selection", ".selected-message"),
      binding("selection text", ".selected-message"),
    ],
  }),
  obligation({
    id: "selection-surface-separation",
    sourceKind: "semantic-declaration",
    sourceId: "selection-surface-oklab-separation-passes",
    scenarioId: "feedback-selection",
    contexts: ["selected-row-beside-unselected-content"],
    fillStates: ["default"],
    focus: false,
    inspectionQuestion:
      "How does the selected row appear beside its neighboring Surface?",
    roleBindings: [
      binding("surface", ".reference-selection-list"),
      binding("selection", ".selected-message"),
    ],
  }),
  obligation({
    id: "focus-adjacency",
    sourceKind: "semantic-declaration",
    sourceId: "focus-adjacent-contrast-passes",
    scenarioId: "edge-matrix",
    composition: "aligned-native-contexts",
    contexts: ["background", "surface", "muted-surface"],
    fillStates: ["default"],
    focus: true,
    inspectionQuestion:
      "How does the same Focus Ring appear on each foundation context?",
    roleBindings: [
      binding("focus ring", ".inspection-focus-target"),
      binding("background", '[data-focus-context="background"]'),
      binding("surface", '[data-focus-context="surface"]'),
      binding("muted surface", '[data-focus-context="muted-surface"]'),
    ],
  }),
  obligation({
    id: "focus-control-separation",
    sourceKind: "semantic-declaration",
    sourceId: "focus-control-oklab-separation-passes",
    scenarioId: "edge-matrix",
    composition: "aligned-native-contexts",
    contexts: ["ordinary-action", "destructive-confirmation"],
    fillStates: ["default"],
    focus: true,
    inspectionQuestion:
      "How does the Focus Ring appear around Primary and Destructive controls?",
    roleBindings: [
      binding("focus ring", ".inspection-focus-target"),
      binding("primary", '[data-inspection-family="primary"]'),
      binding("destructive", '[data-inspection-family="destructive-filled"]'),
    ],
  }),
  obligation({
    id: "utility-semantics",
    sourceKind: "owner-document",
    sourceId: "docs/v2-decisions/policy/utility-role-aliases.md",
    scenarioId: "form-focus",
    contexts: ["blocked-control", "overlay"],
    fillStates: ["default"],
    focus: false,
    inspectionQuestion:
      "Do aliased utility roles retain their non-color duties?",
    roleBindings: [
      binding("disabled background", ".reference-form-scenario input:disabled"),
      binding("disabled text", ".reference-form-scenario input:disabled"),
      binding("disabled border", ".reference-form-scenario input:disabled"),
      binding("popover", ".reference-popover"),
      binding("popover text", ".reference-popover"),
    ],
  }),
  obligation({
    id: "action-family-consistency",
    sourceKind: "presentation-policy",
    sourceId: "single-filled-action-hierarchy-v2",
    scenarioId: "edge-matrix",
    composition: "aligned-native-contexts",
    contexts: [
      "ordinary-actions",
      "destructive-confirmation",
      "warning-feedback",
    ],
    fillStates: FILL_STATES,
    focus: true,
    inspectionQuestion:
      "When these valid contexts are aligned, which state movement or label treatment feels inconsistent?",
    roleBindings: [
      binding("primary", '[data-inspection-family="primary"]'),
      binding("primary text", '[data-inspection-family="primary"]'),
      binding("destructive", '[data-inspection-family="destructive-filled"]'),
      binding(
        "destructive text",
        '[data-inspection-family="destructive-filled"]',
      ),
      binding("warning", '[data-inspection-family="warning"]'),
      binding("warning text", '[data-inspection-family="warning"]'),
    ],
    derivedBindings: [
      Object.freeze({
        role: "confirmation secondary",
        sourceId: "confirmation-secondary-state-family-v1",
        selector: '[data-inspection-family="secondary"]',
      }),
    ],
  }),
  obligation({
    id: "feedback-separation",
    sourceKind: "semantic-declaration",
    sourceId: "feedback-oklab-separation-passes",
    scenarioId: "edge-matrix",
    composition: "aligned-native-contexts",
    contexts: ["aligned-action-families"],
    fillStates: ["default"],
    focus: false,
    inspectionQuestion:
      "What similarities or differences appear among Primary, Destructive, and Warning?",
    roleBindings: [
      binding("primary", '[data-inspection-family="primary"]'),
      binding("destructive", '[data-inspection-family="destructive-filled"]'),
      binding("warning", '[data-inspection-family="warning"]'),
    ],
  }),
  obligation({
    id: "action-default-emphasis",
    sourceKind: "authored-presentation-question",
    sourceId: "action-default-emphasis-v1",
    scenarioId: "edge-matrix",
    composition: "aligned-native-contexts",
    contexts: ["equal-geometry-native-contexts"],
    fillStates: ["default"],
    focus: false,
    inspectionQuestion:
      SAMPLE_AUTHORED_PRESENTATION_QUESTIONS["action-default-emphasis-v1"],
    roleBindings: [
      binding("surface", ".inspection-action-board"),
      binding("primary", '[data-inspection-family="primary"]'),
      binding("destructive", '[data-inspection-family="destructive-filled"]'),
      binding("warning", '[data-inspection-family="warning"]'),
    ],
    derivedBindings: [
      Object.freeze({
        role: "confirmation secondary",
        sourceId: "confirmation-secondary-state-family-v1",
        selector: '[data-inspection-family="secondary"]',
      }),
    ],
  }),
]);

export function sampleInspectionRoles() {
  return new Set(
    SAMPLE_INSPECTION_OBLIGATIONS.flatMap(({ roleBindings }) =>
      roleBindings.map(({ role }) => role),
    ),
  );
}
