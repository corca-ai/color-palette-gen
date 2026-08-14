# Declarative design semantic model

## Problem

A formula and a test that repeat the same constant can prove implementation
consistency without proving design intent. An Oklab distance floor can prove
that two exported colors differ; it cannot by itself prove that hover is
noticeable during interaction.

## Model boundary

The first executable semantic model covers the primary action state family. It
keeps five concepts separate:

- **constraint:** a requirement an automated evaluator can accept or reject;
- **invariant:** a structural property that must always hold;
- **relation:** an intended ordering between semantic roles;
- **intent:** a human-facing outcome that may require judgment evidence;
- **strategy:** a replaceable mechanism that proposes candidate colors.

| Declaration ID                  | Kind       | Required evidence contract              |
| ------------------------------- | ---------- | --------------------------------------- |
| `shared-label-readable`         | constraint | `evidence.primary-label-apca.v1`        |
| `states-distinct`               | invariant  | `evidence.primary-exported-states.v1`   |
| `active-continues-beyond-hover` | relation   | `evidence.primary-state-progression.v1` |
| `hover-discoverable`            | intent     | `evidence.interactive-hover-rating.v1`  |

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
- Foundation, focus, feedback, and selection declarations remain deferred until
  the Primary action trace proves the registry shape is useful.

## Current evidence capture

The applied example keeps the judgment controls beside the real interactive
button. Records stay in browser-local storage and are not mixed into the palette
generator or exported token payload. This preserves the distinction between a
deterministic palette result and reviewer-specific experiential evidence.

## Current implementation slice

Migrate the four existing Primary action declarations without changing their
evaluation behavior. Add registered evidence/evaluator metadata, carry the trace
through evaluation results, and require positive, contradictory, and
missing-evidence acceptance scenarios for every declaration.

Success means the existing palette outputs and status semantics remain stable
while a missing or dangling trace link fails the fast unit gate.

## Next slice

Model Foundation hierarchy and Focus visibility only after reviewing whether the
Primary trace improves explanation and maintenance. Human-rating expansion
remains separate from that structural work.
