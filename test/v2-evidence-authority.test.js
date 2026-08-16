import assert from "node:assert/strict";
import test from "node:test";

import {
  assertEvidenceAuthority,
  EVIDENCE_AUTHORITIES,
} from "../v2/lib/evidence-authority.js";
import {
  validateSemanticTraceability,
  V2_SEMANTIC_MODEL,
} from "../v2/lib/semantic-model.js";
import { RULE_CATALOG, validatePolicy } from "../v2/lib/policy.js";

test("evidence authority vocabulary is closed and distinct from verdict scope", () => {
  assert.deepEqual(Object.values(EVIDENCE_AUTHORITIES), [
    "normative",
    "product-policy",
    "provisional",
    "technical",
    "heuristic",
    "research-policy",
  ]);
  for (const authority of Object.values(EVIDENCE_AUTHORITIES)) {
    assert.equal(assertEvidenceAuthority(authority), authority);
  }
  assert.throws(
    () => assertEvidenceAuthority("selected-result-review"),
    /unknown evidence authority/u,
  );
  assert.throws(
    () => assertEvidenceAuthority("diagnostic"),
    /unknown evidence authority/u,
  );
});

test("semantic declarations fail closed on unknown evidence authority", () => {
  const model = structuredClone(V2_SEMANTIC_MODEL);
  model.declarations[0].authority = "overall-design-quality";
  assert.throws(
    () => validateSemanticTraceability({ model }),
    /unknown evidence authority/u,
  );
});

test("decision policy rules fail closed on unknown evidence authority", () => {
  const rule = RULE_CATALOG["state.minimum-separation"];
  const original = rule.authority;
  try {
    rule.authority = "overall-design-quality";
    assert.throws(() => validatePolicy(), /unknown evidence authority/u);
  } finally {
    rule.authority = original;
  }
  assert.equal(validatePolicy(), true);
});
