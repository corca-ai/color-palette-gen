import { generatePaletteV2, inspectLightWarningAppearance } from "./palette.js";
import {
  WARNING_APPEARANCE_ARMS,
  WARNING_APPEARANCE_EXPERIMENT,
  WARNING_APPEARANCE_INPUTS,
} from "./warning-appearance-experiment.js";

export function buildWarningAppearanceReviewCase(primary) {
  if (!WARNING_APPEARANCE_INPUTS.includes(primary)) {
    throw new TypeError(
      `Unsupported Warning appearance review input: ${primary}.`,
    );
  }
  const production = generatePaletteV2({ primary });
  const baseline = production.modes.light;
  const arms = WARNING_APPEARANCE_ARMS.map((arm) => ({
    ...arm,
    inspection: inspectLightWarningAppearance({
      result: production,
      recipe: arm.recipe,
    }),
  }));
  if (
    arms[0].inspection.family.default !== baseline.values.warning ||
    arms[0].inspection.family.hover !== baseline.values["warning hover"] ||
    arms[0].inspection.family.active !== baseline.values["warning active"] ||
    arms[0].inspection.family.text !== baseline.values["warning text"]
  ) {
    throw new TypeError(
      "Warning appearance baseline must reproduce the production family.",
    );
  }
  for (const arm of arms) {
    arm.matchesCurrentRenderedFamily =
      arm.id !== "current" &&
      JSON.stringify(arm.inspection.family) ===
        JSON.stringify(arms[0].inspection.family);
  }
  return {
    schema: "light-warning-appearance-review-case.v3",
    authority: "accepted-decision-record",
    experiment: WARNING_APPEARANCE_EXPERIMENT,
    input: primary,
    context: {
      background: baseline.values.background,
      surface: baseline.values.surface,
      mutedSurface: baseline.values["muted surface"],
      foreground: baseline.values.foreground,
      primary: baseline.values.primary,
      destructive: baseline.values.destructive,
    },
    arms,
    nonclaims: [
      "Historical arms do not enter production generation or exports.",
      "Passing contracts do not establish aesthetic preference.",
      "Requested chroma is not necessarily rendered chroma after gamut mapping.",
    ],
  };
}

export function buildWarningAppearanceReviewReport() {
  const cases = WARNING_APPEARANCE_INPUTS.map(buildWarningAppearanceReviewCase);
  return {
    schema: "light-warning-appearance-review-report.v3",
    authority: "accepted-decision-record",
    experiment: WARNING_APPEARANCE_EXPERIMENT,
    inputCount: cases.length,
    cases,
    summary: Object.fromEntries(
      WARNING_APPEARANCE_ARMS.map((arm) => {
        const inspections = cases.map(
          (item) => item.arms.find(({ id }) => id === arm.id).inspection,
        );
        return [
          arm.id,
          {
            uniqueDefaultCount: new Set(
              inspections.map(({ family }) => family.default),
            ).size,
            minimumPassingCandidates: Math.min(
              ...inspections.map(({ candidates }) => candidates.passing),
            ),
            minimumTextContrast: Math.min(
              ...inspections.map(
                ({ rendered }) => rendered.minimumTextContrast,
              ),
            ),
            minimumPrimaryDistance: Math.min(
              ...inspections.map(({ rendered }) => rendered.primaryDistance),
            ),
            minimumDestructiveDistance: Math.min(
              ...inspections.map(
                ({ rendered }) => rendered.destructiveDistance,
              ),
            ),
          },
        ];
      }),
    ),
  };
}
