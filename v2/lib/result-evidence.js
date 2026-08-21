import { V2_POLICY } from "./policy.js";
import { RESULT_VERDICT_AUTHORITIES } from "./result-verdicts.js";

function checkName(check) {
  return check?.id ?? check?.role;
}

function assertBooleanChecks(checks, path) {
  if (
    !Array.isArray(checks) ||
    checks.some(
      (check) =>
        typeof checkName(check) !== "string" || typeof check.pass !== "boolean",
    )
  ) {
    throw new TypeError(`${path} must contain named boolean check verdicts.`);
  }
}

function assertTextContractChecks(checks, path) {
  const textChecks = checks.filter(({ kind }) => kind === "text");
  if (
    textChecks.length === 0 ||
    textChecks.some(
      (check) =>
        check.metric !== "WCAG contrast" ||
        check.target !== V2_POLICY.text.wcagNormalTextMinimum ||
        check.typographyContext?.schema !==
          V2_POLICY.text.typographyContextSchema ||
        check.typographyContext?.usage !== "normal-text" ||
        !Number.isFinite(check.typographyContext?.fontSizePx) ||
        !Number.isFinite(check.typographyContext?.fontWeight) ||
        check.diagnostics?.apca?.authority !== "diagnostic-ranking",
    )
  ) {
    throw new TypeError(
      `${path} text checks must declare WCAG normal-text authority, typography context, and APCA diagnostic evidence.`,
    );
  }
}

function assertSemanticEvaluation(semanticEvaluation) {
  const validEvaluations =
    Array.isArray(semanticEvaluation?.evaluations) &&
    semanticEvaluation.evaluations.every(
      (item) =>
        typeof item?.id === "string" &&
        ["satisfied", "unsatisfied", "needs-review"].includes(item.status),
    );
  if (
    typeof semanticEvaluation?.model?.id !== "string" ||
    !Number.isInteger(semanticEvaluation.model.version) ||
    !validEvaluations ||
    typeof semanticEvaluation.satisfied !== "boolean" ||
    semanticEvaluation.satisfied !==
      semanticEvaluation.evaluations.every(
        ({ status }) => status === "satisfied",
      )
  ) {
    throw new TypeError(
      "semanticEvaluation must contain named status verdicts.",
    );
  }
}

function assertResultVerdicts(result) {
  const expectedContractsPassed = [result.modes.light, result.modes.dark].every(
    ({ passed }) => passed,
  );
  const verdicts = result.verdicts;
  const reconciled = [
    typeof result.contractsPassed === "boolean",
    result.contractsPassed === expectedContractsPassed,
    result.passed === result.contractsPassed,
    verdicts?.contracts?.passed === result.contractsPassed,
    verdicts?.contracts?.modes?.light === result.modes.light.passed,
    verdicts?.contracts?.modes?.dark === result.modes.dark.passed,
    verdicts?.qualityReview?.passed === result.quality.passed,
    verdicts?.semanticModel?.satisfied === result.semanticEvaluation.satisfied,
    verdicts?.contracts?.authority === RESULT_VERDICT_AUTHORITIES.CONTRACTS,
    verdicts?.qualityReview?.authority ===
      RESULT_VERDICT_AUTHORITIES.QUALITY_REVIEW,
    verdicts?.semanticModel?.authority ===
      RESULT_VERDICT_AUTHORITIES.SEMANTIC_MODEL,
  ];
  if (reconciled.includes(false)) {
    throw new TypeError(
      "result verdicts must reconcile contracts, review evidence, and semantic evaluation.",
    );
  }
}

function assertQualityReview(quality) {
  if (
    typeof quality.passed !== "boolean" ||
    quality.passed !== quality.checks.every(({ pass }) => pass)
  ) {
    throw new TypeError(
      "quality.passed must reconcile with selected-result review checks.",
    );
  }
}

