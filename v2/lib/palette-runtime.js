import { generatePaletteV2 } from "./palette.js";

export function createPaletteRuntime({
  WorkerClass = globalThis.Worker,
  generate = generatePaletteV2,
  now = () => performance.now(),
} = {}) {
  let sequence = 0;
  const pending = new Map();
  const cache = new Map();
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
      cache.set(result.input.primary, result);
    },
    calculate(primary) {
      if (cache.has(primary)) {
        return Promise.resolve({
          result: cache.get(primary),
          duration: 0,
          cached: true,
        });
      }
      if (!worker) {
        const startedAt = now();
        return Promise.resolve({
          result: generate({ primary }),
          duration: now() - startedAt,
          cached: false,
        });
      }
      const id = ++sequence;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        worker.postMessage({ id, primary });
      });
    },
  };
}
