const MODES = ["light", "dark"];

function hoverMetrics(result, mode) {
  const pair = result.hoverDiagnostics.modes[mode].pairs.defaultToHover;
  return {
    oklabDeltaE: pair.oklabDeltaE,
    ciede2000: pair.ciede2000,
    surfaceContrastChange: pair.contexts.surface.change,
  };
}

function extreme(rows, read, direction = "minimum") {
  return rows.reduce((selected, row) => {
    if (!selected) return row;
    const current = read(row);
    const prior = read(selected);
    return direction === "minimum"
      ? current < prior
        ? row
        : selected
      : current > prior
        ? row
        : selected;
  }, null);
}

export function prioritizeHoverReview(results, limit = 5) {
  if (!Number.isInteger(limit) || limit < 0) {
    throw new TypeError("Review limit must be a nonnegative integer.");
  }
  const rows = results.map((result) => {
    if (!result?.hoverDiagnostics?.modes) {
      throw new TypeError(
        "Review result must include hoverDiagnostics from the evaluation producer.",
      );
    }
    return {
      primary: result.input.primary,
      policyVersion: result.policyVersion,
      diagnostics: result.hoverDiagnostics,
      metrics: Object.fromEntries(
        MODES.map((mode) => [mode, hoverMetrics(result, mode)]),
      ),
    };
  });
  const selectors = [
    ...MODES.flatMap((mode) => [
      {
        reason: `${mode}: smallest Oklab ΔE`,
        read: (row) => row.metrics[mode].oklabDeltaE,
      },
      {
        reason: `${mode}: smallest CIEDE2000`,
        read: (row) => row.metrics[mode].ciede2000,
      },
      {
        reason: `${mode}: smallest surface-contrast change`,
        read: (row) => Math.abs(row.metrics[mode].surfaceContrastChange),
      },
    ]),
    {
      reason: "largest Light/Dark CIEDE2000 disagreement",
      direction: "maximum",
      read: (row) =>
        Math.abs(row.metrics.light.ciede2000 - row.metrics.dark.ciede2000),
    },
  ];
  const allReasons = selectors.map(({ reason }) => reason);
  if (!rows.length || limit === 0) {
    return {
      method:
        "Named metric extremes, capped after prioritizing inputs with more named extremes. No weighted score or calibrated risk threshold.",
      coveredReasonCount: 0,
      totalReasonCount: allReasons.length,
      uncoveredReasons: allReasons,
      recommendations: [],
      rows,
    };
  }
  const reasons = new Map();
  for (const selector of selectors) {
    const selected = extreme(rows, selector.read, selector.direction);
    const existing = reasons.get(selected.primary) ?? [];
    existing.push(selector.reason);
    reasons.set(selected.primary, existing);
  }
  const candidates = [...reasons].map(([primary, selectedReasons]) => ({
    primary,
    reasons: selectedReasons,
  }));
  let recommendations = [...candidates]
    .sort((first, second) => second.reasons.length - first.reasons.length)
    .slice(0, limit);
  if (recommendations.length < Math.min(3, rows.length)) {
    const alreadySelected = new Set(
      recommendations.map(({ primary }) => primary),
    );
    const fill = [...rows]
      .filter(({ primary }) => !alreadySelected.has(primary))
      .sort(
        (first, second) =>
          Math.min(
            first.metrics.light.ciede2000,
            first.metrics.dark.ciede2000,
          ) -
          Math.min(
            second.metrics.light.ciede2000,
            second.metrics.dark.ciede2000,
          ),
      )
      .map(({ primary }) => ({
        primary,
        reasons: ["next-smallest cross-mode CIEDE2000"],
      }));
    recommendations = recommendations.concat(fill);
  }
  recommendations = recommendations.slice(0, limit);
  const coveredReasons = new Set(
    recommendations
      .flatMap(({ reasons: selectedReasons }) => selectedReasons)
      .filter((reason) => allReasons.includes(reason)),
  );
  const order = new Map(
    recommendations.map(({ primary }, index) => [primary, index]),
  );
  return {
    method:
      "Named metric extremes, capped after prioritizing inputs with more named extremes. No weighted score or calibrated risk threshold.",
    coveredReasonCount: coveredReasons.size,
    totalReasonCount: allReasons.length,
    uncoveredReasons: allReasons.filter(
      (reason) => !coveredReasons.has(reason),
    ),
    recommendations,
    rows: [...rows].sort((first, second) => {
      const firstOrder = order.get(first.primary) ?? Number.POSITIVE_INFINITY;
      const secondOrder = order.get(second.primary) ?? Number.POSITIVE_INFINITY;
      return firstOrder - secondOrder;
    }),
  };
}
