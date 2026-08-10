# v2 color decision justification model

## Goal

Every generated color must answer two different questions:

1. **Why did the engine choose this candidate instead of nearby candidates?**
2. **Why does the rule that selected it exist?**

Passing a contrast check answers neither question on its own. v2 must emit a
decision record that separates external requirements, design-system references,
project policy, and unvalidated hypotheses.

## Evidence classes

Every rule receives exactly one evidence class and may cite supporting sources.

| Class            | Meaning                                                         | May block a candidate?                           | Example                                                                  |
| ---------------- | --------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------ |
| `normative`      | Published accessibility requirement used in its actual scope    | Yes                                              | Required input boundary has `>= 3:1` adjacent contrast                   |
| `reference`      | Observable precedent from a public design system                | Only after becoming explicit project policy      | Carbon makes light values darker and dark values lighter for interaction |
| `product-policy` | Deliberate definition of this project's calm/minimal direction  | Yes                                              | Use one brand hue and very low-chroma neutral tint                       |
| `empirical`      | Result supported by a recorded experiment or evaluation dataset | Yes, within the tested population                | A threshold selected after designer rating data                          |
| `heuristic`      | Provisional value without external or empirical validation      | Yes, but must be visibly labeled and replaceable | Current `Delta E >= 0.035` state separation                              |

An implementation constant without this metadata is an undocumented decision and
must fail the decision-record test.

## Source scope

The initial model uses these public sources only within the scope they support:

- [WCAG 2.2 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast):
  required UI information and authored focus indicators need `3:1` contrast
  against adjacent colors. The document explicitly does **not** require hover
  color changes themselves to differ by `3:1`.
- [WCAG 2.2 Focus Appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance):
  provides a Level AAA reference for focus indicator area and `3:1` change of
  contrast. Adjacent contrast and change-of-contrast are separate checks.
