# Craken integration boundary

## Decision

Color Lab v2 remains a visually neutral palette-generation and inspection tool.
The applied specimen, not the entire tool, follows the public Craken Design
Atlas structure.

Applying generated colors to the whole v2 page would change the measurement
frame whenever the input changes. It would also mix authoring controls with the
product surface being validated. A fixed neutral tool around a Craken-specific
specimen keeps those responsibilities separate.

## Public reference

The [Craken Design Atlas](https://craken.borca.ai/design) exposes production
surfaces and states side by side. Its coverage includes Foundation, Navigation,
Messages, Composer, Files & Wiki, Jobs, and inspectors. Its component specimens
show normal, forced hover, active, focus, disabled, and busy states in one scan.

The v2 specimen adopts the parts that directly exercise this palette:

- foundation hierarchy: background, card/surface, muted surface, borders, text;
- navigation: selected row, unread badge, secondary action;
- messages: primary and secondary text, avatars, status badge;
- composer: input boundary, focus ring, primary action;
- component states: primary and destructive normal, hover, active, focus, and
  disabled;
- feedback: warning and destructive action separated from brand action;
- utility: selected content and popover elevation.

It is an independently written compatibility specimen, not copied Craken source
or a runtime dependency on the Craken application.

## Token correspondence

Current v2 names map to the Craken semantic model as follows:

| v2 role                         | Exported Craken token                    |
| ------------------------------- | ---------------------------------------- |
| `background` / `foreground`     | `color.canvas` / `color.text`            |
| `surface` / `raised surface`    | `color.surface` / `color.surface.raised` |
| `muted surface` / `muted text`  | `color.surface.muted` / `color.text.muted` |
| `border` / `input border`       | `color.border.subtle` / `.input`         |
| `primary` / hover / active      | `color.action.primary[.state]`           |
| `primary text` / `focus ring`   | `color.action.primary.text` / `color.focus.ring` |
| `destructive` / hover / active  | `color.action.destructive[.state]`       |
| `warning` / hover / active      | `color.feedback.warning[.state]`         |
| `selection` / text              | `color.selection[.text]`                 |
| disabled background/text/border | `color.control.disabled.*`               |
| `popover` / text                | `color.overlay.popover[.text]`           |

The page exports this mapping as versioned `craken-color-tokens-1` JSON. Disabled
and popover names are distinct consumer tokens but currently document aliases to
foundation colors. Accent and secondary remain intentionally unsupported until
a concrete Craken component requires an independent visual role.
