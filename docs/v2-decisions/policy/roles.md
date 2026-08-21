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
are heuristics without empirical calibration.

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

### Why Primary chroma is capped at C 0.15

Production uses `min(source C, 0.15)` as the effective Primary chroma. The cap
exists to implement the current calm/minimal direction: keep the action color
bounded relative to neutral-dominant foundations, reduce extreme sRGB gamut
mapping, and leave room for readable shared labels, interaction states, and
Light/Dark coordination.

Those goals justify testing a bound; they do **not** establish `0.15` as the
correct boundary. The number is not a WCAG requirement, published perceptual
threshold, or empirically calibrated optimum. `primary.calm-chroma` therefore
has `provisional` authority. Sources at or below the cap retain their measured
chroma; sources above it enter the production Primary search at `C 0.15`.

The fixed-corpus
[Primary chroma restraint counterfactual](../research/adversarial-audit.md#primary-chroma-restraint-counterfactual)
shows why the cap remains under review. Relaxing the Primary inventory and its
matching calm-chroma bound increased selected realized chroma and reduced mean
source distance on the complete 216-input v16 corpus. Under v16,
Primary–Destructive separation is review evidence rather than a generation
constraint, so the earlier v15 `#FF6666` Dark Destructive infeasibility no
longer occurs. `#3300FF` still introduces the
`pair.primary-chroma-difference` eligibility miss. A derived transactional
fallback retains the current result for that one input, but requires both
complete engine results and is not a production policy.

The current cap is therefore a provisional stability guard, not a claim that
colors above `C 0.15` are visually excessive. Changing it requires downstream
generation, pair eligibility, source-fidelity, and perceptual review rather
than changing one constant in isolation.

## Interactive states

The state order is default, hover, active.

- Primary and Destructive are the two filled button families governed by one
  mode-relative interaction rule: Light hover/active get progressively darker,
  while Dark hover/active get progressively lighter. After the Primary family is selected, one
  black-or-white filled-action foreground is chosen against its three fills.
  Destructive then searches only candidates that support that same foreground,
  and its hover and active states retain it. The two families therefore share
  text polarity within each mode instead of making independent text decisions.
- Warning controls choose the lightness direction that preserves one shared
  black-or-white label across default, hover, and active. This makes label
  readability a boundary of the state search instead of a check performed only
  after the colors are selected.
- Destructive-confirmation Cancel is a context-derived Secondary family rather
  than an exported palette role. It consumes Muted Surface and Foreground,
  follows the filled sibling's mode direction with smaller provisional
  `Delta E 0.015/0.030` targets, and rejects any final-sRGB state whose actual
  `11px/650` label misses WCAG `4.5:1`. The decorative border is not promoted to
  a `3:1` boundary obligation because visible text identifies this button.
- Hover selects the nearest candidate reaching the provisional lower separation.
- Active selects the nearest candidate reaching a stronger separation from
  default.
- Requested hue and chroma are held constant while lightness is searched.
  The exported sRGB result can still show small axis drift after gamut mapping;
  the trace reports that actual movement rather than claiming exact preservation.
- One foreground must remain readable across all three states.

The mode-relative rule is the accepted policy v16 product interaction grammar,
not a universal standard. Carbon and Spectrum support ordered interaction
feedback, but do not establish this repo's exact mode directions. The rejected
both-darker rule, feasibility work, warning ledger, and operator decision are
preserved in [the state-direction research](../research/filled-action-state-direction.md)
and [ADR-0004](../adr/0004-mode-relative-filled-actions-and-contextual-separation.md).
The current `Delta E` thresholds also remain `heuristic`.

The paired quality review also compares the default-to-hover interval with the
hover-to-active interval. Its provisional ratio band detects a weak first step
or an abrupt second step. This quality signal does not replace the individual
minimum-separation constraints.

Primary, destructive, and warning families are all included in this pacing
review. Primary and Destructive are reviewed against the declared mode-relative action
direction. Warning derives its direction from the shared readable label
envelope, then requires hover and active to remain monotonic in that direction.

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
distance only after applying policy v12's explicit Primary pair eligibility
gate. The gate owns seven check IDs: the three cross-mode relationships and the
Light/Dark Primary interval-ratio and monotonic-lightness checks. When at least
one sampled pair passes all seven, only eligible pairs proceed to source-first
ranking. When none passes all seven, the complete inventory retains the v11
source-first order. Destructive and Warning pacing checks remain review evidence
and cannot silently enter Primary pair eligibility through array membership.

Zero-miss eligibility is selection-authoritative under v12, while the numeric
target bands remain provisional heuristics rather than empirical or perceptual
findings. Within the eligible or fallback inventory, worst-mode and total source
distance remain the leading objectives.

## Independent review

Accessibility contracts determine whether a generated role is usable. They do
not establish that it is aesthetically strong or faithful to the input.
The seven Primary pair eligibility checks are retained after selection as
inspectable policy-compliance evidence. Source distance, semantic hue
separation, and Destructive/Warning pacing remain independent post-selection
review and may report concerns even when every accessibility contract and pair
eligibility check passes. The review label must never be described as aesthetic
proof.

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
chroma. It must reach `3:1` against background, surface, and muted surface, remain perceptually
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
If reproducible component cases show that red-brand cases remain ambiguous, the
search space must expand to limited hue alternatives or use an additional
non-color cue.

The threshold is currently enforced by the context-free palette even though the
accepted component hierarchy never presents Primary and Destructive as two
filled actions in one action group. This is a conservative reusable-token
obligation, not a proof that semantic role identity requires `ΔE 0.08` in every
presentation. The bounded Dark-lighter joint probe shows that this obligation,
the shared white foreground, and the active-state distance have an empty
intersection for 12 red inputs **within the frozen v15 ranges, steps, sRGB
mapping/deduplication, and 80-candidate state search**. It does not establish
emptiness under every possible inventory. Production keeps the constraint until a separate
policy experiment decides whether separation belongs to palette generation or
contextual presentation evidence.

## Warning and selection

Warning uses a bounded amber search rather than deriving another brand hue. A
candidate must support its shared label and remain perceptually separated from
both primary and destructive. Semantic closeness to the configured amber anchor
ranks the passing set. Warning still requires an icon or label; color is not its
only signal.

Light and Dark own separate appearance recipes. Production v19 gives Light the
operator-selected vivid amber anchor `L .78/C .18` over range `[.52,.82]`; Dark
retains `L .72/C .14` over `[.62,.80]`. Both keep the same bounded hue inventory.
This is an explicit mode distinction, not a claim that one numeric recipe should
look equivalent on both backgrounds. See [ADR-0007](../adr/0007-light-warning-vivid-amber.md).

Selection searches low-chroma, source-hue tints. It selects the least emphasized
candidate that remains distinguishable from its surface and supports selected
content text. Position, shape, or selected-state semantics remains required as a
non-color cue.

Disabled background, text, and border deliberately alias muted foundation roles.
Popover and popover text deliberately alias raised surface and foreground. These
are documented semantic aliases, not hidden independent color decisions. The
promotion contract and explicit deferral are recorded in
[Utility role aliases](utility-role-aliases.md).

## Text colors

Primary text compares black and white, rejects any foreground that misses WCAG
`4.5:1` on a default/hover/active fill, then ranks the eligible set by its
weakest APCA diagnostic score. Destructive text aliases that mode-level
filled-action foreground; Destructive candidate and state constraints must pass
with it. Warning and Selection retain independent black-or-white searches
because they are different interaction families. Final checks declare the
actual public-specimen typography context; APCA `Lc 75/60` remains diagnostic,
not eligibility authority. See
[ADR-0005](../adr/0005-wcag-normal-text-generation-authority.md).
