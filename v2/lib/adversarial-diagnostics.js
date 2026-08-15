import { generatePaletteV2 } from "./palette.js";

export const ADVERSARIAL_CHANNELS = Object.freeze([0, 51, 102, 153, 204, 255]);

function inputGrid(channels) {
  return channels.flatMap((red) =>
    channels.flatMap((green) =>
      channels.map((blue) =>
        `#${[red, green, blue]
          .map((channel) => channel.toString(16).padStart(2, "0"))
          .join("")}`.toUpperCase(),
      ),
    ),
  );
}

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

function assertBooleanChecks(checks, path) {
  if (
    !Array.isArray(checks) ||
    checks.some(
      (check) =>
        typeof checkName(check) !== "string" || typeof check.pass !== "boolean",
    )
  ) {
    throw new TypeError(`${path} must contain named boolean check verdicts.`);
  }
}

function assertSemanticEvaluation(semanticEvaluation) {
  const validEvaluations =
    Array.isArray(semanticEvaluation?.evaluations) &&
    semanticEvaluation.evaluations.every(
      (item) =>
        typeof item?.id === "string" &&
        ["satisfied", "unsatisfied", "needs-review"].includes(item.status),
    );
  if (
    typeof semanticEvaluation?.model?.id !== "string" ||
    !Number.isInteger(semanticEvaluation.model.version) ||
    !validEvaluations
  ) {
    throw new TypeError(
      "semanticEvaluation must contain named status verdicts.",
    );
  }
}

function assertDiagnosticEvidence(result) {
  const validFlags =
    Array.isArray(result.hoverDiagnostics?.structuralFlags) &&
    result.hoverDiagnostics.structuralFlags.every(
      (flag) => typeof flag === "string",
    );
  if (
    !validFlags ||
    !Number.isInteger(result.pairDecision?.selected?.qualityMisses)
  ) {
    throw new TypeError("diagnostic or pair-selection evidence is invalid.");
  }
}

function assertSource(source) {
  if (typeof source?.classification !== "string") {
    throw new TypeError(
      "source.classification must be a named classification.",
    );
  }
  if (
    ![source.oklch?.l, source.oklch?.c, source.oklch?.h].every(Number.isFinite)
  ) {
    throw new TypeError("source.oklch must contain finite coordinates.");
  }
}

function assertDiagnosticResult(result) {
  if (
    !result ||
    typeof result.passed !== "boolean" ||
    !Number.isInteger(result.version) ||
    typeof result.policyVersion !== "string"
  ) {
    throw new TypeError(
      "generator result identity or contract verdict is invalid.",
    );
  }
  assertBooleanChecks(result.quality?.checks, "quality.checks");
  if (result.quality.checks.some(({ id }) => typeof id !== "string")) {
    throw new TypeError("quality.checks must use stable check ids.");
  }
  for (const mode of ["light", "dark"]) {
    assertBooleanChecks(result.modes?.[mode]?.checks, `modes.${mode}.checks`);
    const values = result.modes[mode].values;
    const actionColors = [
      values?.primary,
      values?.["primary hover"],
      values?.["primary active"],
    ];
    if (actionColors.some((color) => !/^#[0-9A-F]{6}$/u.test(color))) {
      throw new TypeError(
        `modes.${mode} action states must be final six-digit sRGB colors.`,
      );
    }
    if (typeof result.modes[mode].adaptations?.largeBrandShift !== "boolean") {
      throw new TypeError(
        `modes.${mode}.adaptations.largeBrandShift must be boolean.`,
      );
    }
  }
  assertSemanticEvaluation(result.semanticEvaluation);
  assertDiagnosticEvidence(result);
  assertSource(result.source);
}

function diagnoseCase(primary, result) {
  assertDiagnosticResult(result);
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

export function buildAdversarialDiagnosticReport({
  channels = ADVERSARIAL_CHANNELS,
  generate = generatePaletteV2,
} = {}) {
  if (
    !Array.isArray(channels) ||
    channels.length === 0 ||
    channels.some(
      (channel) => !Number.isInteger(channel) || channel < 0 || channel > 255,
    )
  ) {
    throw new TypeError("channels must contain integers from 0 through 255.");
  }
  const sortedChannels = [...new Set(channels)].sort((a, b) => a - b);
  const generated = inputGrid(sortedChannels).map((primary) => ({
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

  return {
    schema: "color-palette-adversarial-diagnostics.v2",
    authority: "diagnostic",
    interpretation:
      "Maps named deterministic policy signals; it does not score palette quality or establish perceived design intent.",
    ...JSON.parse([...identities][0]),
    corpus: { kind: "rgb-channel-grid", channels: sortedChannels },
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
    cases: signaledCases,
    convergenceGroups: convergences,
  };
}
