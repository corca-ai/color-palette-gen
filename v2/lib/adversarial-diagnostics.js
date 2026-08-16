import { generatePaletteV2 } from "./palette.js";
import { V2_POLICY } from "./policy.js";
import {
  DIAGNOSTIC_RGB_CHANNELS,
  diagnosticInputGrid,
  normalizeDiagnosticChannels,
} from "./diagnostic-corpus.js";
import { assertDiagnosticResult } from "./result-evidence.js";

export const ADVERSARIAL_CHANNELS = DIAGNOSTIC_RGB_CHANNELS;

function actionSignature(result) {
  return Object.fromEntries(
    ["light", "dark"].map((mode) => [
      mode,
      [
        result.modes[mode].values.primary,
        result.modes[mode].values["primary hover"],
        result.modes[mode].values["primary active"],
      ],
    ]),
  );
}

const SOURCE_COHORTS = {
  lightness: [
    { id: "very-dark", maximumExclusive: 0.25 },
    { id: "dark", maximumExclusive: 0.5 },
    { id: "light", maximumExclusive: 0.75 },
    { id: "very-light", maximumExclusive: 1.01 },
  ],
  chroma: [
    { id: "low", maximumExclusive: 0.08 },
    { id: "moderate", maximumExclusive: 0.16 },
    { id: "high", maximumExclusive: null },
  ],
  hueSectorDegrees: 60,
};

const SEMANTIC_HUE_REVIEW_CHECKS = Object.freeze([
  {
    id: "review.light.primary-destructive-hue",
    mode: "light",
    relationship: "primary-destructive",
  },
  {
    id: "review.light.primary-warning-hue",
    mode: "light",
    relationship: "primary-warning",
  },
  {
    id: "review.dark.primary-destructive-hue",
    mode: "dark",
    relationship: "primary-destructive",
  },
  {
    id: "review.dark.primary-warning-hue",
    mode: "dark",
    relationship: "primary-warning",
  },
]);

function cohortFor(value, definitions) {
  return definitions.find(
    ({ maximumExclusive }) =>
      maximumExclusive === null || value < maximumExclusive,
  ).id;
}

function sourceProfile(source) {
  const { l, c, h } = source.oklch;
  const achromatic = source.classification === "achromatic";
  const normalizedHue = ((h % 360) + 360) % 360;
  const hueSectorStart =
    Math.floor(normalizedHue / SOURCE_COHORTS.hueSectorDegrees) *
    SOURCE_COHORTS.hueSectorDegrees;
  return {
    oklch: { l, c, h },
    lightnessCohort: cohortFor(l, SOURCE_COHORTS.lightness),
    chromaCohort: achromatic
      ? "achromatic"
      : cohortFor(c, SOURCE_COHORTS.chroma),
    hueSector: achromatic
      ? "achromatic"
      : `${hueSectorStart}–${hueSectorStart + SOURCE_COHORTS.hueSectorDegrees}`,
  };
}

function movementDirection(delta, tolerance = 1e-9) {
  if (Math.abs(delta) <= tolerance) return "stable";
  return delta > 0 ? "increase" : "decrease";
}

function sourceLightnessRelativeToRange(sourceLightness, modeRange) {
  if (sourceLightness < modeRange.metrics.minimum) return "below";
  if (sourceLightness > modeRange.metrics.maximum) return "above";
  return "inside";
}

function bestRankedRejectedEvidence(constraintResults, mode) {
  const ids = constraintResults.map(({ id }) => id);
  const modeRanges = constraintResults.filter(
    ({ id }) => id === "primary.mode-range",
  );
  const failedConstraintIds = [
    ...new Set(
      constraintResults
        .filter(({ passed }) => passed === false)
        .map(({ id }) => id),
    ),
  ].sort();
  if (
    new Set(ids).size !== ids.length ||
    modeRanges.length !== 1 ||
    !Number.isFinite(modeRanges[0].metrics?.minimum) ||
    !Number.isFinite(modeRanges[0].metrics?.maximum) ||
    modeRanges[0].metrics.minimum > modeRanges[0].metrics.maximum ||
    failedConstraintIds.length === 0
  ) {
    throw new TypeError(
      `modes.${mode} best-ranked rejected Primary evidence must contain unique constraints, one ordered mode range, and a failed verdict.`,
    );
  }
  return { modeRange: modeRanges[0], failedConstraintIds };
}

