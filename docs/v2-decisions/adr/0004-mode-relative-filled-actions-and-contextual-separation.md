# ADR-0004: Mode-relative filled actions and contextual separation

- Status: **Accepted**
- Date: 2026-08-20
- Production authority: `v2-policy-model-16`
- Presentation authority retained: `single-filled-action-hierarchy-v1`
- Supersedes the production interaction rule in policy v15

> This ADR records the presentation authority that existed at adoption time.
> ADR-0006 retains the hierarchy and advances its current executable identifier
> to `single-filled-action-hierarchy-v2`.

## Context

Policy v15 made Primary and Destructive hover/active states progressively darker
in both Light and Dark. It also rejected Destructive defaults whose Oklab
distance from Primary was below `0.08`. That combination made the Dark interaction
grammar visually inconsistent with the operator's intended theme behavior and
made role separation a generation prerequisite even though the accepted
component hierarchy normally presents only one filled action per action group.

The diagnostic candidate instead used one hue-independent mode rule:

- Light: `default > hover > active` in measured OKLCH lightness;
- Dark: `default < hover < active`;
- Primary and Destructive share one black-or-white foreground per mode;
- Destructive default/state feasibility is completed transactionally;
- `destructive.brand-separation` remains measured, but no longer rejects a
  generated candidate.

## Human decision

The project operator reviewed the exact warning cohorts as real interactive Dark
buttons on `/contextual-review.html`: 22 inputs whose Primary–Destructive
separation review becomes false and 9 inputs with new Dark source-fidelity
findings. Light was shown only for the five inputs with a new Light separation
finding. The operator's recorded disposition was that the adopted/right result
was sufficiently distinguishable and selected it for application.

This is one bounded whole-queue visual disposition. It is not a population
preference study and it does not convert any automated finding to pass.

## Decision

1. Primary and Destructive use the universal mode-relative state grammar:
   Light gets darker; Dark gets lighter. Source hue does not select direction.
2. One foreground polarity is selected per mode and used by both complete
   Primary and Destructive families.
3. Dark Destructive default and states are selected as one complete family so
   the shared foreground and lighter direction are feasibility conditions, not
   post-selection decoration.
4. `destructive.brand-separation` moves from generation eligibility to
   `selected-result-review`. The stable ID, threshold, value, and false verdict
   remain public evidence.
5. Primary and Destructive remain distinct semantic roles and token families.
   This ADR does not alias their values or erase their role identity.
6. `single-filled-action-hierarchy-v1` remains the component presentation rule:
   one filled action per action group; another action uses lower emphasis.

## Executable evidence

The fixed diagnostic grid contains 216 RGB inputs. The adopted arm generated
216/216 complete palettes with no generation infeasibility, no generated-contract
regression, and no pair-eligibility regression. The comparison identities were:

- previous v15 result digest:
  `d46e901f997952b8e2089aa5c3d49f5844aaf800cb134423ea61f234de624c0c`;
- adopted candidate result digest:
  `8b065e6c06dd7e415fbfcc7749748fcfac3192cec4b0b86a105323cc29ccbd9a`;
- reviewed case-set digest:
  `34de7388af589a1b19e45695f4cbab747ac443126b6d6d78bd454785dfb19fe0`.

The selected-result review intentionally remains false for these 22 separation
inputs:

`#660000`, `#990000`, `#990033`, `#993300`, `#993333`, `#CC0000`,
`#CC0033`, `#CC3300`, `#CC3333`, `#CC6633`, `#CC6666`, `#FF0000`,
`#FF0033`, `#FF0066`, `#FF3300`, `#FF3333`, `#FF3366`, `#FF6600`,
`#FF6633`, `#FF6666`, `#FF9966`, `#FF9999`.

The adopted arm also retains nine new Dark source-fidelity findings:

`#00CCFF`, `#33CCCC`, `#33CCFF`, `#66CC99`, `#66CCCC`, `#99CC00`,
`#99CC33`, `#99CC66`, `#99CC99`.

## Consequences

- Interaction direction is predictable by mode instead of source hue.
- Default Destructive selection has a wider obligation: it must admit a complete
  state family under the mode foreground and direction.
- A result may satisfy generation contracts while its selected-result review
  reports Primary–Destructive proximity or source-fidelity findings. Consumers
  must not collapse those verdict scopes into one overall quality boolean.
- The engine still generates both semantic role families because the palette
  cannot know presentation context. The component layer owns which action is
  filled.

## Nonclaims

- Light-darker/Dark-lighter is a product interaction decision, not a WCAG or
  APCA requirement and not a universal design-system rule.
- Oklab `0.08` is still a provisional heuristic, not an empirically validated
  perceptual boundary.
- The 216-input grid proves deterministic bounded coverage, not all possible
  colors or population preference.
- Human acceptance of the warning cohort does not make its review verdicts true.

## Revisit triggers

Reopen this decision if a supported input cannot build a complete family, if a
consumer requires Primary and Destructive to coexist as filled actions, or if
perceptual evidence materially contradicts the retained separation/source
findings.
