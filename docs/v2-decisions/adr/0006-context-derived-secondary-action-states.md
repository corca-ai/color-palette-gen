# ADR-0006: Context-derived Secondary action states

- Status: **Accepted**
- Date: 2026-08-21
- Primary migration kind: presentation/context
- Coupled migration kind: generation/eligibility for Focus adjacency
- Production identity: result schema `3`, policy `v2-policy-model-18`, semantic model `v2-declarative-design@5`
- Presentation authority: `single-filled-action-hierarchy-v2`
- Secondary-state authority: `confirmation-secondary-state-family-v1`

## Before and after law

- **Before:** destructive-confirmation Cancel mapped `transparent → Surface → Raised Surface`; its direction and label contrast were not a selected presentation contract, while Focus was generated only against Background and Surface.
- **After:** Cancel derives an opaque Default/Hover/Active family from its actual Muted Surface context, Light moves darker and Dark moves lighter, every state keeps its actual action label at WCAG `4.5:1`, and Focus must reach `3:1` on Background, Surface, and Muted Surface.

## Retired claims

- Foundation aliases alone do not complete an interactive Secondary state family.
- `transparent → Surface → Raised Surface` is no longer the Confirmation Cancel state recipe.
- A visibility-only browser test is not sufficient proof of the two confirmation buttons' interaction grammar.
- Focus contrast on Background and Surface is not enough when the public specimen also places the same Focus Ring on Muted Surface.

## Context and problem

The accepted hierarchy intentionally gives the destructive confirmation one filled
Destructive action and one lower-emphasis Cancel. That difference in emphasis did
not imply opposite interaction directions. The old CSS happened to make Light
Cancel brighter while the adjacent Destructive button became darker; Dark Cancel
also followed a non-monotonic Foundation-role sequence instead of the mode-relative
action grammar.

The Cancel label is what identifies this text button. WCAG 2.2 Non-text Contrast
does not require a decorative border on a labeled button to reach `3:1`; the label
still follows WCAG Contrast Minimum. Therefore a forced high-contrast border would
add emphasis without serving the accessibility claim this change needs.

The same context scan found a separate producer/consumer mismatch: the
confirmation footer is Muted Surface, but Focus candidate eligibility and final
checks named only Background and Surface. In the fixed 216-input grid, 14 Dark
Focus colors fell below `3:1` on the actual Muted Surface, with a minimum near
`2.82:1`.

## Decision

### Secondary Cancel

`confirmation-secondary-state-family-v1` is a context-derived presentation
family, not a new exported palette role.

1. Default is the actual Muted Surface rendered as an opaque color.
2. Light candidates reduce OKLCH lightness; Dark candidates increase it.
3. Hover must be at least Oklab `ΔE 0.015` from Default; Active must be at least
   `ΔE 0.030` from Default and continue beyond Hover.
4. Candidate requests start at each minimum and advance by `0.005` to a maximum
   lightness shift of `0.08`.
5. Every final gamut-mapped, 8-bit sRGB fill must preserve the Foundation
   Foreground at WCAG `4.5:1` using the actual `11px/650` normal-text action-label
   context. The smallest passing actual `ΔE` wins; hex order is the final tie-break.
6. Border remains the decorative Border token. It does not claim `3:1` because
   the visible text label identifies the button.

The `0.015`, `0.030`, `0.005`, and `0.08` values are provisional product recipe
values, not external standards or perceptual calibration. They intentionally make
the Secondary response smaller than the filled-action `0.035/0.075` targets while
retaining ordered feedback. The fixed 216-input feasibility scan produced all
`432` mode families with no text-contrast exhaustion; its weakest state-label
contrast was above `12.82:1`. These counts establish bounded feasibility, not
aesthetic preference.

### Focus adjacency

The existing Focus search remains the sole Focus Ring producer. Its
`focus.adjacent-contrast` constraint and final mode checks now include Muted
Surface alongside Background and Surface. The unchanged bounded inventory found a
passing candidate for every fixed input. Exactly 14 Dark Focus selections changed;
Light selections did not change in that census.

Because a mode bundle includes its selected Focus value, those changes also alter
full-bundle deduplication and can change which otherwise-valid Primary candidate is
selected later. The v18 diagnostic refresh therefore records `115` large-shift
inputs / `177` mode occurrences and `215` dropped duplicate pair samples for the
current arm, rather than carrying forward v16-era counts. Contract failures remain
zero. This is a deterministic downstream consequence, not evidence that the new
counts are perceptually better.

## Role × Mode × Context × State review

| Role / family       | Mode       | Context                                   | States                    | Owner and disposition                                                                   |
| ------------------- | ---------- | ----------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------- |
| Secondary Cancel    | Light      | destructive confirmation on Muted Surface | Default/Hover/Active      | presentation family; darker, WCAG label checked                                         |
| Secondary Cancel    | Dark       | destructive confirmation on Muted Surface | Default/Hover/Active      | presentation family; lighter, WCAG label checked                                        |
| Destructive         | Light/Dark | destructive confirmation                  | Default/Hover/Active/Text | generated family unchanged; supplies the high-emphasis sibling                          |
| Focus Ring          | Light/Dark | Background/Surface/Muted Surface          | Focus                     | palette producer; all three adjacent contexts now eligible and checked                  |
| Destructive outline | Light/Dark | routine coexistence                       | Hover/Active              | separate lower-emphasis outline grammar; unchanged                                      |
| Generic Secondary   | Light/Dark | form/workspace                            | context-specific          | not generalized by this decision; those contexts do not consume the confirmation recipe |
| Popover action      | Light/Dark | Raised Surface                            | context-specific          | unchanged; distinct consumer context                                                    |

## Deliberately not doing

- Do not export `secondary default/hover/active` as context-free palette tokens.
- Do not apply the Muted Surface recipe to every button called Secondary.
- Do not force the decorative Cancel border to `3:1` merely because Input Border
  and Focus Ring carry that requirement in different contexts.
- Do not claim that `ΔE 0.015/0.030` is the aesthetically optimal response; the
  live Light/Dark specimen remains the human review surface.

## Acceptance

- In both modes, Cancel and Move to Trash move in the same lightness direction.
- Cancel Default/Hover/Active are distinct and monotonic after final rendering.
- Cancel text reaches WCAG `4.5:1` in every state and renders at the declared
  action-label typography.
- Focus reaches `3:1` on Background, Surface, and Muted Surface.
- The fixed 216-input grid completes both changes without candidate exhaustion.
- Palette exports gain no context-specific Secondary token.

## Nonclaims

- Matching direction does not require matching hue, fill, or movement amplitude.
- Passing text and Focus contrast is not accessibility certification.
- The fixed corpus does not represent all colors or establish visual preference.