function sourceShiftEvidence(result, mode) {
  const modeResult = result.modes[mode];
  const selected = modeResult.decisions?.primary?.selected?.oklch;
  const nearestRejected =
    modeResult.decisions?.primary?.alternatives?.nearestRejected;
  if (
    !selected ||
    !Number.isFinite(selected.l) ||
    !Number.isFinite(selected.c) ||
    !Number.isFinite(modeResult.adaptations.primarySourceDistance) ||
    !Array.isArray(nearestRejected?.constraintResults) ||
    nearestRejected.constraintResults.some(
      (result) =>
        typeof result?.id !== "string" || typeof result.passed !== "boolean",
    )
  ) {
    throw new TypeError(
      `modes.${mode} primary decision must expose valid selected and best-ranked rejected Primary evidence.`,
    );
  }
  const { modeRange, failedConstraintIds } = bestRankedRejectedEvidence(
    nearestRejected.constraintResults,
    mode,
  );
  const sourceLightness = result.source.oklch.l;
  return {
    sourceDistance: modeResult.adaptations.primarySourceDistance,
    lightnessDelta: selected.l - result.source.oklch.l,
    lightnessDirection: movementDirection(selected.l - result.source.oklch.l),
    chromaDelta: selected.c - result.source.oklch.c,
    chromaDirection: movementDirection(selected.c - result.source.oklch.c),
    sourceLightnessRoleRange: {
      sourceLightness,
      minimum: modeRange.metrics.minimum,
      maximum: modeRange.metrics.maximum,
      position: sourceLightnessRelativeToRange(sourceLightness, modeRange),
    },
    bestRankedRejectedConstraintIds: failedConstraintIds,
    bestRankedRejectedConstraintCombination: failedConstraintIds.join("+"),
  };
}

function checkName(check) {
  return check?.id ?? check?.role;
}

function semanticHueReviewChecks(result) {
  const checks = result.quality?.semanticChecks;
  if (!Array.isArray(checks) || checks.length !== 4) {
    throw new TypeError(
      "quality.semanticChecks must contain exactly four semantic-hue review verdicts.",
    );
  }
  const byId = new Map();
  for (const check of checks) {
    if (
      typeof check?.id !== "string" ||
      byId.has(check.id) ||
      typeof check.pass !== "boolean" ||
      !Number.isFinite(check.value) ||
      !Number.isFinite(check.target) ||
      typeof check.unit !== "string" ||
      check.authority !== "provisional"
    ) {
      throw new TypeError(
        "quality.semanticChecks must expose unique named verdicts with finite producer evidence.",
      );
    }
    byId.set(check.id, check);
  }
  const normalized = SEMANTIC_HUE_REVIEW_CHECKS.map((definition) => {
    const check = byId.get(definition.id);
    const aggregate = result.quality.checks.filter(
      ({ id }) => id === definition.id,
    );
    const reconciled =
      aggregate.length === 1 &&
      ["pass", "value", "target", "unit", "authority"].every(
        (field) => aggregate[0][field] === check?.[field],
      );
    if (!check || !reconciled) {
      throw new TypeError(
        "semantic-hue review verdicts must match the aggregate quality evidence exactly once.",
      );
    }
    return {
      ...definition,
      value: check.value,
      target: check.target,
      unit: check.unit,
      authority: check.authority,
      pass: check.pass,
    };
  });
  if (byId.size !== normalized.length) {
    throw new TypeError(
      "quality.semanticChecks contains an unknown semantic-hue review verdict.",
    );
  }
  return normalized;
}

