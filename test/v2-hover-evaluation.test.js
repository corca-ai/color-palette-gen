import assert from "node:assert/strict";
import test from "node:test";

import {
  HOVER_EVALUATION_SCHEMA,
  HOVER_SPECIMEN,
  hoverEvaluationEvidence,
  hoverEvaluationKey,
  normalizeHoverEvaluation,
} from "../v2/lib/hover-evaluation.js";

function record(judgments = ["meets-intent", "meets-intent"]) {
  return {
    schema: HOVER_EVALUATION_SCHEMA,
    input: "#507096",
    policyVersion: "v2-policy-model-11",
    specimen: HOVER_SPECIMEN,
    modes: {
      light: { judgment: judgments[0], note: "Visible on the light surface." },
      dark: { judgment: judgments[1], note: "Visible on the dark surface." },
    },
  };
}

test("hover evaluation identity includes input, policy, and specimen", () => {
  assert.equal(
    hoverEvaluationKey("#507096", "v2-policy-model-11"),
    "#507096|v2-policy-model-11|applied-primary-action-1",
  );
});

test("only complete matching Light and Dark evidence can satisfy intent", () => {
  assert.deepEqual(
    hoverEvaluationEvidence(record(), "#507096", "v2-policy-model-11")
      .satisfies,
    true,
  );
  assert.equal(
    hoverEvaluationEvidence(record(), "#507096", "v2-policy-model-12").complete,
    false,
  );

  const missingNote = record();
  delete missingNote.modes.dark.note;
  assert.equal(
    hoverEvaluationEvidence(missingNote, "#507096", "v2-policy-model-11")
      .complete,
    false,
  );
  assert.equal(
    hoverEvaluationEvidence(
      record(["too-subtle", "meets-intent"]),
      "#507096",
      "v2-policy-model-11",
    ).satisfies,
    false,
  );
  assert.equal(
    hoverEvaluationEvidence(
      record(["meets-intent", "too-strong"]),
      "#507096",
      "v2-policy-model-11",
    ).satisfies,
    false,
  );
  assert.equal(
    hoverEvaluationEvidence(record(), "#507097", "v2-policy-model-11").complete,
    false,
  );
  assert.equal(
    hoverEvaluationEvidence(
      { ...record(), specimen: "different-specimen" },
      "#507096",
      "v2-policy-model-11",
    ).complete,
    false,
  );
});

test("invalid imported hover evaluation data is rejected or bounded", () => {
  assert.equal(normalizeHoverEvaluation({}), null);
  assert.equal(
    normalizeHoverEvaluation({
      ...record(),
      input: 507096,
    }),
    null,
  );
  const normalized = normalizeHoverEvaluation({
    ...record(),
    modes: {
      light: { judgment: "invented", note: " x ".repeat(1000) },
      dark: { judgment: "meets-intent", note: " clear " },
    },
  });
  assert.equal(normalized.modes.light.judgment, undefined);
  assert.equal(normalized.modes.light.note.length, 1000);
  assert.equal(normalized.modes.dark.note, "clear");
});
