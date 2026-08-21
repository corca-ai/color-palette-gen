export const FILLED_ACTION_DIRECTION_EXPERIMENT = Object.freeze({
  id: "mode-relative-filled-action-direction",
  authority: "diagnostic",
  directions: Object.freeze({ light: -1, dark: 1 }),
  baselineDirections: Object.freeze({ light: -1, dark: -1 }),
  changedDimensions: Object.freeze([
    "Primary and Destructive state lightness direction",
    "Dark Destructive default eligibility requires a complete diagnostic state family",
  ]),
  darkDestructiveSelection:
    "Select only defaults that can complete hover and active with the shared foreground",
});

export function assertFilledActionDirections(directions) {
  if (
    !directions ||
    directions.light !== -1 ||
    directions.dark !== 1 ||
    Object.keys(directions).length !== 2
  ) {
    throw new TypeError(
      "Filled-action direction diagnostic requires Light -1 and Dark +1.",
    );
  }
  return directions;
}
