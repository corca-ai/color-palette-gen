import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { V2_POLICY } from "../v2/lib/policy.js";
import { EVIDENCE_AUTHORITIES } from "../v2/lib/evidence-authority.js";
import { V2_SEMANTIC_MODEL } from "../v2/lib/semantic-model.js";

const root = new URL("../", import.meta.url);

test("the managed Mermaid flow stays bound to current production policy", async () => {
  const flow = await readFile(
    new URL("docs/v2-decisions/color-decision-flow.md", root),
    "utf8",
  );

  assert.match(flow, /```mermaid\nflowchart TD/);
  assert.match(flow, /```mermaid\nflowchart LR/);
  assert.match(flow, /achromatic, subdued, or chromatic/);
  assert.match(flow, new RegExp(V2_POLICY.version));
  assert.match(flow, new RegExp(V2_POLICY.crossMode.pairRankingStrategy));
  for (const checkId of V2_POLICY.crossMode.eligibilityCheckIds) {
    assert.ok(flow.includes(`\`${checkId}\``), `missing check ID: ${checkId}`);
  }

  for (const dependency of [
    "primary --> destructive",
    "primary --> warning",
    "destructive --> warning",
    "primary --> focus",
    "destructive --> focus",
    "foundations --> contracts",
    "pairs --> pairedEvidence",
    "selected --> review",
    "review --> semantics",
    "selected --> pass",
  ]) {
    assert.ok(flow.includes(dependency), `missing managed edge: ${dependency}`);
  }
  assert.match(flow, /retain complete inventory for alternatives evidence/);
  assert.match(flow, /result\.contractsPassed/);
  assert.match(flow, /result\.verdicts/);
  assert.match(flow, /NO_CANDIDATE: decisionId, mode, role, stage, message/);
  assert.ok(
    flow.includes('foundations -. "zero passing candidates" .-> failure'),
  );
  assert.ok(
    flow.includes('destructiveStates -. "zero passing candidates" .-> failure'),
  );
  assert.ok(
    flow.includes('warningStates -. "zero passing candidates" .-> failure'),
  );
  assert.doesNotMatch(flow, /Restrict ranking pool/);
  assert.match(flow, /Shared generator with explicit diagnostic-only override/);
  assert.doesNotMatch(flow, /findings --> policy/);
});

test("canonical navigation surfaces link to the managed flow", async () => {
  const [architecture, readme, decisions] = await Promise.all([
    readFile(new URL("docs/architecture.md", root), "utf8"),
    readFile(new URL("readme.md", root), "utf8"),
    readFile(new URL("docs/v2-decisions/README.md", root), "utf8"),
  ]);

  assert.match(architecture, /v2-decisions\/color-decision-flow\.md/);
  assert.match(readme, /docs\/v2-decisions\/color-decision-flow\.md/);
  assert.match(decisions, /\(color-decision-flow\.md\)/);
  assert.match(architecture, /v2-decisions\/ontology\.md/);
  assert.match(readme, /docs\/v2-decisions\/ontology\.md/);
  assert.match(decisions, /\(ontology\.md\)/);
});

test("the ontology map stays bound to executable IDs and authorities", async () => {
  const [ontology, evidence] = await Promise.all([
    readFile(new URL("docs/v2-decisions/ontology.md", root), "utf8"),
    readFile(new URL("docs/v2-decisions/evidence.md", root), "utf8"),
  ]);

  assert.match(ontology, new RegExp(V2_POLICY.version));
  assert.match(ontology, new RegExp(V2_POLICY.crossMode.pairRankingStrategy));
  for (const checkId of V2_POLICY.crossMode.eligibilityCheckIds) {
    assert.ok(ontology.includes(`\`${checkId}\``));
  }
  for (const declaration of V2_SEMANTIC_MODEL.declarations) {
    for (const id of [
      declaration.id,
      declaration.evaluator,
      ...declaration.evidence,
    ]) {
      assert.ok(ontology.includes(`\`${id}\``), `missing ontology ID: ${id}`);
    }
  }
  for (const [decisionId, decision] of Object.entries(V2_POLICY.decisions)) {
    for (const id of [
      decisionId,
      ...decision.constraints,
      ...decision.objectives,
      ...decision.tieBreakers,
    ]) {
      assert.ok(ontology.includes(`\`${id}\``), `missing policy ID: ${id}`);
    }
  }
  for (const authority of Object.values(EVIDENCE_AUTHORITIES)) {
    for (const [document, content] of [
      ["ontology", ontology],
      ["evidence", evidence],
    ]) {
      assert.ok(
        content.includes(`\`${authority}\``),
        `missing ${document} authority: ${authority}`,
      );
    }
  }
});
