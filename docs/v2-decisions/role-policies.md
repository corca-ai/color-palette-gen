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

The exact input is retained as a counterfactual. The engine generates
mode-appropriate OKLCH lightness candidates, preserves input hue and relative
chroma, and rejects candidates whose full state family cannot support shared
label contrast or focus contrast. It selects the passing candidate with the
smallest Oklab distance from the source.

Light and dark use non-overlapping role ranges so dark primary remains lighter
than light primary. The ranges are product policy backed by public design-system
precedent, but their exact endpoints remain heuristic.

## Interactive states

The state order is default, hover, active.

- Light mode searches darker candidates.
- Dark mode searches lighter candidates.
- Hover selects the nearest candidate reaching the provisional lower separation.
- Active selects the nearest candidate reaching a stronger separation from
  default.
- Hue and chroma are preserved while lightness is searched.
- One foreground must remain readable across all three states.

Carbon and Spectrum support the direction and ordered progression. They do not
establish the current `Delta E` thresholds, which remain `heuristic`.

## Neutral foundations

Background, surface, raised surface, muted surface, foreground, muted text, and
decorative border currently use versioned `policy anchor` values. Chromatic
inputs add a bounded source-hue tint; achromatic inputs remain neutral.

These roles expose intent and provenance but have not yet migrated to
multi-candidate optimization. Their UI must not show invented alternatives.

## Boundary and focus

Decorative border may remain subtle when it carries no required information.
Input border is required to identify a control and must reach `3:1` adjacent
contrast under WCAG 2.2 Non-text Contrast.

Focus ring currently aliases primary only after it reaches `3:1` against both
background and surface. Focus change-of-contrast and indicator area are separate
questions; adopting WCAG AAA Focus Appearance would require an explicit policy
decision.

## Destructive

The search starts around the semantic red anchor. Candidates preserve red hue
and chroma, support readable text, and meet the provisional perceptual separation
from generated primary. The closest passing candidate to the preferred semantic
anchor is selected.

The separation threshold is a `heuristic`, not a published accessibility rule.
If designer evaluation shows that red-brand cases remain ambiguous, the search
space must expand to limited hue alternatives or use an additional non-color cue.

## Text colors

Primary and destructive text currently compare black and white and select the
foreground maximizing the weakest APCA score across the relevant fills. This is
reported as a policy anchor until the two candidates and their scores are
represented as a full search trace.
