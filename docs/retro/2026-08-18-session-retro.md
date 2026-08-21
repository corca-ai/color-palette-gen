# Session Retro
Date: 2026-08-18

## Context

The public color-system documentation was repeatedly corrected by the user after
first-touch reading exposed missing definitions, incomplete rule lists, and links
whose destinations did not answer the question that triggered the link.

## Evidence Summary

- The About walkthrough linked “7 eligibility checks” to a Reference section
  that documented only three cross-mode checks.
- User questions separately exposed missing first-touch explanations for input
  classification, state-distance thresholds, ΔE, and gamut mapping.
- `test/v2-color-system-doc.test.js` previously asserted anchor presence and a
  few phrases, but not scenario completeness.
- No host-derived turn or token metrics were used; this retro is narrative.

## Waste

I verified that documentation sections and anchors existed instead of walking a
novice scenario and checking whether each linked destination fully answered its
triggering question. This shifted information-architecture testing onto the
user and caused serial patches that a single reader-question inventory would
have exposed together.

## Critical Decisions

- Make one concrete `#FF0000` journey the primary reading path; ontology and
  numeric indexes are supporting references.
- Add a first-reader FAQ derived from that journey.
- Treat count claims such as “7 checks” as completeness contracts: the target
  must enumerate all seven stable IDs and explain their formulas and effects.

## North Star Alignment

`docs/product.md` says evidence must make policy behavior reproducible and
contestable. The implementation preserved inspectability but mis-applied
progressive disclosure: it hid prerequisites rather than revealing detail at
the moment a reader needed it. The corrected structure restores the public
research goal without claiming automated perceptual quality.

## Expert Counterfactuals

- Reader-task lens: start with “I entered red; what happened next?” and record
  every question before designing the page hierarchy. This would have surfaced
  classification, gamut, state, role, pair, and verdict questions in one pass.
- Engelbart system-improving lens: improve the documentation method and its test
  harness together. A scenario/FAQ without assertions would decay; anchor tests
  without scenario semantics repeat the original failure.

## Sibling Search

- same layer: `v2/about.html` rule links | decision: same waste, fix now | proof: added concrete walkthrough and twelve-question FAQ
- abstraction up: `v2/reference.html` count/term destinations | decision: same waste, fix now | proof: added input classification, full state formula, gamut strategy, and all seven pair IDs
- specialization down: `test/v2-color-system-doc.test.js` | decision: same waste, fix now | proof: pins scenario anchors, formulas, IDs, and FAQ links
- mental-model siblings: research reports and maintainer docs | decision: intentional boundary | proof: they serve evidence review rather than first-reader instruction and retain separate ownership

## Next Improvements

- workflow: run one novice input journey and FAQ extraction before calling a first-touch page complete.
- capability: test every public numeric/count claim against its complete stable-ID or formula destination.
- memory: retain this retro and the FAQ as the next documentation review checklist.

## Persisted

Persisted: yes: docs/retro/2026-08-18-session-retro.md
