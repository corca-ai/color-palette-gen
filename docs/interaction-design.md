# Page and interaction design intent

This document defines the current v2 public-site story, section order, and
visualization contract. The maintained v1 experiment has a separate input model
and must not be used to justify v2 interactions.

This page owns presentation order, not color-policy meaning. Read the
[v2 ontology](v2-decisions/ontology.md) for the project concepts and dependency
graph, the [rule mechanics](v2-decisions/rules.md) for candidate filtering and
ranking, and the [decision-model index](v2-decisions/README.md) for role policy,
numeric evidence, and research findings. The public [About](../v2/about.html)
and [Reference](../v2/reference.html) pages are the reader-facing projections of
those maintained sources.

## Research message

Color Lab v2 turns one primary color into complete light and dark semantic UI
palettes. The versioned policy's behavior and limits are the research object;
each generated palette and applied interface form an observable specimen.
Evidence views exist to answer
why a color was selected, whether the palette satisfies its declared contracts,
and how it behaves in a representative interface.

The page should let a first-time visitor recover this argument without reading
the implementation documentation:

1. one primary color is the complete input;
2. the output is a paired light/dark semantic palette;
3. the palette can be understood immediately in an applied interface;
4. deeper evidence is available without dominating the first reading;
5. every automated result remains an experimental design aid, not a production
   or accessibility certification.

The page is an instrument as well as an explanation surface. It must keep
deterministic output, provisional diagnostics, and unmeasured perceptual claims
visually and conceptually distinct. Interface polish supports inspection; it is
not itself evidence that the policy is valid.

## Current v2 journey

The primary reading order is:

> Input → Applied example → Generated palette → Decision evidence → Broader
> evaluation → Relationship explanation → Contract validation

The visitor first inspects the output, then chooses how deeply to examine it.
Evidence sections never introduce another input model, harmony choice, or
application-specific requirement.

The result contract mirrors that reading order: `verdicts.contracts` owns the
generated text/non-text contract verdict, while `verdicts.qualityReview` and
`verdicts.semanticModel` retain separate review and declaration evidence. The
legacy `passed` field aliases `contractsPassed`; it is never presented as an
overall design-quality verdict.

### Input

The form accepts one primary color. The direction is fixed to calm and minimal.
There are no vibe, supporting-color, or harmony controls in v2.

Primary and Destructive are filled button families with the same mode-relative
interaction grammar: Light darkens from default to hover to pressed, while Dark
lightens in that order. The
Primary family first selects one readable black-or-white action foreground;
Destructive candidate and state searches must reuse it. Warning remains a
semantic status family and may use its own foreground and label-preserving
direction.

This is the accepted policy v16 product grammar. The resting/default state was
the primary human review surface. The review accepted the mode-relative result
while keeping 22 separation and nine Dark source-fidelity findings truthful.
See [ADR-0004](v2-decisions/adr/0004-mode-relative-filled-actions-and-contextual-separation.md).

The earlier state-direction research was Destructive-anchored, but it was not a
literal sequential choice. Primary↔Destructive separation makes the two
families mutually dependent, so the bounded probe enumerates complete Dark
Primary and Destructive families with one shared foreground and ranks only
eligible joint tuples. Under the unchanged inventory it recovers 3 of the 15
known failures and leaves 12 infeasible, so it is not a corpus-complete policy
candidate. These controls are not exposed in Generator; the completed successor
experiment is what policy v16 adopts.
See the retained
[state-direction experiment](v2-decisions/research/filled-action-state-direction.md).

The applied-sample tabs expose the accepted one-filled-action hierarchy.
`Routine actions` renders Primary filled and Destructive outline;
`Destructive confirmation` renders dedicated Destructive filled beside
secondary Cancel and contains no ordinary Primary. Both buttons use the same
mode-relative interaction direction—Light darker, Dark lighter—while Cancel
uses a smaller neutral movement and keeps its actual `11px/650` label at WCAG
`4.5:1` in every state. Cancel's state fills belong to this presentation context,
not to the exported palette. The rejected two-filled
comparison and red-band inspection remain in research history rather than the
live Generator. Switching tabs stores no judgment and does not alter palette
generation. See
[ADR-0006](v2-decisions/adr/0006-context-derived-secondary-action-states.md).