- [Carbon interaction colors](https://preview.carbondesignsystem.com/building-blocks/foundations/color/overview):
  hover is a smaller palette step, active is a larger step; darker values move
  lighter and lighter values move darker. This supports ordering and direction,
  not v2's exact numeric distance.
- [Spectrum using color](https://spectrum.adobe.com/page/using-color/):
  default, hover, and down states advance through a theme-specific scale;
  interaction should increase contrast relative to its context. This supports a
  monotonic state scale and opaque theme tokens, not v2's exact scale.
- [Material 3 states](https://m3.material.io/foundations/interaction/states/overview):
  states need consistent indicators and may be combined. Material state-layer
  implementation is a precedent, not a requirement for opaque v2 palette tokens.
- [USWDS state tokens](https://designsystem.digital.gov/design-tokens/color/state-tokens/):
  semantic state colors come from a governed system scale rather than arbitrary
  component-local color functions.

No source above establishes that `Delta E 0.035`, chroma scale `0.82`, or neutral
tint `C 0.012` is perceptually optimal. Until an evaluation exists, those values
remain project heuristics.

## Decision specification

Each generated role is defined by a serializable `DecisionSpec`:

```js
{
  id: "dark.primary.hover",
  role: "primary hover",
  intent: "Show pointer presence with the smallest visible brand-state change.",
  dependsOn: ["input.primary", "dark.primary", "dark.primary.text"],
  preservedAxes: ["hue"],
  candidateSpace: {
    model: "OKLCH",
    axes: {
      l: { from: 0.58, to: 0.68, step: 0.0025 },
      c: { fromSource: "dark.primary", tolerance: 0.01 },
      h: { fromSource: "input.primary", tolerance: 1 }
    }
  },
  constraints: [
    "dark.primary.text.apca.compact",
    "dark.primary.hover.direction",
    "dark.primary.hover.separation",
    "srgb.output"
  ],
  objective: {
    type: "minimize",
    expression: "deltaE(candidate, dark.primary)",
    rationale: "Do not change more than the state needs."
  },
  tieBreak: ["smaller hue movement", "smaller chroma movement"]
}
```

The exact numeric candidate space is configuration, not hidden control flow.

## Constraint record

Every constraint has its own provenance:

```js
{
  id: "input.border.adjacent-contrast",
  metric: "WCAG contrast ratio",
  operator: ">=",
  threshold: 3,
  evidence: {
    class: "normative",
    source: "WCAG 2.2 SC 1.4.11",
    scope: "Border is required to identify the input control."
  }
}
```

A project hypothesis is equally explicit:

```js
{
  id: "primary.hover.separation",
  metric: "Oklab delta E",
  operator: ">=",
  threshold: 0.035,
  evidence: {
    class: "heuristic",
    source: null,
    scope: "Provisional lower bound for the v2 prototype.",
    validationNeeded: "Designer ranking study across representative hues."
  }
}
```

This prevents a project preference from being presented as an accessibility
standard.

## Candidate evaluation and selection trace

The engine must retain compact evidence for the selected candidate and its
closest alternatives. It does not need to serialize every search step.

```js
{
  decisionId: "dark.primary.hover",
  selected: {
    hex: "#6E89AA",
    oklch: { l: 0.62, c: 0.058, h: 253 },
    objectiveCost: 0.040,
    bindingConstraints: ["primary.hover.separation"],
    passed: ["apca.compact", "direction", "separation", "srgb.output"]
  },
  alternatives: {
    nearestRejected: {
      hex: "#6D87A7",
      reason: "Delta E 0.033 < heuristic threshold 0.035"
    },
    nextPassing: {
      hex: "#708BAC",
      reasonNotSelected: "Passes, but changes more: Delta E 0.045"
    }
  },
  summary:
    "Selected the nearest lighter in-gamut color that preserves hue, keeps label contrast, and reaches the provisional state-separation threshold."
}
```

This answers why the engine did not change less and why it did not change more.

## Role-specific selection strategies

### Primary default

- Start from the exact input color.
- Preserve hue unless sRGB mapping makes that impossible.
- Generate mode-appropriate lightness candidates around the source.
- Reject candidates that cannot support the shared state-family text color.
- Among passing candidates, minimize a documented weighted distance from the
  source; report lightness, chroma, and hue movement separately.
- Keep the exact input as a visible source candidate even when rejected.

### Hover and active

- Use an ordered state scale: default, hover, active.
- Light-context values search darker; dark-context values search lighter. This
  is a project policy supported by Carbon and Spectrum precedent, not a universal
  law.
- Hover selects the nearest candidate meeting the provisional separation bound.
- Active selects the nearest candidate beyond hover that meets a stronger bound.
- All states must retain readable shared foreground and remain in gamut.
- The bounds remain `heuristic` until perceptual evaluation replaces them.

### Neutral foundations

- Define calm/minimal as a product policy: one brand hue, neutral-dominant area,
  no supporting hue family, low neutral chroma, and monotonic surface hierarchy.
- Search a bounded low-chroma region instead of applying a fixed multiplier.
- Optimize for the smallest chroma that still carries a detectable family tint;
  until detectability is empirically measured, label its bound heuristic.
- Achromatic inputs prohibit invented hue tint.
- Surface hierarchy must record which roles intentionally alias the same color.

### Boundary and focus

- Decorative border may remain subtle if it does not carry required information.
- Input border is a required control indicator and uses the W3C `3:1` adjacent
  contrast requirement.
- Focus records both adjacent contrast and focus-state change. If the project
  adopts the WCAG AAA Focus Appearance target, record that choice explicitly
  rather than presenting it as an AA requirement.

### Destructive

- Start from the product's semantic red anchor.
- Test distance from the generated brand color.
- If the brand is near red, search lightness and then limited hue alternatives
  while preserving recognizably destructive semantics.
- Select the nearest candidate satisfying text contrast and the provisional
  brand/destructive separation policy.

## Explaining calm and minimal

The engine must not claim that statistics prove its aesthetic direction until a
dataset exists. The initial definition is a product policy:

- one user-provided hue;
- no generated harmony hues;
- neutral foundations occupy the majority of available roles;
- chroma is concentrated in brand action and destructive feedback;
- neutral tint is bounded and subordinate to surface lightness hierarchy;
- interaction changes lightness before hue;
- each role exists for a semantic need, not to add palette variety.

Future empirical work can replace provisional limits: prepare representative hue
and chroma inputs, render paired palettes, collect designer rankings for calmness,
state clarity, and cross-mode equivalence, then version the policy with the
dataset and decision method.

## Required engine output

v2 output includes these fields without changing its single-color input:

```js
{
  input: { primary: "#507096" },
  policyVersion: "v2-justification-1",
  tokens: [["#...", "primary"], ...],
  decisions: [DecisionTrace, ...],
  constraints: [ConstraintResult, ...],
  assumptions: [
    { id: "state.deltaE", evidenceClass: "heuristic", validationNeeded: true }
  ]
}
```

The UI should default to the concise summary. A designer can expand a role to see
the candidate axis, closest rejected candidate, selected candidate, next passing
candidate, binding constraint, provenance, and unresolved heuristic.

## Migration order

1. **Implemented:** move active search thresholds into versioned policy
   configuration with evidence metadata.
2. **Implemented:** add the decision trace schema and provenance tests.
3. **Implemented:** replace primary default fixed-lightness calculation with
   candidate search.
4. **Implemented:** replace hover and active fixed deltas with ordered
   minimum-change searches.
5. **Partial:** destructive uses candidate search; focus, boundary, neutral, and
   text roles expose policy anchors and still need multi-candidate migration.
6. **Implemented:** render per-role evidence and counterfactual candidates in
   the palette UI.
7. **Pending:** build a representative gallery and designer rating protocol; only then
   promote successful heuristic thresholds to `empirical`.

At every migration step, the old and new results should be compared across the
existing RGB grid. A decision is not complete merely because it passes visual or
accessibility constraints; it is complete when its selection and its rule
provenance are both inspectable.

## Current implementation status

Policy version `v2-justification-1` implements the shared evidence schema and
decision trace. Primary default, primary hover, primary active, and destructive
roles use real minimum-change candidate search. Their traces retain the selected
candidate, closest rejected candidate when one exists, and next passing
candidate.

All remaining roles already expose intent and evidence, but they are explicitly
reported as `policy anchor` decisions with one candidate. Neutral foundations,
text selection, and focus aliasing have not yet all migrated to multi-candidate
optimization. The UI must preserve this distinction; a policy anchor must never
be presented as if alternatives were searched.