function diagnoseCase(primary, result) {
  assertDiagnosticResult(result);
  const semanticHueChecks = semanticHueReviewChecks(result);
  const failedContractChecks = ["light", "dark"].flatMap((mode) =>
    result.modes[mode].checks
      .filter(({ pass }) => !pass)
      .map((check) => `${mode}:${checkName(check)}`),
  );
  const failedQualityChecks = result.quality.checks
    .filter(({ pass }) => !pass)
    .map(({ id }) => id)
    .sort();
  const semanticFindings = result.semanticEvaluation.evaluations
    .filter(({ status }) => status !== "satisfied")
    .map(({ id, status }) => `${id}:${status}`)
    .sort();
  const largeBrandShiftModes = ["light", "dark"].filter(
    (mode) => result.modes[mode].adaptations.largeBrandShift,
  );
  const sourceShiftByMode = Object.fromEntries(
    largeBrandShiftModes.map((mode) => [
      mode,
      sourceShiftEvidence(result, mode),
    ]),
  );
  const signals = [
    ...(!result.passed ? ["generated-contract-failure"] : []),
    ...failedContractChecks.map((id) => `contract:${id}`),
    ...failedQualityChecks.map((id) => `quality:${id}`),
    ...semanticFindings.map((finding) => `semantic:${finding}`),
    ...result.hoverDiagnostics.structuralFlags.map((flag) => `hover:${flag}`),
    ...largeBrandShiftModes.map((mode) => `source-shift:${mode}`),
    ...(result.pairDecision.selected.qualityMisses > 0
      ? ["pair:selected-with-quality-miss"]
      : []),
  ].sort();

  return {
    input: primary,
    classification: result.source.classification,
    sourceProfile: sourceProfile(result.source),
    signals,
    failedContractChecks,
    failedQualityChecks,
    semanticFindings,
    hoverStructuralFlags: [...result.hoverDiagnostics.structuralFlags].sort(),
    largeBrandShiftModes,
    sourceShiftByMode,
    pairQualityMisses: result.pairDecision.selected.qualityMisses,
    pairEligibilityMisses: result.pairDecision.selected.eligibilityMisses,
    semanticHueReviewChecks: semanticHueChecks,
    actionSignature: actionSignature(result),
  };
}

function increment(counts, key) {
  counts[key] = (counts[key] ?? 0) + 1;
}

function sortedCounts(counts) {
  return Object.fromEntries(
    Object.entries(counts).sort(([first], [second]) =>
      first.localeCompare(second),
    ),
  );
}

function sourceFidelityAnalysis(cases) {
  const shifted = cases.filter(
    ({ largeBrandShiftModes }) => largeBrandShiftModes.length > 0,
  );
  const byLightness = {};
  const byChroma = {};
  const byHueSector = {};
  const byModePattern = {};
  const modes = Object.fromEntries(
    ["light", "dark"].map((mode) => [
      mode,
      {
        shiftedModeCount: 0,
        lightnessDirectionCounts: {},
        chromaDirectionCounts: {},
        sourceLightnessRoleRangePositionCounts: {},
        bestRankedRejectedConstraintCounts: {},
        bestRankedRejectedConstraintCombinationCounts: {},
      },
    ]),
  );

  for (const item of shifted) {
    increment(byLightness, item.sourceProfile.lightnessCohort);
    increment(byChroma, item.sourceProfile.chromaCohort);
    increment(byHueSector, item.sourceProfile.hueSector);
    increment(byModePattern, item.largeBrandShiftModes.join("+"));
    for (const mode of item.largeBrandShiftModes) {
      const evidence = item.sourceShiftByMode[mode];
      modes[mode].shiftedModeCount += 1;
      increment(
        modes[mode].lightnessDirectionCounts,
        evidence.lightnessDirection,
      );
      increment(modes[mode].chromaDirectionCounts, evidence.chromaDirection);
      increment(
        modes[mode].sourceLightnessRoleRangePositionCounts,
        evidence.sourceLightnessRoleRange.position,
      );
      increment(
        modes[mode].bestRankedRejectedConstraintCombinationCounts,
        evidence.bestRankedRejectedConstraintCombination,
      );
      for (const id of evidence.bestRankedRejectedConstraintIds) {
        increment(modes[mode].bestRankedRejectedConstraintCounts, id);
      }
    }
  }
  for (const mode of Object.values(modes)) {
    mode.lightnessDirectionCounts = sortedCounts(mode.lightnessDirectionCounts);
    mode.chromaDirectionCounts = sortedCounts(mode.chromaDirectionCounts);
    mode.sourceLightnessRoleRangePositionCounts = sortedCounts(
      mode.sourceLightnessRoleRangePositionCounts,
    );
    mode.bestRankedRejectedConstraintCounts = sortedCounts(
      mode.bestRankedRejectedConstraintCounts,
    );
    mode.bestRankedRejectedConstraintCombinationCounts = sortedCounts(
      mode.bestRankedRejectedConstraintCombinationCounts,
    );
  }

  return {
    authority: "diagnostic",
    interpretation:
      "Cohorts describe where large source shifts occur. Constraint IDs on the producer's best-ranked rejected Primary candidate record why that candidate failed; they do not establish an exclusive cause for the shift.",
    cohortDefinitions: {
      lightness: SOURCE_COHORTS.lightness.map(({ id, maximumExclusive }) => ({
        id,
        maximumExclusive,
      })),
      chroma: [
        { id: "achromatic", classification: "achromatic" },
        ...SOURCE_COHORTS.chroma,
      ],
      hue: {
        achromatic: "classification=achromatic",
        chromaticSectorDegrees: SOURCE_COHORTS.hueSectorDegrees,
      },
    },
    shiftedInputCount: shifted.length,
    byInputLightness: sortedCounts(byLightness),
    byInputChroma: sortedCounts(byChroma),
    byHueSector: sortedCounts(byHueSector),
    byModePattern: sortedCounts(byModePattern),
    modes,
  };
}