Generating a palette preserves the current result-mode choice and replaces every
projection from one result object. Repeated normalized inputs may reuse the
in-memory result.

### Applied example

The applied example is the first result section. It answers:

> Do these roles form a legible hierarchy when used together in an interface?

It exercises foundation, navigation, messages, composer, interaction states,
focus, feedback, selection, and popover roles. The primary action is
one real focusable button whose hover, pressed, and focus states appear through
interaction rather than a row of forced-state duplicates. Activating it gives a
truthful local `Saved` confirmation; it does not imply persistence. The structure
is a project-owned inspection example. It must remain visually and textually
generic: no actual-consumer claim or runtime dependency is implied.

The authoring UI stays neutral so generated colors do not change the measurement
frame around the specimen.

### Ontology-driven edge-case inspection

The applied sample is also a human inspection instrument. Its coverage model
must distinguish two independent axes:

1. **Ontology relation** — a declared dependency or obligation such as one
   Primary foreground spanning Default/Hover/Active, Focus remaining visible on
   Background/Surface/Muted Surface, or Selection Text remaining readable on
   Selection.
2. **Presentation composition** — whether a person inspects one native context
   or several valid native contexts aligned for comparison, such as ordinary
   actions, destructive confirmation, and warning feedback. The aligned roles
   may already have an ontology relation or may only share a screen question.
   Differences in foreground, resting emphasis, border treatment, or state
   direction can look inconsistent even when every role passes its own contract.

The second axis is deliberately not promoted into palette policy. Co-location
creates an inspection obligation and possible human finding, not a new candidate
constraint or semantic dependency.

Source provenance and screen composition are orthogonal. `sourceKind` and
`sourceId` name the upstream declaration, rule, document, or authored question;
`composition` says whether it is rendered in one `native-context` or as
`aligned-native-contexts`. A semantic declaration can therefore be inspected
through aligned presentation co-occurrence without changing its ontology kind.

#### Presentation/context migration

- Primary kind: **presentation/context**.
- Before law: sample coverage is complete when every generated role has at least
  one CSS consumer in one of five situations.
- After law: sample coverage is complete for the checked-in bounded inspection
  inventory only when every obligation names its source, roles, both modes,
  actual context, relevant states, and rendered scenario; generated roles may
  intentionally appear in more than one situation.
- Retired claims: one appearance proves a role's applied coverage; scenario role
  lists must partition generated roles exactly once; ontology edges alone identify
  every useful human comparison.

This migration changes neither generated output nor eligibility, ranking, pair
selection, result verdicts, or schema versions. `sample-inspection.js` owns the
presentation-only obligation inventory; policy and ontology remain upstream
authority.

The bounded inventory contains every renderable semantic declaration, every
generated interactive family and its label/boundary duties, every assembly alias
used by the specimen, and a small authored set of presentation co-occurrence
questions grounded in the native scenarios. It does not claim exhaustive
coverage of all role combinations, components, primary inputs, layouts, or
aesthetic defects.

#### Role × Mode × Context × State review

