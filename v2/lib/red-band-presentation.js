import { actionPresentationForResult } from "./action-presentation.js";

export const RED_BAND_PRESENTATION_PROBE = Object.freeze({
  id: "red-band-role-collision-presentation",
  authority: "diagnostic",
  strategies: Object.freeze([
    "two-filled-control",
    "primary-filled-destructive-outline",
    "destructive-filled-secondary-cancel",
  ]),
});

function family(values, role) {
  return Object.freeze({
    default: values[role],
    hover: values[`${role} hover`],
    active: values[`${role} active`],
    text: values[`${role} text`],
  });
}

function modeComparison(modeResult, coexistence, destructiveConfirmation) {
  const primaryFamily = family(modeResult.values, "primary");
  const destructiveFamily = family(modeResult.values, "destructive");
  return Object.freeze({
    primaryFamily,
    destructiveFamily,
    twoFilledControl: Object.freeze({
      strategy: "two-filled-control",
      ordinaryPrimaryPresent: true,
      status: "not-adopted-two-high-emphasis-actions",
    }),
    coexistence,
    destructiveConfirmation,
  });
}

export function buildRedBandPresentationComparison(result) {
  const coexistence = actionPresentationForResult(result, {
    ordinaryPrimaryPresent: true,
  });
  const destructiveConfirmation = actionPresentationForResult(result, {
    ordinaryPrimaryPresent: false,
  });
  const sourceBandApplicable = coexistence.redBandDiagnosticApplies;
  if (!sourceBandApplicable) {
    return Object.freeze({
      experiment: RED_BAND_PRESENTATION_PROBE,
      input: result.input.primary,
      applicable: false,
      modes: null,
    });
  }
  return Object.freeze({
    experiment: RED_BAND_PRESENTATION_PROBE,
    adoptedPresentationPolicy: coexistence.policy,
    input: result.input.primary,
    applicable: true,
    modes: Object.freeze(
      Object.fromEntries(
        ["light", "dark"].map((mode) => [
          mode,
          modeComparison(
            result.modes[mode],
            coexistence,
            destructiveConfirmation,
          ),
        ]),
      ),
    ),
    nonclaims: Object.freeze([
      "The red-band diagnostic does not choose the component hierarchy.",
      "One filled action does not establish that the hierarchy is aesthetically optimal.",
      "Component presentation does not change palette generation policy.",
    ]),
  });
}
