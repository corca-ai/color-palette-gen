import assert from "node:assert/strict";
import test from "node:test";
import {
  loadEvaluationRecords,
  loadHoverEvaluationRecords,
  saveEvaluationRecords,
  saveHoverEvaluationRecords,
} from "../v2/lib/evaluation-store.js";

test("evaluation records round-trip through the supplied storage boundary", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const records = { "#507096": { rating: "Prefer", note: "balanced" } };

  assert.equal(saveEvaluationRecords(records, storage), true);
  assert.deepEqual(loadEvaluationRecords(storage), records);
});

test("evaluation storage failures degrade without breaking the application", () => {
  const unavailable = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
  };
  const invalid = { getItem: () => "{", setItem() {} };

  assert.deepEqual(loadEvaluationRecords(unavailable), {});
  assert.deepEqual(loadEvaluationRecords(invalid), {});
  assert.equal(saveEvaluationRecords({}, unavailable), false);
  assert.deepEqual(loadHoverEvaluationRecords(unavailable), {});
  assert.equal(saveHoverEvaluationRecords({}, unavailable), false);
});

test("hover evidence uses a separate local storage boundary", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  const records = { key: { schema: "color-lab-hover-evaluation-1" } };
  assert.equal(saveHoverEvaluationRecords(records, storage), true);
  assert.deepEqual(loadHoverEvaluationRecords(storage), records);
  assert.deepEqual(loadEvaluationRecords(storage), {});
});

test("hover evidence rejects valid JSON with a non-record root", () => {
  for (const value of ['"text"', "42", "[]", "null"]) {
    assert.deepEqual(loadHoverEvaluationRecords({ getItem: () => value }), {});
  }
});
