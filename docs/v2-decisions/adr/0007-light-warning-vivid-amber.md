# ADR-0007: Light Warning vivid amber

- Status: **Accepted**
- Date: 2026-08-21
- Primary migration kind: generation/eligibility
- Coupled migration kinds: ranking and policy schema/version
- Production identity: result schema `3`, policy `v2-policy-model-19`, semantic model `v2-declarative-design@5`
- Decision evidence: [Light Warning appearance diagnostic](../research/warning-appearance.md)

## Before and after law

- **Before:** Light Warning searched `L [.52,.72]` with preferred `L .65` and shared requested `C .14`, producing the muddy `#B48700` family on the reviewed inputs.
- **After:** Light Warning searches `L [.52,.82]` with preferred `L .78` and requested `C .18`, producing the operator-selected vivid amber `#E6AD00` family; Dark keeps its existing `L [.62,.80]`, preferred `L .72`, and requested `C .14` law.

## Retired claims

- `#B48700 / #BF921C / #CD9F30` is no longer the production Light Warning family.
- Light and Dark no longer share one Warning chroma request merely because the original policy stored one scalar.
- The five-arm Warning page is no longer awaiting a choice; higher-lightness amber is accepted and the orangeward/yellowward arms are rejected.
- The v18 Warning numeric recipe and tests are no longer current production truth.

## Context

The first diagnostic showed that Warning had ample passing candidates but ranked
toward an arbitrary `L .65/C .14/h 85°` anchor. Raising requested chroma alone did
not change the rendered sRGB color because gamut mapping reduced it to the same
boundary. Human review found the combined `L .70/C .18` arm least bad but still
muddy.

The second comparison therefore moved only axes that changed rendered output:
more lightness and bounded hue alternatives. The operator accepted the higher
lightness Default direction and rejected the orangeward and yellowward variants.
The recipe's Hover, Pressed, and black Text are generated consequences retained
because the complete family passes the existing contracts; they were not
separately accepted as aesthetic decisions.

## Decision

1. Light Warning uses preferred `L .78`, requested `C .18`, anchor hue `85°`, and
   range `[.52,.82]`.
2. The existing `[70°,85°,100°]` candidate inventory remains. A fixed-`85°`
   counterfactual and the existing inventory produced the same selected
   `#E6AD00` in all fixed 216 inputs, so narrowing the general search structure
   adds no value.
3. Dark Warning remains unreviewed by this experiment and keeps preferred
   `L .72`, requested `C .14`, and range `[.62,.80]`.
4. `warningChroma` becomes mode-scoped so the Light decision cannot silently
   change Dark.
5. Existing label contrast, Primary/Destructive Oklab separation, state distance,
   monotonicity, and independent Warning Text rules remain authoritative in their
   prior scopes.

The selected Light family is `#E6AD00` Default, `#F3B924` Hover, `#FFC640`
Pressed, and `#000000` Text after deterministic sRGB gamut mapping.

## Role × Mode × Context × State review

| Role / family | Mode  | Context                         | States                       | Owner and disposition                                      |
| ------------- | ----- | ------------------------------- | ---------------------------- | ---------------------------------------------------------- |
| Warning       | Light | feedback alert and warning action | Default/Hover/Active/Text     | Default direction accepted; producer generates contract-passing states/text |
| Warning       | Dark  | feedback alert and warning action | Default/Hover/Active/Text     | intentionally unchanged; no Light-only judgment propagated |
| Primary       | both  | filled brand actions              | complete family              | frozen input to Warning separation                         |
| Destructive   | both  | destructive feedback/actions      | complete family              | frozen input to Warning separation                         |
| Feedback      | Light | Warning specimen                   | icon, label, fill, states     | color remains insufficient without icon or label           |
| Pair selection | both | Light × Dark bundles               | selected pair and evidence   | Warning is not a Primary pair-eligibility objective         |

The producer is `V2_POLICY.feedback` plus `warningFamilySelection`. Generated
contracts decide candidate eligibility; the selected-result review and semantic
verdicts continue to report their own scopes without becoming generation gates.
Generator and export consume only the current production family. The Warning
review page owns presentation of the accepted Default direction and historical
arms, while About and Reference explain the algorithm and notation. The v2 spec,
ontology, rules, role policy, this ADR, and executable tests own the normative
and regression projections of the migration.

## Bounded evidence

Both the retained three-hue inventory and a fixed `85°` inventory completed
`216/216` RGB-grid inputs with one selected default, zero exhaustion, minimum
family label contrast `10.34:1`, minimum Primary distance `.244`, and minimum
Destructive distance `.294`. This establishes feasibility inside the fixed
corpus. It does not establish universal availability, Warning recognition, or
aesthetic optimality.

Run `npm run test:warning-policy-migration` to reproduce the 216-input inventory
equivalence, the three published minima, and the full Dark-family baseline
digest used by this decision.

The complete adversarial report kept its v18 population counts exactly:
`148/216` signaled inputs, zero generated-contract failures, `59` hue-review
flagged inputs, and `120` failed hue-check occurrences. Light Warning keeps the
same selected hue, so the 54 Primary–Warning hue findings remain honest rather
than disappearing because the fill became brighter. The strict text-policy
counterfactual still generates `0/14`; its former one `light.warning` exit now
continues to `dark.primary`, reattributing the exit without adding a failure.

## Deliberately not doing

- Do not change Dark Warning without a Dark-mode visual disposition.
- Do not replace the existing hue inventory with a single hue when both produce
  identical selected results in the reviewed corpus.
- Do not claim requested `C .18` is realized literally; selected `#E6AD00`
  measures near `C .160` after sRGB gamut mapping.
- Do not turn the operator's bounded preference into a universal perceptual rule.

## Acceptance

- Representative and fixed-grid Light results use the family generated from the
  accepted Default recipe direction.
- Dark Warning values remain byte-for-byte unchanged across the fixed 216-input
  corpus.
- All 216 fixed inputs complete generated contracts with no candidate exhaustion.
- Changed adversarial counts are interpreted as Warning-result consequences, not
  perceptual quality scores.
- Policy, ontology, rule explanation, public walkthrough, tests, and historical
  comparison surface identify v19 consistently.
