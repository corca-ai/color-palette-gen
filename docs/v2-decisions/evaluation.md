# Designer evaluation protocol

The representative gallery is an evaluation instrument, not evidence by
itself. It fixes 12 primary inputs across hue, chroma, achromatic, and large
source-shift cases so policy changes can be compared against the same set.

## Rating meanings

- **Prefer:** suitable for the intended Craken application without a color
  adjustment.
- **Acceptable:** usable, but a documented alternative would also be reasonable.
- **Reject:** the palette or state family should not ship for this input.

A short note should describe the visible reason rather than restating a metric.
Useful notes identify weak hierarchy, excessive brand movement, inconsistent
mode identity, or unnatural interaction pacing.

## Storage and exchange

Ratings remain in browser-local storage until explicitly exported. JSON exports
include the policy version recorded with each rating, because a judgment cannot
be interpreted independently from the policy that produced its palette. Import
accepts only the evaluation schema, valid hex keys, known ratings, and bounded
text notes.

## Evidence boundary

One person's rating does not promote a provisional threshold to empirical.
Before changing evidence class, collect multiple independent reviews, retain
the raw exports, define an aggregation method, and report disagreement. The
current UI intentionally records observations without automatically tuning the
engine from them.
