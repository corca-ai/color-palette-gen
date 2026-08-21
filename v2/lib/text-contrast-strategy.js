import { apcaContrast, contrastRatio } from "./runtime.js";
import { V2_POLICY } from "./policy.js";

export const TEXT_CONTRAST_STRATEGIES = Object.freeze({
  PRODUCTION: "wcag-eligible-apca-ranked",
  APCA_ONLY: "apca-only",
  WCAG_ONLY: "wcag-only",
  INTERSECTION: "intersection",
});

export const TEXT_CONTRAST_EXPERIMENT = Object.freeze({
  id: "text-contrast-policy-counterfactual.v2",
  authority: "diagnostic",
  strategies: Object.freeze([
    TEXT_CONTRAST_STRATEGIES.PRODUCTION,
    TEXT_CONTRAST_STRATEGIES.APCA_ONLY,
    TEXT_CONTRAST_STRATEGIES.WCAG_ONLY,
    TEXT_CONTRAST_STRATEGIES.INTERSECTION,
  ]),
  wcagNormalTextMinimum: 4.5,
  intersectionRule: "apca-pass-and-wcag-pass",
  intersectionRanking: "preserve-apca-objective",
  productionRule: "wcag-pass-with-apca-objective",
  canonicalColorBoundary: "final-rendered-srgb",
});

export const PRODUCTION_TEXT_CONTRAST_POLICY = Object.freeze({
  id: "normal-text-wcag-eligible-apca-ranked.v1",
  authority: "normative",
  strategy: TEXT_CONTRAST_STRATEGIES.PRODUCTION,
  eligibility: "wcag-2.2-normal-text",
  wcagMinimum: V2_POLICY.text.wcagNormalTextMinimum,
  ranking: "maximize-weakest-apca-diagnostic",
  typographyContextSchema: V2_POLICY.text.typographyContextSchema,
  canonicalColorBoundary: "final-rendered-srgb",
});

const STRATEGIES = new Set(Object.values(TEXT_CONTRAST_STRATEGIES));

export function assertTextContrastStrategy(strategy) {
  if (!STRATEGIES.has(strategy)) {
    throw new TypeError(`Unsupported text contrast strategy: ${strategy}.`);
  }
  return strategy;
}

export function textContrastEvidence({
  foreground,
  backgrounds,
  apcaMinimum,
  strategy = TEXT_CONTRAST_STRATEGIES.PRODUCTION,
}) {
  assertTextContrastStrategy(strategy);
  if (
    typeof foreground !== "string" ||
    !Array.isArray(backgrounds) ||
    backgrounds.length === 0 ||
    backgrounds.some((background) => typeof background !== "string")
  ) {
    throw new TypeError(
      "Text contrast evidence requires a foreground and one or more backgrounds.",
    );
  }
  if (!(Number.isFinite(apcaMinimum) && apcaMinimum > 0)) {
    throw new TypeError("Text contrast evidence requires an APCA minimum.");
  }

  const apcaValues = backgrounds.map((background) =>
    Math.abs(apcaContrast(foreground, background)),
  );
  const wcagValues = backgrounds.map((background) =>
    contrastRatio(foreground, background),
  );
  const minimumLc = Math.min(...apcaValues);
  const minimumRatio = Math.min(...wcagValues);
  const apcaPassed = minimumLc >= apcaMinimum;
  const wcagMinimum =
    strategy === TEXT_CONTRAST_STRATEGIES.PRODUCTION
      ? PRODUCTION_TEXT_CONTRAST_POLICY.wcagMinimum
      : TEXT_CONTRAST_EXPERIMENT.wcagNormalTextMinimum;
  const wcagPassed = minimumRatio >= wcagMinimum;
  const passed =
    strategy === TEXT_CONTRAST_STRATEGIES.APCA_ONLY
      ? apcaPassed
      : strategy === TEXT_CONTRAST_STRATEGIES.WCAG_ONLY ||
          strategy === TEXT_CONTRAST_STRATEGIES.PRODUCTION
        ? wcagPassed
        : apcaPassed && wcagPassed;

  return {
    strategy,
    passed,
    apca: {
      values: apcaValues,
      minimum: minimumLc,
      required: apcaMinimum,
      passed: apcaPassed,
    },
    wcag: {
      values: wcagValues,
      minimum: minimumRatio,
      required: wcagMinimum,
      passed: wcagPassed,
    },
  };
}

export function textContrastObjective(evidence) {
  return evidence.strategy === TEXT_CONTRAST_STRATEGIES.WCAG_ONLY
    ? evidence.wcag.minimum
    : evidence.apca.minimum;
}

export function chooseTextContrastForeground({
  backgrounds,
  apcaMinimum,
  strategy = TEXT_CONTRAST_STRATEGIES.PRODUCTION,
}) {
  assertTextContrastStrategy(strategy);
  const candidates = ["#000000", "#FFFFFF"].map((foreground) => {
    const evidence = textContrastEvidence({
      foreground,
      backgrounds,
      apcaMinimum,
      strategy,
    });
    return { foreground, evidence };
  });
  const eligible = candidates.filter(({ evidence }) => evidence.passed);
  const ranked = eligible.length > 0 ? eligible : candidates;
  ranked.sort(
    (first, second) =>
      textContrastObjective(second.evidence) -
      textContrastObjective(first.evidence),
  );
  return ranked[0];
}
