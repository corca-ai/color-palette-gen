# Color Lab v2 specification

## Product boundary

v2 is the primary color-palette prototype at the site root. v1 remains
available as the broad, inspectable palette experiment at `/v1/`.

The neutral authoring UI remains independent, while its generic applied
specimen uses the public Craken Design Atlas as one external reference for
coverage and component-state structure. Public-facing labels and exported
token names remain general-purpose. This does not assert affiliation, an
internal consumer relationship, or a runtime dependency. See
[`v2-decisions/craken-integration.md`](v2-decisions/craken-integration.md).

v2 intentionally accepts one input only:

```js
{
  primary: "#507096";
}
```

It does not accept vibe, secondary, additional, or harmony inputs. Its visual
direction is fixed: calm and minimal, with neutral foundations and one brand
hue. It produces paired light and dark palettes from the same primary.

The behavior and limits of the versioned declarative palette policy are the
research object. Each generated palette and applied interface form an
observable specimen. Component previews, export formats, and contrast reports
are permitted only as supporting inspection tools; they
must not define the page hierarchy or expand the palette input contract. The
prototype studies how design declarations, generation strategies, and automated
evidence relate while keeping perceptual outcomes explicitly unmeasured. It does
not claim that passing formulas establish palette quality.

The public page therefore leads with input, the applied example, and a compact
generated palette. Role-level decision evidence, broader evaluation, relationship
explanation, and contract validation follow through progressive disclosure.
Each section owns one reader question defined in `interaction-design.md`.

Every color decision follows the evidence and counterfactual model in
[`v2-decisions/`](v2-decisions/README.md). A passing color
without rule provenance and a nearest-alternative explanation is incomplete.

The v1 and v2 engines, UI state, semantic roles, and tests stay separate. Only
low-level color conversion is shared because sRGB/OKLCH conversion has the same
meaning in both products.

## Generation policy

The input is retained verbatim as the palette source, but it is not promised as
a semantic token. A UI action color needs different usable lightness ranges in
light and dark contexts, so v2 preserves the input's hue and relative chroma
while normalizing lightness for each mode.

Inputs are classified before generation:

- `achromatic`, `C < 0.015`: generate a genuinely neutral family while allowing
  source lightness to influence the resulting brand gray;
- `subdued`, `0.015 <= C < 0.06`: retain the restrained character without
  artificially saturating it;
- `chromatic`, `C >= 0.06`: retain hue and scale chroma into the calm palette
  range, capped at `C 0.15`.

This prevents black and white inputs from collapsing into the same result while
also avoiding an invented hue for achromatic colors. Chromatic inputs apply a
very small source-hue tint to neutral foundations; achromatic inputs do not.

Primary state colors use mode-specific lightness movement: hover and active get
darker in light mode and lighter in dark mode. Source lightness has bounded
influence so it cannot push the full state family outside its text contract.
Destructive feedback remains semantic red. If the input hue is near red, its
lightness is moved away from the brand family and the resulting perceptual
separation is verified.

## Public design reference

