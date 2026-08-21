# Mode-relative tonal offset sweep

> Superseded as the live calibration order by the
> [Destructive-first grammar calibration](./destructive-grammar-calibration.md).
> This document remains as bounded evidence that coupled Primary/Destructive
> movement conflicts early with the current pair relation.

## Question

How far can the current v15 filled buttons move toward their mode surfaces
before existing generated contracts or review rules disagree?

The diagnostic uses one value, `δ`:

- Light Primary and Destructive defaults target `current L + δ`.
- Dark Primary and Destructive defaults target `current L − δ`.
- Existing foreground choice, hover/active direction and spacing, candidate
  chroma/hue construction, APCA constraints, Oklab separation, and semantic
  roles remain unchanged.

The target-aware diagnostic rank exists only to make the requested movement
visible. It does not silently preserve pair eligibility by choosing a color in
the opposite direction. Every existing failed review remains in the result.

## First technical boundary

On the fixed 216-input RGB grid:

|     δ | Complete generation | Generated mode contracts | `pair.primary-lightness-gap` failures |
| ----: | ------------------: | -----------------------: | ------------------------------------: |
| 0.005 |             216/216 |                  216/216 |                                    16 |
| 0.010 |             216/216 |                  216/216 |                                    23 |

The first nonzero UI step therefore already disagrees with the current paired
quality rule for some inputs. That happens because v15 expects Dark Primary to
remain at least `L 0.04` lighter than Light Primary; moving both modes toward
each other consumes twice the offset from that gap.

This is not a claim that `δ 0.005` is visually bad or unsafe. Generated mode
contracts still pass. It means there is no meaningful globally rule-preserving
offset under the current cross-mode relation. The local slider intentionally
continues through `0.08` so a designer can judge appearance while reading the
result's exact failed checks.

## How to inspect

Open the v2 generator, choose **Preview · Tonal offset**, and move the slider.
`δ 0` reproduces current selected colors. The preview disables CSS/reference
export and does not mutate the production cache or v15 policy.

## Non-claims

The sweep does not identify an optimal value, validate aesthetic preference,
or recommend weakening the pair rule. A production change requires a reviewed
choice of visual offset and a separate disposition of the current
surface-relative/cross-mode relationship.
