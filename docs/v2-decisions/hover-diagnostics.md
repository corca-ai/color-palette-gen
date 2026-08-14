# Hover risk diagnostics

## Problem

Direct interaction remains the strongest evidence that a hover change is
noticeable. It is still useful to identify likely failures before a person
reviews every palette. One metric cannot honestly own that decision: color
difference, surrounding contrast, gamut mapping, spatial size, adaptation, and
the temporal presentation all affect perception.

## Capability contract

The generator reports independent post-export signals for Primary default,
hover, and active colors in Light and Dark:

- Oklab Euclidean Delta E for continuity with the existing provisional state
  policy;
- CIEDE2000 as a second color-difference model with corrections for known CIELAB
  non-uniformity;
- WCAG relative-luminance contrast against both `surface` and `background`, plus
  the signed change between states;
- final 8-bit sRGB duplicate detection;
- reversal of the surface-contrast trajectory.

The output uses `authority: diagnostic`. A duplicate export or trajectory
reversal receives `high` review priority. Otherwise priority remains
`unclassified`: the project does not invent a universal threshold and does not
call the palette low risk merely because structural failures are absent.

## Interpretation boundary

- APCA continues to evaluate the actual label/fill readability relationship. It
  is not used as a temporal hover-distance formula.
- WCAG 2.2 non-text contrast protects visual information required to identify a
  component or state. W3C's explanatory material says an additional authored
  hover treatment is supplemental and does not itself receive a universal 3:1
  requirement. Its contrast values are therefore context diagnostics here, not
  hover conformance tests.
- CIEDE2000 predicts small color differences under defined colorimetric viewing
  assumptions. It is a useful countercheck, not proof that a changing UI control
  will be noticed.
- No diagnostic result changes generated colors or `result.passed`. The runtime
  does not claim or record perceived hover discoverability.

## Sources

- [ISO/CIE 11664-6:2014, CIEDE2000 colour-difference formula](https://www.cie.co.at/publications/colorimetry-part-6-ciede2000-colour-difference-formula-1)
- [CIE validity study for small colour-difference formulae](https://www.cie.co.at/publications/validity-formulae-predicting-small-colour-differences)
- [W3C Understanding SC 1.4.11: Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast)
- [APCA rationale and use-case limits](https://github.com/Myndex/SAPC-APCA/blob/master/documentation/WhyAPCA.md)
- [Sharma, Wu, and Dalal CIEDE2000 implementation notes and test data](https://hajim.rochester.edu/ece/sites/gsharma/ciede2000/)

All sources are public. They support the metric definitions and limitations;
none supplies a universal default-to-hover threshold.

## Fixed decisions

- Metrics are calculated from final exported sRGB colors.
- Signals remain separate instead of becoming an opaque weighted score.
- Missing calibration must remain visible as `unclassified`.
- Human evidence and deterministic generator output remain separate.

## Deferred decisions

- color-vision-deficiency simulation and a weakest-simulation signal;
- component size, duration, motion, display, and ambient-adaptation modeling.

## Representative inspection shortlist

When the representative gallery opens, the UI compares all 14 precomputed
inputs and recommends at most five for direct inspection. The shortlist is the union
of named extremes: the smallest Oklab Delta E, smallest CIEDE2000, and smallest
absolute surface-contrast change in each mode, plus the largest Light/Dark
CIEDE2000 disagreement. Duplicate selections accumulate reasons. When more than
five inputs are selected, inputs covering more reasons come first and the UI
names any extreme omitted by the cap. If the union contains fewer than three
inputs, the next-smallest cross-mode CIEDE2000 cases fill the shortlist.

This prioritizes inputs that carry more named extremes before applying the cap;
it does not optimize total coverage and is not a weighted risk score. Every row
remains visible, each recommendation states its reason, and no threshold or
human verdict is inferred from the ranking.

Each diagnostic card renders its Light and Dark generated values as real
buttons. Pointer hover, press, and keyboard focus exercise the same state tokens
being inspected. No score, note, judgment, or observation is recorded. The
comparison table remains supporting evidence rather than a substitute for
interaction, and neither surface establishes perceived discoverability.

## Acceptance checks

- `unit`: published CIEDE2000 reference pairs match the implementation.
- `unit`: both modes expose both color-difference metrics and context trajectories.
- `unit`: duplicate exports and surface reversals produce structural flags.
- `e2e`: the UI identifies the card as diagnostic and makes no human verdict.
- `unit`: representative recommendations are deterministic, bounded, and carry
  named reasons without a synthetic score.
- `e2e`: a representative button changes its computed fill for hover and press,
  and exposes its focus state under keyboard navigation.
- `e2e`: the lazy gallery renders the comparison and five-input shortlist.