The public [Craken Design Atlas](https://craken.borca.ai/design) was inspected
on 2026-08-06. v2 adopts the following observable rules without copying Craken
source code:

- neutral OKLCH surfaces carry the application hierarchy;
- primary hue is reserved for brand actions, selection, and focus;
- light and dark modes use different primary lightness values;
- hover and active states move lightness in opposite directions by mode;
- background, card, muted, border, input, foreground, on-fill, and ring are
  separate semantic roles;
- component states are reviewed together on composed application screens;
- light, dark, and system appearance are first-class states.

The initial v2 recipe uses observable behavior from this public resource as a
design reference, not as evidence of endorsement, affiliation, an internal
relationship, or a private implementation dependency. Its name remains in
attribution and rationale documentation rather than defining the product UI or
export schema.

Craken's observed dark muted text and brand-state lightness values are not
copied literally: under the v2 APCA targets they are insufficient for compact
text. v2 raises dark muted text and narrows the dark brand state range. This is
an intentional consequence of choosing APCA as the generation gate.

## Validation policy

v2 uses APCA (Accessible Perceptual Contrast Algorithm) as the generation gate
for text. It preserves polarity and assigns targets by assumed typography:

- body text, 16px regular: `|Lc| >= 75`;
- compact UI labels, 14px medium: `|Lc| >= 60`;
- large display text, 24px medium: `|Lc| >= 45`.

This is an experimental design policy, not a WCAG conformance claim. WCAG 2.2
is a W3C Recommendation dated 2024-12-12 and remains the appropriate normative
reference for WCAG conformance. WCAG 3.0 is a Working Draft dated 2026-03-03.
APCA is selected here because v2 assumes concrete application typography and
needs polarity- and use-sensitive contrast scoring. The page must state this
limitation.

The runtime follows the public APCA-W3 0.1.9 constants and formula in an
independently written small module. The official
[Myndex apca-w3](https://github.com/Myndex/apca-w3) package is pinned as a
development dependency and the complete 216-color grid is cross-compared over
46,656 foreground/background pairs. The separate
[SAPC-APCA](https://github.com/Myndex/SAPC-APCA) repository remains the theory,
documentation, and discussion reference. It is not treated as the canonical
development implementation.

APCA does not establish the rest of the palette. v2 separately validates:

- input border against its surface at WCAG contrast `>= 3:1`;
- focus ring against background and surface at `>= 3:1`;
- adjacent primary states at Oklab `Delta E >= 0.035`;
- primary and destructive colors at Oklab `Delta E >= 0.08`.

Decorative borders intentionally remain subtler than interactive input borders.
The weekly or manually triggered exhaustive tier applies all contracts to a
216-color RGB grid in addition to the named edge cases used by the fast
pull-request tier.

## Semantic output

Each mode produces a list of `(color, function)` tuples for:

- background, foreground;
- surface, raised surface, muted surface;
- muted text;
- border, input border;
- exact brand source passthrough;
- primary, primary hover, primary active, primary text, primary border;
- focus ring;
- destructive and warning state families;
- selection, disabled, and popover roles.

Every contract records the colors, metric, target, and pass/fail result. Every
mode also exposes source classification, adaptation decisions, text checks, and
non-text checks. Light/dark results are siblings, not one mode calculated by
inverting the other.

The result keeps three verdict authorities separate under `result.verdicts`:

- `contracts.passed` is derived only from the selected Light and Dark text and
  non-text contract verdicts and carries authority `generated-contracts`;
- `qualityReview.passed` summarizes selected-result quality review evidence;
- `semanticModel.satisfied` summarizes only the modeled declarative semantic
  evaluations.

The latter verdicts carry stable authorities `selected-result-review` and
`declarative-semantic-model`, respectively. These IDs are machine-readable
scope declarations, not claims of empirical or perceptual authority.

`result.contractsPassed` is the explicit top-level contract verdict.
`result.passed` remains a backward-compatible alias of that same value; it must
not be interpreted as overall design, perceptual, or semantic quality.

The result also exposes a versioned semantic evaluation for the Primary action,
Foundation, Focus, Feedback, and Selection families. It keeps measurable
constraints, invariants, and relations separate from generation strategies.
This evaluation does not change generated colors or redefine the palette
contract pass result. Its `satisfied` field means only that the currently modeled
automated declarations pass; it does not establish overall palette quality or
perceived hover discoverability.

`result.hoverDiagnostics` supplies non-normative review signals calculated from
final sRGB output: Oklab Delta E, CIEDE2000, contrast trajectories against the
declared surface and background, duplicate detection, and surface-trajectory
reversal. These diagnostics may prioritize inspection but cannot establish
hover discoverability or change the deterministic palette verdict. See
[`v2-decisions/hover-diagnostics.md`](v2-decisions/hover-diagnostics.md).

Each `result.semanticEvaluation.evaluations` entry carries a `trace` containing
the stable declaration ID, registered evaluator ID, and versioned evidence trace
IDs. This trace explains which semantic claim caused the evaluation to exist;
it does not turn explanatory evidence metadata into a runtime schema or establish
an unmeasured perceptual outcome.

The representative gallery derives a bounded inspection shortlist from named metric
extremes rather than a composite score. It keeps all inputs visible and exposes
the reason for each recommendation so ranking mechanics cannot masquerade as a
calibrated perceptual model.

The UI reports semantic role count and unique color count separately. Multiple
roles may intentionally alias one color when documented, but `primary` and
`focus ring` are independently searched because their component duties differ;
an alias is never presented as a new color. Disabled and popover aliases remain
intentional until a reproducible public component case demonstrates a distinct
duty under the [utility-role promotion contract](v2-decisions/utility-role-aliases.md).

## Deployment and navigation

- `/` serves v2 by default.
- `/v1/` preserves and serves v1.
- both pages expose an explicit version switch.
- the static build copies both version UIs and the shared color-math module.

The version switch makes the legacy experiment explicit; v2 does not inherit
v1's input model or UI merely because it owns the default route.
