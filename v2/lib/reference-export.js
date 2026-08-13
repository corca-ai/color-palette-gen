export const REFERENCE_TOKEN_MAP = {
  background: "color.canvas",
  foreground: "color.text",
  surface: "color.surface",
  "raised surface": "color.surface.raised",
  "muted surface": "color.surface.muted",
  "muted text": "color.text.muted",
  border: "color.border.subtle",
  "input border": "color.border.input",
  "brand source": "color.brand.source",
  primary: "color.action.primary",
  "primary hover": "color.action.primary.hover",
  "primary active": "color.action.primary.active",
  "primary text": "color.action.primary.text",
  "primary border": "color.action.primary.border",
  "focus ring": "color.focus.ring",
  destructive: "color.action.destructive",
  "destructive hover": "color.action.destructive.hover",
  "destructive active": "color.action.destructive.active",
  "destructive text": "color.action.destructive.text",
  warning: "color.feedback.warning",
  "warning hover": "color.feedback.warning.hover",
  "warning active": "color.feedback.warning.active",
  "warning text": "color.feedback.warning.text",
  selection: "color.selection",
  "selection text": "color.selection.text",
  "disabled background": "color.control.disabled.background",
  "disabled text": "color.control.disabled.text",
  "disabled border": "color.control.disabled.border",
  popover: "color.overlay.popover",
  "popover text": "color.overlay.popover.text",
};

export function serializeReferenceTokens(result) {
  return {
    schema: "color-lab-reference-tokens-1",
    source: result.input,
    policyVersion: result.policyVersion,
    modes: Object.fromEntries(
      ["light", "dark"].map((mode) => [
        mode,
        Object.fromEntries(
          Object.entries(REFERENCE_TOKEN_MAP).map(([role, token]) => [
            token,
            result.modes[mode].values[role],
          ]),
        ),
      ]),
    ),
  };
}
