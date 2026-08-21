import {
  generatePaletteV2,
  generatePaletteV2DestructiveGrammarCounterfactual,
  generatePaletteV2FilledActionDirectionCounterfactual,
} from "./lib/palette.js";

self.addEventListener("message", ({ data }) => {
  const startedAt = performance.now();
  try {
    const generate =
      data.variant === "mode-relative"
        ? generatePaletteV2FilledActionDirectionCounterfactual
        : data.variant === "destructive-grammar"
          ? generatePaletteV2DestructiveGrammarCounterfactual
          : generatePaletteV2;
    const result = generate({ primary: data.primary, grammar: data.grammar });
    self.postMessage({
      id: data.id,
      result,
      duration: performance.now() - startedAt,
    });
  } catch (error) {
    self.postMessage({ id: data.id, error: error.message });
  }
});
