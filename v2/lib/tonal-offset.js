import { V2_POLICY } from "./policy.js";

export const TONAL_OFFSET_EXPERIMENT = Object.freeze({
  id: "mode-relative-default-tonal-offset",
  authority: "diagnostic",
  minimum: 0,
  maximum: 0.08,
  step: 0.005,
  changedDimension:
    "Shift Light filled-action default search and objective lighter, and Dark darker, by one shared OKLCH L offset.",
});

export function tonalOffsetProfile(offset, baselineModes) {
  if (
    !Number.isFinite(offset) ||
    offset < TONAL_OFFSET_EXPERIMENT.minimum ||
    offset > TONAL_OFFSET_EXPERIMENT.maximum
  ) {
    throw new TypeError("Tonal offset must be a finite value from 0 to 0.08.");
  }
  const shift = { light: offset, dark: -offset };
  if (
    !baselineModes ||
    !["light", "dark"].every((mode) =>
      Number.isFinite(
        baselineModes[mode]?.decisions?.primary?.selected?.oklch?.l,
      ),
    )
  ) {
    throw new TypeError(
      "Tonal offset requires validated baseline mode evidence.",
    );
  }
  const shiftedRanges = (ranges) =>
    Object.fromEntries(
      Object.entries(ranges).map(([mode, [start, end]]) => [
        mode,
        [start + shift[mode], end + shift[mode]],
      ]),
    );
  return Object.freeze({
    offset,
    shifts: Object.freeze(shift),
    preferredPrimaryLightnesses: Object.freeze(
      Object.fromEntries(
        ["light", "dark"].map((mode) => [
          mode,
          baselineModes[mode].decisions.primary.selected.oklch.l + shift[mode],
        ]),
      ),
    ),
    primaryLightnessRanges: shiftedRanges(V2_POLICY.primary.lightnessRange),
    destructiveLightnessRanges: shiftedRanges(
      V2_POLICY.destructive.lightnessRange,
    ),
  });
}
