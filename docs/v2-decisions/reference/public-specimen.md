# Public applied specimen boundary

## Decision

Color Lab v2 remains a visually neutral palette-generation and inspection tool.
The applied specimen is a project-owned interface example that exercises the
generated semantic roles together.

Applying generated colors to the whole authoring page would change the
measurement frame whenever the input changes. It would also mix authoring
controls with the interface surface being inspected. A fixed neutral tool around
an applied specimen keeps those responsibilities separate.

## Applied specimen coverage

The specimen covers the contexts needed to inspect this palette as a coherent
system:

- foundation hierarchy: background, card/surface, muted surface, borders, text;
- navigation: selected row, unread badge, secondary action;
- messages: primary and secondary text, avatars, status badge;
- composer: input boundary, focus ring, primary action;
- component states: interactive primary and destructive actions with hover,
  active, focus, and local completion feedback;
- feedback: warning and destructive action separated from brand action;
- utility: selected content and popover elevation.

This is a project-owned Color Lab example. It demonstrates how the generated
roles work together without certifying deployment or application-level behavior.

## Generic example token correspondence

Current v2 names map to the public example namespace as follows:

| v2 role                         | Exported example token                     |
| ------------------------------- | ------------------------------------------ |
| `background` / `foreground`     | `color.canvas` / `color.text`              |
| `surface` / `raised surface`    | `color.surface` / `color.surface.raised`   |
| `muted surface` / `muted text`  | `color.surface.muted` / `color.text.muted` |
| `border` / `input border`       | `color.border.subtle` / `.input`           |
| `brand source`                  | `color.brand.source`                       |
| `primary` / hover / active      | `color.action.primary[.state]`             |
| primary text / border           | `color.action.primary.text` / `.border`    |
| `focus ring`                    | `color.focus.ring`                         |
| `destructive` / hover / active  | `color.action.destructive[.state]`         |
| `warning` / hover / active      | `color.feedback.warning[.state]`           |
| `selection` / text              | `color.selection[.text]`                   |
| disabled background/text/border | `color.control.disabled.*`                 |
| `popover` / text                | `color.overlay.popover[.text]`             |

The page exports this mapping as versioned `color-lab-reference-tokens-1` JSON.
The schema and token namespace are general-purpose inspection artifacts.
Disabled and popover names are distinct example tokens but currently document
aliases to foundation colors. Accent and secondary remain intentionally
unsupported until a demonstrated public use case requires an independent visual
role.
