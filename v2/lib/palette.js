import { isHex, normalizeHex } from "../../lib/color-math.js";
import {
  aliasDecision,
  inputDecision,
  NoCandidateError,
  noCandidateFailure,
  selectCandidate,
} from "./decision.js";
import { V2_POLICY, decisionPolicy, evidence } from "./policy.js";
import { PAIR_RANKING_STRATEGIES, selectModePair } from "./pair-selection.js";
import { MODE_RECIPE, ROLE_CLASSIFICATION, TOKEN_ORDER } from "./roles.js";
import {
  selectedResultReview,
  pairedQuality,
  semanticHueReviewCheck,
  sourceUsageAlternatives,
} from "./quality.js";
import { evaluateV2Semantics } from "./semantic-model.js";
import { resultVerdicts } from "./result-verdicts.js";
import { diagnosePrimaryHover } from "./hover-diagnostics.js";
import {
  destructiveSearch,
  summarizeFeedbackCandidateEvidence,
  warningSearch,
} from "./feedback-search.js";
import {
  assertFilledActionDirections,
  FILLED_ACTION_DIRECTION_EXPERIMENT,
} from "./filled-action-direction.js";
import { FILLED_ACTION_JOINT_EXPERIMENT } from "./filled-action-joint.js";
import {
  assertContextualDestructiveSeparationExperiment,
  CONTEXTUAL_DESTRUCTIVE_SEPARATION_EXPERIMENT,
} from "./contextual-destructive-separation.js";
import {
  DESTRUCTIVE_ANCHOR_POLICY,
  DESTRUCTIVE_ANCHOR_STRATEGIES,
  destructiveAnchorDecision,
} from "./destructive-anchor.js";
import {
  PRIMARY_CHROMA_EXPERIMENT,
  primaryChromaRequests,
} from "./primary-chroma-experiment.js";
import { TONAL_OFFSET_EXPERIMENT, tonalOffsetProfile } from "./tonal-offset.js";
import {
  assertTextContrastStrategy,
  chooseTextContrastForeground,
  TEXT_CONTRAST_EXPERIMENT,
  TEXT_CONTRAST_STRATEGIES,
  textContrastEvidence,
  textContrastObjective,
} from "./text-contrast-strategy.js";
import {
  apcaContrast,
  bindRule,
  boundedSet,
  brandCandidate,
  candidate,
  classifyInput,
  contrastRatio,
  destructiveTone,
  distance,
  foundationCache,
  hueDistance,
  neutralCandidate,
  paletteCache,
  stableTieBreaker,
  stateCandidate,
  tone,
} from "./runtime.js";

function sharedTextSearch({
  mode,
  role,
  backgrounds,
  target,
  fixedText,
  textContrastStrategy = TEXT_CONTRAST_STRATEGIES.PRODUCTION,
}) {
  const policy = decisionPolicy("binaryText");
  const candidates = fixedText
    ? [candidate(fixedText)]
    : [candidate("#000000"), candidate("#FFFFFF")];
  const contrastEvidence = (item) =>
    textContrastEvidence({
      foreground: item.hex,
      backgrounds,
      apcaMinimum: target,
      strategy: textContrastStrategy,
    });
  return selectCandidate({
    id: `${mode}.${role.replaceAll(" ", ".")}`,
    mode,
    role,
    intent: `Choose one black-or-white ${role} that maximizes the weakest contrast across every intended fill.`,
    candidates,
    policy,
    constraints: [
      bindRule(policy, "constraints", "text.required-contrast", (item) => {
        const result = contrastEvidence(item);
        const passed = result.passed;
        if (textContrastStrategy === TEXT_CONTRAST_STRATEGIES.APCA_ONLY) {
          const minimumLc = result.apca.minimum;
          return {
            passed,
            reasons: [
              passed
                ? `Weakest intended fill reaches ${minimumLc.toFixed(1)} Lc.`
                : `Weakest intended fill reaches only ${minimumLc.toFixed(1)} Lc.`,
            ],
            metrics: { minimumLc, target, backgrounds },
          };
        }
        return {
          passed,
          reasons: [
            passed
              ? `Weakest intended fill passes ${textContrastStrategy}.`
              : `Weakest intended fill fails ${textContrastStrategy}.`,
          ],
          metrics: { ...result, backgrounds },
        };
      }),
    ],
    objectives: [
      bindRule(policy, "objectives", "text.maximize-weakest-contrast", (item) =>
        textContrastObjective(contrastEvidence(item)),
      ),
    ],
    tieBreakers: stableTieBreaker(policy),
    evidence: evidence("wcagText", "apcaText"),
    strategy: "binary foreground search",
  });
}

function ratioCheck({ role, foreground, background, target = 3 }) {
  const value = contrastRatio(foreground, background);
  return {
    kind: "non-text",
    metric: "WCAG contrast",
    role,
    foreground,
    background,
    value,
    target,
    pass: value >= target,
  };
}

function textContractCheck({
  role,
  foreground,
  background,
  typographyContext,
}) {
  const evidence = textContrastEvidence({
    foreground,
    backgrounds: [background],
    apcaMinimum: typographyContext.apcaDiagnosticMinimum,
    strategy: TEXT_CONTRAST_STRATEGIES.PRODUCTION,
  });
  return {
    kind: "text",
    metric: "WCAG contrast",
    role,
    foreground,
    background,
    value: evidence.wcag.minimum,
    target: evidence.wcag.required,
    typography: `${typographyContext.fontSizePx}px / ${typographyContext.fontWeight}`,
    typographyContext: {
      schema: V2_POLICY.text.typographyContextSchema,
      ...typographyContext,
    },
    diagnostics: {
      apca: {
        metric: "APCA Lc",
        value: evidence.apca.minimum,
        target: evidence.apca.required,
        authority: "diagnostic-ranking",
        calibration: "legacy-provisional",
      },
    },
    pass: evidence.passed,
  };
}

function differenceCheck({ role, first, second, target = 0.035 }) {
  const value = distance(candidate(first), candidate(second));
  return {
    kind: "perceptual",
    metric: "Oklab ΔE",
    role,
    foreground: first,
    background: second,
    value,
    target,
    pass: value >= target,
  };
}

function foundationCandidates(input, anchor, tintScale, radius) {
  const candidates = [];
  const tintScales = [...new Set([0, tintScale / 2, tintScale])];
  for (
    let lightness = Math.max(0, anchor - radius);
    lightness <= Math.min(1, anchor + radius) + 0.0001;
    lightness += V2_POLICY.foundation.candidateStep
  ) {
    for (const scale of tintScales) {
      candidates.push(neutralCandidate(input, lightness, scale));
    }
  }
  candidates.push(neutralCandidate(input, anchor, tintScale));
  return candidates.filter(
    (item, index) =>
      candidates.findIndex((other) => other.hex === item.hex) === index,
  );
}

function foundationSearch({
  input,
  mode,
  role,
  anchor,
  tintScale,
  policyId,
  evaluateRole,
  radius = V2_POLICY.foundation.candidateRadius,
}) {
  const policy = decisionPolicy(policyId);
  const target = neutralCandidate(input, anchor, tintScale);
  const candidates = foundationCandidates(input, anchor, tintScale, radius);
  const constraints = policy.constraints.map((definition) =>
    bindRule(policy, "constraints", definition.id, (item) => {
      if (definition.id === "foundation.calm-tint") {
        const passed = item.oklch.c <= V2_POLICY.neutral.tintCap + 0.0005;
        return {
          passed,
          reasons: [
            passed
              ? `Tint C ${item.oklch.c.toFixed(4)} stays within the calm cap.`
              : `Tint C ${item.oklch.c.toFixed(4)} exceeds the calm cap.`,
          ],
          metrics: {
            value: item.oklch.c,
            maximum: V2_POLICY.neutral.tintCap,
          },
        };
      }
      return evaluateRole(definition.id, item);
    }),
  );
  const resolution = selectCandidate({
    id: `${mode}.${role.replaceAll(" ", ".")}`,
    mode,
    role,
    intent: `Resolve ${role} near its ${mode} recipe while preserving the complete foundation contract.`,
    candidates,
    policy,
    constraints,
    objectives: [
      bindRule(policy, "objectives", "foundation.recipe-fidelity", (item) =>
        distance(target, item),
      ),
    ],
    tieBreakers: stableTieBreaker(policy),
    evidence: evidence(
      "calmMinimal",
      ...(policyId === "foundationText" ? ["wcagText", "apcaText"] : []),
      ...(policyId === "foundationInput" ? ["wcagNonText"] : []),
    ),
    searchConstants: ["input hue", "bounded tint candidates"],
  });
  resolution.trace.target = {
    hex: target.hex,
    oklch: target.oklch,
  };
  resolution.trace.searchDomain = {
    lightness: [
      Math.min(...candidates.map((item) => item.oklch.l)),
      Math.max(...candidates.map((item) => item.oklch.l)),
    ],
    chroma: [0, V2_POLICY.neutral.tintCap],
    lightnessStep: V2_POLICY.foundation.candidateStep,
  };
  return resolution;
}