| Inspection obligation | Source kind / ID | Token roles | Modes | Context | Fill states / focus | Screen owner |
| --- | --- | --- | --- | --- | --- | --- |
| Foundation hierarchy | semantic declaration / `foundation-hierarchy-ordered` | Background, Surface, Raised, Muted, Foreground, Muted Text, Border | Light, Dark | nested workspace surfaces | default / off | Workspace |
| Foundation text | semantic declaration / `foundation-text-targets-pass` | Background, Surface, Foreground, Muted Text | Light, Dark | body, surface, and muted content | default / off | Workspace |
| Input boundary | rule / `foundation.boundary-contrast` | Surface, Input Border, Foreground | Light, Dark | editable controls on Surface | default / off, on | Form & focus |
| Primary family | rule / `primary.generated-family` | Primary Default/Hover/Active, Primary Text, Primary Border | Light, Dark | ordinary filled action | default, hover, active / off, on | Routine actions |
| Primary shared label | semantic declaration / `shared-label-readable` | Primary Default/Hover/Active, Primary Text | Light, Dark | ordinary filled action | default, hover, active / off | Routine actions |
| Primary distinct states | semantic declaration / `states-distinct` | Primary Default/Hover/Active | Light, Dark | ordinary filled action | default, hover, active / off | Routine actions |
| Primary progression | semantic declaration / `active-continues-beyond-hover` | Primary Default/Hover/Active | Light, Dark | ordinary filled action | default, hover, active / off | Routine actions |
| Destructive family | rule / `state.minimum-separation` | Destructive Default/Hover/Active, Destructive Text | Light, Dark | confirmation filled action | default, hover, active / off, on | Destructive confirmation |
| Destructive label | semantic declaration / `feedback-destructive-label-targets-pass` | Destructive Default/Hover/Active, Destructive Text | Light, Dark | confirmation filled action | default, hover, active / off | Destructive confirmation |
| Warning family | rule / `state.shared-label` | Warning Default/Hover/Active, Warning Text | Light, Dark | status and warning action | default, hover, active / off, on | Feedback & selection |
| Warning label | semantic declaration / `feedback-warning-label-targets-pass` | Warning Default/Hover/Active, Warning Text | Light, Dark | status and warning action | default, hover, active / off | Feedback & selection |
| Selection pair | semantic declaration / `selection-text-target-passes` | Selection, Selection Text | Light, Dark | selected row beside unselected content | default / off | Feedback & selection |
| Selection separation | semantic declaration / `selection-surface-oklab-separation-passes` | Surface, Selection | Light, Dark | selected beside unselected content | default / off | Feedback & selection |
| Focus adjacency | semantic declaration / `focus-adjacent-contrast-passes` | Focus Ring, Background, Surface, Muted Surface | Light, Dark | three live foundation targets | default / on | Edge matrix |
| Focus/control separation | semantic declaration / `focus-control-oklab-separation-passes` | Focus Ring, Primary, Destructive | Light, Dark | ordinary and destructive controls | default / on | Edge matrix |
| Utility semantics | owner document / `docs/v2-decisions/policy/utility-role-aliases.md` | Disabled aliases, Popover aliases | Light, Dark | blocked control and overlay | default / off | Form & focus |
| Action-family consistency | presentation / `single-filled-action-hierarchy-v2` | Primary, Destructive, Warning plus derived Secondary | Light, Dark | aligned native action contexts | default, hover, active / off, on | Edge matrix |
| Feedback separation | semantic declaration / `feedback-oklab-separation-passes` | Primary, Destructive, Warning | Light, Dark | aligned action families | default / off | Edge matrix |
| Default emphasis hierarchy | authored presentation question / `action-default-emphasis-v1` | Surface plus all action defaults | Light, Dark | equal geometry across native contexts | default / off | Edge matrix |

Intentional differences keep explicit owners. Warning owns an independent label
envelope; Secondary is derived from Muted Surface and Foreground in confirmation
context; outline Destructive belongs to ordinary coexistence while filled
Destructive belongs to confirmation. The Edge matrix must label these differences
instead of making visual consistency look like an automated pass/fail result.

#### Edge matrix screen plan

Add a sixth `Edge matrix` tab alongside the five realistic situations. It is a
deliberate inspection board, not a simulated product screen.

- **Action families** aligns three separately labelled native contexts rather
  than inventing one action group: ordinary Primary + outline Destructive,
  confirmation Secondary + filled Destructive, and Warning feedback. Equal
  geometry makes cross-context comparison easy while preserving the actual
  hierarchy. Every control is genuinely focusable and interactive. A local
  readout exposes fill state (`Default`, `Hover`, `Pressed`) and focus indicator
  (`Off`, `On`) as independent axes.