function cohortBreakdown(cases, flagged, select) {
  const population = {};
  const flaggedCounts = {};
  for (const item of cases) increment(population, select(item));
  for (const item of flagged) increment(flaggedCounts, select(item));
  return Object.fromEntries(
    Object.keys(population)
      .sort((first, second) => first.localeCompare(second))
      .map((id) => [
        id,
        {
          corpusInputCount: population[id],
          flaggedInputCount: flaggedCounts[id] ?? 0,
          flaggedFractionWithinCorpusCohort:
            (flaggedCounts[id] ?? 0) / population[id],
        },
      ]),
  );
}

function overlapTable(cases, isFlagged, otherCondition) {
  const table = { both: 0, semanticHueOnly: 0, otherOnly: 0, neither: 0 };
  for (const item of cases) {
    const semanticHue = isFlagged(item);
    const other = otherCondition(item);
    if (semanticHue && other) table.both += 1;
    else if (semanticHue) table.semanticHueOnly += 1;
    else if (other) table.otherOnly += 1;
    else table.neither += 1;
  }
  return table;
}

function semanticHueReviewAnalysis(cases) {
  const failed = (item) =>
    item.semanticHueReviewChecks.filter(({ pass }) => !pass);
  const flagged = cases.filter((item) => failed(item).length > 0);
  const failedCheckCounts = {};
  const relationshipCounts = {};
  const modeCounts = {};
  const exactPatternCounts = {};
  let failedCheckOccurrenceCount = 0;
  let flaggedModeCaseCount = 0;

  for (const item of flagged) {
    const failures = failed(item);
    failedCheckOccurrenceCount += failures.length;
    flaggedModeCaseCount += new Set(failures.map(({ mode }) => mode)).size;
    increment(
      exactPatternCounts,
      failures
        .map(({ id }) => id)
        .sort()
        .join("+"),
    );
    for (const check of failures) {
      increment(failedCheckCounts, check.id);
      increment(relationshipCounts, check.relationship);
      increment(modeCounts, check.mode);
    }
  }

  const isFlagged = (item) => failed(item).length > 0;
  return {
    authority: "diagnostic",
    interpretation:
      "Describes where four provisional producer hue-separation checks fire in the fixed RGB grid. Source cohorts describe input colors, not the selected Primary colors used by the checks; counts and overlaps do not establish cause, semantic confusion, perception, prevalence, or an empirical threshold.",
    opportunityCounts: {
      input: cases.length,
      inputMode: cases.length * 2,
      inputModeRelationshipCheck: cases.length * 4,
    },
    flaggedInputCount: flagged.length,
    flaggedModeCaseCount,
    failedCheckOccurrenceCount,
    failedCheckCounts: sortedCounts(failedCheckCounts),
    failedCheckOccurrenceCountsByRelationship: sortedCounts(relationshipCounts),
    failedCheckOccurrenceCountsByMode: sortedCounts(modeCounts),
    exactPatternInputCounts: sortedCounts(exactPatternCounts),
    cohortDefinitions: {
      lightness: SOURCE_COHORTS.lightness.map(({ id, maximumExclusive }) => ({
        id,
        maximumExclusive,
      })),
      chroma: [
        { id: "achromatic", classification: "achromatic" },
        ...SOURCE_COHORTS.chroma,
      ],
      hue: {
        achromatic: "classification=achromatic",
        chromaticSectorDegrees: SOURCE_COHORTS.hueSectorDegrees,
      },
    },
    sourceCohorts: {
      lightness: cohortBreakdown(
        cases,
        flagged,
        ({ sourceProfile }) => sourceProfile.lightnessCohort,
      ),
      chroma: cohortBreakdown(
        cases,
        flagged,
        ({ sourceProfile }) => sourceProfile.chromaCohort,
      ),
      hueSector: cohortBreakdown(
        cases,
        flagged,
        ({ sourceProfile }) => sourceProfile.hueSector,
      ),
    },
    inputLevelOverlaps: {
      sourceShift: overlapTable(
        cases,
        isFlagged,
        ({ largeBrandShiftModes }) => largeBrandShiftModes.length > 0,
      ),
      contractFailure: overlapTable(
        cases,
        isFlagged,
        ({ failedContractChecks }) => failedContractChecks.length > 0,
      ),
      pairEligibilityMiss: overlapTable(
        cases,
        isFlagged,
        ({ pairEligibilityMisses }) => pairEligibilityMisses > 0,
      ),
    },
    flaggedCases: flagged.map((item) => ({
      input: item.input,
      sourceProfile: item.sourceProfile,
      failedChecks: failed(item),
    })),
  };
}