function foundationPalette(
  input,
  mode,
  recipe,
  textContrastStrategy = TEXT_CONTRAST_STRATEGIES.PRODUCTION,
) {
  const cacheKey = `${V2_POLICY.version}/${input.hex}/${mode}/${textContrastStrategy}`;
  const cached = foundationCache.get(cacheKey);
  if (cached) return cached;
  const separation = V2_POLICY.foundation.hierarchySeparation;
  const modeZone = (item) => {
    const passed =
      mode === "light"
        ? item.oklch.l >= V2_POLICY.foundation.modeZone.lightMinimum
        : item.oklch.l <= V2_POLICY.foundation.modeZone.darkMaximum;
    return {
      passed,
      reasons: [
        passed
          ? `L ${item.oklch.l.toFixed(3)} remains in the ${mode} foundation zone.`
          : `L ${item.oklch.l.toFixed(3)} leaves the ${mode} foundation zone.`,
      ],
      metrics: { value: item.oklch.l, mode },
    };
  };
  const background = foundationSearch({
    input,
    mode,
    role: "background",
    anchor: recipe.background,
    tintScale: 0.16,
    policyId: "foundationAnchor",
    evaluateRole: (_id, item) => modeZone(item),
  });
  const hierarchy = (reference, direction, label) => (item) => {
    const movement = direction * (item.oklch.l - reference.oklch.l);
    const passed = movement >= separation - 0.001;
    return {
      passed,
      reasons: [
        passed
          ? `${label} separation reaches ΔL ${movement.toFixed(3)}.`
          : `${label} separation ΔL ${movement.toFixed(3)} is below ${separation.toFixed(3)}.`,
      ],
      metrics: { movement, target: separation },
    };
  };
  const layer = (role, anchor, tintScale, reference, direction) =>
    foundationSearch({
      input,
      mode,
      role,
      anchor,
      tintScale,
      policyId: "foundationLayer",
      evaluateRole: (_id, item) =>
        hierarchy(reference.value, direction, role)(item),
    });
  const surface = layer(
    "surface",
    recipe.surface,
    0.28,
    background,
    mode === "light" ? -1 : 1,
  );
  const raised = layer("raised surface", recipe.raised, 0.12, surface, 1);
  const muted = layer(
    "muted surface",
    recipe.muted,
    0.52,
    surface,
    mode === "light" ? -1 : 1,
  );
  const textRole = (role, anchor, tintScale, backgrounds, targetLc) =>
    foundationSearch({
      input,
      mode,
      role,
      anchor,
      tintScale,
      policyId: "foundationText",
      radius: 0.08,
      evaluateRole: (_id, item) => {
        const result = textContrastEvidence({
          foreground: item.hex,
          backgrounds: backgrounds.map(({ value }) => value.hex),
          apcaMinimum: targetLc,
          strategy: textContrastStrategy,
        });
        const minimumLc = result.apca.minimum;
        const passed = result.passed;
        if (textContrastStrategy !== TEXT_CONTRAST_STRATEGIES.APCA_ONLY) {
          return {
            passed,
            reasons: [
              passed
                ? `Weakest text pair passes ${textContrastStrategy}.`
                : `Weakest text pair fails ${textContrastStrategy}.`,
            ],
            metrics: result,
          };
        }
        return {
          passed,
          reasons: [
            passed
              ? `Weakest text pair reaches ${minimumLc.toFixed(1)} Lc.`
              : `Weakest text pair reaches only ${minimumLc.toFixed(1)} Lc.`,
          ],
          metrics: { minimumLc, target: targetLc },
        };
      },
    });
  const foreground = textRole(
    "foreground",
    recipe.foreground,
    0.08,
    [background, surface],
    V2_POLICY.foundation.bodyTextApcaDiagnosticLc,
  );
  const mutedText = textRole(
    "muted text",
    recipe.mutedText,
    0.16,
    [background, muted],
    V2_POLICY.foundation.mutedTextApcaDiagnosticLc,
  );
  const border = layer(
    "border",
    recipe.border,
    0.3,
    surface,
    mode === "light" ? -1 : 1,
  );
  const inputBorder = foundationSearch({
    input,
    mode,
    role: "input border",
    anchor: recipe.input,
    tintScale: 0.22,
    policyId: "foundationInput",
    radius: 0.1,
    evaluateRole: (_id, item) => {
      const contrast = contrastRatio(item.hex, surface.value.hex);
      const passed = contrast >= V2_POLICY.foundation.inputContrast;
      return {
        passed,
        reasons: [
          passed
            ? `Input boundary reaches ${contrast.toFixed(2)}:1.`
            : `Input boundary reaches only ${contrast.toFixed(2)}:1.`,
        ],
        metrics: {
          value: contrast,
          target: V2_POLICY.foundation.inputContrast,
        },
      };
    },
  });
  const selections = {
    background,
    surface,
    "raised surface": raised,
    "muted surface": muted,
    foreground,
    "muted text": mutedText,
    border,
    "input border": inputBorder,
  };
  return boundedSet(
    foundationCache,
    cacheKey,
    {
      values: Object.fromEntries(
        Object.entries(selections).map(([role, selection]) => [
          role,
          selection.value.hex,
        ]),
      ),
      decisions: Object.fromEntries(
        Object.entries(selections).map(([role, selection]) => [
          role,
          selection.trace,
        ]),
      ),
    },
    256,
  );
}

function stateSearch({
  mode,
  base,
  role,
  target,
  labelText,
  labelLc,
  direction: requestedDirection,
  retainPlot = false,
  textContrastStrategy = TEXT_CONTRAST_STRATEGIES.PRODUCTION,
}) {
  const policy = decisionPolicy(labelText ? "labeledState" : "state");
  const direction =
    requestedDirection ??
    (labelText
      ? labelText === "#FFFFFF"
        ? -1
        : 1
      : V2_POLICY.state.direction[mode]);
  const candidates = [];
  for (
    let index = 1;
    index <= V2_POLICY.search.stateCandidateLimit;
    index += 1
  ) {
    const lightness =
      base.oklch.l + direction * V2_POLICY.search.candidateStep * index;
    if (lightness <= 0 || lightness >= 1) break;
    candidates.push(stateCandidate(base, lightness));
  }
  return selectCandidate({
    id: `${mode}.${role.replaceAll(" ", ".")}`,
    mode,
    role,
    intent: `Create the smallest ${direction < 0 ? "darker" : "lighter"} state change that remains visibly ordered${labelText ? " inside the shared label contrast envelope" : ""}.`,
    candidates,
    policy,
    constraints: [
      bindRule(policy, "constraints", "state.minimum-separation", (item) => {
        const deltaE = distance(base, item);
        const chromaShift = item.oklch.c - base.oklch.c;
        const hueShift = hueDistance(item.oklch.h, base.oklch.h);
        return {
          passed: deltaE >= target,
          reasons: [
            deltaE >= target
              ? `Oklab ΔE ${deltaE.toFixed(3)} reaches ${target.toFixed(3)}.`
              : `Oklab ΔE ${deltaE.toFixed(3)} is below ${target.toFixed(3)}.`,
          ],
          metrics: { deltaE, target, chromaShift, hueShift },
        };
      }),
      ...(labelText && labelLc
        ? [
            {
              definition: policy.constraints.find(
                ({ id }) => id === "state.shared-label",
              ),
              evaluate(item) {
                const result = textContrastEvidence({
                  foreground: labelText,
                  backgrounds: [item.hex],
                  apcaMinimum: labelLc,
                  strategy: textContrastStrategy,
                });
                if (
                  textContrastStrategy === TEXT_CONTRAST_STRATEGIES.APCA_ONLY
                ) {
                  const value = result.apca.minimum;
                  return {
                    passed: result.passed,
                    reasons: [
                      result.passed
                        ? `Shared label reaches ${value.toFixed(1)} Lc.`
                        : `Shared label reaches only ${value.toFixed(1)} Lc.`,
                    ],
                    metrics: { value, target: labelLc, labelText },
                  };
                }
                return {
                  passed: result.passed,
                  reasons: [
                    result.passed
                      ? `Shared label passes ${textContrastStrategy}.`
                      : `Shared label fails ${textContrastStrategy}.`,
                  ],
                  metrics: { ...result, labelText },
                };
              },
            },
          ]
        : []),
    ],
    objectives: [
      bindRule(policy, "objectives", "state.minimum-change", (item) =>
        distance(base, item),
      ),
    ],
    tieBreakers: stableTieBreaker(policy),
    evidence: evidence("carbonStates", "spectrumStates", "stateSeparation"),
    searchConstants: ["requested hue", "requested chroma"],
    retainPlot,
  });
}

export function inspectDestructiveGrammar({
  mode,
  lightness,
  direction,
  foreground,
}) {
  if (!["light", "dark"].includes(mode)) {
    throw new TypeError("Destructive grammar mode must be light or dark.");
  }
  if (![-1, 1].includes(direction)) {
    throw new TypeError("Destructive grammar direction must be -1 or 1.");
  }
  if (!["#000000", "#FFFFFF"].includes(foreground)) {
    throw new TypeError(
      "Destructive grammar foreground must be black or white.",
    );
  }
  const [minimum, maximum] = V2_POLICY.destructive.lightnessRange[mode];
  if (
    !Number.isFinite(lightness) ||
    lightness < minimum ||
    lightness > maximum
  ) {
    throw new TypeError(
      `Destructive grammar L must stay inside ${minimum}–${maximum} for ${mode}.`,
    );
  }
  const base = candidate(destructiveTone(lightness), { lightness });
  const defaultLc = Math.abs(apcaContrast(foreground, base.hex));
  if (defaultLc < V2_POLICY.destructive.apcaDiagnosticLc) {
    return {
      schema: "destructive-grammar-inspection.v1",
      authority: "diagnostic",
      conditioning: "none",
      mode,
      requested: { lightness, direction, foreground },
      complete: false,
      failure: {
        stage: "default-label-contrast",
        checkId: "destructive.label-contrast",
        value: defaultLc,
        target: V2_POLICY.destructive.apcaDiagnosticLc,
      },
      values: { default: base.hex },
    };
  }
  try {
    const hover = stateSearch({
      mode,
      base,
      role: "destructive calibration hover",
      target: V2_POLICY.state.separation.hoverFromDefault,
      labelText: foreground,
      labelLc: V2_POLICY.destructive.apcaDiagnosticLc,
      direction,
    });
    const active = stateSearch({
      mode,
      base,
      role: "destructive calibration active",
      target: V2_POLICY.state.separation.activeFromDefault,
      labelText: foreground,
      labelLc: V2_POLICY.destructive.apcaDiagnosticLc,
      direction,
    });
    const values = {
      default: base.hex,
      hover: hover.value.hex,
      active: active.value.hex,
    };
    return {
      schema: "destructive-grammar-inspection.v1",
      authority: "diagnostic",
      conditioning: "none",
      mode,
      requested: { lightness, direction, foreground },
      complete: true,
      values,
      realized: Object.fromEntries(
        Object.entries(values).map(([state, hex]) => [
          state,
          { hex, oklch: candidate(hex).oklch },
        ]),
      ),
      weakestLc: Math.min(
        ...Object.values(values).map((hex) =>
          Math.abs(apcaContrast(foreground, hex)),
        ),
      ),
    };
  } catch (error) {
    if (!(error instanceof NoCandidateError)) throw error;
    return {
      schema: "destructive-grammar-inspection.v1",
      authority: "diagnostic",
      conditioning: "none",
      mode,
      requested: { lightness, direction, foreground },
      complete: false,
      failure: noCandidateFailure(error),
      values: { default: base.hex },
    };
  }
}

function primarySharedLabelConstraint({
  item,
  filledActionForeground,
  textContrastStrategy,
}) {
  const colors = item.family
    ? [item.hex, item.family.hover.value.hex, item.family.active.value.hex]
    : [item.hex];
  const choice = filledActionForeground
    ? {
        foreground: filledActionForeground,
        evidence: textContrastEvidence({
          foreground: filledActionForeground,
          backgrounds: colors,
          apcaMinimum: V2_POLICY.primary.apcaDiagnosticLc,
          strategy: textContrastStrategy,
        }),
      }
    : chooseTextContrastForeground({
        backgrounds: colors,
        apcaMinimum: V2_POLICY.primary.apcaDiagnosticLc,
        strategy: textContrastStrategy,
      });
  const text = choice.foreground;
  const minimumLc = choice.evidence.apca.minimum;
  if (textContrastStrategy !== TEXT_CONTRAST_STRATEGIES.APCA_ONLY) {
    return {
      passed: Boolean(item.family) && choice.evidence.passed,
      reasons: [
        item.family && choice.evidence.passed
          ? `Complete-family label passes ${textContrastStrategy}.`
          : `Complete-family label fails ${textContrastStrategy}.`,
      ],
      metrics: { ...choice.evidence, text },
    };
  }
  return {
    passed:
      Boolean(item.family) && minimumLc >= V2_POLICY.primary.apcaDiagnosticLc,
    reasons: [
      item.family && minimumLc >= V2_POLICY.primary.apcaDiagnosticLc
        ? `Shared label reaches ${minimumLc.toFixed(1)} Lc.`
        : `Complete-family label reaches only ${minimumLc.toFixed(1)} Lc.`,
    ],
    metrics: {
      minimumLc,
      target: V2_POLICY.primary.apcaDiagnosticLc,
      text,
    },
  };
}

