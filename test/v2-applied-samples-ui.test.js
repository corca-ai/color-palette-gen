import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { generatePaletteV2 } from "../v2/lib/palette.js";
import {
  ACTION_PRESENTATION_POLICY,
  SECONDARY_ACTION_STATE_POLICY,
  actionPresentationForResult,
} from "../v2/lib/action-presentation.js";
import { RULE_CATALOG } from "../v2/lib/policy.js";
import {
  SAMPLE_AUTHORED_PRESENTATION_QUESTIONS,
  SAMPLE_INSPECTION_COMPOSITIONS,
  SAMPLE_INSPECTION_OBLIGATIONS,
  SAMPLE_INSPECTION_SOURCE_KINDS,
  SAMPLE_PROVENANCE_ONLY_ROLES,
  SAMPLE_SCENARIOS,
  sampleInspectionRoles,
} from "../v2/lib/sample-inspection.js";
import { appliedExampleView } from "../v2/lib/view.js";
import { V2_SEMANTIC_MODEL } from "../v2/lib/semantic-model.js";

test("Generator exposes accepted component situations instead of diagnostic controls", async () => {
  const [html, app, view, css] = await Promise.all([
    readFile(new URL("../v2/index.html", import.meta.url), "utf8"),
    readFile(new URL("../v2/app.js", import.meta.url), "utf8"),
    readFile(new URL("../v2/lib/view.js", import.meta.url), "utf8"),
    readFile(new URL("../v2/styles/specimens.css", import.meta.url), "utf8"),
  ]);

  for (const { id: scenario } of SAMPLE_SCENARIOS) {
    assert.match(html, new RegExp(`data-sample-scenario="${scenario}"`));
  }
  assert.doesNotMatch(html, /data-palette-variant|destructive-calibration/);
  assert.doesNotMatch(
    app,
    /inspectDestructiveGrammar|buildRedBandPresentationComparison/,
  );
  assert.match(app, /ArrowLeft/);
  assert.match(app, /aria-selected/);
  assert.match(app, /sampleScenario === "routine-actions"/);
  assert.match(view, /reference-destructive-outline/);
  assert.match(view, /reference-destructive-demo/);
  assert.match(view, /reference-warning/);
  assert.match(view, /reference-warning-demo/);
  assert.match(view, /reference-form-scenario/);
  assert.match(view, /reference-popover/);
  assert.match(view, /inspection-board/);
  assert.match(view, /data-inspection-family/);
  assert.match(view, /data-fill-state/);
  assert.match(view, /data-focus-state/);
  assert.match(view, /disabled/);
  assert.match(view, /secondaryActionPresentationForMode/);
  assert.match(view, /--sample-secondary-action-hover/);
  assert.match(view, /confirmation-secondary-state-family-v1/);
  assert.match(css, /var\(--sample-secondary-action-hover\)/);
  assert.match(css, /var\(--sample-secondary-action-active\)/);

  const generatedRoles = generatePaletteV2({ primary: "#507096" })
    .modes.light.tokens.map(([, role]) => role)
    .sort();
  const classifiedRoles = [
    ...sampleInspectionRoles(),
    ...SAMPLE_PROVENANCE_ONLY_ROLES,
  ].sort();
  assert.deepEqual(classifiedRoles, generatedRoles);
  assert.deepEqual(SAMPLE_PROVENANCE_ONLY_ROLES, ["brand source"]);
  for (const role of sampleInspectionRoles()) {
    const variable = `var(--sample-${role.replaceAll(" ", "-")})`;
    assert.ok(css.includes(variable), `${role} lacks an applied CSS consumer`);
  }
});

