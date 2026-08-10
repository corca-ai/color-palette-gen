function compactCandidate(candidate, evaluation, objectiveCost) {
  if (!candidate) return null;
  return {
    hex: candidate.hex,
    oklch: candidate.oklch,
    objectiveCost,
    passed: evaluation.passed,
    reasons: evaluation.reasons,
    metrics: evaluation.metrics,
  };
}

export function selectCandidate({
  id,
  role,
  intent,
  candidates,
  evaluate,
  objective,
  evidence,
  preservedAxes = [],
}) {
  const evaluated = candidates
    .map((candidate) => {
      const evaluation = evaluate(candidate);
      return {
        candidate,
        evaluation,
        objectiveCost: objective(candidate),
      };
    })
    .sort((first, second) => first.objectiveCost - second.objectiveCost);
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
      candidateCount: evaluated.length,
      preservedAxes,
      evidence,
      selected: compactCandidate(
        selected.candidate,
        selected.evaluation,
        selected.objectiveCost,
      ),
      alternatives: {
        nearestRejected: nearestRejected
          ? compactCandidate(
              nearestRejected.candidate,
              nearestRejected.evaluation,
              nearestRejected.objectiveCost,
            )
          : null,
        nextPassing: nextPassing
          ? compactCandidate(
              nextPassing.candidate,
              nextPassing.evaluation,
              nextPassing.objectiveCost,
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
    preservedAxes: [],
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