function canGenerateDirectionalStates(base, direction) {
  return direction < 0 ? base.oklch.l > 0.1 : base.oklch.l < 0.9;
}

function brandFamilySearch({
  input,
  mode,
  background,
  surface,
  primaryRange,
  allowInfeasibleStateCandidates = false,
  primaryChromaExperiment = null,
  filledActionDirection = V2_POLICY.state.filledActionDirections[mode],
  filledActionForeground,
  preferredPrimaryLightness,
  textContrastStrategy = TEXT_CONTRAST_STRATEGIES.PRODUCTION,
}) {
  const policy = decisionPolicy("primary");
  const [start, end] = primaryRange ?? V2_POLICY.primary.lightnessRange[mode];
  const source = candidate(input.hex, {
    lightness: input.l,
    ...(primaryChromaExperiment ? { requestedOrigins: [] } : {}),
  });
  const objectiveReference =
    preferredPrimaryLightness === undefined
      ? source
      : brandCandidate(input, preferredPrimaryLightness);
  const candidates = [];
  let infeasibleStateCandidateCount = 0;
  const addFamily = (primary) => {
    try {
      const hover = stateSearch({
        mode,
        base: primary,
        role: "primary hover",
        target: V2_POLICY.state.separation.hoverFromDefault,
        direction: filledActionDirection,
        labelText: filledActionForeground,
        labelLc: filledActionForeground
          ? V2_POLICY.primary.apcaDiagnosticLc
          : undefined,
        textContrastStrategy,
      });
      const active = stateSearch({
        mode,
        base: primary,
        role: "primary active",
        target: V2_POLICY.state.separation.activeFromDefault,
        direction: filledActionDirection,
        labelText: filledActionForeground,
        labelLc: filledActionForeground
          ? V2_POLICY.primary.apcaDiagnosticLc
          : undefined,
        textContrastStrategy,
      });
      return { ...primary, family: { hover, active } };
    } catch (error) {
      if (
        !allowInfeasibleStateCandidates ||
        !(error instanceof NoCandidateError)
      ) {
        throw error;
      }
      noCandidateFailure(error);
      infeasibleStateCandidateCount += 1;
      return primary;
    }
  };
  const sourceCanGenerateStates = canGenerateDirectionalStates(
    source,
    filledActionDirection,
  );
  candidates.push(sourceCanGenerateStates ? addFamily(source) : source);
  if (!primaryChromaExperiment) {
    for (
      let lightness = start;
      lightness <= end + V2_POLICY.search.candidateStep / 2;
      lightness += V2_POLICY.search.candidateStep
    ) {
      const primary = brandCandidate(input, lightness);
      if (primary.hex !== source.hex) candidates.push(addFamily(primary));
    }
  } else {
    const generated = new Map();
    for (
      let lightness = start;
      lightness <= end + V2_POLICY.search.candidateStep / 2;
      lightness += V2_POLICY.search.candidateStep
    ) {
      for (const requestedChroma of primaryChromaExperiment.requestedChromas) {
        const primary = candidate(
          tone({ l: lightness, c: requestedChroma, h: input.h }),
          {
            lightness,
            requestedOrigins: [
              { requestedLightness: lightness, requestedChroma },
            ],
          },
        );
        if (primary.hex === source.hex) {
          source.parameters.requestedOrigins.push(
            ...primary.parameters.requestedOrigins,
          );
          continue;
        }
        const existing = generated.get(primary.hex);
        if (existing) {
          existing.parameters.requestedOrigins.push(
            ...primary.parameters.requestedOrigins,
          );
        } else {
          generated.set(primary.hex, primary);
        }
      }
    }
    for (const primary of generated.values())
      candidates.push(addFamily(primary));
  }
  const selection = selectCandidate({
    id: `${mode}.primary`,
    mode,
    role: "primary",
    intent:
      "Stay as close to the source as possible while the complete mode state family remains usable.",
    candidates,
    policy,
    constraints: [
      bindRule(policy, "constraints", "primary.generated-family", (item) => ({
        passed: Boolean(item.family),
        reasons: [
          item.family
            ? "Default, hover, and active candidates are all available."
            : "Exact source is retained as a counterfactual; it cannot produce the complete mode family.",
        ],
        metrics: { completeFamily: Boolean(item.family) },
      })),
      bindRule(policy, "constraints", "primary.mode-range", (item) => {
        const passed =
          item.oklch.l >= start - 0.001 && item.oklch.l <= end + 0.001;
        return {
          passed,
          reasons: [
            passed
              ? `L ${item.oklch.l.toFixed(3)} is inside the ${mode} role range.`
              : `L ${item.oklch.l.toFixed(3)} is outside ${start.toFixed(3)}–${end.toFixed(3)}.`,
          ],
          metrics: { value: item.oklch.l, minimum: start, maximum: end },
        };
      }),
      bindRule(policy, "constraints", "primary.calm-chroma", (item) => {
        const maximum =
          (primaryChromaExperiment?.maximumRequestedChroma ??
            input.brandChroma) + V2_POLICY.primary.chromaTolerance;
        const passed = item.oklch.c <= maximum;
        return {
          passed,
          reasons: [
            passed
              ? `C ${item.oklch.c.toFixed(3)} preserves the restrained source chroma.`
              : `C ${item.oklch.c.toFixed(3)} exceeds the calm bound ${maximum.toFixed(3)}.`,
          ],
          metrics: { value: item.oklch.c, maximum },
        };
      }),
      bindRule(policy, "constraints", "primary.shared-label", (item) =>
        primarySharedLabelConstraint({
          item,
          filledActionForeground,
          textContrastStrategy,
        }),
      ),
    ],
    objectives: [
      bindRule(policy, "objectives", "primary.source-fidelity", (item) =>
        distance(objectiveReference, item),
      ),
    ],
    tieBreakers: stableTieBreaker(policy),
    evidence: evidence("wcagText", "apcaText", "calmMinimal"),
    searchConstants: ["input hue", "bounded source chroma"],
    retainPlot:
      primaryChromaExperiment ||
      (textContrastStrategy !== TEXT_CONTRAST_STRATEGIES.PRODUCTION &&
        textContrastStrategy !== TEXT_CONTRAST_STRATEGIES.APCA_ONLY)
        ? "detailed"
        : false,
  });
  return {
    primary: selection.value,
    hover: selection.value.family.hover.value,
    active: selection.value.family.active.value,
    traces: {
      primary: selection.trace,
      "primary hover": selection.value.family.hover.trace,
      "primary active": selection.value.family.active.trace,
    },
    infeasibleStateCandidateCount,
  };
}

function selectionSearch({
  input,
  mode,
  surface,
  textContrastStrategy = TEXT_CONTRAST_STRATEGIES.PRODUCTION,
}) {
  const policy = decisionPolicy("selection");
  const [start, end] = V2_POLICY.selection.lightnessRange[mode];
  const candidates = [];
  for (let lightness = start; lightness <= end + 0.0025; lightness += 0.005) {
    for (const chromaScale of V2_POLICY.selection.chromaScales) {
      candidates.push(
        candidate(
          tone({
            l: lightness,
            c: input.brandChroma * chromaScale,
            h: input.h,
          }),
          { lightness, chromaScale },
        ),
      );
    }
  }
  return selectCandidate({
    id: `${mode}.selection`,
    mode,
    role: "selection",
    intent:
      "Use the least emphasized brand tint that remains readable and visibly selected from the surface.",
    candidates,
    policy,
    constraints: [
      bindRule(policy, "constraints", "selection.text-contrast", (item) => {
        const choice = chooseTextContrastForeground({
          backgrounds: [item.hex],
          apcaMinimum: V2_POLICY.selection.textApcaDiagnosticLc,
          strategy: textContrastStrategy,
        });
        const text = choice.foreground;
        const lc = choice.evidence.apca.minimum;
        const passed = choice.evidence.passed;
        if (textContrastStrategy !== TEXT_CONTRAST_STRATEGIES.APCA_ONLY) {
          return {
            passed,
            reasons: [
              passed
                ? `Selected content passes ${textContrastStrategy}.`
                : `Selected content fails ${textContrastStrategy}.`,
            ],
            metrics: { ...choice.evidence, text },
          };
        }
        return {
          passed,
          reasons: [
            passed
              ? `Selected content reaches ${lc.toFixed(1)} Lc.`
              : `Selected content reaches only ${lc.toFixed(1)} Lc.`,
          ],
          metrics: {
            lc,
            target: V2_POLICY.selection.textApcaDiagnosticLc,
            text,
          },
        };
      }),
      bindRule(
        policy,
        "constraints",
        "selection.surface-separation",
        (item) => {
          const deltaE = distance(surface, item);
          const passed = deltaE >= V2_POLICY.selection.surfaceSeparation;
          return {
            passed,
            reasons: [
              passed
                ? `Surface separation reaches ΔE ${deltaE.toFixed(3)}.`
                : `Surface separation ΔE ${deltaE.toFixed(3)} is too weak.`,
            ],
            metrics: {
              deltaE,
              target: V2_POLICY.selection.surfaceSeparation,
            },
          };
        },
      ),
    ],
    objectives: [
      bindRule(policy, "objectives", "selection.minimum-emphasis", (item) =>
        distance(surface, item),
      ),
    ],
    tieBreakers: stableTieBreaker(policy),
    evidence: evidence(
      "wcagText",
      "apcaText",
      "stateSeparation",
      "calmMinimal",
    ),
    searchConstants: ["input hue", "bounded brand tint"],
    retainPlot: true,
  });
}

