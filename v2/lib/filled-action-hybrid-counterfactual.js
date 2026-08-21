import { createHash } from "node:crypto";

import { destructiveAnchorDecision } from "./destructive-anchor.js";
import {
  DIAGNOSTIC_RGB_CHANNELS,
  diagnosticInputGrid,
} from "./diagnostic-corpus.js";
import {
  generatePaletteV2BothDarkerLegacyCounterfactual,
  generatePaletteV2FilledActionDirectionCounterfactual,
} from "./palette.js";
import { FILLED_ACTION_DIRECTION_EXPERIMENT } from "./filled-action-direction.js";
import { assertDiagnosticResult } from "./result-evidence.js";
import { candidate } from "./runtime.js";

export const FILLED_ACTION_HYBRID_PROPOSAL = Object.freeze({
  id: "source-red-collision-aware-mode-relative-actions",
  status: "proposed",
  lightDirection: -1,
  darkDirectionByBranch: Object.freeze({
    "source-red-collision": -1,
    "mode-relative": 1,
  }),
  sourceRedPredicateOwner: "destructive-anchor.source-band-applicable",
  noFallback: true,
});

function digest(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function failedIds(checks) {
  return checks
    .filter(({ pass }) => !pass)
    .map(({ id, role }) => id ?? role)
    .sort();
}

function actualDirection(result, mode, family) {
  const values = result.modes[mode].values;
  const lightness = [family, `${family} hover`, `${family} active`].map(
    (role) => candidate(values[role]).oklch.l,
  );
  if (lightness[0] > lightness[1] && lightness[1] > lightness[2]) return -1;
  if (lightness[0] < lightness[1] && lightness[1] < lightness[2]) return 1;
  throw new TypeError(`${mode} ${family} has no strict state direction.`);
}

function introducedIds(current, selected, readChecks) {
  const before = new Set(failedIds(readChecks(current)));
  return failedIds(readChecks(selected)).filter((id) => !before.has(id));
}

function observation(input, current, selected, branch) {
  assertDiagnosticResult(selected);
  if (
    branch === "mode-relative" &&
    (selected.diagnosticOverride?.experiment !==
      FILLED_ACTION_DIRECTION_EXPERIMENT.id ||
      JSON.stringify(selected.diagnosticOverride.experimentDefinition) !==
        JSON.stringify(FILLED_ACTION_DIRECTION_EXPERIMENT))
  ) {
    throw new TypeError("Mode-relative experiment identity drifted.");
  }
  const direction = Object.fromEntries(
    ["light", "dark"].map((mode) => [
      mode,
      Object.fromEntries(
        ["primary", "destructive"].map((family) => [
          family,
          actualDirection(selected, mode, family),
        ]),
      ),
    ]),
  );
  const foregroundMismatchModes = ["light", "dark"].filter(
    (mode) =>
      selected.modes[mode].values["primary text"] !==
      selected.modes[mode].values["destructive text"],
  );
  const expectedDarkDirection =
    FILLED_ACTION_HYBRID_PROPOSAL.darkDirectionByBranch[branch];
  for (const family of ["primary", "destructive"]) {
    if (
      direction.light[family] !==
        FILLED_ACTION_HYBRID_PROPOSAL.lightDirection ||
      direction.dark[family] !== expectedDarkDirection
    ) {
      throw new TypeError(
        `${input} does not follow the ${branch} filled-action grammar.`,
      );
    }
  }
  return {
    input,
    branch,
    direction,
    foregroundMismatchModes,
    introducedContractIds: introducedIds(current, selected, (result) =>
      ["light", "dark"].flatMap((mode) => result.modes[mode].checks),
    ),
    introducedQualityIds: introducedIds(
      current,
      selected,
      (result) => result.quality.checks,
    ),
    semanticRegression:
      current.semanticEvaluation.satisfied &&
      !selected.semanticEvaluation.satisfied,
    pairEligibilityMissIncrease:
      selected.pairDecision.eligibilityMisses >
      current.pairDecision.eligibilityMisses,
    selectedResultDigest: digest(selected),
  };
}

export function buildFilledActionHybridCounterfactualReport({
  channels = DIAGNOSTIC_RGB_CHANNELS,
  generateCurrent = generatePaletteV2BothDarkerLegacyCounterfactual,
  generateModeRelative = generatePaletteV2FilledActionDirectionCounterfactual,
} = {}) {
  const inputs = diagnosticInputGrid(channels);
  const cases = inputs.map((input) => {
    const current = generateCurrent({ primary: input });
    assertDiagnosticResult(current);
    const sourceBandApplicable = destructiveAnchorDecision({
      input: {
        ...current.source.oklch,
        classification: current.source.classification,
      },
      mode: "dark",
    }).sourceBandApplicable;
    const branch = sourceBandApplicable
      ? "source-red-collision"
      : "mode-relative";
    const selected = sourceBandApplicable
      ? current
      : generateModeRelative({ primary: input });
    return observation(input, current, selected, branch);
  });
  const redCases = cases.filter(
    ({ branch }) => branch === "source-red-collision",
  );
  const modeRelativeCases = cases.filter(
    ({ branch }) => branch === "mode-relative",
  );
  const qualityIntroductions = cases.filter(
    ({ introducedQualityIds }) => introducedQualityIds.length > 0,
  );
  const unexpected = cases.filter(
    ({
      semanticRegression,
      pairEligibilityMissIncrease,
      foregroundMismatchModes,
    }) =>
      semanticRegression ||
      pairEligibilityMissIncrease ||
      foregroundMismatchModes.length > 0,
  );
  const currentContractDifferenceCases = cases
    .filter(({ introducedContractIds }) => introducedContractIds.length > 0)
    .map(({ input, introducedContractIds }) => ({
      input,
      introducedContractIds,
    }));
  return {
    schema: "color-palette-filled-action-hybrid-counterfactual.v1",
    authority: "diagnostic",
    proposal: FILLED_ACTION_HYBRID_PROPOSAL,
    scope: {
      inputCount: cases.length,
      generatedInputCount: cases.length,
      sourceRedCollisionInputCount: redCases.length,
      modeRelativeInputCount: modeRelativeCases.length,
    },
    directionCounts: {
      lightDarker: cases.length,
      darkLighter: modeRelativeCases.length,
      darkDarker: redCases.length,
    },
    qualityWarningIntroductions: qualityIntroductions.map(
      ({ input, introducedQualityIds }) => ({ input, introducedQualityIds }),
    ),
    unexpectedRegressionCases: unexpected.map(({ input }) => input),
    currentContractDifferenceCases,
    sourceRedCollisionInputs: redCases.map(({ input }) => input),
    modeRelativeInputs: modeRelativeCases.map(({ input }) => input),
    caseDigest: digest(cases),
    selectedOutputDigest: digest(
      cases.map(({ input, branch, selectedResultDigest }) => ({
        input,
        branch,
        selectedResultDigest,
      })),
    ),
    cases,
    interpretation: {
      status: "proposed-not-adopted",
      warningBoundary:
        "Selected-result source-fidelity warnings remain false review verdicts and require explicit human disposition.",
      nonclaims: [
        "Historical APCA-generated arms are re-read by the current WCAG result contract; currentContractDifferenceCases are migration evidence, not an isolated direction regression.",
        "The source-red predicate is provisional product policy, not a perceptually validated red definition.",
        "The fixed RGB corpus proves bounded deterministic feasibility, not aesthetic quality or population preference.",
        "The source-red branch is selected before generation and is not a fallback after candidate exhaustion.",
      ],
    },
  };
}
