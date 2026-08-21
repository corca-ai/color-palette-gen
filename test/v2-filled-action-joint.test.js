import assert from "node:assert/strict";
import test from "node:test";

import { candidate } from "../v2/lib/runtime.js";
import {
  generatePaletteV2,
  inspectBoundedJointDarkFilledActionFamily,
} from "../v2/lib/palette.js";
import { FILLED_ACTION_JOINT_EXPERIMENT } from "../v2/lib/filled-action-joint.js";
import { destructiveSearch } from "../v2/lib/feedback-search.js";

const KNOWN_TRANSACTIONAL_FAILURES = [
  "#660000",
  "#990000",
  "#990033",
  "#993300",
  "#993333",
  "#CC0000",
  "#CC0033",
  "#CC3300",
  "#CC3333",
  "#FF0000",
  "#FF0033",
  "#FF3300",
  "#FF3333",
  "#FF6633",
  "#FF6666",
];

function assertIncreasingFamily(values, role) {
  const lightnesses = [role, `${role}Hover`, `${role}Active`].map(
    (key) => candidate(values[key]).oklch.l,
  );
  assert.ok(lightnesses[0] < lightnesses[1]);
  assert.ok(lightnesses[1] < lightnesses[2]);
}

test("bounded joint Dark inspection keeps its diagnostic identity and production isolated", () => {
  const before = generatePaletteV2({ primary: "#3366CC" });
  const first = inspectBoundedJointDarkFilledActionFamily({
    primary: "#3366CC",
  });
  const second = inspectBoundedJointDarkFilledActionFamily({
    primary: "#3366CC",
  });

  assert.equal(first.complete, true);
  assert.deepEqual(first.experiment, FILLED_ACTION_JOINT_EXPERIMENT);
  assert.equal(first.experiment.directionSourceHueBranch, "none");
  assert.equal(first.experiment.fallback, "none");
  assert.deepEqual(first, second);
  assert.equal(first.funnel.requestedPrimaryForegroundAttemptCount, 34);
  assert.ok(first.funnel.eligibleJointFamilyCount > 0);
  assert.equal(
    Object.values(first.funnel.statusCounts).reduce(
      (sum, count) => sum + count,
      0,
    ),
    first.funnel.requestedPrimaryForegroundAttemptCount,
  );
  assertIncreasingFamily(first.selected.values, "primary");
  assertIncreasingFamily(first.selected.values, "destructive");
  assert.ok(["#000000", "#FFFFFF"].includes(first.selected.values.foreground));
  assert.deepEqual(generatePaletteV2({ primary: "#3366CC" }), before);
});

test("the separation-off diagnostic keeps the Destructive producer inventory and all other constraints", () => {
  const input = {
    mode: "dark",
    primary: candidate("#3366CC"),
    actionForeground: "#FFFFFF",
    preferredLightness: 0.637,
    retainPlot: "detailed",
  };
  const current = destructiveSearch(input).trace.searchPlot;
  const separationOff = destructiveSearch({
    ...input,
    diagnosticOmitBrandSeparation: true,
  }).trace.searchPlot;

  assert.deepEqual(
    separationOff.map(({ hex }) => hex),
    current.map(({ hex }) => hex),
  );
  for (let index = 0; index < current.length; index += 1) {
    const currentConstraints = current[index].constraintResults;
    const diagnosticConstraints = separationOff[index].constraintResults;
    assert.deepEqual(
      diagnosticConstraints.map(({ id }) => id),
      ["destructive.label-contrast"],
    );
    assert.deepEqual(diagnosticConstraints[0], currentConstraints[0]);
    assert.equal(currentConstraints[1].id, "destructive.brand-separation");
  }
  assert.throws(
    () =>
      destructiveSearch({
        ...input,
        diagnosticOmitBrandSeparation: "yes",
      }),
    /must be a boolean diagnostic option/u,
  );
});