function focusSearch({
  input,
  mode,
  primary,
  destructive,
  adjacentFoundations,
}) {
  const policy = decisionPolicy("focus");
  const candidates = [candidate(primary.hex)];
  const [start, end] = V2_POLICY.focus.lightnessRange;
  for (
    let lightness = start;
    lightness <= end + V2_POLICY.focus.candidateStep / 2;
    lightness += V2_POLICY.focus.candidateStep
  ) {
    for (const chromaScale of V2_POLICY.focus.chromaScales) {
      candidates.push(
        candidate(
          tone({
            l: lightness,
            c: primary.oklch.c * chromaScale,
            h: input.h,
          }),
          { lightness, chromaScale },
        ),
      );
    }
  }
  const uniqueCandidates = candidates.filter(
    (item, index) =>
      candidates.findIndex((other) => other.hex === item.hex) === index,
  );
  return selectCandidate({
    id: `${mode}.focus.ring`,
    mode,
    role: "focus ring",
    intent:
      "Resolve an independent focus color that remains brand-related while separating from controls on every applied foundation context.",
    candidates: uniqueCandidates,
    policy,
    constraints: [
      bindRule(policy, "constraints", "focus.adjacent-contrast", (item) => {
        const ratios = Object.fromEntries(
          Object.entries(adjacentFoundations).map(([role, color]) => [
            role,
            contrastRatio(item.hex, color),
          ]),
        );
        const minimumContrast = Math.min(...Object.values(ratios));
        const passed = minimumContrast >= V2_POLICY.focus.contrast;
        return {
          passed,
          reasons: [
            passed
              ? `Weakest foundation contrast reaches ${minimumContrast.toFixed(2)}:1.`
              : `Weakest foundation contrast reaches only ${minimumContrast.toFixed(2)}:1.`,
          ],
          metrics: {
            ratios,
            minimumContrast,
            target: V2_POLICY.focus.contrast,
          },
        };
      }),
      bindRule(policy, "constraints", "focus.semantic-separation", (item) => {
        const primaryDistance = distance(primary, item);
        const destructiveDistance = distance(destructive, item);
        const minimumDistance = Math.min(primaryDistance, destructiveDistance);
        const passed = minimumDistance >= V2_POLICY.focus.semanticSeparation;
        return {
          passed,
          reasons: [
            passed
              ? `Nearest authored control remains ΔE ${minimumDistance.toFixed(3)} away.`
              : `Nearest authored control is only ΔE ${minimumDistance.toFixed(3)} away.`,
          ],
          metrics: {
            primaryDistance,
            destructiveDistance,
            target: V2_POLICY.focus.semanticSeparation,
          },
        };
      }),
      bindRule(policy, "constraints", "focus.brand-relation", (item) => {
        const drift = hueDistance(item.oklch.h, input.h);
        const passed = primary.oklch.c < 0.015 || drift <= 4;
        return {
          passed,
          reasons: [
            passed
              ? `Hue drift ${drift.toFixed(2)}° remains brand-related.`
              : `Hue drift ${drift.toFixed(2)}° leaves the brand family.`,
          ],
          metrics: { drift, maximum: 4 },
        };
      }),
    ],
    objectives: [
      bindRule(policy, "objectives", "focus.minimum-brand-distance", (item) =>
        distance(primary, item),
      ),
    ],
    tieBreakers: stableTieBreaker(policy),
    evidence: evidence("wcagNonText", "calmMinimal", "stateSeparation"),
    searchConstants: ["input hue", "bounded primary chroma scales"],
  });
}

function primaryBorderSearch({ input, mode, primary, background, surface }) {
  const policy = decisionPolicy("primaryBorder");
  const candidates = [];
  for (let lightness = 0.12; lightness <= 0.88; lightness += 0.01) {
    for (const chromaScale of [0.35, 0.65, 1]) {
      candidates.push(
        candidate(
          tone({
            l: lightness,
            c: primary.oklch.c * chromaScale,
            h: input.h,
          }),
          { lightness, chromaScale },
        ),
      );
    }
  }
  const uniqueCandidates = candidates.filter(
    (item, index) =>
      candidates.findIndex((other) => other.hex === item.hex) === index,
  );
  return selectCandidate({
    id: `${mode}.primary.border`,
    mode,
    role: "primary border",
    intent:
      "Provide the required action boundary independently so the brand-derived fill does not carry every contrast responsibility.",
    candidates: uniqueCandidates,
    policy,
    constraints: [
      bindRule(
        policy,
        "constraints",
        "primary-border.adjacent-contrast",
        (item) => {
          const minimumContrast = Math.min(
            contrastRatio(item.hex, background),
            contrastRatio(item.hex, surface),
          );
          return {
            passed: minimumContrast >= V2_POLICY.primary.boundaryContrast,
            reasons: [
              minimumContrast >= V2_POLICY.primary.boundaryContrast
                ? `Weakest foundation contrast reaches ${minimumContrast.toFixed(2)}:1.`
                : `Weakest foundation contrast reaches only ${minimumContrast.toFixed(2)}:1.`,
            ],
            metrics: {
              minimumContrast,
              target: V2_POLICY.primary.boundaryContrast,
            },
          };
        },
      ),
    ],
    objectives: [
      bindRule(
        policy,
        "objectives",
        "primary-border.minimum-brand-distance",
        (item) => distance(primary, item),
      ),
    ],
    tieBreakers: stableTieBreaker(policy),
    evidence: evidence("wcagNonText", "calmMinimal"),
    searchConstants: ["input hue", "bounded primary chroma scales"],
  });
}

function emptyStateCandidateEvidence() {
  return {
    candidateOccurrenceCount: 0,
    availableOccurrenceCount: 0,
    failedIdOccurrenceCounts: {},
    failedPatternOccurrenceCounts: {},
  };
}

function addStateCandidateEvidence(summary, searchPlot) {
  if (!Array.isArray(searchPlot) || searchPlot.length === 0) {
    throw new TypeError(
      "Detailed state candidate evidence must contain a search plot.",
    );
  }
  const expectedConstraintIds = [
    "state.minimum-separation",
    "state.shared-label",
  ];
  for (const item of searchPlot) {
    if (
      typeof item?.hex !== "string" ||
      typeof item.passed !== "boolean" ||
      !Array.isArray(item.constraintResults)
    ) {
      throw new TypeError("Detailed state candidate evidence is malformed.");
    }
    const constraintIds = item.constraintResults.map(({ id }) => id).sort();
    if (
      new Set(constraintIds).size !== constraintIds.length ||
      JSON.stringify(constraintIds) !== JSON.stringify(expectedConstraintIds) ||
      item.constraintResults.some(({ passed }) => typeof passed !== "boolean")
    ) {
      throw new TypeError(
        "Detailed state candidate constraints must match producer policy.",
      );
    }
    const failedIds = item.constraintResults
      .filter(({ passed }) => !passed)
      .map(({ id }) => id)
      .sort();
    if (item.passed !== (failedIds.length === 0)) {
      throw new TypeError(
        "Detailed state candidate verdict must reconcile with constraints.",
      );
    }
    summary.candidateOccurrenceCount += 1;
    if (failedIds.length === 0) {
      summary.availableOccurrenceCount += 1;
      continue;
    }
    const pattern = failedIds.join("+");
    summary.failedPatternOccurrenceCounts[pattern] =
      (summary.failedPatternOccurrenceCounts[pattern] ?? 0) + 1;
    for (const id of failedIds) {
      summary.failedIdOccurrenceCounts[id] =
        (summary.failedIdOccurrenceCounts[id] ?? 0) + 1;
    }
  }
  const classifiedOccurrenceCount =
    summary.availableOccurrenceCount +
    Object.values(summary.failedPatternOccurrenceCounts).reduce(
      (sum, count) => sum + count,
      0,
    );
  if (classifiedOccurrenceCount !== summary.candidateOccurrenceCount) {
    throw new TypeError(
      "Detailed state candidate evidence must conserve occurrences.",
    );
  }
}

function inspectTransactionalDestructiveFamilySearch({
  searchInput,
  actionForeground,
  direction,
}) {
  if (searchInput.mode !== "dark" || direction !== 1) {
    throw new TypeError(
      "Transactional Destructive state selection is scoped to the Dark lighter-state diagnostic.",
    );
  }
  let initial;
  try {
    initial = destructiveSearch({ ...searchInput, retainPlot: "detailed" });
  } catch (error) {
    if (!(error instanceof NoCandidateError)) throw error;
    return {
      complete: false,
      terminalStage: "base-constraints",
      failure: noCandidateFailure(error),
      error,
      completeFamilies: new Map(),
      completeFamilyRequestedLightness: new Map(),
      candidateCounts: {
        inventory: null,
        basePassing: 0,
        hoverComplete: 0,
        activeComplete: 0,
        completeFamily: 0,
      },
      stateFailureCountsByDecision: {},
      stateCandidateEvidence: {
        hover: emptyStateCandidateEvidence(),
        active: emptyStateCandidateEvidence(),
      },
    };
  }
  const basePassing = initial.trace.searchPlot.filter(({ passed }) => passed);
  const completeFamilies = new Map();
  const completeFamilyRequestedLightness = new Map();
  const stateFailureCountsByDecision = {};
  const stateCandidateEvidence = {
    hover: emptyStateCandidateEvidence(),
    active: emptyStateCandidateEvidence(),
  };
  let hoverComplete = 0;
  let activeComplete = 0;
  for (const item of basePassing) {
    const base = candidate(item.hex);
    const states = {};
    for (const [state, target] of [
      ["hover", V2_POLICY.state.separation.hoverFromDefault],
      ["active", V2_POLICY.state.separation.activeFromDefault],
    ]) {
      try {
        states[state] = stateSearch({
          mode: "dark",
          base,
          role: `destructive ${state}`,
          target,
          labelText: actionForeground,
          labelLc: V2_POLICY.destructive.apcaDiagnosticLc,
          direction,
          retainPlot: "detailed",
          textContrastStrategy: searchInput.textContrastStrategy,
        });
        addStateCandidateEvidence(
          stateCandidateEvidence[state],
          states[state].trace.searchPlot,
        );
        if (state === "hover") hoverComplete += 1;
        else activeComplete += 1;
      } catch (error) {
        if (!(error instanceof NoCandidateError)) throw error;
        const failure = noCandidateFailure(error);
        addStateCandidateEvidence(
          stateCandidateEvidence[state],
          error.diagnosticSearchPlot,
        );
        stateFailureCountsByDecision[failure.decisionId] =
          (stateFailureCountsByDecision[failure.decisionId] ?? 0) + 1;
      }
    }
    if (states.hover && states.active) {
      completeFamilies.set(item.hex, states);
      completeFamilyRequestedLightness.set(
        item.hex,
        Number.isFinite(item.parameters?.lightness)
          ? Number(item.parameters.lightness.toFixed(6))
          : null,
      );
    }
  }
  const candidateCounts = {
    inventory: initial.trace.candidateCount,
    basePassing: basePassing.length,
    hoverComplete,
    activeComplete,
    completeFamily: completeFamilies.size,
  };
  if (completeFamilies.size === 0) {
    let error;
    try {
      destructiveSearch({
        ...searchInput,
        diagnosticEligibleHexes: [],
      });
    } catch (caught) {
      if (!(caught instanceof NoCandidateError)) throw caught;
      error = caught;
    }
    return {
      complete: false,
      terminalStage: "state-family",
      failure: noCandidateFailure(error),
      error,
      completeFamilies,
      completeFamilyRequestedLightness,
      candidateCounts,
      stateFailureCountsByDecision,
      stateCandidateEvidence,
    };
  }
  const decision = destructiveSearch({
    ...searchInput,
    diagnosticEligibleHexes: [...completeFamilies.keys()],
  });
  return {
    complete: true,
    terminalStage: "eligible",
    decision,
    states: completeFamilies.get(decision.value.hex),
    completeFamilies,
    completeFamilyRequestedLightness,
    candidateCounts,
    stateFailureCountsByDecision,
    stateCandidateEvidence,
  };
}

