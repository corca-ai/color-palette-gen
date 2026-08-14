# Palette evaluation research protocol

## Purpose

This protocol first collects bounded, latest-state annotations about generated
palettes in one browser. It does not measure universal preference, certify
accessibility, or automatically tune the generator. Its first use is to test
whether participants understand the distinction between measurable contracts,
diagnostics, and visual intent that still needs a person to judge an interactive
specimen.

## Research questions

- Can reviewers notice the primary hover state without judging it too strong
  for the fixed calm/minimal direction?
- Across the fixed cases, what candidate patterns appear by primary hue, source
  chroma, or Light/Dark mode? This purposive set cannot establish population
  effects.
- Do automated hover diagnostics help select cases for review without being
  mistaken for proof of discoverability?
- Which instructions or labels cause a local observation to be mistaken for a
  policy-level finding?

## Experimental unit and controlled context

One hover annotation is the tuple:

```text
(normalized primary, mode, policy version, specimen version, judgment, note)
```

Light and Dark are paired but separate annotations because their generated
states and surrounding contexts differ. The applied Primary button is the
controlled interactive specimen. Reviewers use pointer hover on the rendered
control rather than side-by-side swatches or keyboard focus. Device, display,
browser, ambient light, visual correction, and reviewer identity are not
currently recorded, so the present evidence is suitable for a task and
construct-clarity pilot but not a calibrated perception study.

The overall gallery rating is a different exploratory annotation. It describes
the whole palette card and must not be interpreted as mode-specific hover
evidence or used to promote a hover heuristic.

The representative gallery is an evaluation instrument, not evidence by
itself. It fixes 14 purposively selected primary inputs across hue, chroma,
achromatic, and large source-shift cases so policy behavior can be inspected
against the same cases.

## Rating meanings

Overall gallery annotations use these labels:

- **Prefer:** suitable for the public-reference applied specimen without a
  color adjustment.
- **Acceptable:** usable, but a documented alternative would also be reasonable.
- **Reject:** unsuitable for this input under the current fixed policy and
  specimen without further review or adjustment.

A short note should describe the visible reason rather than restating a metric.
Useful notes identify weak hierarchy, excessive brand movement, inconsistent
mode identity, or unnatural interaction pacing.

Hover evidence uses its own three judgments:

- **Meets intent:** noticeable without overpowering the fixed direction.
- **Too subtle:** the state change is not readily noticed in the specimen.
- **Too strong:** the state change overpowers the intended interaction pacing.

These labels operationalize the declared intent for this specimen. They are not
psychophysical measurements and do not establish how every person will see the
same colors.

## Storage and exchange

Overall gallery ratings remain in browser-local storage until explicitly
exported. Their JSON includes the policy version recorded with each rating.
Import accepts only the gallery evaluation schema, valid hex keys, known ratings,
and bounded text notes.

Hover records are different: they remain local-only, are not exported, and keep
only the latest Light/Dark annotation for each input, policy, and specimen key.
They have no participant, session, or run marker. Therefore current storage can
test task and construct clarity for one browser, but cannot preserve raw history,
establish independent reviews, or support disagreement analysis.

## Evidence boundary

One person's annotation does not promote a provisional threshold to empirical.
The current UI intentionally records latest local observations without tuning
the engine. Independent review and evidence-class changes remain blocked until
a separately specified collection boundary can retain raw hover observations,
mark independent runs, export them safely, define an aggregation method, and
report disagreement.

Automated APCA, WCAG contrast, Oklab Delta E, CIEDE2000, duplicate, and context
trajectory results remain separate fields with separate meanings. They may
prioritize a case for review or help explain a judgment. None can substitute for
the recorded hover observation, and an observation cannot override a failed
declared automated contract.

In the current semantic model, `satisfied` and `unsatisfied` describe whether a
current reviewer-specific, version-matched specimen record completes or
contradicts this evaluation instance. They do not establish policy-level hover
discoverability across reviewers, devices, or contexts.

## Pilot procedure

1. Use the built public artifact and keep browser zoom at its normal setting.
   The system binds policy and specimen versions automatically; verify them in
   the stored-evidence inventory after saving.
2. Move a hover-capable pointer onto and off the actual Light Primary button,
   then record the Light judgment and a visible reason. If hover cannot be
   produced, do not substitute focus; record the case as not observed outside
   the current UI.
3. Repeat for Dark as a paired judgment. Mode order and carryover are not
   controlled in this pilot.
