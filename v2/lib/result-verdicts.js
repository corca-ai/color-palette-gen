export const RESULT_VERDICT_AUTHORITIES = Object.freeze({
  CONTRACTS: "generated-contracts",
  QUALITY_REVIEW: "selected-result-review",
  SEMANTIC_MODEL: "declarative-semantic-model",
});

export function resultVerdicts(modes, quality, semanticEvaluation) {
  const contractsPassed = Object.values(modes).every((mode) => mode.passed);
  return {
    contractsPassed,
    verdicts: {
      contracts: {
        passed: contractsPassed,
        authority: RESULT_VERDICT_AUTHORITIES.CONTRACTS,
        modes: {
          light: modes.light.passed,
          dark: modes.dark.passed,
        },
      },
      qualityReview: {
        passed: quality.passed,
        authority: RESULT_VERDICT_AUTHORITIES.QUALITY_REVIEW,
      },
      semanticModel: {
        satisfied: semanticEvaluation.satisfied,
        authority: RESULT_VERDICT_AUTHORITIES.SEMANTIC_MODEL,
      },
    },
  };
}
