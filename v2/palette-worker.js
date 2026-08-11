import { generatePaletteV2 } from "./lib/palette.js";

self.addEventListener("message", ({ data }) => {
  const startedAt = performance.now();
  try {
    const result = generatePaletteV2({ primary: data.primary });
    self.postMessage({
      id: data.id,
      result,
      duration: performance.now() - startedAt,
    });
  } catch (error) {
    self.postMessage({ id: data.id, error: error.message });
  }
});
