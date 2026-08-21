import {
  generatePaletteV2,
  generatePaletteV2DestructiveGrammarCounterfactual,
  generatePaletteV2FilledActionDirectionCounterfactual,
} from "./palette.js";

function generateVariant({ primary, variant, grammar }) {
  if (variant === "destructive-grammar")
    return generatePaletteV2DestructiveGrammarCounterfactual({
      primary,
      grammar,
    });
  if (variant === "mode-relative")
    return generatePaletteV2FilledActionDirectionCounterfactual({ primary });
  return generatePaletteV2({ primary });
}

export function createPaletteRuntime({
  WorkerClass = globalThis.Worker,
  generate = generateVariant,
  now = () => performance.now(),
} = {}) {
  let sequence = 0;
  const pending = new Map();
  const cache = new Map();
  const cacheKey = (primary, variant, grammar) =>
    `${variant}/${primary}/${grammar ? JSON.stringify(grammar) : ""}`;
  const worker =
    typeof WorkerClass === "undefined"
      ? null
      : new WorkerClass(new URL("../palette-worker.js", import.meta.url), {
          type: "module",
        });

  worker?.addEventListener("message", ({ data }) => {
    const calculation = pending.get(data.id);
    if (!calculation) return;
    pending.delete(data.id);
    if (data.error) calculation.reject(new Error(data.error));
    else calculation.resolve(data);
  });

  return {
    remember(result) {
      cache.set(cacheKey(result.input.primary, "current"), result);
    },
    calculate(primary, { variant = "current", grammar } = {}) {
      const key = cacheKey(primary, variant, grammar);
      if (cache.has(key)) {
        return Promise.resolve({
          result: cache.get(key),
          duration: 0,
          cached: true,
        });
      }
      if (!worker) {
        const startedAt = now();
        return Promise.resolve({
          result: generate({ primary, variant, grammar }),
          duration: now() - startedAt,
          cached: false,
        });
      }
      const id = ++sequence;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        worker.postMessage({ id, primary, variant, grammar });
      });
    },
    rememberVariant(result, variant = "current", grammar) {
      cache.set(cacheKey(result.input.primary, variant, grammar), result);
    },
  };
}
