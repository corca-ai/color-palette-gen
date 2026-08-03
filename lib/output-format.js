export const FUNCTION_TO_VAR = {
  background: "--color-background",
  surface: "--color-surface",
  "main text": "--color-main-text",
  "secondary text": "--color-secondary-text",
  border: "--color-border",
  "border control": "--color-border-control",
  "primary button default": "--color-primary-button",
  "primary button hover": "--color-primary-button-hover",
  "primary button active": "--color-primary-button-active",
  "primary button text": "--color-primary-button-text",
  "focus ring": "--color-focus-ring",
  "secondary accent": "--color-secondary-accent",
  "secondary accent soft": "--color-secondary-accent-soft",
  "secondary accent text": "--color-secondary-accent-text",
  "decorative accent": "--color-decorative-accent",
  "decorative accent soft": "--color-decorative-accent-soft",
  "decorative accent text": "--color-decorative-accent-text",
};

export function serializeTokens(tokens) {
  return JSON.stringify(tokens, null, 2);
}

export function serializeCss(tokens) {
  const declarations = tokens
    .map(([color, functionName]) => {
      const variable = FUNCTION_TO_VAR[functionName];
      return variable ? `  ${variable}: ${color};` : "";
    })
    .filter(Boolean)
    .join("\n");
  return `:root {\n${declarations}\n}`;
}

export function serializeDebug(result, constraints) {
  return JSON.stringify(
    {
      input: result.input,
      params: result.params,
      supportingColors: result.supportingColors,
      tokens: result.tokens,
      artifacts: result.artifacts,
      traces: result.traces,
      warnings: result.warnings,
      constraints,
    },
    null,
    2,
  );
}
