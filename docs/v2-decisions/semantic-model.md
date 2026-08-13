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

| Declaration | Kind | Required evidence |
| --- | --- | --- |
| One label remains readable across all primary states | constraint | APCA checks for the actual label/fill pairs |
| Default, hover, and active export as distinct colors | invariant | final sRGB values |
| Active continues beyond hover in the same direction | relation | state progression evaluation |
| Hover is noticeable without overpowering brand identity | intent | recorded interactive specimen rating |

The current lightness search is a heuristic strategy. Passing its distance
threshold is not evidence that `hover-discoverable` is satisfied.

## Evaluation states

- `satisfied`: the declaration has the evidence type it requires and passes;
- `unsatisfied`: available evidence directly contradicts the declaration;
- `needs-review`: required judgment evidence is absent or insufficient.

Missing or incomplete automated evidence also resolves to `needs-review`; an
empty evidence set must never pass by vacuous truth. Evidence that is complete
and directly contradicts a declaration resolves to `unsatisfied`.

Automated checks must not convert `needs-review` into `satisfied`. A future
rating record must identify the input, mode, specimen, policy version, judgment,
and note before it can satisfy a judgment-backed intent.

## Deliberately not doing

- APCA is not used as a temporal default-to-hover distance metric.
- One surrounding surface is not treated as universal for exported action tokens.
- The current Oklab thresholds are not promoted from heuristic to empirical.
- This slice does not change generated colors.

## Next slice

Define a versioned interactive-specimen rating record and evaluate representative
inputs in Light and Dark before changing the hover candidate strategy.
