# Declarative design semantic model

## Problem

A formula and a test that repeat the same constant can prove implementation
consistency without proving design intent. An Oklab distance floor can prove
that two exported colors differ; it cannot by itself prove that hover is
noticeable during interaction.

## Model boundary

The executable semantic model currently covers the Primary action state family,
Foundation hierarchy and text, Focus adjacent contrast and Oklab control
separation, Feedback label and pair relations, and Selection text and Surface
relations. It keeps four modeled concepts separate while leaving experiential
intent explicitly unmodeled:

- **constraint:** a requirement an automated evaluator can accept or reject;
- **invariant:** a structural property that must always hold;
- **relation:** an intended ordering between semantic roles;
- **strategy:** a replaceable mechanism that proposes candidate colors.

| Declaration ID                              | Kind       | Required evidence contract                   |
| ------------------------------------------- | ---------- | -------------------------------------------- |
| `shared-label-readable`                     | constraint | `evidence.primary-label-wcag.v1`             |
| `states-distinct`                           | invariant  | `evidence.primary-exported-states.v1`        |
| `active-continues-beyond-hover`             | relation   | `evidence.primary-state-progression.v1`      |
| `foundation-hierarchy-ordered`              | relation   | `evidence.foundation-hierarchy-decisions.v1` |
| `foundation-text-targets-pass`              | constraint | `evidence.foundation-text-wcag.v1`           |
| `focus-adjacent-contrast-passes`            | constraint | `evidence.focus-foundation-contrast.v2`      |
| `focus-control-oklab-separation-passes`     | relation   | `evidence.focus-semantic-separation.v1`      |
| `feedback-destructive-label-targets-pass`   | constraint | `evidence.destructive-label-wcag.v1`         |
| `feedback-warning-label-targets-pass`       | constraint | `evidence.warning-label-wcag.v1`             |
| `feedback-oklab-separation-passes`          | relation   | `evidence.feedback-oklab-separation.v1`      |
| `selection-text-target-passes`              | constraint | `evidence.selection-text-wcag.v1`            |
| `selection-surface-oklab-separation-passes` | relation   | `evidence.selection-surface-separation.v1`   |

The current lightness search is a heuristic strategy. Passing its distance
threshold is not evidence that hover is perceptually discoverable.

The aggregate model version identifies its serialized component and declaration
schema. The current automated 12-declaration boundary is
`v2-declarative-design@5` and remains model-scoped. Text evidence declares a
`typography-context.v1` usage context and WCAG `4.5:1` authority; APCA remains
diagnostic ranking evidence.

## Traceability contract

The executable model chains each research claim through stable identifiers:

```text
research question
  → semantic declaration
  → evidence contract
  → evaluator
  → evaluation instance
  → acceptance scenario
  → executable test
```

Each declaration names one registered evaluator and one or more evidence trace
contracts. These contracts state the expected producer, required observations,
evaluation scope, and claims they cannot establish. Their `requires` and
`cannotEstablish` fields are explanatory trace metadata rather than a general
runtime schema system. The owning automated producer still validates the actual
payload before the semantic evaluator consumes its verdict.

Evaluator metadata declares which declaration it owns and which declared
evidence trace it consumes. The registry dispatches the actual evaluator
function, and evaluation results carry those identifiers forward so the UI and
tests do not have to infer provenance from prose.

The fast unit gate validates the registry and acceptance manifest. It fails when:

- a declaration references an unknown evidence contract or evaluator;
- an evaluator claims another declaration or undeclared evidence;
- duplicate identifiers make a link ambiguous;
- a declaration lacks positive, contradictory, or missing-evidence coverage;
- an acceptance scenario names an unknown declaration or evaluator.

Each acceptance row supplies an executable context and expected status. The unit
suite invokes every row through its registered evaluator; metadata alone cannot
satisfy coverage. This does not prove the underlying design intent is universally
true. It proves that positive, contradictory, and missing evidence receive the
declared evaluation semantics and makes the reason for each test discoverable.

## Evaluation states

- `satisfied`: the declaration has the evidence type it requires and passes;
- `unsatisfied`: available evidence directly contradicts the declaration;
- `needs-review`: required automated evidence is absent or incomplete.

Missing or incomplete automated evidence also resolves to `needs-review`; an
empty evidence set must never pass by vacuous truth. Evidence that is complete
and directly contradicts a declaration resolves to `unsatisfied`.

An aggregate `satisfied` result means only that every currently modeled
measurable declaration passed. It does not establish overall palette quality,
hover discoverability, feedback meaning, selection discoverability, or complete
accessibility conformance. The runtime records no human score or observation.

## Human inspection projection