function transactionalDestructiveFamilySearch({
  searchInput,
  actionForeground,
  direction,
}) {
  const inspection = inspectTransactionalDestructiveFamilySearch({
    searchInput,
    actionForeground,
    direction,
  });
  if (!inspection.complete) throw inspection.error;
  const { decision, states } = inspection;
  if (!states) {
    throw new TypeError(
      "Selected diagnostic Destructive default must own a complete state family.",
    );
  }
  return {
    decision,
    states,
    candidateCounts: inspection.candidateCounts,
  };
}

function destructiveFamilySelection({
  searchInput,
  actionForeground,
  options,
}) {
  const { mode } = searchInput;
  const direction =
    options.destructiveGrammar?.direction ??
    options.filledActionDirections?.[mode] ??
    V2_POLICY.state.filledActionDirections[mode];
  if (options.transactionalDarkDestructiveStates === true && mode === "dark") {
    const transactional = transactionalDestructiveFamilySearch({
      searchInput,
      actionForeground,
      direction,
    });
    return {
      decision: transactional.decision,
      hover: transactional.states.hover,
      active: transactional.states.active,
      candidateCounts: transactional.candidateCounts,
    };
  }
  const decision = destructiveSearch({
    ...searchInput,
    ...(options.destructiveGrammar
      ? {
          preferredLightness: options.destructiveGrammar.lightness,
          diagnosticLightnessRange: [
            options.destructiveGrammar.lightness,
            options.destructiveGrammar.lightness,
          ],
        }
      : {}),
  });
  const stateInput = {
    mode,
    base: decision.value,
    labelText: actionForeground,
    labelLc: V2_POLICY.destructive.apcaDiagnosticLc,
    direction,
    textContrastStrategy: searchInput.textContrastStrategy,
  };
  return {
    decision,
    hover: stateSearch({
      ...stateInput,
      role: "destructive hover",
      target: V2_POLICY.state.separation.hoverFromDefault,
    }),
    active: stateSearch({
      ...stateInput,
      role: "destructive active",
      target: V2_POLICY.state.separation.activeFromDefault,
    }),
    candidateCounts: null,
  };
}

function filledActionConfiguration(options, mode) {
  const grammar = options.destructiveGrammar
    ? options.destructiveGrammar[mode]
    : null;
  return {
    grammar,
    direction:
      grammar?.direction ??
      options.filledActionDirections?.[mode] ??
      V2_POLICY.state.filledActionDirections[mode],
    foreground: grammar?.foreground ?? null,
  };
}

function configuredForeground(configuration, fallback) {
  return configuration.foreground ?? fallback;
}

function normalizedInputColor(primary) {
  if (typeof primary !== "string" || !isHex(primary)) {
    throw new TypeError("primary must be a six-digit hex color.");
  }
  const hex = normalizeHex(primary);
  const raw = candidate(hex).oklch;
  const classification = classifyInput(raw);
  return {
    normalizedPrimary: hex,
    raw,
    input: {
      ...raw,
      hex,
      classification,
      brandChroma:
        classification === "achromatic"
          ? 0
          : Math.min(V2_POLICY.primary.chromaCap, raw.c),
    },
  };
}

function modePalette(input, mode, options = {}) {
  const recipe = MODE_RECIPE[mode];
  const actionConfiguration = filledActionConfiguration(options, mode);
  const textContrastStrategy =
    options.textContrastStrategy ?? TEXT_CONTRAST_STRATEGIES.PRODUCTION;
  const foundation = foundationPalette(
    input,
    mode,
    recipe,
    textContrastStrategy,
  );
  const foundations = foundation.values;
  const brandFamily = brandFamilySearch({
    input,
    mode,
    background: foundations.background,
    surface: foundations.surface,
    primaryRange: options.primaryRange,
    allowInfeasibleStateCandidates: options.allowInfeasibleStateCandidates,
    primaryChromaExperiment: options.primaryChromaExperiment,
    filledActionDirection: actionConfiguration.direction,
    filledActionForeground: actionConfiguration.foreground,
    preferredPrimaryLightness: options.preferredPrimaryLightnesses?.[mode],
    textContrastStrategy,
  });
  const primary = brandFamily.primary.hex;
  const primaryHover = brandFamily.hover.hex;
  const primaryActive = brandFamily.active.hex;
  const primaryTextDecision = sharedTextSearch({
    mode,
    role: "primary text",
    backgrounds: [primary, primaryHover, primaryActive],
    target: V2_POLICY.primary.apcaDiagnosticLc,
    fixedText: actionConfiguration.foreground,
    textContrastStrategy,
  });
  const primaryText = primaryTextDecision.value.hex;
  const actionForeground = configuredForeground(
    actionConfiguration,
    primaryText,
  );
  const primaryBorderDecision = primaryBorderSearch({
    input,
    mode,
    primary: brandFamily.primary,
    background: foundations.background,
    surface: foundations.surface,
  });
  const primaryBorder = primaryBorderDecision.value.hex;
  const primarySourceDistance = distance(
    candidate(input.hex),
    brandFamily.primary,
  );
  const destructiveAnchor = destructiveAnchorDecision({
    input,
    mode,
    strategy:
      options.destructiveAnchorStrategy ??
      DESTRUCTIVE_ANCHOR_STRATEGIES.CURRENT_SOURCE_BAND,
  });
  const redConflict = destructiveAnchor.sourceBandApplicable;
  const destructiveSearchInput = {
    mode,
    primary: brandFamily.primary,
    actionForeground,
    preferredLightness:
      destructiveAnchor.preferredLightness +
      (options.filledActionLightnessShifts?.[mode] ?? 0),
    diagnosticLightnessRange: options.destructiveLightnessRanges?.[mode],
    diagnosticOmitBrandSeparation:
      options.destructiveSeparationAuthority === "selected-result-review",
    textContrastStrategy,
  };
  const destructiveFamily = destructiveFamilySelection({
    searchInput: destructiveSearchInput,
    actionForeground,
    options: { ...options, destructiveGrammar: actionConfiguration.grammar },
  });
  const destructiveDecision = destructiveFamily.decision;
  const destructiveColor = destructiveDecision.value.hex;
  const destructiveHoverDecision = destructiveFamily.hover;
  const destructiveActiveDecision = destructiveFamily.active;
  const destructiveHover = destructiveHoverDecision.value.hex;
  const destructiveActive = destructiveActiveDecision.value.hex;
  const destructiveText = actionForeground;
  const warningDecision = warningSearch({
    mode,
    primary: brandFamily.primary,
    destructive: destructiveDecision.value,
    textContrastStrategy,
    retainPlot:
      textContrastStrategy === TEXT_CONTRAST_STRATEGIES.PRODUCTION ||
      textContrastStrategy === TEXT_CONTRAST_STRATEGIES.APCA_ONLY
        ? false
        : "detailed",
  });
  const warningLabel = chooseTextContrastForeground({
    backgrounds: [warningDecision.value.hex],
    apcaMinimum: V2_POLICY.primary.apcaDiagnosticLc,
    strategy: textContrastStrategy,
  }).foreground;
  const warningHoverDecision = stateSearch({
    mode,
    base: warningDecision.value,
    role: "warning hover",
    target: V2_POLICY.state.separation.hoverFromDefault,
    labelText: warningLabel,
    labelLc: V2_POLICY.primary.apcaDiagnosticLc,
    textContrastStrategy,
  });
  const warningActiveDecision = stateSearch({
    mode,
    base: warningDecision.value,
    role: "warning active",
    target: V2_POLICY.state.separation.activeFromDefault,
    labelText: warningLabel,
    labelLc: V2_POLICY.primary.apcaDiagnosticLc,
    textContrastStrategy,
  });
  const warning = warningDecision.value.hex;
  const warningHover = warningHoverDecision.value.hex;
  const warningActive = warningActiveDecision.value.hex;
  const warningTextDecision = sharedTextSearch({
    mode,
    role: "warning text",
    backgrounds: [warning, warningHover, warningActive],
    target: V2_POLICY.primary.apcaDiagnosticLc,
    textContrastStrategy,
  });
  const warningText = warningTextDecision.value.hex;
  const selectionDecision = selectionSearch({
    input,
    mode,
    surface: candidate(foundations.surface),
    textContrastStrategy,
  });
  const selection = selectionDecision.value.hex;
  const selectionTextDecision = sharedTextSearch({
    mode,
    role: "selection text",
    backgrounds: [selection],
    target: V2_POLICY.selection.textApcaDiagnosticLc,
    textContrastStrategy,
  });
  const selectionText = selectionTextDecision.value.hex;
  const focusDecision = focusSearch({
    input,
    mode,
    primary: brandFamily.primary,
    destructive: destructiveDecision.value,
    adjacentFoundations: Object.fromEntries(
      V2_POLICY.focus.adjacentRoles.map((role) => [role, foundations[role]]),
    ),
  });
  const focusRing = focusDecision.value.hex;
  const values = {
    ...foundations,
    "brand source": input.hex,
    primary,
    "primary hover": primaryHover,
    "primary active": primaryActive,
    "primary text": primaryText,
    "primary border": primaryBorder,
    "focus ring": focusRing,
    destructive: destructiveColor,
    "destructive hover": destructiveHover,
    "destructive active": destructiveActive,
    "destructive text": destructiveText,
    warning,
    "warning hover": warningHover,
    "warning active": warningActive,
    "warning text": warningText,
    selection,
    "selection text": selectionText,
    "disabled background": foundations["muted surface"],
    "disabled text": foundations["muted text"],
    "disabled border": foundations.border,
    popover: foundations["raised surface"],
    "popover text": foundations.foreground,
  };
  const textChecks = [
    textContractCheck({
      role: "Body text",
      foreground: values.foreground,
      background: values.background,
      typographyContext: V2_POLICY.text.typographyContexts.body,
    }),
    textContractCheck({
      role: "Text on surface",
      foreground: values.foreground,
      background: values.surface,
      typographyContext: V2_POLICY.text.typographyContexts.body,
    }),
    textContractCheck({
      role: "Muted text",
      foreground: values["muted text"],
      background: values.background,
      typographyContext: V2_POLICY.text.typographyContexts.muted,
    }),
    ...["primary", "primary hover", "primary active"].map((role) =>
      textContractCheck({
        role: `Label on ${role}`,
        foreground: primaryText,
        background: values[role],
        typographyContext: V2_POLICY.text.typographyContexts.actionLabel,
      }),
    ),
    ...["destructive", "destructive hover", "destructive active"].map((role) =>
      textContractCheck({
        role: `Label on ${role}`,
        foreground: destructiveText,
        background: values[role],
        typographyContext: V2_POLICY.text.typographyContexts.actionLabel,
      }),
    ),
    ...["warning", "warning hover", "warning active"].map((role) =>
      textContractCheck({
        role: `Label on ${role}`,
        foreground: warningText,
        background: values[role],
        typographyContext: V2_POLICY.text.typographyContexts.warningLabel,
      }),
    ),
    textContractCheck({
      role: "Selected content",
      foreground: selectionText,
      background: selection,
      typographyContext: V2_POLICY.text.typographyContexts.selection,
    }),
  ];

  const measuredNonTextChecks = [
    ratioCheck({
      role: "Primary boundary on background",
      foreground: values["primary border"],
      background: values.background,
    }),
    ratioCheck({
      role: "Primary boundary on surface",
      foreground: values["primary border"],
      background: values.surface,
    }),
    ratioCheck({
      role: "Input boundary",
      foreground: values["input border"],
      background: values.surface,
    }),
    ratioCheck({
      role: "Focus on background",
      foreground: values["focus ring"],
      background: values.background,
    }),
    ratioCheck({
      role: "Focus on surface",
      foreground: values["focus ring"],
      background: values.surface,
    }),
    ratioCheck({
      role: "Focus on muted surface",
      foreground: values["focus ring"],
      background: values["muted surface"],
    }),
    differenceCheck({
      role: "Default → hover",
      first: primary,
      second: primaryHover,
    }),
    differenceCheck({
      role: "Hover → active",
      first: primaryHover,
      second: primaryActive,
    }),
    differenceCheck({
      role: "Brand → destructive",
      first: primary,
      second: destructiveColor,
      target: 0.08,
    }),
    differenceCheck({
      role: "Brand → warning",
      first: primary,
      second: warning,
      target: V2_POLICY.feedback.semanticSeparation,
    }),
    differenceCheck({
      role: "Destructive → warning",
      first: destructiveColor,
      second: warning,
      target: V2_POLICY.feedback.semanticSeparation,
    }),
    differenceCheck({
      role: "Surface → selection",
      first: foundations.surface,
      second: selection,
      target: V2_POLICY.selection.surfaceSeparation,
    }),
  ];
  const reviewOnlyChecks =
    options.destructiveSeparationAuthority === "selected-result-review"
      ? measuredNonTextChecks.filter(
          ({ role }) => role === "Brand → destructive",
        )
      : [];
  const nonTextChecks = measuredNonTextChecks.filter(
    (check) => !reviewOnlyChecks.includes(check),
  );
  const checks = [...textChecks, ...nonTextChecks];

  const decisions = { ...foundation.decisions, ...brandFamily.traces };
  decisions["primary text"] = primaryTextDecision.trace;
  decisions["brand source"] = inputDecision({
    id: `${mode}.brand.source`,
    role: "brand source",
    candidate: candidate(input.hex),
    evidence: evidence("calmMinimal"),
  });
  decisions["primary border"] = primaryBorderDecision.trace;
  decisions["focus ring"] = focusDecision.trace;
  decisions.destructive = destructiveDecision.trace;
  decisions["destructive hover"] = destructiveHoverDecision.trace;
  decisions["destructive active"] = destructiveActiveDecision.trace;
  decisions["destructive text"] = aliasDecision({
    id: `${mode}.destructive.text`,
    role: "destructive text",
    sourceRole: "primary text",
    candidate: candidate(destructiveText),
    intent:
      "Reuse the mode's shared filled-action foreground so Primary and Destructive follow one text-polarity rule.",
    evidence: evidence("wcagText", "apcaText"),
  });
  decisions.warning = warningDecision.trace;
  decisions["warning hover"] = warningHoverDecision.trace;
  decisions["warning active"] = warningActiveDecision.trace;
  decisions["warning text"] = warningTextDecision.trace;
  decisions.selection = selectionDecision.trace;
  decisions["selection text"] = selectionTextDecision.trace;
  for (const [role, sourceRole] of Object.entries(
    ROLE_CLASSIFICATION.aliases,
  )) {
    decisions[role] = aliasDecision({
      id: `${mode}.${role.replaceAll(" ", ".")}`,
      role,
      sourceRole,
      candidate: candidate(values[role]),
      intent: `Reuse ${sourceRole} because ${role} does not require a new palette color.`,
      evidence: evidence("calmMinimal"),
    });
  }

  return {
    mode,
    tokens: TOKEN_ORDER.map((role) => [values[role], role]),
    checks,
    ...(reviewOnlyChecks.length > 0 ? { reviewOnlyChecks } : {}),
    textChecks,
    nonTextChecks,
    values,
    decisions,
    recipe,
    adaptations: {
      inputLightnessInfluence: brandFamily.primary.oklch.l - input.l,
      primarySourceDistance,
      largeBrandShift:
        primarySourceDistance > V2_POLICY.primary.maximumSourceDistance,
      neutralTintChroma:
        input.classification === "achromatic"
          ? 0
          : Math.min(V2_POLICY.neutral.tintCap, input.brandChroma * 0.52),
      redConflict,
      filledActionDirection: actionConfiguration.direction,
      filledActionDirectionAuthority: "state.mode-relative-filled-actions",
      destructiveSeparationAuthority:
        options.destructiveSeparationAuthority ??
        V2_POLICY.destructive.separationAuthority,
      ...(options.destructiveAnchorStrategy
        ? { diagnosticDestructiveAnchor: destructiveAnchor }
        : {}),
      ...(options.allowInfeasibleStateCandidates
        ? {
            diagnosticInfeasiblePrimaryStateCandidateCount:
              brandFamily.infeasibleStateCandidateCount,
          }
        : {}),
      ...(options.filledActionDirections
        ? {
            diagnosticFilledActionDirection:
              options.filledActionDirections[mode],
          }
        : {}),
      ...(destructiveFamily.candidateCounts
        ? {
            destructiveFamilyCandidateCounts: destructiveFamily.candidateCounts,
            diagnosticDestructiveFamilyCandidateCounts:
              destructiveFamily.candidateCounts,
          }
        : {}),
      ...(options.destructiveSeparationAuthority
        ? {
            diagnosticDestructiveSeparationAuthority:
              options.destructiveSeparationAuthority,
          }
        : {}),
    },
    passed: checks.every((check) => check.pass),
  };
}

