# Implementation status

Current policy version: `v2-justification-1`.

## Candidate search implemented

- primary default;
- primary hover;
- primary active;
- destructive.

These roles retain selected, closest rejected, and next passing candidates when
available.

## Policy anchors

- neutral foundations;
- foreground and muted text;
- decorative and input boundaries;
- primary and destructive text;
- focus-ring alias.

Anchors expose intent and provenance but do not claim that alternatives were
searched.

## Verification

- every semantic role must have a selected decision and provenance;
- searched roles must retain a counterfactual candidate;
- text and non-text contracts run across a 216-color RGB grid;
- v1 and v2 remain separate applications.

## Next migration

1. Move neutral hierarchy and tint into bounded candidate search.
2. Represent black/white text comparison as a complete search trace.
3. Search input boundary and focus independently instead of relying on anchors.
4. Resolve Craken token gaps: distinct popover, accent, secondary, warning,
   disabled, and destructive interaction states.
5. Build a representative palette gallery and designer rating protocol.
6. Promote thresholds from `heuristic` to `empirical` only with recorded data.
