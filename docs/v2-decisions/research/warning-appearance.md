# Light Warning appearance diagnostic

> Status: **Completed diagnostic with accepted disposition.** The experiment ran
> against production v18; [ADR-0007](../adr/0007-light-warning-vivid-amber.md)
> promotes the higher-lightness amber to production v19.

## Historical v18 diagnostic contract

- **Problem:** Light Warning converges on a mustard-like resting color and feels
  muddy across representative Primary inputs.
- **Correct behavior:** show a small set of complete, contract-checked Warning
  families that isolate lightness and hue so a human can judge the resting
  state first and then inspect Hover/Pressed.
- **Fixed experiment inputs:** production was `v2-policy-model-18`; Primary,
  Destructive, Foundation, pair selection, and Dark mode are frozen inputs to
  this diagnostic; no arm is automatically promoted.
- **Acceptance:** the then-current v18 arm plus three factorized arms render as
  live Light-mode specimens; each exposes actual rendered OKLCH, label contrast,
  semantic distances, and complete state colors; unsupported recipes fail closed.
- **Disposition:** accept higher-lightness amber; reject orangeward and
  yellowward; keep Dark unchanged.

### Retired diagnostic claims

- The four-arm lightness/chroma set is no longer the active review UI.
- A higher requested C is no longer treated as evidence of a more chromatic
  rendered Warning.
- At the diagnostic stage no production rule changed. ADR-0007 subsequently
  retires only the v18 Light Warning recipe and keeps Dark unchanged.

## Smallest reproduction and root cause

For `#507096`, `#FF0000`, `#00A86B`, `#6C3FD1`, `#00AACC`, and `#777777`, the
v18 production Light Warning was the same `#B48700` (`L 0.6493`, `C 0.1331`, hue
`84.88°`) with black label contrast `6.41:1`. Every case has 123 default
candidates passing current label and semantic-separation constraints. The
inventory reaches approximately `L 0.72`, so neither WCAG label contrast nor
candidate exhaustion forces the selected mustard color.

The immediate cause is the provisional `feedback.semantic-anchor` objective:
it ranks passing candidates by distance from requested `L 0.65`, `C 0.14`, hue
`85°`. The production selection is therefore behaving as specified; the
missing surface was a way to judge whether that arbitrary anchor still serves
the intended visual character.

## First comparison and human disposition

The first comparison isolated Light preferred L `0.65 → 0.70`, requested C
`0.14 → 0.18`, and their combination. Human review found the combined arm least
bad, but all four arms still muddy. That disposition retires the first four-arm
UI as an active review set; the measured result remains evidence below.

All arms keep the `[70°, 85°, 100°]` hue inventory, Light range `[0.52, 0.72]`,
current constraints, state-distance rules, and black/white text search. Requested
chroma is not claimed as realized chroma after gamut mapping.

## First four-arm six-input result

All six representative inputs in that first comparison converged to one rendered
family per arm; none exhausts and every family keeps at least `4.5:1` label
contrast and `0.08` distance from both frozen semantic siblings.

| Arm                    | Default   | Rendered L / C / hue  | Weakest family label contrast |
| ---------------------- | --------- | --------------------- | ----------------------------- |
| v18 Production         | `#B48700` | `.649 / .133 / 84.9°` | `6.41:1`                      |
| Brighter               | `#C69612` | `.700 / .140 / 84.9°` | `7.77:1`                      |
| More chroma            | `#B48700` | `.649 / .133 / 84.9°` | `6.41:1`                      |
| Brighter + more chroma | `#C79600` | `.701 / .144 / 85.1°` | `7.79:1`                      |

The chroma-only request renders exactly the current family. At the current
lightness and hue, requesting `C 0.18` does not produce more rendered chroma;
gamut mapping reduces it to the same sRGB result. Raising L is the only isolated
arm here that visibly moves the result. A follow-up sweep also confirmed that
requests from `C 0.18` through `C 0.24` converge to the same rendered color at a
fixed L/hue. More requested chroma is therefore not a viable next control.

## Second comparison: brightness and hue

The second review kept the v18 production baseline and the first comparison's
least-bad arm, then moves only axes that produced different rendered colors.
All diagnostic arms request `C 0.18`; the page displays requested C beside
rendered C so gamut clipping is visible rather than implied.

| Arm                | Requested anchor         | Rendered Default |
| ------------------ | ------------------------ | ---------------- |
| v18 Production     | then-current policy      | `#B48700`        |
| Previous least-bad | `L .70 · C .18 · h 85°`  | `#C79600`        |
| Higher lightness   | `L .78 · C .18 · h 85°`  | `#E6AD00`        |
| Orangeward         | `L .78 · C .18 · h 70°`  | `#FBA100`        |
| Yellowward         | `L .78 · C .18 · h 100°` | `#D0B800`        |

The second comparison widened only the diagnostic Light range to `[.52, .82]`
and uses one hue candidate per arm. This prevents the ranking objective from
silently choosing a different hue than the arm being judged. Production keeps
its original range and three-hue inventory during review.

## Final disposition and production migration

The operator selected Higher lightness and rejected Orangeward and Yellowward.
Production v19 therefore adopts Light preferred `L .78`, requested `C .18`, and
range `[.52,.82]` while retaining the existing `[70°,85°,100°]` inventory. A
fixed 216-input scan generated every Light family with no exhaustion; the
retained inventory and a fixed-`85°` inventory selected the same `#E6AD00` in all
216 cases. Minimum family label contrast was `10.34:1`, minimum Primary distance
`.244`, and minimum Destructive distance `.294`.

The live review surface now shows current production v20 first and identifies
its appearance recipe as the one accepted in v19. It is followed by four historical cards:
superseded v18, the previous least-bad arm, Orangeward, and Yellowward.
The six-input page is a decision record, not the original four-arm diagnostic.
The v19 decision kept Dark numeric values identical to the v18
appearance recipe because this comparison did not present or disposition Dark.

The fixed-grid evidence is executable as
`npm run test:warning-policy-migration`; it also pins the 216-input Dark-family
baseline rather than relying on this prose as regression evidence.

## Judgment order

1. Compare Default colors without hovering.
2. Reject an arm if its semantic role no longer reads as Warning.
3. Hover and press only after choosing plausible defaults.
4. Use metrics to explain the colors, not to replace the visual disposition.

The live review surface is `/warning-review.html`.

## Nonclaims

- More L or C is not automatically more beautiful.
- Passing contrast and semantic distance do not prove Warning recognition.
- Six representative inputs do not establish population frequency.
- The human disposition authorizes only the Light recipe recorded in ADR-0007.