function countSignals(cases) {
  const counts = new Map();
  for (const item of cases) {
    for (const signal of item.signals) {
      counts.set(signal, (counts.get(signal) ?? 0) + 1);
    }
  }
  return Object.fromEntries(
    [...counts.entries()].sort(([first], [second]) =>
      first.localeCompare(second),
    ),
  );
}

function convergenceGroups(cases) {
  const groups = new Map();
  for (const item of cases) {
    const key = JSON.stringify(item.actionSignature);
    const group = groups.get(key) ?? {
      signature: item.actionSignature,
      inputs: [],
    };
    group.inputs.push(item.input);
    groups.set(key, group);
  }
  return [...groups.values()]
    .filter(({ inputs }) => inputs.length > 1)
    .map(({ signature, inputs }) => ({ signature, inputs: inputs.sort() }))
    .sort(
      (first, second) =>
        second.inputs.length - first.inputs.length ||
        JSON.stringify(first.signature).localeCompare(
          JSON.stringify(second.signature),
        ),
    );
}

function publicDiagnosticCase(item) {
  const publicCase = { ...item };
  delete publicCase.semanticHueReviewChecks;
  delete publicCase.pairEligibilityMisses;
  return publicCase;
}

export function buildAdversarialDiagnosticReport({
  channels = ADVERSARIAL_CHANNELS,
  generate = generatePaletteV2,
} = {}) {
  const normalizedChannels = normalizeDiagnosticChannels(channels);
  const generated = diagnosticInputGrid(normalizedChannels).map((primary) => ({
    primary,
    result: generate({ primary }),
  }));
  const identities = new Set(
    generated.map(({ result }) =>
      JSON.stringify({
        resultVersion: result.version,
        policyVersion: result.policyVersion,
        semanticModel: result.semanticEvaluation?.model,
      }),
    ),
  );
  if (identities.size !== 1) {
    throw new TypeError("all corpus results must share one version identity.");
  }
  const cases = generated.map(({ primary, result }) =>
    diagnoseCase(primary, result),
  );
  const signaledCases = cases.filter(({ signals }) => signals.length > 0);
  const convergences = convergenceGroups(cases);
  const sourceFidelity = sourceFidelityAnalysis(cases);
  const semanticHueReview = semanticHueReviewAnalysis(cases);

  return {
    schema: "color-palette-adversarial-diagnostics.v3",
    authority: "diagnostic",
    interpretation:
      "Maps named deterministic policy signals; it does not score palette quality or establish perceived design intent.",
    ...JSON.parse([...identities][0]),
    corpus: { kind: "rgb-channel-grid", channels: normalizedChannels },
    summary: {
      inputCount: cases.length,
      signaledInputCount: signaledCases.length,
      generatedContractFailureCount: cases.filter((item) =>
        item.signals.includes("generated-contract-failure"),
      ).length,
      semanticFindingInputCount: cases.filter(
        ({ semanticFindings }) => semanticFindings.length > 0,
      ).length,
      convergenceGroupCount: convergences.length,
      signalCounts: countSignals(cases),
    },
    sourceFidelity,
    semanticHueReview,
    cases: signaledCases.map(publicDiagnosticCase),
    convergenceGroups: convergences,
  };
}