function validateDiagnosticDestructiveHues(relationship, hues) {
  if (hues === undefined) return;
  if (
    relationship !== "destructive" ||
    !Array.isArray(hues) ||
    hues.length === 0 ||
    hues.some((hue) => !Number.isFinite(hue) || hue < 0 || hue >= 360) ||
    new Set(hues).size !== hues.length
  ) {
    throw new TypeError(
      "diagnostic Destructive hue candidates require a unique bounded Destructive inventory.",
    );
  }
}

function omitsDestructiveSeparationConstraint(modeResult, relationship) {
  return (
    relationship === "destructive" &&
    modeResult.adaptations.destructiveSeparationAuthority ===
      "selected-result-review"
  );
}

export function inspectFeedbackDefaultCandidateAvailabilityV2({
  result,
  mode,
  relationship,
  diagnosticDestructiveHueCandidates,
}) {
  if (
    result?.version !== 3 ||
    result.policyVersion !== V2_POLICY.version ||
    !["light", "dark"].includes(mode) ||
    !["destructive", "warning"].includes(relationship)
  ) {
    throw new TypeError(
      "feedback candidate inspection requires a current v2 result, mode, and relationship.",
    );
  }
  validateDiagnosticDestructiveHues(
    relationship,
    diagnosticDestructiveHueCandidates,
  );
  const modeResult = result.modes[mode];
  const omittedDestructiveSeparation = omitsDestructiveSeparationConstraint(
    modeResult,
    relationship,
  );
  const primary = candidate(modeResult.values.primary);
  const selectedDestructive = candidate(modeResult.values.destructive);
  const baselineCheckId = `review.${mode}.primary-${relationship}-hue`;
  const baselineChecks = result.quality.semanticChecks.filter(
    ({ id }) => id === baselineCheckId,
  );
  if (baselineChecks.length !== 1 || baselineChecks[0].pass) {
    throw new TypeError(
      "feedback candidate inspection requires one failed baseline semantic-hue check.",
    );
  }
  const selectedFeedback = candidate(modeResult.values[relationship]);
  const reproducedBaseline = semanticHueReviewCheck({
    mode,
    relationship,
    primary,
    feedback: selectedFeedback,
  });
  if (
    JSON.stringify(baselineChecks[0]) !== JSON.stringify(reproducedBaseline)
  ) {
    throw new TypeError(
      "feedback candidate inspection baseline hue evidence must reconcile with selected colors.",
    );
  }
  const search =
    relationship === "destructive"
      ? destructiveSearch({
          mode,
          primary,
          actionForeground: modeResult.values["primary text"],
          preferredLightness: modeResult.adaptations.redConflict
            ? modeResult.recipe.conflictingDestructive
            : modeResult.recipe.destructive,
          retainPlot: "detailed",
          diagnosticOmitBrandSeparation: omittedDestructiveSeparation,
          diagnosticHueCandidates: diagnosticDestructiveHueCandidates,
        })
      : warningSearch({
          mode,
          primary,
          destructive: selectedDestructive,
          retainPlot: "detailed",
        });
  const productionSelected = modeResult.decisions[relationship].selected;
  const reproducedProduction = search.trace.searchPlot.find(
    ({ hex }) => hex === productionSelected.hex,
  );
  if (
    !reproducedProduction ||
    (diagnosticDestructiveHueCandidates === undefined &&
      !modeResult.adaptations.destructiveFamilyCandidateCounts &&
      JSON.stringify(search.trace.selected) !==
        JSON.stringify(productionSelected))
  ) {
    throw new TypeError(
      "diagnostic feedback inventory must reproduce the production-selected candidate.",
    );
  }
  const candidateIds = search.trace.searchPlot.map(({ hex }) => hex);
  if (new Set(candidateIds).size !== candidateIds.length) {
    throw new TypeError(
      "diagnostic feedback inventory must contain unique rendered candidates.",
    );
  }
  const evaluated = search.trace.searchPlot.map((item) => ({
    item,
    hueReview: semanticHueReviewCheck({
      mode,
      relationship,
      primary,
      feedback: candidate(item.hex),
    }),
  }));
  const basePassing = evaluated.filter(({ item }) => item.passed);
  const feasible = basePassing.filter(({ hueReview }) => hueReview.pass);
  const best = feasible[0] ?? null;
  const evidenceSummary = summarizeFeedbackCandidateEvidence({
    searchPlot: search.trace.searchPlot,
    hueReviews: evaluated.map(({ hueReview }) => hueReview),
    expectedConstraintIds: decisionPolicy(relationship)
      .constraints.map(({ id }) => id)
      .filter(
        (id) =>
          !omittedDestructiveSeparation ||
          id !== "destructive.brand-separation",
      ),
  });
  const siblingRole =
    relationship === "destructive" ? "warning" : "destructive";

  return {
    authority: "diagnostic",
    scope: "role-local-default-fill",
    input: result.input.primary,
    mode,
    relationship,
    baselineCheck: baselineChecks[0],
    conditioning: {
      primary: primary.hex,
      siblingRole,
      siblingFeedback: modeResult.values[siblingRole],
      downstreamSiblingRevalidation: false,
    },
    candidateSetIdentity: [
      result.version,
      result.policyVersion,
      result.input.primary,
      mode,
      relationship,
      primary.hex,
      modeResult.values[siblingRole],
      search.trace.policy.id,
      ...search.trace.searchConstants,
      baselineChecks[0].target,
      ...(diagnosticDestructiveHueCandidates ?? []),
      ...candidateIds,
    ].join("/"),
    requestedCandidateOccurrenceCount: search.trace.searchPlot.reduce(
      (count, item) => count + (item.parameters.requestedOrigins?.length ?? 1),
      0,
    ),
    candidateCounts: {
      inventory: evaluated.length,
      baseConstraintPassing: basePassing.length,
      semanticHuePassingAmongBase: feasible.length,
    },
    ...evidenceSummary,
    roleLocalAlternativeAvailable: feasible.length > 0,
    objectiveBestRoleLocalAlternative: best
      ? {
          hex: best.item.hex,
          oklch: best.item.oklch,
          constraintResults: best.item.constraintResults,
          objectiveResults: best.item.objectiveResults,
          tieBreakerResults: best.item.tieBreakerResults,
          semanticHueReview: best.hueReview,
        }
      : null,
    unestablished: [
      "hover-active-family-feasibility",
      "shared-label-family-feasibility",
      "state-pacing",
      "joint-feedback-substitution",
      "perceived-semantic-meaning",
    ],
  };
}

