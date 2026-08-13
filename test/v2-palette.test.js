import assert from "node:assert/strict";
import test from "node:test";

import { generatePaletteV2, serializeModeCss } from "../v2/lib/palette.js";
import { ROLE_CLASSIFICATION, TOKEN_ORDER } from "../v2/lib/roles.js";

const REQUIRED = TOKEN_ORDER;

test("v2 accepts only a primary contract and resolves both modes", () => {
  const result = generatePaletteV2({ primary: "#507096" });
  assert.deepEqual(result.input, { primary: "#507096" });
  assert.equal(result.direction, "calm minimal");
  for (const mode of ["light", "dark"]) {
    assert.deepEqual(
      result.modes[mode].tokens.map(([, role]) => role),
      REQUIRED,
    );
    assert.equal(result.modes[mode].passed, true);
    assert.ok(result.modes[mode].textChecks.length > 0);
    assert.ok(result.modes[mode].nonTextChecks.length > 0);
  }
});

test("v2 CSS serialization remains mode-scoped", () => {
  const result = generatePaletteV2({ primary: "#507096" });
  assert.match(serializeModeCss(result.modes.light), /^\[data-theme="light"\]/);
  assert.match(
    serializeModeCss(result.modes.dark),
    /--palette-primary-active: #[0-9A-F]{6}/,
  );
});

test("v2 preserves input character without collapsing light and dark achromatics", () => {
  const black = generatePaletteV2({ primary: "#000000" });
  const white = generatePaletteV2({ primary: "#FFFFFF" });
  assert.equal(black.source.classification, "achromatic");
  assert.equal(white.source.classification, "achromatic");
  assert.notEqual(
    black.modes.light.values.primary,
    white.modes.light.values.primary,
  );
  assert.notEqual(
    black.modes.dark.values.primary,
    white.modes.dark.values.primary,
  );
});

test("v2 applies restrained hue tint only to chromatic foundations", () => {
  const chromatic = generatePaletteV2({ primary: "#507096" });
  const achromatic = generatePaletteV2({ primary: "#777777" });
  assert.ok(chromatic.modes.light.adaptations.neutralTintChroma > 0);
  assert.equal(achromatic.modes.light.adaptations.neutralTintChroma, 0);
});

test("v2 separates destructive feedback when the primary is red", () => {
  const result = generatePaletteV2({ primary: "#FF0000" });
  for (const mode of ["light", "dark"]) {
    assert.equal(result.modes[mode].adaptations.redConflict, true);
    const check = result.modes[mode].nonTextChecks.find(
      ({ role }) => role === "Brand → destructive",
    );
    assert.equal(check.pass, true);
  }
});

test("every v2 role exposes provenance and a selected decision", () => {
  const result = generatePaletteV2({ primary: "#507096" });
  assert.equal(result.policyVersion, "v2-policy-model-11");
  for (const mode of ["light", "dark"]) {
    for (const role of REQUIRED) {
      const decision = result.modes[mode].decisions[role];
      assert.ok(decision, `${mode}/${role} decision`);
      assert.equal(decision.selected.hex, result.modes[mode].values[role]);
      assert.ok(decision.intent.length > 20);
      assert.ok(decision.evidence.length > 0);
      assert.ok(
        decision.evidence.every(({ class: evidenceClass }) =>
          [
            "normative",
            "reference",
            "product-policy",
            "empirical",
            "heuristic",
          ].includes(evidenceClass),
        ),
      );
    }
  }
});

test("searched roles retain counterfactual candidates", () => {
  const result = generatePaletteV2({ primary: "#507096" });
  for (const mode of ["light", "dark"]) {
    for (const role of [
      "primary",
      "primary hover",
      "primary active",
      "destructive",
    ]) {
      const decision = result.modes[mode].decisions[role];
      assert.equal(decision.strategy, "minimum-change candidate search");
      assert.ok(decision.candidateCount > 1);
      assert.ok(decision.policy.constraints.length > 0);
      assert.ok(decision.policy.objectives.length > 0);
      assert.ok(decision.policy.tieBreakers.length > 0);
      assert.equal(
        decision.selected.constraintResults.every(({ passed }) => passed),
        true,
      );
      assert.equal(decision.selected.objectiveResults.length > 0, true);
      assert.ok(
        decision.alternatives.nearestRejected ||
          decision.alternatives.nextPassing,
        `${mode}/${role} alternative`,
      );
    }
  }
});

test("v2 invalid input fails explicitly", () => {
  assert.throws(
    () => generatePaletteV2({ primary: "blue" }),
    /primary must be a six-digit hex color/,
  );
});

test("a usable source color is retained instead of receiving an unconditional chroma cut", () => {
  const result = generatePaletteV2({ primary: "#507096" });
  assert.equal(result.modes.light.values.primary, "#507096");
  assert.equal(result.modes.light.adaptations.primarySourceDistance, 0);
});

test("large source shifts remain explicit for designer review", () => {
  const result = generatePaletteV2({ primary: "#F2C230" });
  assert.equal(result.modes.light.adaptations.largeBrandShift, true);
  assert.ok(result.modes.light.adaptations.primarySourceDistance > 0.18);
});

