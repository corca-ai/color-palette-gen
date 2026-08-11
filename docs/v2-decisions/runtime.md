# Runtime and performance boundary

The engine remains a deterministic JavaScript module. The browser UI does not
change its selection rules for performance.

## Interactive generation

New primary inputs run in a module Web Worker. The form exposes a busy state and
reports measured worker duration when the result returns. Repeated normalized
inputs reuse the complete in-memory result. The synchronous path exists only as
a compatibility fallback when workers are unavailable.

## Evaluation gallery

The fixed 12-input evaluation set is generated during `npm run build`. Its
static JSON contains only the values and paired-quality summary required to draw
the gallery, not the much larger candidate traces. Opening the gallery therefore
performs no palette search. Loading one card requests its complete inspectable
result from the worker and then caches it.

The generated file includes its policy version. It must be rebuilt whenever the
engine policy changes; the normal site build already enforces that coupling.

## Regression coverage

Node tests cover the full 216-color RGB grid and named edge inputs. Playwright
covers worker generation, lazy static gallery loading, persistence, graph/card
synchronization, and fixed screenshots of the paired palettes and Craken
specimen.