function assertDiagnosticEvidence(result) {
  const validFlags =
    Array.isArray(result.hoverDiagnostics?.structuralFlags) &&
    result.hoverDiagnostics.structuralFlags.every(
      (flag) => typeof flag === "string",
    );
  if (
    !validFlags ||
    !Number.isInteger(result.pairDecision?.selected?.qualityMisses) ||
    !Number.isInteger(result.pairDecision?.selected?.eligibilityMisses)
  ) {
    throw new TypeError("diagnostic or pair-selection evidence is invalid.");
  }
}

function assertPairEligibilityEvidence(result) {
  const expectedIds = V2_POLICY.crossMode.eligibilityCheckIds;
  const traceIds = result.pairDecision?.eligibility?.checkIds;
  const selectedMisses = result.pairDecision?.selected?.eligibilityMisses;
  if (
    !Array.isArray(traceIds) ||
    traceIds.length !== expectedIds.length ||
    traceIds.some((id, index) => id !== expectedIds[index]) ||
    !Number.isInteger(selectedMisses) ||
    selectedMisses < 0 ||
    selectedMisses > expectedIds.length
  ) {
    throw new TypeError(
      "pair eligibility trace must match the policy-owned check IDs and a bounded selected miss count.",
    );
  }
  const checks = expectedIds.map((id) =>
    result.quality.checks.filter((check) => check.id === id),
  );
  if (
    checks.some(
      (matches) => matches.length !== 1 || typeof matches[0].pass !== "boolean",
    ) ||
    checks.filter(([check]) => !check.pass).length !== selectedMisses
  ) {
    throw new TypeError(
      "selected pair eligibility misses must reconcile with the policy-owned quality checks.",
    );
  }
}

function assertSource(source) {
  if (typeof source?.classification !== "string") {
    throw new TypeError(
      "source.classification must be a named classification.",
    );
  }
  if (
    ![source.oklch?.l, source.oklch?.c, source.oklch?.h].every(Number.isFinite)
  ) {
    throw new TypeError("source.oklch must contain finite coordinates.");
  }
}

export function assertDiagnosticResult(result) {
  if (
    !result ||
    typeof result.passed !== "boolean" ||
    !Number.isInteger(result.version) ||
    typeof result.policyVersion !== "string"
  ) {
    throw new TypeError(
      "generator result identity or contract verdict is invalid.",
    );
  }
  assertBooleanChecks(result.quality?.checks, "quality.checks");
  if (result.quality.checks.some(({ id }) => typeof id !== "string")) {
    throw new TypeError("quality.checks must use stable check ids.");
  }
  for (const mode of ["light", "dark"]) {
    assertBooleanChecks(result.modes?.[mode]?.checks, `modes.${mode}.checks`);
    assertTextContractChecks(result.modes[mode].checks, `modes.${mode}.checks`);
    const values = result.modes[mode].values;
    const actionColors = [
      values?.primary,
      values?.["primary hover"],
      values?.["primary active"],
    ];
    if (actionColors.some((color) => !/^#[0-9A-F]{6}$/u.test(color))) {
      throw new TypeError(
        `modes.${mode} action states must be final six-digit sRGB colors.`,
      );
    }
    if (typeof result.modes[mode].adaptations?.largeBrandShift !== "boolean") {
      throw new TypeError(
        `modes.${mode}.adaptations.largeBrandShift must be boolean.`,
      );
    }
    if (
      typeof result.modes[mode].passed !== "boolean" ||
      result.modes[mode].passed !==
        result.modes[mode].checks.every(({ pass }) => pass)
    ) {
      throw new TypeError(
        `modes.${mode}.passed must reconcile with its contract checks.`,
      );
    }
  }
  if (
    result.passed !==
    [result.modes.light, result.modes.dark].every(({ passed }) => passed)
  ) {
    throw new TypeError(
      "result.passed must reconcile with the Light and Dark contract verdicts.",
    );
  }
  assertSemanticEvaluation(result.semanticEvaluation);
  assertQualityReview(result.quality);
  assertResultVerdicts(result);
  assertDiagnosticEvidence(result);
  assertPairEligibilityEvidence(result);
  assertSource(result.source);
}
