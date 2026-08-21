# ADR-0005: WCAG normal-text generation authority

- Status: Accepted
- Date: 2026-08-21
- Production identity: result schema `3`, policy `v2-policy-model-17`, semantic model `v2-declarative-design@4`
- Primary migration kinds: generation/eligibility, authority, schema/version

## Decision

Before this ADR, role-specific APCA Lc thresholds decided whether generated text
candidates were eligible. WCAG `4.5:1` was retained as non-authoritative
diagnostic evidence.

After this ADR, every generated text use declared as `normal-text` must reach
WCAG 2.2 contrast `4.5:1` against every background in its role context. Among
eligible black/white candidates, the engine keeps the existing weakest-APCA
score as a diagnostic ranking objective. APCA is no longer generated-contract
authority and its legacy `75/60` targets are not conformance claims.

Each final text check carries a versioned typography context. The current
contexts mirror the applied specimen rather than assuming larger type: body
`11px/400`, muted UI `9px/400`, action labels `11px/650`, warning labels
`10px/650`, and selection text `10px/400`. All remain WCAG normal text. A
consumer using different typography must declare that context in its own
contract; the color token does not silently own typography.

## Why

The previous system could generate a palette that passed its APCA heuristic but
failed the project's declared compact normal-text use at WCAG `4.5:1`. That
made generated-contract success and the applied example disagree.
The new boundary makes the minimum public requirement authoritative while
retaining APCA's polarity-sensitive score as useful, explicitly non-authoritative
ranking evidence.

## Falsifiers and evidence

Before changing production, the existing bounded inventory was run with WCAG
eligibility over the complete 216-input diagnostic grid: `216/216` generated
and no generation failures occurred. The fixed 14-input report then produced:

| Arm                                      | Generated | Generated contracts | Reference compatibility | Meaning                     |
| ---------------------------------------- | --------: | ------------------: | ----------------------: | --------------------------- |
| WCAG eligible + APCA ranked (production) |     14/14 |               14/14 |                   14/14 | adopted                     |
| APCA only (historical)                   |     14/14 |                0/14 |                    0/14 | diagnostic only             |
| WCAG only                                |     14/14 |               14/14 |                   14/14 | same outputs on this corpus |
| APCA ∩ WCAG                              |      0/14 |                0/14 |                    0/14 | current inventory exhausted |

The strict intersection fails because independent thresholds remove every
candidate in the bounded search; most failures occur at Dark Primary, with one
Light Warning failure. This does not prove the metrics are universally
incompatible, nor does successful generation prove visual quality or complete
accessibility.

## Role × Mode × Context × State review

| Family          | Modes       | Contexts and states                                             | Owner of intentional difference                       |
| --------------- | ----------- | --------------------------------------------------------------- | ----------------------------------------------------- |
| Foundation text | Light, Dark | body on Background/Surface; muted text on its declared surfaces | `foundationPalette`, body/muted typography contexts   |
| Primary         | Light, Dark | one foreground across default/hover/active                      | Primary producer and shared-action foreground policy  |
| Destructive     | Light, Dark | same mode foreground rule as Primary across all states          | Destructive family transaction                        |
| Warning         | Light, Dark | independent foreground across default/hover/active              | Warning producer; distinct warning typography context |
| Selection       | Light, Dark | selected text on Selection fill                                 | Selection producer                                    |

Focus and required boundaries remain WCAG non-text `3:1`. State direction,
Oklab separation, source fidelity, pair selection, and contextual presentation
are unchanged.

## Retired claims

- APCA Lc thresholds own production text eligibility.
- WCAG normal-text contrast is downstream diagnostic-only.
- APCA-named semantic evidence is authoritative for text declarations.
- The APCA-only diagnostic arm must reproduce production output.

## Consequences and nonclaims

- Result schema moves from `2` to `3`; semantic model moves from `@3` to `@4`.
- APCA formula verification remains useful and pinned, but APCA target
  calibration is still `legacy-provisional`.
- Passing color-pair checks is not accessibility certification. Typography,
  DOM semantics, focus behavior, motion, and human visual review remain outside
  the generated color contract.
