import { isHex, normalizeHex } from "../../lib/color-math.js";
import { apcaCheck } from "./apca.js";
import { aliasDecision, inputDecision, selectCandidate } from "./decision.js";
import { V2_POLICY, decisionPolicy, evidence } from "./policy.js";
import { MODE_RECIPE, ROLE_CLASSIFICATION, TOKEN_ORDER } from "./roles.js";
import {
  apcaContrast,
  bindRule,
  boundedSet,
  brandCandidate,
  candidate,
  chooseSharedText,
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

function sharedTextSearch({ mode, role, backgrounds, target }) {
  const policy = decisionPolicy("binaryText");
  const candidates = [candidate("#000000"), candidate("#FFFFFF")];
  const weakestContrast = (item) =>
    Math.min(
      ...backgrounds.map((background) =>
        Math.abs(apcaContrast(item.hex, background)),
      ),
    );
  return selectCandidate({
    id: `${mode}.${role.replaceAll(" ", ".")}`,
    role,
    intent: `Choose one black-or-white ${role} that maximizes the weakest contrast across every intended fill.`,
    candidates,
    policy,
    constraints: [
      bindRule(policy, "constraints", "text.required-contrast", (item) => {
        const minimumLc = weakestContrast(item);
        const passed = minimumLc >= target;
        return {
          passed,
          reasons: [
            passed
              ? `Weakest intended fill reaches ${minimumLc.toFixed(1)} Lc.`
              : `Weakest intended fill reaches only ${minimumLc.toFixed(1)} Lc.`,
          ],
          metrics: { minimumLc, target, backgrounds },
        };
      }),
    ],
    objectives: [
      bindRule(
        policy,
        "objectives",
        "text.maximize-weakest-contrast",
        weakestContrast,
      ),
    ],
    tieBreakers: stableTieBreaker(policy),
    evidence: evidence("apcaText"),
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
  return selectCandidate({
    id: `${mode}.${role.replaceAll(" ", ".")}`,
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
      ...(policyId === "foundationText" ? ["apcaText"] : []),
      ...(policyId === "foundationInput" ? ["wcagNonText"] : []),
    ),
    searchConstants: ["input hue", "bounded tint candidates"],
  });
}

function foundationPalette(input, mode, recipe) {
  const cacheKey = `${V2_POLICY.version}/${input.hex}/${mode}`;
  const cached = foundationCache.get(cacheKey);
  if (cached) return cached;
  const separation = V2_POLICY.foundation.hierarchySeparation;
  const modeZone = (item) => {
    const passed =
      mode === "light" ? item.oklch.l >= 0.96 : item.oklch.l <= 0.22;
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
        const minimumLc = Math.min(
          ...backgrounds.map((backgroundColor) =>
            Math.abs(apcaContrast(item.hex, backgroundColor.value.hex)),
          ),
        );
        const passed = minimumLc >= targetLc;
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
    V2_POLICY.foundation.bodyTextLc,
  );
  const mutedText = textRole(
    "muted text",
    recipe.mutedText,
    0.16,
    [background, muted],
    V2_POLICY.foundation.mutedTextLc,
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

function stateSearch({ mode, base, role, target, labelText, labelLc }) {
  const policy = decisionPolicy(labelText ? "labeledState" : "state");
  const direction = labelText
    ? labelText === "#FFFFFF"
      ? -1
      : 1
    : V2_POLICY.state.direction[mode];
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
                const value = Math.abs(apcaContrast(labelText, item.hex));
                return {
                  passed: value >= labelLc,
                  reasons: [
                    value >= labelLc
                      ? `Shared label reaches ${value.toFixed(1)} Lc.`
                      : `Shared label reaches only ${value.toFixed(1)} Lc.`,
                  ],
                  metrics: { value, target: labelLc, labelText },
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
  });
}

function brandFamilySearch({ input, mode, background, surface, primaryRange }) {
  const policy = decisionPolicy("primary");
  const [start, end] = primaryRange ?? V2_POLICY.primary.lightnessRange[mode];
  const source = candidate(input.hex, { lightness: input.l });
  const candidates = [];
  const addFamily = (primary) => {
    const hover = stateSearch({
      mode,
      base: primary,
      role: "primary hover",
      target: V2_POLICY.state.separation.hoverFromDefault,
    });
    const active = stateSearch({
      mode,
      base: primary,
      role: "primary active",
      target: V2_POLICY.state.separation.activeFromDefault,
    });
    return { ...primary, family: { hover, active } };
  };
  const sourceCanGenerateStates =
    mode === "light" ? source.oklch.l > 0.1 : source.oklch.l < 0.9;
  candidates.push(sourceCanGenerateStates ? addFamily(source) : source);
  for (
    let lightness = start;
    lightness <= end + V2_POLICY.search.candidateStep / 2;
    lightness += V2_POLICY.search.candidateStep
  ) {
    const primary = brandCandidate(input, lightness);
    if (primary.hex !== source.hex) candidates.push(addFamily(primary));
  }
  const selection = selectCandidate({
    id: `${mode}.primary`,
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
        const maximum = input.brandChroma + V2_POLICY.primary.chromaTolerance;
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
      bindRule(policy, "constraints", "primary.shared-label", (item) => {
        const colors = item.family
          ? [
              item.hex,
              item.family.hover.value.hex,
              item.family.active.value.hex,
            ]
          : [item.hex];
        const text = chooseSharedText(colors);
        const minimumLc = Math.min(
          ...colors.map((color) => Math.abs(apcaContrast(text, color))),
        );
        return {
          passed:
            Boolean(item.family) && minimumLc >= V2_POLICY.primary.labelLc,
          reasons: [
            item.family && minimumLc >= V2_POLICY.primary.labelLc
              ? `Shared label reaches ${minimumLc.toFixed(1)} Lc.`
              : `Complete-family label reaches only ${minimumLc.toFixed(1)} Lc.`,
          ],
          metrics: { minimumLc, target: V2_POLICY.primary.labelLc, text },
        };
      }),
    ],
    objectives: [
      bindRule(policy, "objectives", "primary.source-fidelity", (item) =>
        distance(source, item),
      ),
    ],
    tieBreakers: stableTieBreaker(policy),
    evidence: evidence("apcaText", "calmMinimal"),
    searchConstants: ["input hue", "bounded source chroma"],
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
  };
}

function destructiveSearch({ mode, primary, preferredLightness }) {
  const policy = decisionPolicy("destructive");
  const [start, end] = V2_POLICY.destructive.lightnessRange[mode];
  const candidates = [];
  for (
    let lightness = start;
    lightness <= end + V2_POLICY.destructive.candidateStep / 2;
    lightness += V2_POLICY.destructive.candidateStep
  ) {
    candidates.push(candidate(destructiveTone(lightness), { lightness }));
  }
  return selectCandidate({
    id: `${mode}.destructive`,
    role: "destructive",
    intent:
      "Stay near the semantic red anchor while remaining readable and distinct from the generated brand.",
    candidates,
    policy,
    constraints: [
      bindRule(policy, "constraints", "destructive.label-contrast", (item) => {
        const text = chooseSharedText([item.hex]);
        const lc = Math.abs(apcaContrast(text, item.hex));
        return {
          passed: lc >= V2_POLICY.destructive.labelLc,
          reasons: [
            lc >= V2_POLICY.destructive.labelLc
              ? `Best label reaches ${lc.toFixed(1)} Lc.`
              : `Best label reaches only ${lc.toFixed(1)} Lc.`,
          ],
          metrics: { value: lc, target: V2_POLICY.destructive.labelLc, text },
        };
      }),
      bindRule(
        policy,
        "constraints",
        "destructive.brand-separation",
        (item) => {
          const deltaE = distance(primary, item);
          const passed = deltaE >= V2_POLICY.destructive.separation;
          return {
            passed,
            reasons: [
              passed
                ? `Brand separation reaches ΔE ${deltaE.toFixed(3)}.`
                : `Brand separation ΔE ${deltaE.toFixed(3)} is below ${V2_POLICY.destructive.separation.toFixed(3)}.`,
            ],
            metrics: {
              value: deltaE,
              target: V2_POLICY.destructive.separation,
            },
          };
        },
      ),
    ],
    objectives: [
      bindRule(policy, "objectives", "destructive.semantic-anchor", (item) =>
        Math.abs(item.oklch.l - preferredLightness),
      ),
    ],
    tieBreakers: stableTieBreaker(policy),
    evidence: evidence("apcaText", "destructiveSeparation", "calmMinimal"),
    searchConstants: ["semantic red hue", "requested chroma"],
  });
}

function warningSearch({ mode, primary, destructive }) {
  const policy = decisionPolicy("warning");
  const preferredLightness = V2_POLICY.feedback.warningLightness[mode];
  const anchor = candidate(
    tone({
      l: preferredLightness,
      c: V2_POLICY.feedback.warningChroma,
      h: V2_POLICY.feedback.warningHue,
    }),
  );
  const [start, end] = V2_POLICY.feedback.warningRange[mode];
  const candidates = [];
  for (let lightness = start; lightness <= end + 0.0025; lightness += 0.005) {
    for (const hue of V2_POLICY.feedback.warningHueCandidates) {
      candidates.push(
        candidate(
          tone({
            l: lightness,
            c: V2_POLICY.feedback.warningChroma,
            h: hue,
          }),
          { lightness, hue },
        ),
      );
    }
  }
  return selectCandidate({
    id: `${mode}.warning`,
    role: "warning",
    intent:
      "Resolve an amber warning fill that remains readable and distinct from brand and destructive feedback.",
    candidates,
    policy,
    constraints: [
      bindRule(policy, "constraints", "feedback.label-contrast", (item) => {
        const text = chooseSharedText([item.hex]);
        const lc = Math.abs(apcaContrast(text, item.hex));
        const passed = lc >= V2_POLICY.primary.labelLc;
        return {
          passed,
          reasons: [
            passed
              ? `Best warning label reaches ${lc.toFixed(1)} Lc.`
              : `Best warning label reaches only ${lc.toFixed(1)} Lc.`,
          ],
          metrics: { lc, target: V2_POLICY.primary.labelLc, text },
        };
      }),
      bindRule(
        policy,
        "constraints",
        "feedback.semantic-separation",
        (item) => {
          const brandDistance = distance(primary, item);
          const destructiveDistance = distance(destructive, item);
          const minimumDistance = Math.min(brandDistance, destructiveDistance);
          const passed =
            minimumDistance >= V2_POLICY.feedback.semanticSeparation;
          return {
            passed,
            reasons: [
              passed
                ? `Nearest semantic color remains ΔE ${minimumDistance.toFixed(3)} away.`
                : `Nearest semantic color is only ΔE ${minimumDistance.toFixed(3)} away.`,
            ],
            metrics: {
              brandDistance,
              destructiveDistance,
              target: V2_POLICY.feedback.semanticSeparation,
            },
          };
        },
      ),
    ],
    objectives: [
      bindRule(policy, "objectives", "feedback.semantic-anchor", (item) =>
        distance(anchor, item),
      ),
    ],
    tieBreakers: stableTieBreaker(policy),
    evidence: evidence("apcaText", "destructiveSeparation", "calmMinimal"),
    searchConstants: ["bounded amber hue candidates", "warning chroma"],
    retainPlot: true,
  });
}

function selectionSearch({ input, mode, surface }) {
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
    role: "selection",
    intent:
      "Use the least emphasized brand tint that remains readable and visibly selected from the surface.",
    candidates,
    policy,
    constraints: [
      bindRule(policy, "constraints", "selection.text-contrast", (item) => {
        const text = chooseSharedText([item.hex]);
        const lc = Math.abs(apcaContrast(text, item.hex));
        const passed = lc >= V2_POLICY.selection.textLc;
        return {
          passed,
          reasons: [
            passed
              ? `Selected content reaches ${lc.toFixed(1)} Lc.`
              : `Selected content reaches only ${lc.toFixed(1)} Lc.`,
          ],
          metrics: { lc, target: V2_POLICY.selection.textLc, text },
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
    evidence: evidence("apcaText", "stateSeparation", "calmMinimal"),
    searchConstants: ["input hue", "bounded brand tint"],
    retainPlot: true,
  });
}

function focusSearch({
  input,
  mode,
  primary,
  destructive,
  background,
  surface,
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
    role: "focus ring",
    intent:
      "Resolve an independent focus color that remains brand-related while separating from controls on both foundations.",
    candidates: uniqueCandidates,
    policy,
    constraints: [
      bindRule(policy, "constraints", "focus.adjacent-contrast", (item) => {
        const minimumContrast = Math.min(
          contrastRatio(item.hex, background),
          contrastRatio(item.hex, surface),
        );
        const passed = minimumContrast >= V2_POLICY.focus.contrast;
        return {
          passed,
          reasons: [
            passed
              ? `Weakest foundation contrast reaches ${minimumContrast.toFixed(2)}:1.`
              : `Weakest foundation contrast reaches only ${minimumContrast.toFixed(2)}:1.`,
          ],
          metrics: { minimumContrast, target: V2_POLICY.focus.contrast },
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

function modePalette(input, mode, options = {}) {
  const recipe = MODE_RECIPE[mode];
  const foundation = foundationPalette(input, mode, recipe);
  const foundations = foundation.values;
  const brandFamily = brandFamilySearch({
    input,
    mode,
    background: foundations.background,
    surface: foundations.surface,
    primaryRange: options.primaryRange,
  });
  const primary = brandFamily.primary.hex;
  const primaryHover = brandFamily.hover.hex;
  const primaryActive = brandFamily.active.hex;
  const primaryTextDecision = sharedTextSearch({
    mode,
    role: "primary text",
    backgrounds: [primary, primaryHover, primaryActive],
    target: V2_POLICY.primary.labelLc,
  });
  const primaryText = primaryTextDecision.value.hex;
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
  const redConflict =
    input.classification !== "achromatic" && hueDistance(input.h, 27) < 38;
  const destructiveDecision = destructiveSearch({
    mode,
    primary: brandFamily.primary,
    preferredLightness: redConflict
      ? recipe.conflictingDestructive
      : recipe.destructive,
  });
  const destructiveColor = destructiveDecision.value.hex;
  const destructiveLabel = chooseSharedText([destructiveColor]);
  const destructiveHoverDecision = stateSearch({
    mode,
    base: destructiveDecision.value,
    role: "destructive hover",
    target: V2_POLICY.state.separation.hoverFromDefault,
    labelText: destructiveLabel,
    labelLc: V2_POLICY.destructive.labelLc,
  });
  const destructiveActiveDecision = stateSearch({
    mode,
    base: destructiveDecision.value,
    role: "destructive active",
    target: V2_POLICY.state.separation.activeFromDefault,
    labelText: destructiveLabel,
    labelLc: V2_POLICY.destructive.labelLc,
  });
  const destructiveHover = destructiveHoverDecision.value.hex;
  const destructiveActive = destructiveActiveDecision.value.hex;
  const destructiveTextDecision = sharedTextSearch({
    mode,
    role: "destructive text",
    backgrounds: [destructiveColor, destructiveHover, destructiveActive],
    target: V2_POLICY.destructive.labelLc,
  });
  const destructiveText = destructiveTextDecision.value.hex;
  const warningDecision = warningSearch({
    mode,
    primary: brandFamily.primary,
    destructive: destructiveDecision.value,
  });
  const warningLabel = chooseSharedText([warningDecision.value.hex]);
  const warningHoverDecision = stateSearch({
    mode,
    base: warningDecision.value,
    role: "warning hover",
    target: V2_POLICY.state.separation.hoverFromDefault,
    labelText: warningLabel,
    labelLc: V2_POLICY.primary.labelLc,
  });
  const warningActiveDecision = stateSearch({
    mode,
    base: warningDecision.value,
    role: "warning active",
    target: V2_POLICY.state.separation.activeFromDefault,
    labelText: warningLabel,
    labelLc: V2_POLICY.primary.labelLc,
  });
  const warning = warningDecision.value.hex;
  const warningHover = warningHoverDecision.value.hex;
  const warningActive = warningActiveDecision.value.hex;
  const warningTextDecision = sharedTextSearch({
    mode,
    role: "warning text",
    backgrounds: [warning, warningHover, warningActive],
    target: V2_POLICY.primary.labelLc,
  });
  const warningText = warningTextDecision.value.hex;
  const selectionDecision = selectionSearch({
    input,
    mode,
    surface: candidate(foundations.surface),
  });
  const selection = selectionDecision.value.hex;
  const selectionTextDecision = sharedTextSearch({
    mode,
    role: "selection text",
    backgrounds: [selection],
    target: V2_POLICY.selection.textLc,
  });
  const selectionText = selectionTextDecision.value.hex;
  const focusDecision = focusSearch({
    input,
    mode,
    primary: brandFamily.primary,
    destructive: destructiveDecision.value,
    background: foundations.background,
    surface: foundations.surface,
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
    apcaCheck({
      role: "Body text",
      foreground: values.foreground,
      background: values.background,
      target: 75,
      typography: "16px / 400",
    }),
    apcaCheck({
      role: "Text on surface",
      foreground: values.foreground,
      background: values.surface,
      target: 75,
      typography: "16px / 400",
    }),
    apcaCheck({
      role: "Muted text",
      foreground: values["muted text"],
      background: values.background,
      target: 60,
      typography: "14px / 500",
    }),
    ...["primary", "primary hover", "primary active"].map((role) =>
      apcaCheck({
        role: `Label on ${role}`,
        foreground: primaryText,
        background: values[role],
        target: 60,
        typography: "14px / 600",
      }),
    ),
    ...["destructive", "destructive hover", "destructive active"].map((role) =>
      apcaCheck({
        role: `Label on ${role}`,
        foreground: destructiveText,
        background: values[role],
        target: 60,
        typography: "14px / 600",
      }),
    ),
    ...["warning", "warning hover", "warning active"].map((role) =>
      apcaCheck({
        role: `Label on ${role}`,
        foreground: warningText,
        background: values[role],
        target: 60,
        typography: "14px / 600",
      }),
    ),
    apcaCheck({
      role: "Selected content",
      foreground: selectionText,
      background: selection,
      target: V2_POLICY.selection.textLc,
      typography: "14px / 500",
    }),
  ].map((check) => ({
    ...check,
    kind: "text",
    metric: "APCA Lc",
    value: Math.abs(check.lc),
  }));

  const nonTextChecks = [
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
  decisions["destructive text"] = destructiveTextDecision.trace;
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
    },
    passed: checks.every((check) => check.pass),
  };
}

function exactModeCandidate(input, mode, lightness) {
  try {
    return modePalette(input, mode, { primaryRange: [lightness, lightness] });
  } catch {
    return null;
  }
}

function uniqueModeCandidates(input, mode, baseline) {
  const [start, end] = V2_POLICY.primary.lightnessRange[mode];
  const lightnesses = [start, (start + end) / 2, end];
  const candidates = [
    baseline,
    ...lightnesses.map((lightness) =>
      exactModeCandidate(input, mode, lightness),
    ),
  ].filter(Boolean);
  return candidates.filter(
    (candidateMode, index) =>
      candidates.findIndex(
        (other) => other.values.primary === candidateMode.values.primary,
      ) === index,
  );
}

function qualityPenalty(quality) {
  return quality.checks.reduce((total, check) => {
    if (check.pass) return total;
    if (Array.isArray(check.target)) {
      return (
        total +
        Math.min(
          Math.abs(check.value - check.target[0]),
          Math.abs(check.value - check.target[1]),
        )
      );
    }
    return total + Math.abs(check.value - check.target);
  }, 0);
}

function comparePair(first, second) {
  const firstRank = first.rank;
  const secondRank = second.rank;
  for (let index = 0; index < firstRank.length; index += 1) {
    if (firstRank[index] !== secondRank[index]) {
      return firstRank[index] - secondRank[index];
    }
  }
  return first.id.localeCompare(second.id);
}

function selectModePair(input, baselineModes) {
  const source = candidate(input.hex);
  const lightCandidates = uniqueModeCandidates(
    input,
    "light",
    baselineModes.light,
  );
  const darkCandidates = uniqueModeCandidates(
    input,
    "dark",
    baselineModes.dark,
  );
  const pairs = lightCandidates
    .flatMap((light) =>
      darkCandidates.map((dark) => {
        const modes = { light, dark };
        const quality = pairedQuality(modes);
        const lightDistance = distance(source, candidate(light.values.primary));
        const darkDistance = distance(source, candidate(dark.values.primary));
        return {
          id: `${light.values.primary}/${dark.values.primary}`,
          modes,
          quality,
          lightDistance,
          darkDistance,
          rank: [
            Math.max(lightDistance, darkDistance),
            lightDistance + darkDistance,
            quality.checks.filter(({ pass }) => !pass).length,
            qualityPenalty(quality),
          ],
        };
      }),
    )
    .sort(comparePair);
  const selected = pairs[0];
  const compactPair = (pair) =>
    pair
      ? {
          light: pair.modes.light.values.primary,
          dark: pair.modes.dark.values.primary,
          qualityMisses: pair.quality.checks.filter(({ pass }) => !pass).length,
          maximumSourceDistance: pair.rank[0],
          totalSourceDistance: pair.rank[1],
          hueDrift: pair.quality.crossMode.hueDrift,
          chromaDifference: pair.quality.crossMode.chromaDifference,
          lightnessGap: pair.quality.crossMode.lightnessGap,
        }
      : null;
  const sourceFidelity = [...pairs].sort(
    (first, second) =>
      first.lightDistance +
        first.darkDistance -
        (second.lightDistance + second.darkDistance) ||
      first.id.localeCompare(second.id),
  )[0];
  const selectedMisses = selected.quality.checks.filter(
    ({ pass }) => !pass,
  ).length;
  const qualityRejected = pairs.find(
    (pair) =>
      pair.quality.checks.filter(({ pass }) => !pass).length > selectedMisses,
  );
  return {
    modes: selected.modes,
    quality: selected.quality,
    decision: {
      strategy: "sampled cross-mode pair search",
      candidateCount: pairs.length,
      ranking: [
        "smallest worst-mode source distance",
        "smallest total source distance",
        "fewest structural review misses",
        "smallest quality miss",
      ],
      selected: compactPair(selected),
      alternatives: {
        nextRanked: compactPair(pairs[1]),
        sourceFidelity: compactPair(sourceFidelity),
        qualityRejected: compactPair(qualityRejected),
      },
    },
  };
}

function independentPaletteReview(input, modes, structuralQuality) {
  const source = candidate(input.hex);
  const sourceChecks = ["light", "dark"].map((mode) =>
    maximumQualityCheck({
      id: `review.${mode}.source-fidelity`,
      label: `${mode} action source distance`,
      value: distance(source, candidate(modes[mode].values.primary)),
      maximum: V2_POLICY.primary.maximumSourceDistance,
      unit: "ΔE",
    }),
  );
  const semanticChecks = ["light", "dark"].flatMap((mode) => {
    const values = modes[mode].values;
    const primary = candidate(values.primary);
    const destructive = candidate(values.destructive);
    const warning = candidate(values.warning);
    const hueCheck = (id, label, first, second) => {
      const chromatic =
        first.oklch.c >= V2_POLICY.semanticReview.chromaFloor &&
        second.oklch.c >= V2_POLICY.semanticReview.chromaFloor;
      return minimumQualityCheck({
        id,
        label,
        value: chromatic ? hueDistance(first.oklch.h, second.oklch.h) : 180,
        minimum: V2_POLICY.semanticReview.minimumHueSeparation,
        unit: chromatic ? "°" : "° · achromatic exemption",
      });
    };
    return [
      hueCheck(
        `review.${mode}.primary-destructive-hue`,
        `${mode} primary ↔ destructive hue`,
        primary,
        destructive,
      ),
      hueCheck(
        `review.${mode}.primary-warning-hue`,
        `${mode} primary ↔ warning hue`,
        primary,
        warning,
      ),
    ];
  });
  const checks = [
    ...structuralQuality.checks,
    ...sourceChecks,
    ...semanticChecks,
  ];
  return {
    ...structuralQuality,
    intent:
      "Independently review source fidelity, cross-mode identity, and state pacing after pair selection.",
    sourceChecks,
    semanticChecks,
    checks,
    passed: checks.every(({ pass }) => pass),
  };
}

function rangeQualityCheck({ id, label, value, range, unit = "" }) {
  const pass = value >= range[0] && value <= range[1];
  return {
    id,
    label,
    value,
    target: range,
    unit,
    pass,
    authority: "provisional",
  };
}

function maximumQualityCheck({ id, label, value, maximum, unit = "" }) {
  return {
    id,
    label,
    value,
    target: maximum,
    unit,
    pass: value <= maximum,
    authority: "provisional",
  };
}

function minimumQualityCheck({ id, label, value, minimum, unit = "" }) {
  return {
    id,
    label,
    value,
    target: minimum,
    unit,
    direction: "minimum",
    pass: value >= minimum,
    authority: "provisional",
  };
}

function stateProgression(modeResult, family = "primary") {
  const values = modeResult.values;
  const primary = candidate(values[family]);
  const hover = candidate(values[`${family} hover`]);
  const active = candidate(values[`${family} active`]);
  const defaultToHover = distance(primary, hover);
  const hoverToActive = distance(hover, active);
  const ratio = hoverToActive / defaultToHover;
  const direction =
    family === "primary"
      ? V2_POLICY.state.direction[modeResult.mode]
      : Math.sign(hover.oklch.l - primary.oklch.l);
  const monotonic =
    direction < 0
      ? primary.oklch.l > hover.oklch.l && hover.oklch.l > active.oklch.l
      : primary.oklch.l < hover.oklch.l && hover.oklch.l < active.oklch.l;
  const checks = [
    rangeQualityCheck({
      id: `${modeResult.mode}.${family}.state.interval-ratio`,
      label: `${family} hover → active interval balance`,
      value: ratio,
      range: V2_POLICY.state.progressionRatio,
      unit: "× hover interval",
    }),
    {
      id: `${modeResult.mode}.${family}.state.monotonic-lightness`,
      label: `${family} monotonic state direction`,
      value: monotonic ? 1 : 0,
      target: 1,
      unit: "ordered",
      pass: monotonic,
      authority: "product-policy",
    },
  ];
  return {
    mode: modeResult.mode,
    family,
    defaultToHover,
    hoverToActive,
    ratio,
    checks,
    passed: checks.every(({ pass }) => pass),
  };
}

function pairedQuality(modes) {
  const light = candidate(modes.light.values.primary);
  const dark = candidate(modes.dark.values.primary);
  const hueDrift = hueDistance(light.oklch.h, dark.oklch.h);
  const chromaDifference = Math.abs(light.oklch.c - dark.oklch.c);
  const lightnessGap = dark.oklch.l - light.oklch.l;
  const crossModeChecks = [
    maximumQualityCheck({
      id: "pair.primary-hue-drift",
      label: "Primary hue drift",
      value: hueDrift,
      maximum: V2_POLICY.crossMode.maximumHueDrift,
      unit: "°",
    }),
    maximumQualityCheck({
      id: "pair.primary-chroma-difference",
      label: "Primary chroma difference",
      value: chromaDifference,
      maximum: V2_POLICY.crossMode.maximumChromaDifference,
      unit: "ΔC",
    }),
    rangeQualityCheck({
      id: "pair.primary-lightness-gap",
      label: "Dark/light primary lightness gap",
      value: lightnessGap,
      range: V2_POLICY.crossMode.lightnessGap,
      unit: "ΔL",
    }),
  ];
  const states = {
    light: stateProgression(modes.light),
    dark: stateProgression(modes.dark),
  };
  const feedbackStates = Object.fromEntries(
    ["destructive", "warning"].map((family) => [
      family,
      {
        light: stateProgression(modes.light, family),
        dark: stateProgression(modes.dark, family),
      },
    ]),
  );
  const checks = [
    ...crossModeChecks,
    ...states.light.checks,
    ...states.dark.checks,
    ...Object.values(feedbackStates).flatMap((family) => [
      ...family.light.checks,
      ...family.dark.checks,
    ]),
  ];
  return {
    intent:
      "Review whether both modes preserve one brand identity and whether interaction states advance at a balanced pace.",
    authority: "provisional",
    crossMode: {
      hueDrift,
      chromaDifference,
      lightnessGap,
      checks: crossModeChecks,
    },
    states,
    feedbackStates,
    checks,
    passed: checks.every(({ pass }) => pass),
  };
}

function sourceUsageAlternatives(input, modes) {
  if (!Object.values(modes).some((mode) => mode.adaptations.largeBrandShift)) {
    return null;
  }
  const byMode = Object.fromEntries(
    Object.entries(modes).map(([mode, result]) => {
      const sourceText = chooseSharedText([input.hex]);
      const sourceLabelLc = Math.abs(apcaContrast(sourceText, input.hex));
      const outlineContrast = Math.min(
        contrastRatio(input.hex, result.values.background),
        contrastRatio(input.hex, result.values.surface),
      );
      return [
        mode,
        {
          background: result.values.background,
          foreground: result.values.foreground,
          filled: {
            color: result.values.primary,
            hover: result.values["primary hover"],
            active: result.values["primary active"],
            text: result.values["primary text"],
            safe: true,
            note: "Generated fill selected by the complete palette policy.",
          },
          outline: {
            color: input.hex,
            text: input.hex,
            contrast: outlineContrast,
            safe: outlineContrast >= V2_POLICY.primary.boundaryContrast,
            note:
              outlineContrast >= V2_POLICY.primary.boundaryContrast
                ? "Source color can identify an outline control on both foundations."
                : "Source color is too weak for a required outline on one foundation.",
          },
          brandFaithful: {
            color: input.hex,
            text: sourceText,
            border: result.values["primary border"],
            lc: sourceLabelLc,
            safe: sourceLabelLc >= V2_POLICY.primary.labelLc,
            note:
              sourceLabelLc >= V2_POLICY.primary.labelLc
                ? "Source fill supports the selected black-or-white label."
                : "Source fill does not support the current label target.",
          },
        },
      ];
    }),
  );
  return {
    intent:
      "Expose usage trade-offs when the generated primary moves far from the supplied brand color.",
    source: input.hex,
    modes: byMode,
    recommendation: {
      statefulAction: "Generated fill",
      sourceFaithfulAction: Object.values(byMode).every(
        ({ outline }) => outline.safe,
      )
        ? "Source outline"
        : Object.values(byMode).every(({ brandFaithful }) => brandFaithful.safe)
          ? "Source fill with generated boundary"
          : "No source-faithful action is safe in both modes",
      rationale:
        "Generated fill is the only option with a complete state family; source-faithful options are base-state alternatives.",
    },
  };
}

export function generatePaletteV2({ primary }) {
  if (typeof primary !== "string" || !isHex(primary)) {
    throw new TypeError("primary must be a six-digit hex color.");
  }
  const normalizedPrimary = normalizeHex(primary);
  const cacheKey = `${V2_POLICY.version}/${normalizedPrimary}`;
  const cached = paletteCache.get(cacheKey);
  if (cached) return cached;
  const rawInput = candidate(normalizedPrimary).oklch;
  const classification = classifyInput(rawInput);
  const inputColor = {
    ...rawInput,
    hex: normalizedPrimary,
    classification,
    brandChroma:
      classification === "achromatic"
        ? 0
        : Math.min(V2_POLICY.primary.chromaCap, rawInput.c),
  };
  const baselineModes = {
    light: modePalette(inputColor, "light"),
    dark: modePalette(inputColor, "dark"),
  };
  const pairSelection = selectModePair(inputColor, baselineModes);
  const { modes } = pairSelection;
  const quality = independentPaletteReview(
    inputColor,
    modes,
    pairSelection.quality,
  );
  const sourceAlternatives = sourceUsageAlternatives(inputColor, modes);
  const result = {
    version: 2,
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
    contrastModel: "APCA-W3 0.1.9 text + WCAG non-text",
    modes,
    quality,
    pairDecision: pairSelection.decision,
    sourceAlternatives,
    passed: Object.values(modes).every((mode) => mode.passed),
  };
  return boundedSet(paletteCache, cacheKey, result, 128);
}

export function serializeModeCss(modeResult) {
  const declarations = modeResult.tokens
    .map(
      ([color, role]) => `  --palette-${role.replaceAll(" ", "-")}: ${color};`,
    )
    .join("\n");
  return `[data-theme="${modeResult.mode}"] {\n${declarations}\n}`;
}
