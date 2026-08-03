# Public design basis

This prototype is implemented from public color standards and openly licensed
references. The goal of this document is to make the origin of each design
decision inspectable without relying on private implementations.

## Normative and scientific references

- [CSS Color Module Level 4](https://www.w3.org/TR/css-color-4/) defines Oklab,
  OKLCH, color conversion behavior, and the web color spaces used by the
  engine.
- [WCAG 2.2: Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
  is the basis for declared text contrast checks. A passing calculated pair is
  evidence about that pair, not a complete accessibility certification.
- [Design Tokens Format Module 2025.10](https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/)
  informs the separation between a human-readable token name, its value, type,
  description, and tool-specific extension metadata.

## Open implementations used as design references

- [Itten](https://github.com/corca-ai/itten) demonstrates visual constraint
  inspection and relationships between generated colors. It is MIT licensed.
- [Evil Martians OKLCH Picker](https://github.com/evilmartians/oklch-picker)
  demonstrates designer-facing OKLCH and gamut visualization. It is MIT
  licensed.
- [Material Color Utilities](https://github.com/material-foundation/material-color-utilities)
  demonstrates role-aware tonal palettes, contrast preferences, and dynamic
  light/dark schemes. It uses HCT rather than this project's OKLCH engine and is
  Apache-2.0 licensed.

The current implementation does not copy Material Color Utilities or OKLCH
Picker source code. If source code is incorporated later, its original license
and notices must be retained.

## Local design decisions

The prototype deliberately keeps its existing 17 semantic functions. It does
not adopt another project's complete token taxonomy or numeric recipe table.

Each generated token records:

1. a named source;
2. ordered transformation and validation operations;
3. the candidate OKLCH value;
4. any sRGB gamut mapping;
5. the exported hexadecimal value;
6. measurable constraints and warnings.

Interaction-state checks use two complementary views:

- axis movement (`ΔL`, `ΔC`, and shortest signed `ΔH`) explains what changed;
- Euclidean distance in Oklab (`ΔE`) summarizes total perceptual movement.

The pass target remains the vibe's declared lightness step. `ΔE` is reported as
diagnostic evidence and is not presented as a universal accessibility
threshold. Any future threshold must be justified with a public source or
documented user testing.

## Independence rules

- Do not reproduce a private token list, formula table, pipeline order, UI
  copy, asset, or numeric threshold set.
- Prefer standards and openly licensed primary sources in design notes and code
  comments.
- Choose project-specific parameters through explicit constraints and tests.
- Record third-party code in a notice file before incorporating it.
- Keep automated checks narrowly worded: they report what was calculated, not
  blanket WCAG or production compliance.
