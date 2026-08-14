# Declarative design semantic model

## Problem

A formula and a test that repeat the same constant can prove implementation
consistency without proving design intent. An Oklab distance floor can prove
that two exported colors differ; it cannot by itself prove that hover is
noticeable during interaction.

## Model boundary

The executable semantic model currently covers the Primary action state family,
Foundation hierarchy and text, and Focus adjacent contrast and Oklab control
separation. It keeps five concepts separate:

- **constraint:** a requirement an automated evaluator can accept or reject;
- **invariant:** a structural property that must always hold;
- **relation:** an intended ordering between semantic roles;
- **intent:** a human-facing outcome that may require judgment evidence;
- **strategy:** a replaceable mechanism that proposes candidate colors.

| Declaration ID                          | Kind       | Required evidence contract                   |
| --------------------------------------- | ---------- | -------------------------------------------- |
| `shared-label-readable`                 | constraint | `evidence.primary-label-apca.v1`             |
| `states-distinct`                       | invariant  | `evidence.primary-exported-states.v1`        |
| `active-continues-beyond-hover`         | relation   | `evidence.primary-state-progression.v1`      |
| `hover-discoverable`                    | intent     | `evidence.interactive-hover-rating.v1`       |
| `foundation-hierarchy-ordered`          | relation   | `evidence.foundation-hierarchy-decisions.v1` |
| `foundation-text-targets-pass`          | constraint | `evidence.foundation-text-apca.v1`           |
| `focus-adjacent-contrast-passes`        | constraint | `evidence.focus-foundation-contrast.v1`      |
| `focus-control-oklab-separation-passes` | relation   | `evidence.focus-semantic-separation.v1`      |

The current lightness search is a heuristic strategy. Passing its distance
threshold is not evidence that `hover-discoverable` is satisfied.

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
runtime schema system. The owning producer still validates the actual payload;
for example, `hover-evaluation.js` validates and normalizes versioned human
records before the semantic evaluator consumes its verdict. The semantic layer
also rejects logically impossible summaries such as complete human evidence
without a record.

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
- `needs-review`: required judgment evidence is absent or insufficient.

Missing or incomplete automated evidence also resolves to `needs-review`; an
empty evidence set must never pass by vacuous truth. Evidence that is complete
and directly contradicts a declaration resolves to `unsatisfied`.

Automated checks must not convert `needs-review` into `satisfied`. The versioned
`color-lab-hover-evaluation-1` record identifies the input, specimen, policy
version, and a judgment plus note for each mode. Only matching Light and Dark
records that both judge the applied Primary button as `meets-intent` satisfy the
judgment-backed intent. `too-subtle` or `too-strong` is contradictory evidence;
missing, stale, or incomplete evidence remains `needs-review`.

## Deliberately not doing

- APCA is not used as a temporal default-to-hover distance metric.
- One surrounding surface is not treated as universal for exported action tokens.
- The current Oklab thresholds are not promoted from heuristic to empirical.
- This slice does not change generated colors.
- Strategies and metric thresholds are not promoted into semantic declarations.
- Feedback, selection, and utility-role declarations remain deferred until the
  combined trace proves the registry shape is useful.

## Current evidence capture

The applied example keeps the judgment controls beside the real interactive
button. Records stay in browser-local storage and are not mixed into the palette
generator or exported token payload. This preserves the distinction between a
deterministic palette result and reviewer-specific experiential evidence.

## Foundation and Focus boundary

Foundation hierarchy consumes the selected `foundation.hierarchy` decision
results for surface, raised surface, and muted surface in both modes. Foundation
text consumes the actual Body text, Text on surface, and Muted text APCA checks.
The semantic evaluator does not repeat their numeric formulas or thresholds.
Their candidate-generation strategies remain owned by the palette policy and
are not represented in the semantic strategy registry in this slice.

Focus adjacent contrast consumes the final non-text contrast checks against
background and surface. Focus Oklab control separation consumes the selected
`focus.semantic-separation` decision result against Primary and Destructive.
These declarations prove the named automated relationships only. They do not
prove that one focus ring is noticeable for every person, component geometry,
input modality, or viewing condition; that broader experiential intent remains
unclaimed until a separate observation protocol exists.

## Current implementation slice

Add four Foundation and Focus declarations by consuming existing decision and
check outputs without changing palette generation. Carry their trace through the
same evaluation result and require positive, contradictory, and missing-evidence
acceptance scenarios for each declaration.

Success means the existing palette colors and pass/fail contract remain stable,
the new declarations are satisfied for the established representative input,
and missing or contradictory upstream evidence resolves honestly.

## Next slice

Review whether the combined trace improves explanation and maintenance before
adding Feedback, Selection, or utility-role declarations. Human-rating expansion
remains separate from structural modeling.
