import { hexCiede2000 } from "./color-difference.js";
import { candidate, contrastRatio, distance } from "./runtime.js";

const STATE_ROLES = ["primary", "primary hover", "primary active"];
const PAIRS = [
  ["defaultToHover", 0, 1],
  ["hoverToActive", 1, 2],
];

function contextMetrics(first, second, context) {
  const contrast = [
    contrastRatio(first, context),
    contrastRatio(second, context),
  ];
  return { contrast, change: contrast[1] - contrast[0] };
}

function pairMetrics(values, [, from, to]) {
  const first = values[STATE_ROLES[from]];
  const second = values[STATE_ROLES[to]];
  return {
    colors: [first, second],
    oklabDeltaE: distance(candidate(first), candidate(second)),
    ciede2000: hexCiede2000(first, second),
    contexts: Object.fromEntries(
      ["surface", "background"].map((role) => [
        role,
        contextMetrics(first, second, values[role]),
      ]),
    ),
  };
}

export function diagnosePrimaryHover(modes) {
  const byMode = Object.fromEntries(
    ["light", "dark"].map((mode) => {
      const values = modes[mode].values;
      const pairs = Object.fromEntries(
        PAIRS.map((pair) => [pair[0], pairMetrics(values, pair)]),
      );
      const colors = STATE_ROLES.map((role) => values[role]);
      const firstChange = pairs.defaultToHover.contexts.surface.change;
      const secondChange = pairs.hoverToActive.contexts.surface.change;
      return [
        mode,
        {
          colors,
          pairs,
          distinctExportedColors: new Set(colors).size === colors.length,
          reversesAgainstSurface: firstChange * secondChange < 0,
        },
      ];
    }),
  );
  const structuralFlags = Object.entries(byMode).flatMap(([mode, result]) => [
    ...(!result.distinctExportedColors ? [`${mode}.duplicate-export`] : []),
    ...(result.reversesAgainstSurface
      ? [`${mode}.surface-direction-reversal`]
      : []),
  ]);
  return {
    authority: "diagnostic",
    interpretation:
      "Signals review priority; it does not prove temporal hover discoverability.",
    structuralFlags,
    reviewPriority: structuralFlags.length ? "high" : "unclassified",
    modes: byMode,
  };
}
