import {
  contrastRatio,
  hexToRgb,
  oklchDifference,
  oklchToHex,
  rgbToOklch,
} from "../../lib/color-math.js";
import { destructiveAnchorDecision } from "./destructive-anchor.js";
import { V2_POLICY } from "./policy.js";

export const ACTION_PRESENTATION_POLICY = Object.freeze({
  id: "single-filled-action-hierarchy-v2",
  authority: "component-presentation",
  diagnosticTriggerId: "destructive-anchor.source-band-applicable",
  strategies: Object.freeze({
    coexistence: "primary-filled-destructive-outline",
    destructiveConfirmation: "destructive-filled-secondary-cancel",
  }),
});

export const SECONDARY_ACTION_STATE_POLICY = Object.freeze({
  id: "confirmation-secondary-state-family-v1",
  authority: "component-presentation",
  context: "destructive-confirmation",
  contextBackgroundRole: "muted surface",
  labelRole: "foreground",
  borderRole: "border",
  directionByMode: Object.freeze({ light: -1, dark: 1 }),
  minimumDeltaE: Object.freeze({ hover: 0.015, active: 0.03 }),
  candidateStep: 0.005,
  maximumLightnessShift: 0.08,
  minimumTextContrast: V2_POLICY.text.wcagNormalTextMinimum,
  typographyContext: Object.freeze({
    schema: V2_POLICY.text.typographyContextSchema,
    ...V2_POLICY.text.typographyContexts.actionLabel,
  }),
  boundaryContrastAuthority: "decorative-not-required-for-text-button",
});

function modeValues(modeResult) {
  if (!modeResult || !["light", "dark"].includes(modeResult.mode)) {
    throw new TypeError("A Light or Dark mode result is required.");
  }
  const values = modeResult.values;
  for (const role of ["muted surface", "foreground", "border"]) {
    if (!/^#[0-9A-F]{6}$/i.test(values?.[role] ?? "")) {
      throw new TypeError(`Secondary action requires ${role}.`);
    }
  }
  return values;
}

function requestedShifts(minimum) {
  const shifts = [];
  for (
    let shift = minimum;
    shift <=
    SECONDARY_ACTION_STATE_POLICY.maximumLightnessShift +
      SECONDARY_ACTION_STATE_POLICY.candidateStep / 2;
    shift += SECONDARY_ACTION_STATE_POLICY.candidateStep
  ) {
    shifts.push(Number(shift.toFixed(6)));
  }
  return shifts;
}

function secondaryCandidate({ base, direction, requestedShift, text }) {
  const rendered = oklchToHex({
    ...base,
    l: base.l + direction * requestedShift,
  });
  const coordinates = rgbToOklch(hexToRgb(rendered.hex));
  const difference = oklchDifference(base, coordinates);
  return {
    hex: rendered.hex,
    requestedShift,
    coordinates,
    difference,
    textContrast: contrastRatio(text, rendered.hex),
  };
}

function selectSecondaryState({ state, base, previous, direction, text }) {
  const minimumDeltaE = SECONDARY_ACTION_STATE_POLICY.minimumDeltaE[state];
  const candidates = requestedShifts(minimumDeltaE).map((requestedShift) =>
    secondaryCandidate({ base, direction, requestedShift, text }),
  );
  const eligible = candidates.filter((item) => {
    const followsDirection = direction * item.difference.deltaL > 0;
    const reachesStateDistance = item.difference.deltaE >= minimumDeltaE;
    const continuesBeyondPrevious = previous
      ? direction * (item.coordinates.l - previous.coordinates.l) > 0
      : true;
    return (
      followsDirection &&
      reachesStateDistance &&
      continuesBeyondPrevious &&
      item.textContrast >= SECONDARY_ACTION_STATE_POLICY.minimumTextContrast
    );
  });
  eligible.sort(
    (first, second) =>
      first.difference.deltaE - second.difference.deltaE ||
      first.requestedShift - second.requestedShift ||
      first.hex.localeCompare(second.hex),
  );
  const selected = eligible[0];
  if (!selected) {
    throw new Error(
      `No ${state} Secondary candidate satisfies direction and text contrast.`,
    );
  }
  return Object.freeze({
    state,
    candidateCount: candidates.length,
    eligibleCandidateCount: eligible.length,
    selected: Object.freeze({ ...selected }),
  });
}

export function secondaryActionPresentationForMode(modeResult) {
  const values = modeValues(modeResult);
  const text = values[SECONDARY_ACTION_STATE_POLICY.labelRole];
  const baseHex = values[SECONDARY_ACTION_STATE_POLICY.contextBackgroundRole];
  const base = rgbToOklch(hexToRgb(baseHex));
  const defaultTextContrast = contrastRatio(text, baseHex);
  if (defaultTextContrast < SECONDARY_ACTION_STATE_POLICY.minimumTextContrast) {
    throw new Error("Secondary default misses its text contrast contract.");
  }
  const direction =
    SECONDARY_ACTION_STATE_POLICY.directionByMode[modeResult.mode];
  const hover = selectSecondaryState({
    state: "hover",
    base,
    previous: null,
    direction,
    text,
  });
  const active = selectSecondaryState({
    state: "active",
    base,
    previous: hover.selected,
    direction,
    text,
  });
  return Object.freeze({
    policy: SECONDARY_ACTION_STATE_POLICY,
    mode: modeResult.mode,
    direction,
    values: Object.freeze({
      default: baseHex,
      hover: hover.selected.hex,
      active: active.selected.hex,
      text,
      border: values[SECONDARY_ACTION_STATE_POLICY.borderRole],
    }),
    checks: Object.freeze({
      defaultTextContrast,
      hoverTextContrast: hover.selected.textContrast,
      activeTextContrast: active.selected.textContrast,
      minimumTextContrast: SECONDARY_ACTION_STATE_POLICY.minimumTextContrast,
    }),
    decisions: Object.freeze({ hover, active }),
  });
}

function sourceRedBandApplies(result) {
  if (!result?.source?.oklch || !result?.source?.classification) {
    throw new TypeError(
      "A generated palette result with source evidence is required.",
    );
  }
  return destructiveAnchorDecision({
    input: {
      ...result.source.oklch,
      classification: result.source.classification,
    },
    mode: "dark",
  }).sourceBandApplicable;
}

export function actionPresentationForResult(
  result,
  { ordinaryPrimaryPresent },
) {
  if (typeof ordinaryPrimaryPresent !== "boolean") {
    throw new TypeError("ordinaryPrimaryPresent must be a boolean.");
  }
  const redBandDiagnosticApplies = sourceRedBandApplies(result);
  return Object.freeze({
    policy: ACTION_PRESENTATION_POLICY,
    redBandDiagnosticApplies,
    ordinaryPrimaryPresent,
    strategy: ordinaryPrimaryPresent
      ? ACTION_PRESENTATION_POLICY.strategies.coexistence
      : ACTION_PRESENTATION_POLICY.strategies.destructiveConfirmation,
    highestEmphasisRole: ordinaryPrimaryPresent ? "primary" : "destructive",
    primaryVariant: ordinaryPrimaryPresent ? "filled" : "absent",
    destructiveVariant: ordinaryPrimaryPresent ? "outline" : "filled",
    semanticRole: "destructive",
    visualSourceRole: "destructive",
    separationStatus: ordinaryPrimaryPresent
      ? "evaluated-by-current-policy"
      : "not-applicable-ordinary-primary-absent",
  });
}
