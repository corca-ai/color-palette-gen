# Role policies

## Calm and minimal

This is a `product-policy`, not a statistical finding. v2 currently defines the
direction as:

- one user-provided hue and no generated harmony hues;
- neutral foundations occupying most semantic roles;
- chroma concentrated in brand action and destructive feedback;
- bounded neutral tint subordinate to surface lightness hierarchy;
- interaction changing lightness before hue;
- roles existing for semantic needs rather than palette variety.

Achromatic inputs prohibit invented hue tint. The current chroma and tint bounds
are heuristics and still need designer evaluation.

## Primary default

The exact input is always retained as the non-generated `brand source`. It is
also evaluated as a candidate for the filled-action `primary`. Chroma is retained until it
exceeds the calm/minimal cap; it is no longer reduced by an unconditional
percentage. The engine generates
mode-appropriate OKLCH lightness candidates, holds input hue and bounded source
chroma constant during the search, and rejects candidates whose full state family cannot support shared
label contrast or focus contrast. It selects the passing candidate with the
smallest Oklab distance from the source.

Source distance is also reported independently from pass/fail. A result beyond
the provisional review threshold is marked as a large brand shift so a passing
palette is not mistaken for a faithful one.

Large shifts expose three usage-specific outputs instead of silently presenting
one answer: the generated filled control, a source-colored outline when it has
sufficient boundary contrast, and a source-faithful fill when it supports the
text target. Unsafe alternatives remain visible but are marked not recommended.

The strategy panel recommends generated fill for a stateful action because it
is the only complete default/hover/active family. It separately identifies a
safe source-faithful outline or bordered base-state option when available.

Light and dark use non-overlapping role ranges so dark primary remains lighter
than light primary. The ranges are product policy backed by public design-system
precedent, but their exact endpoints remain heuristic.

## Interactive states

The state order is default, hover, active.

- Primary controls search darker candidates in light mode and lighter candidates
  in dark mode.
- Feedback controls choose the lightness direction that preserves one shared
  black-or-white label across default, hover, and active. This makes label
  readability a boundary of the state search instead of a check performed only
  after the colors are selected.
- Hover selects the nearest candidate reaching the provisional lower separation.
- Active selects the nearest candidate reaching a stronger separation from
  default.
- Requested hue and chroma are held constant while lightness is searched.
  The exported sRGB result can still show small axis drift after gamut mapping;
  the trace reports that actual movement rather than claiming exact preservation.
- One foreground must remain readable across all three states.

Carbon and Spectrum support the direction and ordered progression. They do not
establish the current `Delta E` thresholds, which remain `heuristic`.

The paired quality review also compares the default-to-hover interval with the
hover-to-active interval. Its provisional ratio band detects a weak first step
or an abrupt second step. This quality signal does not replace the individual
minimum-separation constraints.

Primary, destructive, and warning families are all included in this pacing
review. Primary retains the mode-directed convention. Feedback families derive
their direction from the shared readable label envelope, then require hover and
active to remain monotonic in that chosen direction.

## Cross-mode identity

Light and dark primary ranges are coordinated to provide a provisional minimum
lightness gap. Both palettes are generated from the same bounded source hue and
chroma, then evaluated together. The paired review reports hue drift, chroma
difference, and the lightness gap between primary roles. These are provisional
product objectives, not accessibility requirements, so a palette can pass every
contract while still being marked for cross-mode review.

The engine performs a sampled cross-mode comparison over each mode's baseline
plus the start, midpoint, and end of its primary lightness range. It is not an
exhaustive joint search. Pair selection minimizes worst-mode and total source
distance before using structural review misses as a later discriminator.
The target bands and ordering remain provisional until designer evaluation
provides stronger evidence.

## Independent review

Accessibility contracts determine whether a generated role is usable. They do
not establish that it is aesthetically strong or faithful to the input.
Source-distance, cross-mode identity, and state-pacing signals therefore run
after pair selection and may report review even when every accessibility
contract passes. The review label must never be described as aesthetic proof.

Chromatic primary is also compared with destructive and warning by hue. A
provisional separation below 30 degrees raises semantic-ambiguity review even
when total Delta E passes. This catches red brand/destructive and amber
brand/warning false positives; required icons and labels remain necessary.

## Neutral foundations

Background, surface, raised surface, muted surface, foreground, muted text,
decorative border, and input border use bounded OKLCH candidate search. The
versioned recipe is a target rather than an unquestioned output. Candidates
must preserve mode zones, ordered hierarchy, relevant text or boundary
contrast, and the neutral tint cap before recipe fidelity ranks them.

Chromatic inputs consider zero, partial, and intended source-hue tint;
achromatic inputs remain neutral. The foundation map plots selected, best-ranked
rejected, and next-passing candidates by lightness and tint chroma.

## Boundary and focus

Decorative border may remain subtle when it carries no required information.
Input border is required to identify a control and must reach `3:1` adjacent
contrast under WCAG 2.2 Non-text Contrast.

The exact input is preserved separately as `brand source`. The generated
`primary` is specifically a filled-action adaptation. Its boundary obligation
is carried by an independently searched `primary border`, allowing the engine to
report brand fidelity without pretending that the component fill and the brand
source are the same role.

Focus ring uses an independent bounded search over lightness and primary-relative
chroma. It must reach `3:1` against background and surface, remain perceptually
distinct from primary and destructive controls, and stay within the input hue
family. The closest passing candidate to primary is selected.

The specimen uses a visible gap around focused controls. Focus
change-of-contrast and indicator area are separate questions; adopting WCAG AAA
Focus Appearance would require an explicit policy decision.

## Destructive

The search starts around the semantic red anchor. Candidates preserve red hue
and chroma, support readable text, and meet the provisional perceptual separation
from generated primary. The closest passing candidate to the preferred semantic
anchor is selected.

The separation threshold is a `heuristic`, not a published accessibility rule.
If designer evaluation shows that red-brand cases remain ambiguous, the search
space must expand to limited hue alternatives or use an additional non-color cue.

## Warning and selection

Warning uses a bounded amber search rather than deriving another brand hue. A
candidate must support its shared label and remain perceptually separated from
both primary and destructive. Semantic closeness to the configured amber anchor
ranks the passing set. Warning still requires an icon or label; color is not its
only signal.

Selection searches low-chroma, source-hue tints. It selects the least emphasized
candidate that remains distinguishable from its surface and supports selected
content text. Position, shape, or selected-state semantics remains required as a
non-color cue.

Disabled background, text, and border deliberately alias muted foundation roles.
Popover and popover text deliberately alias raised surface and foreground. These
are documented semantic aliases, not hidden independent color decisions. A
future Craken requirement for stronger elevation or disabled differentiation is
the trigger for turning them into independent searches.

## Text colors

Primary, destructive, warning, and selection text compare black and white and select the foreground
maximizing the weakest APCA score across the relevant fills. Both candidates,
their limiting score, and the rejected or next-passing alternative are retained
as a complete search trace.
