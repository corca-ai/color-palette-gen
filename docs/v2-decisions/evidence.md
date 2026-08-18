# Evidence and provenance

Color Lab separates rule/declaration authority from external source provenance.
Neither vocabulary measures importance, and aggregate verdict authority is a
third, separate concept described in [Ontology](ontology.md).

## Rule and declaration authority

Every executable decision rule and semantic declaration uses one value from the
closed vocabulary owned by `v2/lib/evidence-authority.js`.

| Authority | Meaning | Example |
| --- | --- | --- |
| `normative` | Published requirement used only in its actual scope | Required input boundary has `>= 3:1` adjacent contrast |
| `product-policy` | Deliberate selection rule owned by current v2 policy | Primary pair eligibility membership |
| `provisional` | Review or selection evidence with an unvalidated numeric boundary | Current cross-mode chroma-difference band |
| `technical` | Structural implementation truth rather than design validation | Exported state colors must be distinct |
| `heuristic` | Replaceable design approximation without empirical validation | Current interaction-state Oklab separation |
| `research-policy` | Explicit relation chosen for this research prototype | Active continues beyond hover in one direction |

Unknown authority values fail policy or semantic trace validation.

## External evidence source class

`policy.js` separately labels cited source material. Current source classes are:

| Source class | Meaning |
| --- | --- |
| `normative` | Published requirement cited in its real scope |
| `reference` | Observable precedent from a public design system |
| `heuristic` | Prototype rationale that does not supply normative or empirical authority |

Source class does not automatically determine a rule's authority. A public
reference may motivate a `product-policy` or `heuristic` rule without proving
its exact threshold.

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
