import { V2_POLICY } from "./policy.js";

export const PRIMARY_CHROMA_EXPERIMENT = Object.freeze({
  id: "source-relative-four-origin-primary-chroma",
  requestedScales: Object.freeze([1, 0.9, 0.75]),
  currentEffectiveCap: V2_POLICY.primary.chromaCap,
  boundTreatment: "Primary calm-chroma maximum follows raw source chroma",
  deduplication:
    "distinct requested C, then rendered sRGB hex with all origins",
});

export const PRIMARY_CHROMA_ADOPTION_GUARD = Object.freeze({
  id: "above-current-cap-transactional-fallback",
  sourceChromaTolerance: 1e-9,
  considerWhen:
    "raw source chroma is greater than the current effective cap plus tolerance",
  rejectWhen: Object.freeze([
    "the already-generated adaptive result is infeasible",
    "adaptive introduces a generated contract failure",
    "adaptive introduces a policy-owned pair eligibility miss",
  ]),
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
