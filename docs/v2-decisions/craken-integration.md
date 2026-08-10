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
- component states: primary normal, hover, active, focus;
- feedback: destructive action separated from brand action.

It is an independently written compatibility specimen, not copied Craken source
or a runtime dependency on the Craken application.

## Token correspondence

Current v2 names map to the Craken semantic model as follows:

| v2 role                    | Craken use                                                 |
| -------------------------- | ---------------------------------------------------------- |
| `background`               | application background                                     |
| `surface`                  | card                                                       |
| `raised surface`           | popover / raised layer                                     |
| `muted surface`            | muted, accent, and secondary surfaces in the current scope |
| `foreground`               | primary and on-neutral foreground                          |
| `muted text`               | muted foreground                                           |
| `border`                   | decorative border                                          |
| `input border`             | required input boundary                                    |
| `primary` / hover / active | brand solid state family                                   |
| `primary text`             | brand solid foreground                                     |
| `focus ring`               | ring                                                       |
| `destructive` / text       | destructive fill and foreground                            |

This mapping also exposes current palette debt. Craken has distinct popover,
accent, secondary, warning, disabled, destructive-hover, and destructive-active
roles. The first specimen aliases only roles that can be represented honestly;
future palette work should add distinct tokens when composed Craken screens show
that the alias loses hierarchy or state clarity.