function validatePrimaryRanges(primaryRanges) {
  const valid = ["light", "dark"].every((mode) => {
    const range = primaryRanges?.[mode];
    return (
      Array.isArray(range) &&
      range.length === 2 &&
      range.every(Number.isFinite) &&
      range[0] >= 0 &&
      range[1] <= 1 &&
      range[0] <= range[1]
    );
  });
  if (!valid) {
    throw new TypeError(
      "primaryLightnessRanges must contain ordered light and dark ranges within 0–1.",
    );
  }
}

function compareJointFilledActionTuple(first, second) {
  const numeric = [
    [first.primarySourceDistance, second.primarySourceDistance],
    [first.destructiveAnchorDistance, second.destructiveAnchorDistance],
    [-first.weakestForegroundLc, -second.weakestForegroundLc],
  ];
  for (const [firstValue, secondValue] of numeric) {
    if (firstValue !== secondValue) return firstValue - secondValue;
  }
  return first.identity.localeCompare(second.identity);
}

export function inspectBoundedJointDarkFilledActionFamily({ primary }) {
  const { normalizedPrimary, input } = normalizedInputColor(primary);
  const mode = "dark";
  const direction = FILLED_ACTION_JOINT_EXPERIMENT.directions.dark;
  const textContrastStrategy = TEXT_CONTRAST_STRATEGIES.APCA_ONLY;
  const foundation = foundationPalette(
    input,
    mode,
    MODE_RECIPE.dark,
    textContrastStrategy,
  );
  const source = candidate(normalizedPrimary);
  const destructiveAnchor = destructiveAnchorDecision({
    input,
    mode,
    strategy: DESTRUCTIVE_ANCHOR_STRATEGIES.CURRENT_SOURCE_BAND,
  });
  const [start, end] = V2_POLICY.primary.lightnessRange.dark;
  const attempted = [];
  const uniquePrimaryFamilies = new Set();
  const primaryFamiliesByForeground = new Map(
    FILLED_ACTION_JOINT_EXPERIMENT.foregrounds.map((foreground) => [
      foreground,
      new Map(),
    ]),
  );
  const eligible = [];

  for (const foreground of FILLED_ACTION_JOINT_EXPERIMENT.foregrounds) {
    for (
      let requestedLightness = start;
      requestedLightness <= end + V2_POLICY.search.candidateStep / 2;
      requestedLightness += V2_POLICY.search.candidateStep
    ) {
      let brandFamily;
      try {
        brandFamily = brandFamilySearch({
          input,
          mode,
          background: foundation.values.background,
          surface: foundation.values.surface,
          primaryRange: [requestedLightness, requestedLightness],
          allowInfeasibleStateCandidates: true,
          filledActionDirection: direction,
          filledActionForeground: foreground,
          textContrastStrategy,
        });
      } catch (error) {
        if (!(error instanceof NoCandidateError)) throw error;
        attempted.push({
          requestedLightness,
          foreground,
          status: "primary-family-infeasible",
          failure: noCandidateFailure(error),
        });
        continue;
      }

      const primaryFamilyKey = `${foreground}/${brandFamily.primary.hex}`;
      if (uniquePrimaryFamilies.has(primaryFamilyKey)) {
        attempted.push({
          requestedLightness,
          foreground,
          status: "rendered-primary-duplicate",
          primary: brandFamily.primary.hex,
        });
        continue;
      }
      uniquePrimaryFamilies.add(primaryFamilyKey);
      primaryFamiliesByForeground
        .get(foreground)
        .set(brandFamily.primary.hex, brandFamily);

      const destructiveFamily = inspectTransactionalDestructiveFamilySearch({
        searchInput: {
          mode,
          primary: brandFamily.primary,
          actionForeground: foreground,
          preferredLightness: destructiveAnchor.preferredLightness,
          textContrastStrategy,
        },
        actionForeground: foreground,
        direction,
      });
      if (!destructiveFamily.complete) {
        attempted.push({
          requestedLightness,
          foreground,
          status: "destructive-family-infeasible",
          terminalStage: destructiveFamily.terminalStage,
          primary: brandFamily.primary.hex,
          failure: destructiveFamily.failure,
          destructiveCandidateCounts: destructiveFamily.candidateCounts,
          stateFailureCountsByDecision:
            destructiveFamily.stateFailureCountsByDecision,
          stateCandidateEvidence: destructiveFamily.stateCandidateEvidence,
        });
        continue;
      }

      const values = {
        foreground,
        primary: brandFamily.primary.hex,
        primaryHover: brandFamily.hover.hex,
        primaryActive: brandFamily.active.hex,
        destructive: destructiveFamily.decision.value.hex,
        destructiveHover: destructiveFamily.states.hover.value.hex,
        destructiveActive: destructiveFamily.states.active.value.hex,
      };
      const fillColors = [
        values.primary,
        values.primaryHover,
        values.primaryActive,
        values.destructive,
        values.destructiveHover,
        values.destructiveActive,
      ];
      const tuple = {
        requestedPrimaryLightness: requestedLightness,
        values,
        primarySourceDistance: distance(source, brandFamily.primary),
        destructiveAnchorDistance: Math.abs(
          destructiveFamily.decision.value.oklch.l -
            destructiveAnchor.preferredLightness,
        ),
        weakestForegroundLc: Math.min(
          ...fillColors.map((color) =>
            Math.abs(apcaContrast(foreground, color)),
          ),
        ),
        destructiveCandidateCounts: destructiveFamily.candidateCounts,
        identity: [
          foreground,
          brandFamily.primary.hex,
          destructiveFamily.decision.value.hex,
          brandFamily.hover.hex,
          brandFamily.active.hex,
          destructiveFamily.states.hover.value.hex,
          destructiveFamily.states.active.value.hex,
        ].join("/"),
      };
      eligible.push(tuple);
      attempted.push({
        requestedLightness,
        foreground,
        status: "eligible-joint-family",
        primary: brandFamily.primary.hex,
        destructive: destructiveFamily.decision.value.hex,
      });
    }
  }

  eligible.sort(compareJointFilledActionTuple);
  const statusCounts = Object.fromEntries(
    [...new Set(attempted.map(({ status }) => status))]
      .sort()
      .map((status) => [
        status,
        attempted.filter((item) => item.status === status).length,
      ]),
  );
  const whitePrimaryFamilies = [
    ...primaryFamiliesByForeground.get("#FFFFFF").values(),
  ];
  let separationDisconfirmingProbe = null;
  if (whitePrimaryFamilies.length > 0) {
    const separationOff = inspectTransactionalDestructiveFamilySearch({
      searchInput: {
        mode,
        primary: whitePrimaryFamilies[0].primary,
        actionForeground: "#FFFFFF",
        preferredLightness: destructiveAnchor.preferredLightness,
        diagnosticOmitBrandSeparation: true,
        textContrastStrategy,
      },
      actionForeground: "#FFFFFF",
      direction,
    });
    if (!separationOff.complete) {
      throw new TypeError(
        "The separation-off disconfirming inventory must contain complete Destructive families.",
      );
    }
    const completeDestructiveFamilies = [
      ...separationOff.completeFamilies.entries(),
    ]
      .map(([defaultHex, states]) => ({
        default: defaultHex,
        hover: states.hover.value.hex,
        active: states.active.value.hex,
        requestedLightness:
          separationOff.completeFamilyRequestedLightness.get(defaultHex),
      }))
      .sort((first, second) => first.default.localeCompare(second.default));
    let maximumPair = null;
    for (const brandFamily of whitePrimaryFamilies) {
      for (const destructiveFamily of completeDestructiveFamilies) {
        const deltaE = distance(
          brandFamily.primary,
          candidate(destructiveFamily.default),
        );
        if (
          maximumPair === null ||
          deltaE > maximumPair.deltaE ||
          (deltaE === maximumPair.deltaE &&
            `${brandFamily.primary.hex}/${destructiveFamily.default}` <
              `${maximumPair.primary}/${maximumPair.destructive}`)
        ) {
          maximumPair = {
            primary: brandFamily.primary.hex,
            destructive: destructiveFamily.default,
            deltaE,
          };
        }
      }
    }
    separationDisconfirmingProbe = {
      authority: "diagnostic",
      omittedConstraintId: "destructive.brand-separation",
      retainedConstraintIds: [
        "destructive.label-contrast",
        "state.minimum-separation",
        "state.shared-label",
      ],
      conditioning: {
        mode: "dark",
        direction,
        foreground: "#FFFFFF",
        stateCandidateLimit: V2_POLICY.search.stateCandidateLimit,
        destructiveLightnessRange: V2_POLICY.destructive.lightnessRange.dark,
        destructiveCandidateStep: V2_POLICY.destructive.candidateStep,
      },
      eligiblePrimaryFamilyCount: whitePrimaryFamilies.length,
      completeDestructiveFamilyCount: completeDestructiveFamilies.length,
      completeDestructiveFamilies,
      separationThreshold: V2_POLICY.destructive.separation,
      maximumPair,
      anyPairMeetsSeparation:
        maximumPair !== null &&
        maximumPair.deltaE >= V2_POLICY.destructive.separation,
    };
  }
  return {
    schema: "bounded-joint-dark-filled-action-family-inspection.v1",
    authority: "diagnostic",
    experiment: FILLED_ACTION_JOINT_EXPERIMENT,
    input: normalizedPrimary,
    complete: eligible.length > 0,
    selected: eligible[0] ?? null,
    funnel: {
      requestedPrimaryForegroundAttemptCount: attempted.length,
      uniquePrimaryFamilyCount: uniquePrimaryFamilies.size,
      eligibleJointFamilyCount: eligible.length,
      statusCounts,
    },
    separationDisconfirmingProbe,
    attempts: attempted,
  };
}

