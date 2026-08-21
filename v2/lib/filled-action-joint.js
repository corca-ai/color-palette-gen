export const FILLED_ACTION_JOINT_EXPERIMENT = Object.freeze({
  id: "bounded-joint-dark-filled-action-family",
  authority: "diagnostic",
  scope: "dark-only; Light remains production v15",
  directions: Object.freeze({ light: -1, dark: 1 }),
  foregrounds: Object.freeze(["#000000", "#FFFFFF"]),
  inventory: "current-v15-primary-and-destructive-candidates",
  ranking: Object.freeze([
    "primary.source-fidelity",
    "destructive.semantic-anchor",
    "text.maximum-weakest-contrast",
    "stable.rendered-color-identity",
  ]),
  fallback: "none",
  directionSourceHueBranch: "none",
  retainedInputRelativePolicy:
    "current Destructive semantic-anchor preference and Primary separation",
});
