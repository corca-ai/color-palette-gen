# Public reference specimen boundary

## Decision

Color Lab v2 remains a visually neutral palette-generation and inspection tool.
The applied specimen, not the entire tool, follows structure observed in the
public Craken Design Atlas.

Applying generated colors to the whole v2 page would change the measurement
frame whenever the input changes. It would also mix authoring controls with the
product surface being validated. A fixed neutral tool around a public-reference
specimen keeps those responsibilities separate.

## Public reference

The public [Craken Design Atlas](https://craken.borca.ai/design) exposes
surfaces and states side by side. Its coverage includes Foundation, Navigation,
Messages, Composer, Files & Wiki, Jobs, and inspectors. Color Lab uses that
coverage as research input while presenting the primary action as a real
interactive control rather than a forced-state comparison row.

The v2 specimen adopts the parts that directly exercise this palette:

- foundation hierarchy: background, card/surface, muted surface, borders, text;
- navigation: selected row, unread badge, secondary action;
- messages: primary and secondary text, avatars, status badge;
- composer: input boundary, focus ring, primary action;
- component states: interactive primary and destructive actions with hover,
  active, focus, and local completion feedback;
- feedback: warning and destructive action separated from brand action;
- utility: selected content and popover elevation.

It is an independently written applied specimen, not copied source, an
assertion of an internal consumer relationship, or a runtime dependency on the
referenced application.

## Generic example token correspondence

For the public applied example, current v2 names map to the referenced
semantic model as follows:

| v2 role                         | Exported example token                   |
| ------------------------------- | ---------------------------------------- |
| `background` / `foreground`     | `color.canvas` / `color.text`            |
| `surface` / `raised surface`    | `color.surface` / `color.surface.raised` |
| `muted surface` / `muted text`  | `color.surface.muted` / `color.text.muted` |
| `border` / `input border`       | `color.border.subtle` / `.input`         |
| `brand source`                  | `color.brand.source`                     |
| `primary` / hover / active      | `color.action.primary[.state]`           |
| primary text / border           | `color.action.primary.text` / `.border`  |
| `focus ring`                    | `color.focus.ring`                       |
| `destructive` / hover / active  | `color.action.destructive[.state]`       |
| `warning` / hover / active      | `color.feedback.warning[.state]`         |
| `selection` / text              | `color.selection[.text]`                 |
| disabled background/text/border | `color.control.disabled.*`               |
| `popover` / text                | `color.overlay.popover[.text]`           |

The page exports this mapping as versioned `color-lab-reference-tokens-1` JSON.
The schema and token namespace are general-purpose; the public reference is
attribution for specimen coverage, not the identity of an integration. Disabled
and popover names are distinct example tokens but currently document aliases to
foundation colors. Accent and secondary remain intentionally unsupported until
a demonstrated public use case requires an independent visual role.

## Legacy export compatibility

Earlier public builds exposed `v2/lib/craken.js`, `CRAKEN_TOKEN_MAP`,
`serializeCrakenTokens()`, and the `craken-color-tokens-1` schema. That module
remains as a deprecated compatibility adapter so existing imports and payload
consumers do not break while the visible UI and new integrations use the
general-purpose reference export. It intentionally has no UI action. Removing
it requires an explicit breaking release and migration note.