- **Focus across surfaces** places the same Focus Ring around equivalent controls
  on Background, Surface, and Muted Surface. Keyboard focus must reach every case.
- Explanatory labels distinguish ontology-owned sameness from intentionally
  independent behavior. The screen records no vote and converts no visual finding
  into generation authority.
- Open observation questions are visible beside the relevant comparison. They
  ask what appears similar, different, stronger, or weaker; they do not restate
  an automated semantic status as a human conclusion.

`SAMPLE_INSPECTION_OBLIGATIONS` is the executable presentation contract. Each
static record contains `id`, closed `sourceKind`, exact `sourceId`,
`composition`, `scenarioId`, `modes`, `contexts`, `fillStates`, `focus`,
`inspectionQuestion`, `inspectionVerdictAuthority`, and `roleBindings` of token
role to actual selector; derived Secondary bindings are marked separately. The
inventory does not generate components, expand arbitrary families, evaluate
color policy, or drive palette production. `inspectionVerdictAuthority: none`
applies only to the inspection record; it does not erase an upstream semantic
verdict.

Unit tests must prove generated-role coverage without requiring roles to be
unique to one scenario, validate the record shape, and bind every obligation's
selectors inside its rendered `data-inspection-obligation` marker. Playwright
must inspect both modes; exercise Default/Hover/Pressed and independent focus;
compare computed fills and labels; verify shared Primary/Destructive foreground
identity; and check the Focus Ring plus actual Background/Surface/Muted Surface
host colors. One complete Light and one complete Dark Edge matrix snapshot are
the bounded human comparison surface. The UI exposes no score, vote, saved
judgment, or automatic pass/fail result.

Multi-input matrices are deferred until a finding proves input-dependent on this
single-palette board. Finding persistence is deferred until an operator workflow
names its disposition owner and authority. Generated pairwise co-occurrence is
deferred unless curated probes repeatedly miss a documented defect class.

### Generated palette

The compact palette follows the applied result. It answers:

> What colors were generated, and which semantic role does each color serve?

Light and Dark are readable independently. Compare is an explicit analytical
mode, not the default. Collapsed role groups provide a compact color scan and
role count; every group expands on demand. Opening a swatch reveals intent, the
selected candidate, nearby counterfactuals, rule order, and public provenance.
The UI labels the internal `brand source` role as `Original input` so it reads as
provenance rather than a component token. Exported token names remain stable.

## Evidence section contracts

Evidence is ordered from role-level decisions toward aggregate checks. Every
section owns one reader question.

### Foundation search map

Question:

> Why did each neutral foundation or boundary candidate win?

Each role gets its own lightness and chroma tracks because distances across
different role searches have no shared decision meaning. Show the recipe target,
selected candidate, closest rejected candidate, another passing candidate,
numeric range, candidate count, and rejecting rule.

### Independent focus search

Question:

> Does one independently selected focus indicator remain visible around the
> controls it must serve?

Show the same ring on neutral, primary, and destructive targets with a visible
gap. The generated ring must pass its adjacent-contrast contract on Background,
Surface, and Muted Surface because all three are live specimen contexts. Focus
is not presented as an alias of primary.

### Selected-result review

Question:

> What recorded review concerns remain after generated palette contracts pass?

This section begins with the small semantic model that declares measurable
constraints, invariants, and relations independently from the formulas used to
generate colors. Primary cross-mode and state cards retain the seven
selection-authoritative eligibility checks as inspectable compliance evidence.
The remaining cards contain independent signals such as source fidelity,
semantic ambiguity, and Destructive/Warning state pacing. They must not present
either category as accessibility certification or evidence of perceived hover
discoverability.

The Quality section also exposes hover risk diagnostics below the semantic
model. It presents Oklab and CIEDE2000 differences plus context-contrast
trajectories as measurements, never as an accessibility pass or proof of
perceived discoverability from direct interactive inspection.

### Representative diagnostic set

Question:

> How does the policy behave across varied and adversarial primary inputs?