4. Use the representative gallery only after judging the current input. Its
   automated shortlist may choose cases but must not be treated as the expected
   rating.
5. Do not change a generation constant during the same pilot. The current UI
   overwrites a case's previous local annotation, so it must not be described as
   raw-history or disagreement preservation.

## Interpretation and promotion rule

This pilot may reveal confusing instructions, missing context, or candidate
hypotheses. It cannot make a heuristic empirical. After an append-only,
exportable independent-observation boundary exists, a later policy study must:

1. state one falsifiable hypothesis and the affected input/mode cohort;
2. freeze the policy, specimen, input set, and aggregation method for the round;
3. collect multiple independent observations;
4. report counts and disagreement for each mode and declared cohort;
5. compare the proposed change in the same specimen without discarding negative
   results;
6. version the policy and update tests and rationale together if the evidence
   supports a change.

No universal numeric hover threshold is assumed. A result may instead show that
the current model needs another contextual variable or that reviewer agreement
is insufficient to promote a rule.

## Fixed decisions

- The current study uses the one-primary, paired Light/Dark, calm/minimal policy.
- Automated contracts, diagnostics, overall palette ratings, and hover
  judgments remain distinct evidence types.
- Mode-specific hover judgments use pointer hover on the actual applied control.
  Focus remains a separate interaction state.
- One person's judgment cannot change generation policy.

## Probe questions

- Do participants understand the difference between an overall palette rating
  and a mode-specific hover judgment?
- Are the three hover judgments and note prompt sufficient to reproduce the
  visible concern?
- Can participants distinguish policy, generated specimen, diagnostic, and
  reviewer observation?
- Can participants use the visible shortlist without treating its diagnostics
  as the expected answer? This pilot can reveal confusion, not measure a causal
  anchoring effect.

Answers are written into `Pilot record` below before the protocol or collection
schema expands.

## Deferred decisions

- Reviewer/session markers and hover export reopen before independent
  cross-review collection begins.
- Display, browser, ambient-light, visual-correction, or demographic fields
  reopen only if comparisons across viewing conditions or participant groups
  are proposed.
- Randomized or blinded ordering reopens before testing shortlist anchoring or
  comparative policy outcomes.
- A statistical aggregation method and minimum sample size reopen after the
  pilot stabilizes task wording and the observation schema.
- Additional design recipes or component specimens reopen when a named research
  question cannot be answered by the current fixed policy and specimen.

## Current executable checks

- `unit`: matching, stale, incomplete, and contradictory Light/Dark hover
  records resolve the `hover-discoverable` instance without allowing empty
  evidence to pass.
- `e2e`: the actual applied Primary buttons expose distinct hover, pressed, and
  keyboard focus states, and saved mode-specific judgments survive reload.
- `unit`: hover diagnostics cannot satisfy `hover-discoverable` and do not
  redefine deterministic palette pass/fail.

## Current pilot exit observations

- `manual`: a first-time participant can identify which controls record Light
  hover, Dark hover, and overall palette annotations without facilitator
  correction; confusion is recorded below as a protocol failure, not user error.
- `manual`: a participant can explain that automated checks, diagnostics, and a
  local hover annotation make different claims.
- `manual`: inability to produce pointer hover is recorded as not observed, not
  converted into a focus judgment.

## Future study gates

- `unit`: an append-only hover exchange format preserves revised and negative
  observations and rejects malformed or incompatible records.
- `manual`: an analysis report preserves counts and disagreement by mode and
  declared cohort and labels policy recommendations separately from
  observations.

## Pilot record

Status: not run. Record participant-facing ambiguity, protocol failures, and
candidate schema changes here before expanding collection. Do not place private
inputs, reviewer identity, or other sensitive information in this public file.

## Deliberately not doing

- Treating a polished interface as evidence that the palette policy is valid.
- Optimizing product conversion, retention, or sharing before a research need
  requires those surfaces.
- Adding a composite quality score that collapses unlike evidence types.
- Claiming the pilot represents all viewers or implementation contexts.
- Treating overall gallery ratings as evidence for the first hover pilot.

## Local hover evidence management

The applied specimen exposes a browser-local inventory of saved hover evidence.
It reports stored records and per-mode judgments, shows the versioned record, and
supports a two-step clear action. Clearing this boundary does not clear overall
gallery ratings. Hover evidence remains local-only and is not included in the
gallery rating export.