test("the frozen joint inventory rescues only three of the fifteen known failures", () => {
  const results = KNOWN_TRANSACTIONAL_FAILURES.map((primary) =>
    inspectBoundedJointDarkFilledActionFamily({ primary }),
  );
  const complete = results.filter((result) => result.complete);
  const infeasible = results.filter((result) => !result.complete);

  assert.deepEqual(
    complete.map(({ input }) => input),
    ["#660000", "#990033", "#993333"],
  );
  assert.equal(infeasible.length, 12);
  assert.ok(infeasible.every(({ selected }) => selected === null));
  assert.ok(
    infeasible.every(
      ({ funnel }) =>
        funnel.statusCounts["eligible-joint-family"] === undefined,
    ),
  );

  const attempts = infeasible.flatMap(({ attempts }) => attempts);
  assert.equal(
    attempts.filter(
      ({ foreground, status }) =>
        foreground === "#000000" && status === "primary-family-infeasible",
    ).length,
    204,
  );
  const destructiveAttempts = attempts.filter(
    ({ status }) => status === "destructive-family-infeasible",
  );
  const sumCandidateCount = (key) =>
    destructiveAttempts.reduce(
      (sum, attempt) => sum + (attempt.destructiveCandidateCounts[key] ?? 0),
      0,
    );
  assert.equal(destructiveAttempts.length, 165);
  assert.equal(sumCandidateCount("inventory"), 5445);
  assert.equal(sumCandidateCount("basePassing"), 1052);
  assert.equal(sumCandidateCount("hoverComplete"), 126);
  assert.equal(sumCandidateCount("activeComplete"), 0);
  assert.equal(sumCandidateCount("completeFamily"), 0);

  const expectedMaximumDistances = {
    "#990000": 0.06995805597667352,
    "#993300": 0.07990549171942975,
    "#CC0000": 0.06995805597667352,
    "#CC0033": 0.07249973812635585,
    "#CC3300": 0.07326666101528799,
    "#CC3333": 0.06952367564412565,
    "#FF0000": 0.06995805597667352,
    "#FF0033": 0.07198066859688297,
    "#FF3300": 0.07148866627674445,
    "#FF3333": 0.06894942326764515,
    "#FF6633": 0.07627239805418515,
    "#FF6666": 0.07243034158810828,
  };
  for (const result of infeasible) {
    const probe = result.separationDisconfirmingProbe;
    assert.equal(probe.omittedConstraintId, "destructive.brand-separation");
    assert.deepEqual(probe.retainedConstraintIds, [
      "destructive.label-contrast",
      "state.minimum-separation",
      "state.shared-label",
    ]);
    assert.equal(probe.completeDestructiveFamilyCount, 13);
    assert.equal(probe.anyPairMeetsSeparation, false);
    assert.equal(
      probe.maximumPair.deltaE,
      expectedMaximumDistances[result.input],
    );
  }
  assert.deepEqual(
    infeasible[0].separationDisconfirmingProbe.completeDestructiveFamilies,
    [
      [0.56, "#CC3430", "#D9423B", "#E74F47"],
      [0.565, "#CE3631", "#DB433C", "#E95148"],
      [0.57, "#D03833", "#DD453E", "#EC534A"],
      [0.575, "#D23934", "#DF463F", "#EE544B"],
      [0.58, "#D33B36", "#E04741", "#EF564D"],
      [0.585, "#D53D37", "#E24942", "#F0574E"],
      [0.59, "#D73F39", "#E44B44", "#F25950"],
      [0.595, "#D9413A", "#E64D45", "#F45B51"],
      [0.6, "#DB423C", "#E84E47", "#F65C53"],
      [0.605, "#DC443D", "#E95048", "#F75E54"],
      [0.61, "#DE463F", "#EB524A", "#F96056"],
      [0.615, "#E04840", "#ED544B", "#FC6257"],
      [0.62, "#E24942", "#EF554D", "#FE6359"],
    ].map(([requestedLightness, defaultHex, hover, active]) => ({
      default: defaultHex,
      hover,
      active,
      requestedLightness,
    })),
  );

  const activeEvidence = destructiveAttempts.reduce(
    (summary, attempt) => {
      const evidence = attempt.stateCandidateEvidence.active;
      summary.candidateOccurrenceCount += evidence.candidateOccurrenceCount;
      summary.availableOccurrenceCount += evidence.availableOccurrenceCount;
      for (const [pattern, count] of Object.entries(
        evidence.failedPatternOccurrenceCounts,
      )) {
        summary.failedPatternOccurrenceCounts[pattern] =
          (summary.failedPatternOccurrenceCounts[pattern] ?? 0) + count;
      }
      return summary;
    },
    {
      candidateOccurrenceCount: 0,
      availableOccurrenceCount: 0,
      failedPatternOccurrenceCounts: {},
    },
  );
  assert.deepEqual(activeEvidence, {
    candidateOccurrenceCount: 84160,
    availableOccurrenceCount: 0,
    failedPatternOccurrenceCounts: {
      "state.minimum-separation": 7843,
      "state.minimum-separation+state.shared-label": 19318,
      "state.shared-label": 56999,
    },
  });
});

test("bounded joint Dark inspection rejects malformed Primary input", () => {
  assert.throws(
    () => inspectBoundedJointDarkFilledActionFamily({ primary: "red" }),
    /six-digit hex/u,
  );
});