The gallery is optional and collapsed by default. It supports comparison,
interactive Light/Dark specimens, and loading one case into the inspector. It
does not collect scores, notes, or observations. The expanded section first
compares hover diagnostics across the complete set.

### Light Warning appearance review

Question:

> Which Light Warning family was accepted, which alternatives were rejected,
> and what changed in the actual rendered states?

`/warning-review.html` starts from six representative Primary inputs and shows
five side-by-side Light Warning families: current v20 using the recipe accepted
in v19, superseded
v18, the previous least-bad arm, orangeward hue, and yellowward hue. The page
exposes actual rendered OKLCH, requested versus rendered chroma, and contract
metrics, and stores no vote. It must distinguish accepted, superseded, and
rejected arms and link the prior Destructive decision history separately.
Its six fixed tabs are the complete review input set for this page; it does not
claim metric-extreme prioritization or expose the separate 14-input diagnostic
gallery. The cards link back to the Warning walkthrough and the explanations for
candidate inventory, gamut mapping, and Oklab distance.

### Color relationships

Question:

> How are the output roles structurally related?

This section explains foundation, content, brand, boundary, and feedback
sequences. It describes the generated structure; it does not render a quality
verdict. Terminology and dependency ownership come from the
[ontology](v2-decisions/ontology.md); the executable ordering is summarized by
the ontology's top-to-bottom Mermaid flow.

### Palette validation

Question:

> Which explicit text, boundary, focus, and separation contracts passed?

Validation is collapsed by default and reports measured values against declared
targets. APCA text checks, WCAG non-text checks, and Oklab separation checks must
remain distinguishable. Passing is not a conformance or production-suitability
claim. Individual check IDs, formulas, thresholds, and evidence authority are
maintained in [rule mechanics](v2-decisions/rules.md) and the linked policy
references rather than duplicated here.

## Shared visualization grammar

- A track or plot represents a declared measurable domain.
- Numeric endpoints are shown whenever position implies scale.
- Target, selected, rejected, and alternative candidates retain distinct labels
  and shapes.
- Color alone never carries pass/fail or candidate status.
- Candidate marks show where values were considered; large swatches and text
  carry color identification.
- A line or arrow represents an actual relationship or movement, never
  decoration.
- A threshold or feasible boundary is labeled with the rule that owns it.
- Overlapping candidates are disclosed rather than separated artificially.
- Every compact visualization provides a path to the corresponding decision
  evidence.

## Result-mode coherence

The sticky Light / Dark / Compare control applies to the complete result
surface: palette, example, foundation map, semantic maps, focus specimens,
quality, relationships, and validation.

Light and Dark use the full width for reading. Compare may be denser because it
exists for cross-mode analysis. Switching mode never recalculates or changes the
input, and the selection may be remembered locally.

## Progressive disclosure

The first reading shows the palette and its applied consequence. Detailed
counterfactuals, gallery cases, and contract rows are opened on demand.

Progressive disclosure may hide depth, not the reason for a decision. A visitor
must be able to identify each section's question and principal conclusion
without opening a full calculation trace.

## Applied-example boundary

The applied example exercises component coverage and state structure as a
self-contained Color Lab specimen. Primary UI labels, example content, export
schema names, and token names stay project-owned and general-purpose. The
specimen demonstrates generated-role use; it does not certify application-level
component behavior.

## Change review checklist

Before changing page structure or visualization, verify:

- Can a first-time visitor state the one-input/two-palette promise?
- Are the final palette and applied example visible before dense diagnostics?
- Does every evidence section answer one distinct reader question?
- Are Quality, Relationships, and Validation still clearly non-overlapping?
- Does Light / Dark / Compare update every visible projection coherently?
- Are target, selected, rejected, and alternative values labeled without relying
  on color alone?
- Can the page be understood without assuming knowledge of a referenced product?
- Is the v1 multi-color/vibe journey kept out of the v2 contract?
- Do keyboard operation, focus visibility, and narrow-view layouts remain usable?

A change that alters this journey updates this document and the corresponding
v2 specification before implementation is considered complete.
