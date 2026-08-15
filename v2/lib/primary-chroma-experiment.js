import { V2_POLICY } from "./policy.js";

export const PRIMARY_CHROMA_EXPERIMENT = Object.freeze({
  id: "source-relative-four-origin-primary-chroma",
  requestedScales: Object.freeze([1, 0.9, 0.75]),
  currentEffectiveCap: V2_POLICY.primary.chromaCap,
  boundTreatment: "Primary calm-chroma maximum follows raw source chroma",
  deduplication:
    "distinct requested C, then rendered sRGB hex with all origins",
});

export function primaryChromaRequests(rawChroma) {
  const origins = [
    rawChroma,
    ...PRIMARY_CHROMA_EXPERIMENT.requestedScales
      .slice(1)
      .map((scale) => rawChroma * scale),
    Math.min(rawChroma, PRIMARY_CHROMA_EXPERIMENT.currentEffectiveCap),
  ];
  return {
    origins,
    distinct: origins.filter(
      (value, index, values) =>
        values.findIndex((other) => Math.abs(other - value) < 1e-9) === index,
    ),
  };
}
