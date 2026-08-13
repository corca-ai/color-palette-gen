import assert from "node:assert/strict";
import test from "node:test";

import { generatePaletteV2 } from "../../v2/lib/palette.js";

test("v2 contracts hold across an RGB input grid", () => {
  const channels = [0, 51, 102, 153, 204, 255];
  for (const red of channels) {
    for (const green of channels) {
      for (const blue of channels) {
        const primary = `#${[red, green, blue]
          .map((channel) => channel.toString(16).padStart(2, "0"))
          .join("")}`;
        const result = generatePaletteV2({ primary });
        assert.equal(result.passed, true, primary);
        assert.equal(
          result.quality.checks.every(({ value }) => Number.isFinite(value)),
          true,
          `${primary} paired quality metrics`,
        );
      }
    }
  }
});
