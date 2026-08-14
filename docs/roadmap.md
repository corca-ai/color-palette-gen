# Roadmap

## Immediate research sequence

1. Keep the 12-declaration automated semantic trace synchronized with its APCA,
   WCAG contrast, Oklab, and selected-decision producers.
2. Use the fixed 14-input diagnostic set to expose metric extremes,
   convergence, source shifts, and mode differences without collecting scores.
3. Test one narrowly stated heuristic hypothesis at a time. Exit only when the
   evidence can support retaining, revising, or rejecting it without treating an
   unrelated metric as a proxy for perception.

## Completed decisions

- Popover and disabled roles remain documented semantic aliases. Independent
  search is deferred until a reproducible public component case demonstrates a
  distinct duty that the source role cannot meet. See
  [Utility role aliases](v2-decisions/utility-role-aliases.md).

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
