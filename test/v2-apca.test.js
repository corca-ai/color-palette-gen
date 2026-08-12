import assert from "node:assert/strict";
import test from "node:test";

import { APCAcontrast, sRGBtoY } from "apca-w3";

import { apcaContrast, sRgbToApcaY } from "../v2/lib/apca.js";

function rgb(hex) {
  return [1, 3, 5].map((offset) =>
    Number.parseInt(hex.slice(offset, offset + 2), 16),
  );
}

function officialContrast(text, background) {
  return APCAcontrast(
    sRGBtoY([...rgb(text), 1]),
    sRGBtoY([...rgb(background), 1]),
  );
}

test("APCA preserves contrast polarity and known endpoints", () => {
  assert.ok(
    Math.abs(apcaContrast("#000000", "#FFFFFF") - 106.040673) < 0.000001,
  );
  assert.ok(
    Math.abs(apcaContrast("#FFFFFF", "#000000") + 107.884733) < 0.000001,
  );
  assert.ok(
    Math.abs(apcaContrast("#777777", "#FFFFFF") - 71.111103) < 0.000001,
  );
  assert.ok(
    Math.abs(apcaContrast("#FFFFFF", "#777777") + 76.581946) < 0.000001,
  );
  assert.equal(apcaContrast("#777777", "#777777"), 0);
});

test("APCA rejects invalid color strings", () => {
  assert.throws(() => apcaContrast("red", "#FFFFFF"), /six-digit hex/);
});

test("local APCA luminance matches the official apca-w3 0.1.9 implementation", () => {
  for (const red of [0, 51, 102, 153, 204, 255]) {
    for (const green of [0, 51, 102, 153, 204, 255]) {
      for (const blue of [0, 51, 102, 153, 204, 255]) {
        const hex = `#${[red, green, blue]
          .map((channel) => channel.toString(16).padStart(2, "0"))
          .join("")}`;
        assert.ok(
          Math.abs(sRgbToApcaY(hex) - sRGBtoY([red, green, blue, 1])) < 1e-12,
          hex,
        );
      }
    }
  }
});

test("local APCA contrast matches official apca-w3 across 46,656 pairs", () => {
  const levels = [0, 51, 102, 153, 204, 255];
  const colors = levels.flatMap((red) =>
    levels.flatMap((green) =>
      levels.map(
        (blue) =>
          `#${[red, green, blue]
            .map((channel) => channel.toString(16).padStart(2, "0"))
            .join("")}`,
      ),
    ),
  );

  for (const text of colors) {
    for (const background of colors) {
      assert.ok(
        Math.abs(
          apcaContrast(text, background) - officialContrast(text, background),
        ) < 1e-10,
        `${text} on ${background}`,
      );
    }
  }
});
