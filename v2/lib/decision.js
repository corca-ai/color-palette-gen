function compactCandidate(candidate, evaluation, ranking) {
  if (!candidate) return null;
  return {
    hex: candidate.hex,
    oklch: candidate.oklch,
    objectiveCost: ranking.objectives[0]?.value ?? 0,
    constraintResults: evaluation.constraints,
    objectiveResults: ranking.objectives,
    tieBreakerResults: ranking.tieBreakers,
    passed: evaluation.passed,
    reasons: evaluation.reasons,
    metrics: evaluation.metrics,
  };
}

function compareValues(first, second, direction) {
  if (typeof first === "number" && !Number.isFinite(first)) {
    throw new TypeError(`Ranking value must be finite; received ${first}.`);
  }
  if (typeof second === "number" && !Number.isFinite(second)) {
    throw new TypeError(`Ranking value must be finite; received ${second}.`);
  }
  if (first === second) return 0;
  if (direction === "ascending" || direction === "minimize") {
    return first < second ? -1 : 1;
  }
  if (direction === "descending" || direction === "maximize") {
    return first > second ? -1 : 1;
  }
  throw new TypeError(`Unsupported ranking direction: ${direction}.`);
}

function compareRanking(first, second) {
  for (let index = 0; index < first.objectives.length; index += 1) {
    const comparison = compareValues(
      first.objectives[index].value,
      second.objectives[index].value,
      first.objectives[index].direction,
    );
    if (comparison) return comparison;
  }
  for (let index = 0; index < first.tieBreakers.length; index += 1) {
    const comparison = compareValues(
      first.tieBreakers[index].value,
      second.tieBreakers[index].value,
      first.tieBreakers[index].direction,
    );
    if (comparison) return comparison;
  }
  return 0;
}

export function selectCandidate({
  id,
  role,
  intent,
  candidates,
  policy,
  constraints,
  objectives,
  tieBreakers = [],
  evidence,
  searchConstants = [],
}) {
  const evaluated = candidates
    .map((candidate) => {
      const constraintResults = constraints.map((rule) => ({
        ...rule.definition,
        ...rule.evaluate(candidate),
      }));
      if (constraintResults.some(({ passed }) => typeof passed !== "boolean")) {
        throw new TypeError(`${id} constraint results must declare passed.`);
      }
      const evaluation = {
        passed: constraintResults.every(({ passed }) => passed),
        constraints: constraintResults,
        reasons: constraintResults.flatMap(({ reasons = [] }) => reasons),
        metrics: Object.fromEntries(
          constraintResults.map(({ id: ruleId, metrics = {} }) => [
            ruleId,
            metrics,
          ]),
        ),
      };
      const ranking = {
        objectives: objectives.map((rule) => ({
          ...rule.definition,
          value: rule.evaluate(candidate),
        })),
        tieBreakers: tieBreakers.map((rule) => ({
          ...rule.definition,
          value: rule.evaluate(candidate),
        })),
      };
      for (const result of [...ranking.objectives, ...ranking.tieBreakers]) {
        if (
          result.value == null ||
          (typeof result.value === "number" && !Number.isFinite(result.value))
        ) {
          throw new TypeError(
            `${result.id} returned an invalid ranking value.`,
          );
        }
      }
      return {
        candidate,
        evaluation,
        ranking,
      };
    })
    .sort((first, second) => compareRanking(first.ranking, second.ranking));
  const passing = evaluated.filter(({ evaluation }) => evaluation.passed);
  if (!passing.length) {
    throw new Error(`${id} has no candidate satisfying its constraints.`);
  }
  const selected = passing[0];
  const nearestRejected = evaluated.find(
    ({ evaluation }) => !evaluation.passed,
  );
  const nextPassing = passing[1] ?? null;
  return {
    value: selected.candidate,
    trace: {
      id,
      role,
      intent,
      strategy: "minimum-change candidate search",
      policy,
      candidateCount: evaluated.length,
      searchConstants,
      evidence,
      selected: compactCandidate(
        selected.candidate,
        selected.evaluation,
        selected.ranking,
      ),
      alternatives: {
        nearestRejected: nearestRejected
          ? compactCandidate(
              nearestRejected.candidate,
              nearestRejected.evaluation,
              nearestRejected.ranking,
            )
          : null,
        nextPassing: nextPassing
          ? compactCandidate(
              nextPassing.candidate,
              nextPassing.evaluation,
              nextPassing.ranking,
            )
          : null,
      },
    },
  };
}

export function anchoredDecision({
  id,
  role,
  intent,
  candidate,
  evidence,
  summary,
  aliases = [],
}) {
  return {
    id,
    role,
    intent,
    strategy: "policy anchor",
    candidateCount: 1,
    searchConstants: [],
    evidence,
    aliases,
    selected: {
      hex: candidate.hex,
      oklch: candidate.oklch,
      objectiveCost: 0,
      passed: true,
      reasons: [summary],
      metrics: {},
    },
    alternatives: { nearestRejected: null, nextPassing: null },
  };
}