function generatePalette(primary, primaryRanges, diagnosticOptions = null) {
  const {
    normalizedPrimary,
    raw: rawInput,
    input: inputColor,
  } = normalizedInputColor(primary);
  const cacheKey = `${V2_POLICY.version}/${normalizedPrimary}`;
  const cached = diagnosticOptions ? null : paletteCache.get(cacheKey);
  if (cached) return cached;
  const { classification } = inputColor;
  const chromaRequests = primaryChromaRequests(rawInput.c);
  const primaryChromaExperiment =
    diagnosticOptions?.experiment === "primary-chroma-ladder"
      ? {
          ...PRIMARY_CHROMA_EXPERIMENT,
          requestedChromaOrigins: chromaRequests.origins,
          requestedChromas: chromaRequests.distinct,
          maximumRequestedChroma: rawInput.c,
        }
      : null;
  const buildMode = (input, mode, options = {}) =>
    modePalette(input, mode, {
      ...options,
      allowInfeasibleStateCandidates: Boolean(
        diagnosticOptions?.allowInfeasibleStateCandidates,
      ),
      primaryChromaExperiment,
      destructiveAnchorStrategy: diagnosticOptions?.destructiveAnchorStrategy,
      filledActionDirections:
        diagnosticOptions?.filledActionDirections ??
        V2_POLICY.state.filledActionDirections,
      filledActionLightnessShifts:
        diagnosticOptions?.filledActionLightnessShifts,
      destructiveLightnessRanges: diagnosticOptions?.destructiveLightnessRanges,
      preferredPrimaryLightnesses:
        diagnosticOptions?.preferredPrimaryLightnesses,
      transactionalDarkDestructiveStates:
        diagnosticOptions?.transactionalDarkDestructiveStates ?? true,
      destructiveGrammar: diagnosticOptions?.destructiveGrammar,
      destructiveSeparationAuthority:
        diagnosticOptions?.destructiveSeparationAuthority ??
        V2_POLICY.destructive.separationAuthority,
      textContrastStrategy:
        diagnosticOptions?.textContrastStrategy ??
        TEXT_CONTRAST_STRATEGIES.PRODUCTION,
    });
  const baselineModes = {
    light: buildMode(inputColor, "light", {
      primaryRange: primaryRanges.light,
    }),
    dark: buildMode(inputColor, "dark", {
      primaryRange: primaryRanges.dark,
    }),
  };
  const pairSelection = selectModePair(
    inputColor,
    baselineModes,
    buildMode,
    primaryRanges,
    {
      rankingStrategy:
        diagnosticOptions?.pairRankingStrategy ??
        V2_POLICY.crossMode.pairRankingStrategy,
      includeCandidateSetIdentity:
        diagnosticOptions?.experiment === "pair-ranking",
      preferredPrimaryLightnesses:
        diagnosticOptions?.preferredPrimaryLightnesses,
    },
  );
  const { modes } = pairSelection;
  const quality = selectedResultReview(
    inputColor,
    modes,
    pairSelection.quality,
  );
  const sourceAlternatives = sourceUsageAlternatives(inputColor, modes);
  const semanticEvaluation = evaluateV2Semantics(modes, quality);
  const hoverDiagnostics = diagnosePrimaryHover(modes);
  const { contractsPassed, verdicts } = resultVerdicts(
    modes,
    quality,
    semanticEvaluation,
  );
  const result = {
    version: 3,
    policyVersion: V2_POLICY.version,
    input: { primary: normalizedPrimary },
    source: {
      hex: normalizedPrimary,
      oklch: rawInput,
      classification,
      policy:
        classification === "achromatic"
          ? "Preserve source lightness influence; generate an achromatic brand family."
          : "Preserve hue and relative chroma; normalize lightness for usable mode roles.",
    },
    direction: "calm minimal",
    contrastModel:
      "WCAG 2.2 normal-text eligibility + APCA diagnostic ranking + WCAG non-text",
    modes,
    quality,
    semanticEvaluation,
    verdicts,
    hoverDiagnostics,
    pairDecision: pairSelection.decision,
    sourceAlternatives,
    contractsPassed,
    passed: contractsPassed,
    ...(diagnosticOptions
      ? {
          diagnosticOverride: {
            authority: "diagnostic",
            baselinePolicyVersion: V2_POLICY.version,
            ...diagnosticOptions,
            ...(primaryChromaExperiment ? { primaryChromaExperiment } : {}),
          },
        }
      : {}),
  };
  return diagnosticOptions
    ? result
    : boundedSet(paletteCache, cacheKey, result, 128);
}

export function generatePaletteV2({ primary }) {
  return generatePalette(primary, V2_POLICY.primary.lightnessRange);
}

export function generatePaletteV2BothDarkerLegacyCounterfactual({ primary }) {
  return generatePalette(primary, V2_POLICY.primary.lightnessRange, {
    experiment: "legacy-v15-both-darker-replay",
    authority: "historical-diagnostic-baseline",
    filledActionDirections: { light: -1, dark: -1 },
    transactionalDarkDestructiveStates: false,
    destructiveSeparationAuthority: "generation-constraint",
    textContrastStrategy: TEXT_CONTRAST_STRATEGIES.APCA_ONLY,
  });
}

export function generatePaletteV2Counterfactual({
  primary,
  primaryLightnessRanges,
}) {
  validatePrimaryRanges(primaryLightnessRanges);
  return generatePalette(primary, primaryLightnessRanges, {
    experiment: "primary-lightness-range",
    allowInfeasibleStateCandidates: true,
    primaryLightnessRanges,
  });
}

export function generatePaletteV2PairRankingCounterfactual({
  primary,
  strategy,
}) {
  if (!Object.values(PAIR_RANKING_STRATEGIES).includes(strategy)) {
    throw new TypeError(`Unsupported pair ranking strategy: ${strategy}.`);
  }
  return generatePalette(primary, V2_POLICY.primary.lightnessRange, {
    experiment: "pair-ranking",
    pairRankingStrategy: strategy,
  });
}

export function generatePaletteV2PrimaryChromaCounterfactual({ primary }) {
  return generatePalette(primary, V2_POLICY.primary.lightnessRange, {
    experiment: "primary-chroma-ladder",
    strategy: PRIMARY_CHROMA_EXPERIMENT.id,
    experimentDefinition: PRIMARY_CHROMA_EXPERIMENT,
  });
}

export function generatePaletteV2TextContrastCounterfactual({
  primary,
  strategy,
}) {
  assertTextContrastStrategy(strategy);
  return generatePalette(primary, V2_POLICY.primary.lightnessRange, {
    experiment: TEXT_CONTRAST_EXPERIMENT.id,
    experimentDefinition: TEXT_CONTRAST_EXPERIMENT,
    textContrastStrategy: strategy,
  });
}

export function generatePaletteV2DestructiveAnchorCounterfactual({
  primary,
  strategy = DESTRUCTIVE_ANCHOR_STRATEGIES.FIXED_DEFAULT,
}) {
  if (!Object.values(DESTRUCTIVE_ANCHOR_STRATEGIES).includes(strategy)) {
    throw new TypeError(
      `Unsupported destructive anchor strategy: ${strategy}.`,
    );
  }
  return generatePalette(primary, V2_POLICY.primary.lightnessRange, {
    experiment: "destructive-anchor",
    strategy,
    policySnapshot: DESTRUCTIVE_ANCHOR_POLICY,
    destructiveAnchorStrategy: strategy,
  });
}

export function generatePaletteV2FilledActionDirectionCounterfactual({
  primary,
  directions = FILLED_ACTION_DIRECTION_EXPERIMENT.directions,
}) {
  assertFilledActionDirections(directions);
  return generatePalette(primary, V2_POLICY.primary.lightnessRange, {
    experiment: FILLED_ACTION_DIRECTION_EXPERIMENT.id,
    experimentDefinition: FILLED_ACTION_DIRECTION_EXPERIMENT,
    filledActionDirections: directions,
    transactionalDarkDestructiveStates: true,
    destructiveSeparationAuthority: "generation-constraint",
    textContrastStrategy: TEXT_CONTRAST_STRATEGIES.APCA_ONLY,
  });
}

export function generatePaletteV2ContextualDestructiveSeparationCounterfactual({
  primary,
  experiment = CONTEXTUAL_DESTRUCTIVE_SEPARATION_EXPERIMENT,
}) {
  assertContextualDestructiveSeparationExperiment(experiment);
  return generatePalette(primary, V2_POLICY.primary.lightnessRange, {
    experiment: experiment.id,
    experimentDefinition: experiment,
    filledActionDirections: experiment.directions,
    transactionalDarkDestructiveStates: true,
    destructiveSeparationAuthority: "selected-result-review",
    textContrastStrategy: TEXT_CONTRAST_STRATEGIES.APCA_ONLY,
  });
}

function assertDestructiveGrammar(grammar) {
  if (
    !grammar ||
    !["light", "dark"].every((mode) => {
      const item = grammar[mode];
      const range = V2_POLICY.destructive.lightnessRange[mode];
      return (
        item &&
        Number.isFinite(item.lightness) &&
        item.lightness >= range[0] &&
        item.lightness <= range[1] &&
        [-1, 1].includes(item.direction) &&
        ["#000000", "#FFFFFF"].includes(item.foreground)
      );
    })
  ) {
    throw new TypeError(
      "Destructive grammar preview requires bounded Light and Dark tuples.",
    );
  }
  return grammar;
}

export function generatePaletteV2DestructiveGrammarCounterfactual({
  primary,
  grammar,
}) {
  assertDestructiveGrammar(grammar);
  return generatePalette(primary, V2_POLICY.primary.lightnessRange, {
    experiment: "destructive-first-grammar-preview",
    strategy: "operator-selected-bounded-tuples",
    destructiveGrammar: grammar,
    allowInfeasibleStateCandidates: true,
    transactionalDarkDestructiveStates: false,
    textContrastStrategy: TEXT_CONTRAST_STRATEGIES.APCA_ONLY,
  });
}

export function generatePaletteV2TonalOffsetCounterfactual({
  primary,
  offset,
}) {
  const baseline = generatePaletteV2({ primary });
  const profile = tonalOffsetProfile(offset, baseline.modes);
  return generatePalette(primary, profile.primaryLightnessRanges, {
    experiment: TONAL_OFFSET_EXPERIMENT.id,
    experimentDefinition: TONAL_OFFSET_EXPERIMENT,
    tonalOffsetProfile: profile,
    filledActionLightnessShifts: profile.shifts,
    destructiveLightnessRanges: profile.destructiveLightnessRanges,
    preferredPrimaryLightnesses: profile.preferredPrimaryLightnesses,
  });
}

export function serializeModeCss(modeResult) {
  const selector = `[data-theme="${modeResult.mode}"]`;
  const hexDeclarations = modeResult.tokens
    .map(
      ([color, role]) => `  --palette-${role.replaceAll(" ", "-")}: ${color};`,
    )
    .join("\n");
  const oklchDeclarations = modeResult.tokens
    .map(([color, role]) => {
      const name = `--palette-${role.replaceAll(" ", "-")}`;
      const { l, c, h } = candidate(color).oklch;
      const cssColor = `oklch(${l.toFixed(8)} ${c.toFixed(8)} ${h.toFixed(6)})`;
      return `    ${name}: ${cssColor};`;
    })
    .join("\n");
  return `${selector} {\n${hexDeclarations}\n}\n\n@supports (color: oklch(0.5 0 0)) {\n  ${selector} {\n${oklchDeclarations}\n  }\n}`;
}