test("state traces report actual gamut-axis movement", () => {
  const result = generatePaletteV2({ primary: "#FF0000" });
  const decision = result.modes.light.decisions["primary hover"];
  assert.deepEqual(decision.searchConstants, [
    "requested hue",
    "requested chroma",
  ]);
  assert.equal(
    Number.isFinite(decision.selected.constraintResults[0].metrics.chromaShift),
    true,
  );
});

test("v2 reports paired quality separately from accessibility contracts", () => {
  const result = generatePaletteV2({ primary: "#6633FF" });
  assert.equal(result.passed, true);
  assert.equal(typeof result.quality.passed, "boolean");
  assert.equal(result.quality.crossMode.checks.length, 3);
  assert.equal(result.quality.states.light.checks.length, 2);
  assert.equal(result.quality.states.dark.checks.length, 2);
  assert.ok(
    result.quality.crossMode.checks.find(
      ({ id }) => id === "pair.primary-lightness-gap",
    ),
  );
});

test("state progression remains monotonic across representative colors", () => {
  for (const primary of ["#FF0000", "#F2C230", "#00A878", "#7A4ED8"]) {
    const result = generatePaletteV2({ primary });
    for (const mode of ["light", "dark"]) {
      const progression = result.quality.states[mode];
      assert.equal(progression.checks[1].pass, true, `${primary}/${mode}`);
      assert.ok(progression.defaultToHover > 0);
      assert.ok(progression.hoverToActive > 0);
    }
  }
});

test("sampled pair search reports its bounded alternatives honestly", () => {
  const result = generatePaletteV2({ primary: "#6633FF" });
  assert.equal(result.pairDecision.strategy, "sampled cross-mode pair search");
  assert.ok(result.pairDecision.candidateCount > 1);
  assert.ok(result.pairDecision.alternatives.nextRanked);
  assert.ok(result.pairDecision.alternatives.sourceFidelity);
  assert.ok("qualityRejected" in result.pairDecision.alternatives);
  assert.equal(
    result.pairDecision.selected.light,
    result.modes.light.values.primary,
  );
  assert.equal(
    result.pairDecision.selected.dark,
    result.modes.dark.values.primary,
  );
  assert.equal(typeof result.quality.passed, "boolean");
  assert.equal(result.quality.sourceChecks.length, 2);
});

test("brand source is preserved while the action boundary is independently searched", () => {
  const result = generatePaletteV2({ primary: "#FFFF00" });
  for (const mode of ["light", "dark"]) {
    const values = result.modes[mode].values;
    assert.equal(values["brand source"], "#FFFF00");
    assert.equal(
      result.modes[mode].decisions["brand source"].strategy,
      "input passthrough",
    );
    assert.ok(
      result.modes[mode].decisions["primary border"].candidateCount > 1,
    );
  }
});

test("independent review can reject source fidelity after accessibility passes", () => {
  const result = generatePaletteV2({ primary: "#FFFF00" });
  assert.equal(result.passed, true);
  assert.equal(result.quality.passed, false);
  assert.deepEqual(
    result.quality.sourceChecks.filter(({ pass }) => !pass).map(({ id }) => id),
    ["review.light.source-fidelity", "review.dark.source-fidelity"],
  );
});

test("semantic maps retain the searched feasible and rejected spaces", () => {
  const result = generatePaletteV2({ primary: "#507096" });
  for (const mode of ["light", "dark"]) {
    for (const role of ["warning", "selection"]) {
      const plot = result.modes[mode].decisions[role].searchPlot;
      assert.ok(plot.length > 10, `${mode}/${role}`);
      assert.ok(
        plot.some(({ passed }) => passed),
        `${mode}/${role}/passing`,
      );
      if (role === "warning") {
        assert.ok(
          plot.some(({ passed }) => !passed),
          `${mode}/${role}/rejected`,
        );
      }
    }
  }
});

test("every generated state constraint carries displayable provenance metadata", () => {
  const result = generatePaletteV2({ primary: "#507096" });
  for (const mode of ["light", "dark"]) {
    for (const role of [
      "destructive hover",
      "destructive active",
      "warning hover",
      "warning active",
    ]) {
      for (const rule of result.modes[mode].decisions[role].selected
        .constraintResults) {
        assert.equal(typeof rule.label, "string", `${mode}/${role}/${rule.id}`);
        assert.equal(
          typeof rule.authority,
          "string",
          `${mode}/${role}/${rule.id}`,
        );
      }
    }
  }
});