The applied specimen projects all 12 declaration identities into renderable
contexts, but it is not another semantic evaluator. The projection copies only
the declaration identity and relevant roles/context; it does not consume or
display that declaration's evaluation status. Policy rules, alias owners, and
presentation policy may also source inspection records without becoming
semantic declarations.

Source provenance and screen composition are independent axes. A declaration
may be shown in one native context or through several valid native contexts
aligned for comparison. Every record declares
`inspectionVerdictAuthority: "none"`: this scopes the non-claim to the rendered
inspection item while the upstream declaration retains its existing semantic
verdict authority. Open observation questions create no evidence contract,
evaluation instance, score, or reverse edge into generation or policy.

Consequently the inspection layer does not change the executable identity
`v2-declarative-design@5`, its 12 declarations, or the serialized semantic
result. New declarations for perceptual distinguishability, emphasis hierarchy,
or feedback meaning remain deferred until they have named evidence and evaluators.

## Deliberately not doing

- APCA is not used as a temporal default-to-hover distance metric.
- One surrounding surface is not treated as universal for exported action tokens.
- The current Oklab thresholds are not promoted from heuristic to empirical.
- This slice does not change generated colors.
- Strategies and metric thresholds are not promoted into semantic declarations.
- Utility-role declarations remain deferred until a non-alias relationship
  needs an executable semantic owner.

## Foundation and Focus boundary

Foundation hierarchy consumes the selected `foundation.hierarchy` decision
results for surface, raised surface, and muted surface in both modes. Foundation
text consumes the actual Body text, Text on surface, and Muted text WCAG checks.
The semantic evaluator does not repeat their numeric formulas or thresholds.
Their candidate-generation strategies remain owned by the palette policy and
are not represented in the semantic strategy registry in this slice.

Focus adjacent contrast consumes the final non-text contrast checks against
background, surface, and muted surface. Focus Oklab control separation consumes the selected
`focus.semantic-separation` decision result against Primary and Destructive.
These declarations prove the named automated relationships only. They do not
prove that one focus ring is noticeable for every person, component geometry,
input modality, or viewing condition; that broader experiential intent remains
unclaimed until a separate observation protocol exists.

## Current implementation slice

Maintain 12 automated declarations with positive, contradictory, and
missing-evidence acceptance scenarios for each, without changing palette
generation.

Success means the existing palette colors and pass/fail contract remain stable,
the new declarations are satisfied for the established representative input,
and missing or contradictory upstream evidence resolves honestly.

## Next slice

Review whether utility aliases need declarations beyond their existing
promotion contract. Human-study infrastructure is outside the current runtime
and roadmap.

## Feedback and Selection boundary

### Why Primary and Destructive are related

Primary represents the ordinary representative action. Destructive represents
an irreversible or hazardous action such as delete or remove. When both appear
in one interface, the model intends their role difference not to collapse into
nearly identical colors and leave labels or placement as the only signal.

The `feedback-oklab-separation-passes` relation is the current measurable
projection of that intent. Its evidence includes the final Brand → Destructive
Oklab check in both Light and Dark modes. Policy v16 generation does not reject
a candidate on this relation. The semantic evaluator consumes the recorded
final relationship after selection and does not select another color; a false
status remains visible.

This declaration currently describes the **context-free palette relation**, not
whether two filled buttons actually coexist. The accepted component hierarchy
uses Primary filled + Destructive outline when both roles are present and omits
ordinary Primary in destructive confirmation. A Dark-lighter joint diagnostic
showed that applying the palette relation unconditionally can conflict with the
shared foreground and complete Active family for red inputs. The executable
semantic declaration remains as review authority after ADR-0004 moved the
generation boundary. A future policy may still introduce a more specific
presentation-context evidence owner.

This relation establishes only that the declared numeric separation heuristic
passed. It does not establish that a viewer notices the difference, interprets
Destructive as dangerous, or can safely operate the interface without labels.
Those experiential claims remain outside the automated model.

Destructive and Warning label declarations each consume their own final WCAG
checks across default, hover, and active states. Their evidence contracts are
separate so one family can remain satisfied while the other is incomplete.
Feedback separation consumes the three final Brand/Destructive/Warning Oklab
pair checks. These declarations do not establish that a viewer interprets
either color as a particular meaning.

Selection text consumes the final Selected-content WCAG check, while Selection
surface separation consumes the final Surface-to-selection Oklab check. These
relations do not establish selection discoverability in a particular component
or interaction context.

The Selection text declaration is downstream of generation. Candidate selection
first uses `selection.text-contrast` to reject Selection backgrounds for which
neither black nor white reaches WCAG `4.5:1`. The selected background
then receives a concrete `selection text` token, and mode assembly recomputes the
final pair as the `Selected content` text contract. Only that final Light/Dark
contract evidence is consumed by `selection-text-target-passes`; the semantic
evaluator does not choose a background or text color and cannot rescue a failed
mode contract.
