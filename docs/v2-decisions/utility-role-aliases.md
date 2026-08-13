# Utility role alias decision

## Problem

Disabled and popover tokens name component duties, but a role name alone does
not prove that the palette needs another independently generated color. Adding
searches without a distinct visual contract would create more outputs while
inventing constraints the project cannot justify.

## Fixed decision

The current general-purpose palette keeps these semantic aliases:

| Role | Reuses | Why this is sufficient now |
| --- | --- | --- |
| `disabled background` | `muted surface` | Disabled treatment is completed by platform disabled semantics, blocked activation, and reduced emphasis. |
| `disabled text` | `muted text` | It communicates lower emphasis without claiming that color alone disables a control. |
| `disabled border` | `border` | A separate border color has no declared duty that the existing boundary cannot perform. |
| `popover` | `raised surface` | Both roles describe elevated content above the background; component elevation and geometry supply the remaining distinction. |
| `popover text` | `foreground` | Popover text has the same readability duty as ordinary foreground text on its declared surface. |

These are semantic aliases, not five additional calculated colors. The export
retains the distinct role names so a consumer can bind by meaning without the
engine pretending that distinct names require distinct values.

## Promotion triggers

An alias becomes an independent-search candidate only when a public,
reproducible component case demonstrates a duty that its source role cannot
meet. A proposal must provide all of the following:

- the component context and the surrounding palette role;
- the failure observable with the current alias;
- the required relation or constraint for the new role;
- a non-color cue where state or elevation cannot be conveyed by color alone;
- acceptance evidence across Light and Dark modes.

Examples of valid triggers include a popover that cannot maintain its required
boundary against every supported host surface, or a disabled control whose
documented component structure cannot achieve reduced emphasis while keeping
required text legibility. Preference for “more variation” is not a trigger.

## Deferred work

No independent search is added in this policy version. Consumer-specific
component variants, shadows, opacity systems, and interaction behavior remain
outside the palette generator. A future trigger starts a new versioned role
policy; it must not silently change the meaning of the current aliases.

## Acceptance checks

- `unit`: every declared alias exports the same value as its source role in both
  modes and retains alias provenance.
- `unit`: the utility-role registry declares disabled semantics, blocked
  activation, and reduced emphasis as non-color requirements.
- `exhaustive unit`: `popover text` meets the declared body-text APCA target on
  `popover` across the maintained 216-point RGB grid in both modes.
- `manual`: a future promotion proposal supplies a reproducible public specimen
  and names the missing duty before implementation begins.
