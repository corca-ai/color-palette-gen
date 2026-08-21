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
The [ontology](v2-decisions/ontology.md) connects the concept vocabulary and
role dependencies. The [decision rules guide](v2-decisions/rules.md) connects
constraints, ranking, pair eligibility, verdict scopes, semantic declarations,
producers, tests, and explicit nonclaims.

The v1 and v2 engines, UI state, semantic roles, and tests stay separate. Only
low-level color conversion is shared because sRGB/OKLCH conversion has the same
meaning in both products.

When a requested OKLCH coordinate is outside sRGB, the shared converter keeps
requested lightness and hue fixed and uses 24 binary-search iterations to find
the largest in-gamut chroma before 8-bit hex export. This deterministic
technical strategy is not a perceptual-nearest-color claim; clipping,
local-MINDE, cusp-aware, and wider-gamut strategies can produce different
results. The public [gamut-mapping reference](../v2/reference.html#gamut-mapping)
shows the algorithm and a concrete clipping comparison.

The CSS serializer progressively enhances each final token with two declarations:
the canonical six-digit sRGB value first, followed by `oklch()` measured from
that same final color. Modern browsers use the latter; a browser without OKLCH
syntax support keeps the first declaration. Browser support does not replace the
engine's sRGB boundary: APCA, WCAG contrast, gamut acceptance, rendered-candidate
deduplication, stable ordering, and reproducible evidence still require one
deterministic rendered sRGB identity. Requested out-of-gamut OKLCH is therefore
never handed to the browser as an unevaluated policy decision. The browser smoke
renders every Light/Dark token in both forms to an sRGB canvas and permits at
most one 8-bit channel of serialization/conversion difference; contract evidence
continues to use the canonical hex side of that boundary.

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
  range, capped at [`C 0.15`](v2-decisions/policy/roles.md#why-primary-chroma-is-capped-at-c-015).

This prevents black and white inputs from collapsing into the same result while
also avoiding an invented hue for achromatic colors. Chromatic inputs apply a
very small source-hue tint to neutral foundations; achromatic inputs do not.

Primary and Destructive state colors use one mode-relative filled-action
movement: Light gets progressively darker and Dark gets progressively lighter.
After the
Primary family is selected, one black-or-white action foreground is selected;
Destructive default and state candidates must support that same foreground.
Source lightness has bounded
influence so it cannot push the full state family outside its text contract.
Destructive feedback remains semantic red. If the input hue is near red, its
preferred lightness anchor may move away from the brand family. The final
Primary–Destructive Oklab separation is retained as selected-result review
evidence rather than a generation contract.

Palette tokens and visual families remain distinct in every component context.
Under `single-filled-action-hierarchy-v2`, an action group containing ordinary
Primary and Destructive actions renders Primary filled and Destructive outline.
A destructive-confirmation group contains no ordinary Primary; it renders the
dedicated Destructive family filled beside a secondary Cancel. The source-red
predicate remains diagnostic evidence and never switches either strategy.

Confirmation Cancel is a context-derived presentation family rather than an
exported palette role. Its opaque Default equals the actual Muted Surface;
Light Hover/Active move darker and Dark Hover/Active move lighter. Final sRGB
state candidates must preserve the Foundation Foreground at WCAG `4.5:1` in the
declared `11px/650` normal-text action-label context. Hover and Active use the
provisional minimum Oklab distances `0.015` and `0.030`; these are bounded product
recipe values, not accessibility or perceptual standards. See
[ADR-0006](v2-decisions/adr/0006-context-derived-secondary-action-states.md).

## Public design reference

The public [Craken Design Atlas](https://craken.borca.ai/design) was inspected
on 2026-08-06. v2 adopts the following observable rules without copying Craken
source code:

- neutral OKLCH surfaces carry the application hierarchy;
- primary hue is reserved for brand actions, selection, and focus;
- light and dark modes use different primary lightness values;
- Primary and Destructive hover/active states get darker in Light and lighter
  in Dark; Warning retains its separate shared-label-envelope direction;
- destructive-confirmation Secondary follows the same per-mode direction with
  a smaller neutral response and checked label contrast;
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

v2 classifies the generated public-specimen text uses as normal text and uses
WCAG 2.2 contrast `>= 4.5:1` as candidate eligibility and final generated-contract
authority. A text candidate must pass against every declared background, not an
average. Final checks carry `typography-context.v1` with the specimen's actual
size and weight. Changing the consumer typography requires a new or updated
consumer context rather than an implicit token claim.

Among eligible black/white candidates the engine ranks the weakest APCA score.
The legacy role targets (`Lc 75` for body, `Lc 60` for compact roles) remain
diagnostic heuristics only. They do not reject production candidates and are not
WCAG conformance values. See
[ADR-0005](v2-decisions/adr/0005-wcag-normal-text-generation-authority.md).

The runtime follows the public APCA-W3 0.1.9 constants and formula in an
independently written small module. The official
[Myndex apca-w3](https://github.com/Myndex/apca-w3) package is pinned as a
development dependency and the complete 216-color grid is cross-compared over
46,656 foreground/background pairs. The separate
[SAPC-APCA](https://github.com/Myndex/SAPC-APCA) repository remains the theory,
documentation, and discussion reference. It is not treated as the canonical
development implementation.

Text-pair success does not establish the rest of the palette. v2 separately validates:

- input border against its surface at WCAG contrast `>= 3:1`;
- focus ring against background, surface, and muted surface at `>= 3:1`;
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

Context-derived Secondary states are deliberately absent from this exported role
list. Their values depend on the destructive-confirmation presentation context
and are recomputed from that mode's Muted Surface and Foreground.

Every contract records the colors, metric, target, and pass/fail result. Every
mode also exposes source classification, adaptation decisions, text checks, and
non-text checks. Light/dark results are siblings, not one mode calculated by
inverting the other.

Primary and Destructive filled action families use progressively darker Light
hover/active fills and progressively lighter Dark fills. Within a mode, both families share the foreground selected
from the Primary family; Destructive selection is constrained by that decision.
This is a product interaction rule rather than an accessibility or perceptual
standard. It is the executable v16 rule; its diagnostic history, retained
warnings, and operator disposition are preserved in the
[filled-action state direction experiment](v2-decisions/research/filled-action-state-direction.md)
and [ADR-0004](v2-decisions/adr/0004-mode-relative-filled-actions-and-contextual-separation.md).

The result keeps three verdict authorities separate under `result.verdicts`:

- `contracts.passed` is derived only from the selected Light and Dark text and
  non-text contract verdicts and carries authority `generated-contracts`;
- `qualityReview.passed` summarizes selected-result quality review evidence;
- `semanticModel.satisfied` summarizes only the modeled declarative semantic
  evaluations.

The latter verdicts carry stable authorities `selected-result-review` and
`declarative-semantic-model`, respectively. These IDs are machine-readable
scope declarations, not claims of empirical or perceptual authority.

Individual decision rules and semantic declarations use the closed vocabulary
`normative`, `product-policy`, `provisional`, `technical`, `heuristic`, and
`research-policy`. This evidence vocabulary is distinct from aggregate verdict
scope IDs and from report-level `diagnostic` authority.

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
[`v2-decisions/research/hover-diagnostics.md`](v2-decisions/research/hover-diagnostics.md).

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
duty under the
[utility-role promotion contract](v2-decisions/policy/utility-role-aliases.md).

## Deployment and navigation

- `/` serves v2 by default.
- `/v1/` preserves and serves v1.
- both pages expose an explicit version switch.
- the static build copies both version UIs and the shared color-math module.

The version switch makes the legacy experiment explicit; v2 does not inherit
v1's input model or UI merely because it owns the default route.
