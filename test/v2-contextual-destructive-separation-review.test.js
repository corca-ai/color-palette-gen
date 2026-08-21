import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  CONTEXTUAL_REVIEW_COHORTS,
  buildContextualDestructiveSeparationReviewCase,
  contextualReviewCohort,
} from "../v2/lib/contextual-destructive-separation-review.js";
import { generatePaletteV2 } from "../v2/lib/palette.js";

test("review cohorts bind the exact warning queues and remain diagnostic-only", () => {
  assert.equal(CONTEXTUAL_REVIEW_COHORTS.separation.inputs.length, 22);
  assert.equal(CONTEXTUAL_REVIEW_COHORTS.sourceFidelity.inputs.length, 9);
  assert.equal(contextualReviewCohort("separation").inputs[11], "#FF0000");
  assert.throws(
    () => contextualReviewCohort("unknown"),
    /Unknown contextual review cohort/u,
  );
  assert.throws(
    () => buildContextualDestructiveSeparationReviewCase("#507096"),
    /outside the bounded review queue/u,
  );
});

test("review cases expose the two exact visual questions without mutating production", () => {
  const productionBefore = generatePaletteV2({ primary: "#FF0000" });
  const separation = buildContextualDestructiveSeparationReviewCase("#FF0000");
  const fidelity = buildContextualDestructiveSeparationReviewCase("#00CCFF");

  assert.equal(separation.current.modes.dark.separation.pass, true);
  assert.equal(separation.candidate.modes.dark.separation.pass, false);
  assert.equal(fidelity.current.modes.dark.sourceFidelity.pass, true);
  assert.equal(fidelity.candidate.modes.dark.sourceFidelity.pass, false);
  assert.equal(separation.current.modes.dark.primary.direction.id, "darker");
  assert.equal(separation.candidate.modes.dark.primary.direction.id, "lighter");
  assert.equal(
    separation.candidate.modes.dark.primary.text,
    separation.candidate.modes.dark.destructive.text,
  );
  assert.deepEqual(generatePaletteV2({ primary: "#FF0000" }), productionBefore);
});

test("the review page is separate from Generator and labels its judgment boundary", async () => {
  const [html, app] = await Promise.all([
    readFile(new URL("../v2/contextual-review.html", import.meta.url), "utf8"),
    readFile(new URL("../v2/contextual-review.js", import.meta.url), "utf8"),
  ]);
  assert.match(html, /Decision record · production v16 adopted/u);
  assert.match(html, /Dark Default를 먼저 비교한다/u);
  assert.match(html, /채택 결정의 경계/u);
  assert.doesNotMatch(html, /best|recommended/iu);
  assert.match(app, /Default/u);
  assert.match(app, /contextualReviewCohort/u);
  assert.match(app, /lightSeparationRegression/u);
});
