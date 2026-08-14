# Page and interaction design intent

This document defines the current v2 public-site story, section order, and
visualization contract. The maintained v1 experiment has a separate input model
and must not be used to justify v2 interactions.

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

### Input

The form accepts one primary color. The direction is fixed to calm and minimal.
There are no vibe, supporting-color, or harmony controls in v2.

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
truthful local `Saved` confirmation; it does not imply persistence. The structure is an
independently written example informed by a public design reference. It must
remain visually and textually generic: no affiliation, actual-consumer claim, or
runtime dependency is implied.

The authoring UI stays neutral so generated colors do not change the measurement
frame around the specimen.

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
gap. Focus is not presented as an alias of primary.

### Quality review

Question:

> What design-quality concerns remain after hard palette contracts pass?

This section begins with the small semantic model that declares measurable
constraints, invariants, and relations independently from the formulas used to
generate colors. The remaining cards contain provisional signals such as source
fidelity, cross-mode identity, semantic ambiguity, and state pacing. They must
not present these signals as accessibility pass/fail or evidence of perceived
hover discoverability.

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
It places up to five named metric extremes first and explains why each deserves
direct inspection. This order is not presented as a calibrated risk score; all 14
inputs remain available below it.

### Color relationships

Question:

> How are the output roles structurally related?

This section explains foundation, content, brand, boundary, and feedback
sequences. It describes the generated structure; it does not render a quality
verdict.

### Palette validation

Question:

> Which explicit text, boundary, focus, and separation contracts passed?

Validation is collapsed by default and reports measured values against declared
targets. APCA text checks, WCAG non-text checks, and Oklab separation checks must
remain distinguishable. Passing is not a conformance or production-suitability
claim.

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

## Public-reference boundary

Public references may inform coverage, component-state structure, and documented
rationale. The site must not imply endorsement, affiliation, an actual consumer
relationship, or a private implementation dependency.

Public-reference names belong in attribution documentation. Primary UI labels,
example content, export schema names, and token names stay general-purpose unless
a separately approved public interoperability contract requires otherwise.

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
