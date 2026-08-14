# Evidence and provenance

Every rule receives one provenance class. The class describes what can honestly
be claimed about the rule; it does not measure how important the rule is.

| Class            | Meaning                                                        | Example                                                   |
| ---------------- | -------------------------------------------------------------- | --------------------------------------------------------- |
| `normative`      | Published accessibility requirement used in its actual scope   | Required input boundary has `>= 3:1` adjacent contrast    |
| `reference`      | Observable precedent from a public design system               | Carbon uses a smaller hover step and stronger active step |
| `product-policy` | Deliberate definition chosen for Color Lab v2                  | One brand hue and neutral-dominant foundations            |
| `empirical`      | Supported by a documented experiment or external dataset       | A threshold calibrated from a published study             |
| `heuristic`      | Provisional and replaceable value without empirical validation | Current interaction-state Delta E threshold               |

## External sources and their limits

- [WCAG 2.2 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast)
  supports `3:1` adjacent contrast for required UI information. It does not say
  that hover colors must differ from default colors by `3:1`.
- [WCAG 2.2 Focus Appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance)
  separates focus-indicator adjacent contrast from change-of-contrast and area.
- [Carbon interaction colors](https://preview.carbondesignsystem.com/building-blocks/foundations/color/overview)
  supports a subtle hover step, stronger active step, and context-dependent
  lightness direction. It does not establish v2's exact distance.
- [Spectrum using color](https://spectrum.adobe.com/page/using-color/) supports
  a monotonic default, hover, and down scale. It does not establish v2's exact
  scale.
- [Material 3 states](https://m3.material.io/foundations/interaction/states/overview)
  is a precedent for consistent, combinable state indicators, not a requirement
  to use state layers in v2.
- [USWDS state tokens](https://designsystem.digital.gov/design-tokens/color/state-tokens/)
  supports deriving semantic states from a governed scale rather than arbitrary
  component-local functions.

No source above proves that `Delta E 0.035`, chroma scale `0.82`, or neutral tint
`C 0.012` is optimal. These remain heuristics until a documented evaluation
replaces them.
