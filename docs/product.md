# Product direction and roadmap

> Status: **Normative product direction.** This document owns the current
> research purpose, sequencing, and deferred product scope. Executable palette
> behavior remains in [the v2 specification](v2-spec.md).

## Research purpose

Study the behavior and limits of a versioned declarative palette policy: how one
key color can become reusable light and dark semantic UI palettes when design
intent, generation strategies, automated checks, and unmeasured perceptual
claims remain explicitly separate. Each generated palette and its applied
interface form an observable specimen; inspectable decision evidence makes the
policy's behavior reproducible and contestable. The retained v1 experiment
separately explores additional colors and an optional desired mood.

This is a public research prototype, not a claim that palette quality can be
fully automated and not a production-readiness or accessibility-certification
service.

## Current research questions

1. Which parts of a small declarative design model can be expressed as
   constraints, invariants, relations, and experiential intent?
2. Which declarations can be evaluated from generated color values, and which
   require observation in an interactive specimen?
3. Can decision records and counterfactuals expose when a passing formula does
   not establish the intended visual outcome?
4. Across varied primary colors and Light/Dark modes, where do automated
   diagnostics expose hierarchy, source-fidelity, and interaction-state risks?
5. What evidence would be sufficient to replace a provisional heuristic without
   turning one metric into a universal perceptual rule?

## Readers and public story

No single customer group is designated. Designers and developers can inspect
palettes, interaction specimens, and decision evidence. The runtime does not
collect scores, notes, judgments, or observations.

The site leads with a tabbed applied-sample surface and then a compact generated
palette so visual judgment has concrete component contexts. Workspace, routine
actions, destructive confirmation, feedback/selection, and form/focus tabs
reuse the same generated result without exposing superseded experiment controls.
It then offers progressively deeper decision evidence, relationship explanation,
and explicit contract validation. On-demand diagnostics remain reproducible in
the repository instead of competing with the accepted behavior in Generator.

The public About surface starts from one complete `#FF0000` generation trace:
source measurement and preservation, Foundation, Primary family, Destructive,
Warning, Selection/Focus, Light×Dark pairing, and scoped review evidence. Each
stage links directly to the formula and numeric-policy reference that governs
it. Ontology and rule indexes are supporting references, not prerequisites for
understanding the first walkthrough.

The project may support internal services while remaining publicly available as
a general-purpose open-source prototype. Public documentation and UI must stand
on public evidence and must not expose or imply private consumer relationships.

## Research posture

- Prefer falsifiable questions and versioned automated evidence over feature breadth.
- Treat the default state as the primary visual acceptance surface. Hover and
  active feasibility must not silently optimize an unattractive resting fill.
- Require Light and Dark to read as one system without assuming they must use
  the same numerical state direction. Human comparison owns that visual
  judgment; automated checks supply bounded supporting evidence.
- Keep automated evidence from standing in for unmeasured human perception.
- Treat the current `calm and minimal` direction as one fixed research policy,
  not as proof that it is a universal palette style.
- Add inputs, recipes, exports, or delivery surfaces only when they answer a
  named research question or make an experiment reproducible.
- Do not tune generation from an informal visual impression or a single metric.

## Immediate sequence

1. Keep the 12-declaration automated semantic trace synchronized with normative
   WCAG text/non-text evidence, APCA diagnostic ranking, Oklab, typography
   contexts, and selected-decision producers.
2. Use the fixed 14-input diagnostic set to expose metric extremes,
   convergence, source shifts, and mode differences without collecting scores.
3. Test one narrowly stated heuristic hypothesis at a time. Exit only when the
   evidence can support retaining, revising, or rejecting it without treating an
   unrelated metric as a proxy for perception.

## Completed decisions

- Popover and disabled roles remain documented semantic aliases. Independent
  search is deferred until a reproducible public component case demonstrates a
  distinct duty that the source role cannot meet. See
  [Utility role aliases](v2-decisions/policy/utility-role-aliases.md).
- Policy v16 adopts a hue-independent mode-relative filled-action grammar:
  Light gets darker, Dark gets lighter, and both Primary/Destructive families
  share one foreground per mode. The rejected v15 behavior, warning ledger, and
  operator decision are recorded in
  [ADR-0004](v2-decisions/adr/0004-mode-relative-filled-actions-and-contextual-separation.md).
- Primary and Destructive keep distinct visual families for every source hue.
  Component hierarchy permits one filled action per action group: ordinary
  coexistence uses Primary filled plus Destructive outline; destructive
  confirmation uses Destructive filled plus secondary Cancel. Red-band remains
  a diagnostic rather than a presentation switch. The operator-reviewed rule
  is recorded by
  [ADR-0003](v2-decisions/adr/0003-single-filled-action-hierarchy.md).
- Destructive confirmation derives a lower-amplitude Secondary Cancel family
  from its actual Muted Surface context. It follows the same Light-darker /
  Dark-lighter direction as the filled Destructive sibling while preserving
  WCAG normal-text contrast. Focus eligibility now covers Muted Surface as an
  actual presentation context. See
  [ADR-0006](v2-decisions/adr/0006-context-derived-secondary-action-states.md).

## Deferred

- User accounts, server-side storage, and sharing infrastructure.
- Additional style recipes, vibe controls, and broader input taxonomies until a
  named research question requires them.
- A stable public package, CLI, or service API until the research result schema
  is stable enough to support a compatibility promise.
- Claims of accessibility certification or production suitability.
- In-app human scoring, notes, observation storage, or evaluation exchange.
- Empirical calibration or human-study infrastructure unless a new, explicit
  research decision adds it outside the current runtime scope.
- Publication of internal service details or private-resource content.