test("the bounded inspection inventory binds sources, contexts, and rendered scenarios", async () => {
  const result = generatePaletteV2({ primary: "#507096" });
  const presentation = actionPresentationForResult(result, {
    ordinaryPrimaryPresent: true,
  });
  const scenarioIds = new Set(SAMPLE_SCENARIOS.map(({ id }) => id));
  const obligationIds = new Set();
  const semanticSourceIds = new Set(
    SAMPLE_INSPECTION_OBLIGATIONS.filter(
      ({ sourceKind }) => sourceKind === "semantic-declaration",
    ).map(({ sourceId }) => sourceId),
  );
  assert.deepEqual(
    semanticSourceIds,
    new Set(V2_SEMANTIC_MODEL.declarations.map(({ id }) => id)),
  );
  assert.equal(V2_SEMANTIC_MODEL.id, "v2-declarative-design");
  assert.equal(V2_SEMANTIC_MODEL.version, 5);
  assert.equal(V2_SEMANTIC_MODEL.declarations.length, 12);

  for (const obligation of SAMPLE_INSPECTION_OBLIGATIONS) {
    assert.ok(!obligationIds.has(obligation.id), `duplicate ${obligation.id}`);
    obligationIds.add(obligation.id);
    assert.ok(scenarioIds.has(obligation.scenarioId));
    assert.ok(obligation.sourceKind.length > 0);
    assert.ok(obligation.sourceId.length > 0);
    assert.ok(SAMPLE_INSPECTION_SOURCE_KINDS.includes(obligation.sourceKind));
    assert.ok(SAMPLE_INSPECTION_COMPOSITIONS.includes(obligation.composition));
    assert.equal(obligation.inspectionVerdictAuthority, "none");
    assert.ok(obligation.inspectionQuestion.length > 0);
    if (obligation.sourceKind === "policy-rule") {
      assert.ok(RULE_CATALOG[obligation.sourceId]);
    }
    if (obligation.sourceKind === "presentation-policy") {
      assert.equal(obligation.sourceId, ACTION_PRESENTATION_POLICY.id);
    }
    if (obligation.sourceKind === "owner-document") {
      const document = await readFile(
        new URL(`../${obligation.sourceId}`, import.meta.url),
        "utf8",
      );
      assert.ok(document.length > 0);
    }
    if (obligation.sourceKind === "authored-presentation-question") {
      assert.equal(
        obligation.inspectionQuestion,
        SAMPLE_AUTHORED_PRESENTATION_QUESTIONS[obligation.sourceId],
      );
    }
    assert.deepEqual(obligation.modes, ["light", "dark"]);
    assert.ok(obligation.contexts.length > 0);
    assert.ok(obligation.fillStates.length > 0);
    assert.ok(obligation.roleBindings.length > 0);
    for (const { role, selector } of obligation.roleBindings) {
      assert.ok(role.length > 0);
      assert.ok(selector.length > 0);
    }
    for (const { sourceId } of obligation.derivedBindings) {
      assert.equal(sourceId, SECONDARY_ACTION_STATE_POLICY.id);
    }
    const markup = appliedExampleView(
      result.modes.light,
      presentation,
      obligation.scenarioId,
    );
    assert.match(
      markup,
      new RegExp(`data-inspection-obligation="[^"]*${obligation.id}[^"]*"`),
    );
    if (obligation.scenarioId === "edge-matrix") {
      assert.ok(markup.includes(obligation.inspectionQuestion));
    }
  }
});

test("the human inspection projection cannot produce semantic authority", async () => {
  const [inspection, palette, semanticModel, app] = await Promise.all([
    readFile(
      new URL("../v2/lib/sample-inspection.js", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../v2/lib/palette.js", import.meta.url), "utf8"),
    readFile(new URL("../v2/lib/semantic-model.js", import.meta.url), "utf8"),
    readFile(new URL("../v2/app.js", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(
    inspection,
    /from\s+["']\.\/(?:palette|semantic-model|decision|quality|result-verdicts)\.js/,
  );
  assert.doesNotMatch(palette, /sample-inspection/);
  assert.doesNotMatch(semanticModel, /sample-inspection/);
  assert.doesNotMatch(
    app,
    /SAMPLE_INSPECTION_OBLIGATIONS|semanticEvaluation\s*=/,
  );
});
