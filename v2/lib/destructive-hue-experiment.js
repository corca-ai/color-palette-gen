export const DESTRUCTIVE_HUE_INVENTORY_EXPERIMENT = Object.freeze({
  id: "bounded-red-hue-ladder",
  anchorHue: 27,
  requestedHues: Object.freeze([12, 27, 42]),
  derivation:
    "symmetric ±15° around the existing 27° anchor, matching the existing Warning inventory spacing",
  chroma: 0.19,
  authority: "diagnostic",
});
