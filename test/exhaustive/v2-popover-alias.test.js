import assert from "node:assert/strict";
import test from "node:test";

import { apcaContrast } from "../../v2/lib/apca.js";
import { generatePaletteV2 } from "../../v2/lib/palette.js";
import { V2_POLICY } from "../../v2/lib/policy.js";

test("popover text retains the body-text target on its aliased surface", () => {
  for (let red = 0; red <= 255; red += 51) {
    for (let green = 0; green <= 255; green += 51) {
      for (let blue = 0; blue <= 255; blue += 51) {
        const primary = `#${[red, green, blue]
          .map((channel) => channel.toString(16).padStart(2, "0"))
          .join("")}`;
        const result = generatePaletteV2({ primary });
        for (const mode of ["light", "dark"]) {
          const values = result.modes[mode].values;
          assert.ok(
            Math.abs(apcaContrast(values["popover text"], values.popover)) >=
              V2_POLICY.foundation.bodyTextApcaDiagnosticLc,
            `${primary}/${mode} popover text`,
          );
        }
      }
    }
  }
});