test("large shifts expose safe usage alternatives without weakening the main palette", () => {
  const result = generatePaletteV2({ primary: "#F2C230" });
  assert.ok(result.sourceAlternatives);
  assert.equal(
    result.sourceAlternatives.recommendation.statefulAction,
    "Generated fill",
  );
  assert.equal(
    typeof result.sourceAlternatives.recommendation.sourceFaithfulAction,
    "string",
  );
  for (const mode of ["light", "dark"]) {
    const alternatives = result.sourceAlternatives.modes[mode];
    assert.equal(alternatives.filled.safe, true);
    assert.ok(alternatives.filled.hover);
    assert.ok(alternatives.filled.active);
    assert.equal(alternatives.outline.color, "#F2C230");
    assert.equal(alternatives.brandFaithful.color, "#F2C230");
    assert.equal(typeof alternatives.outline.safe, "boolean");
    assert.equal(typeof alternatives.brandFaithful.safe, "boolean");
  }
});

test("ordinary source fidelity does not create unnecessary usage alternatives", () => {
  const result = generatePaletteV2({ primary: "#507096" });
  assert.equal(result.sourceAlternatives, null);
});

test("foundation roles use inspectable candidate search instead of anchors", () => {
  const result = generatePaletteV2({ primary: "#507096" });
  for (const mode of ["light", "dark"]) {
    for (const role of [
      "background",
      "surface",
      "raised surface",
      "muted surface",
      "foreground",
      "muted text",
      "border",
      "input border",
    ]) {
      const decision = result.modes[mode].decisions[role];
      assert.equal(decision.strategy, "minimum-change candidate search");
      assert.ok(decision.candidateCount > 1, `${mode}/${role}`);
      assert.ok(decision.policy.constraints.length > 0);
      assert.ok(decision.target?.hex, `${mode}/${role}/target`);
      assert.equal(decision.searchDomain.lightness.length, 2);
      assert.deepEqual(decision.searchDomain.chroma, [0, 0.012]);
      assert.ok(
        decision.searchDomain.lightness[0] < decision.searchDomain.lightness[1],
      );
    }
  }
});

test("binary foreground decisions retain both black and white evidence", () => {
  const result = generatePaletteV2({ primary: "#507096" });
  for (const mode of ["light", "dark"]) {
    for (const role of ["primary text", "destructive text"]) {
      const decision = result.modes[mode].decisions[role];
      assert.equal(decision.strategy, "binary foreground search");
      assert.equal(decision.candidateCount, 2);
      assert.ok(
        decision.alternatives.nearestRejected ||
          decision.alternatives.nextPassing,
      );
    }
  }
});

test("focus ring is independently searched rather than aliased to primary", () => {
  const result = generatePaletteV2({ primary: "#507096" });
  for (const mode of ["light", "dark"]) {
    const decision = result.modes[mode].decisions["focus ring"];
    assert.ok(decision.candidateCount > 2);
    assert.notEqual(
      result.modes[mode].values["focus ring"],
      result.modes[mode].values.primary,
    );
    assert.equal(
      decision.selected.constraintResults.every(({ passed }) => passed),
      true,
    );
  }
});

test("identical normalized inputs reuse the complete generated palette", () => {
  const first = generatePaletteV2({ primary: "#507096" });
  const second = generatePaletteV2({ primary: "#507096" });
  assert.equal(first, second);
});

test("application utility roles are explicit searches or documented aliases", () => {
  assert.deepEqual(ROLE_CLASSIFICATION.aliases, {
    "disabled background": "muted surface",
    "disabled text": "muted text",
    "disabled border": "border",
    popover: "raised surface",
    "popover text": "foreground",
  });
  const result = generatePaletteV2({ primary: "#507096" });
  for (const mode of ["light", "dark"]) {
    const { decisions, values } = result.modes[mode];
    for (const role of ROLE_CLASSIFICATION.searched) {
      assert.ok(decisions[role], `${mode}/${role} decision`);
      assert.ok(decisions[role].candidateCount >= 2, `${mode}/${role} search`);
    }
    for (const [role, source] of Object.entries(ROLE_CLASSIFICATION.aliases)) {
      assert.equal(values[role], values[source], `${mode}/${role} value`);
      assert.equal(decisions[role].strategy, "semantic alias");
      assert.deepEqual(decisions[role].aliases, [source]);
    }
  }
});

test("disabled aliases retain non-color state requirements", () => {
  assert.deepEqual(ROLE_CLASSIFICATION.nonColorRequirements.disabled, [
    "disabled semantics exposed to assistive technology",
    "activation blocked",
    "reduced emphasis",
  ]);
});

test("feedback states keep one readable label and remain ordered", () => {
  for (const primary of ["#FF0000", "#507096", "#F2C230", "#111111"]) {
    const result = generatePaletteV2({ primary });
    for (const mode of ["light", "dark"]) {
      const { decisions, values } = result.modes[mode];
      for (const family of ["destructive", "warning"]) {
        const label = values[`${family} text`];
        for (const role of [family, `${family} hover`, `${family} active`]) {
          const decision =
            role === family ? decisions[family] : decisions[role];
          assert.ok(decision.selected.passed, `${primary}/${mode}/${role}`);
          assert.ok(label === "#000000" || label === "#FFFFFF");
        }
        assert.notEqual(values[family], values[`${family} hover`]);
        assert.notEqual(values[family], values[`${family} active`]);
      }
    }
  }
});
