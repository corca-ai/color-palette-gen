export const WARNING_APPEARANCE_EXPERIMENT = Object.freeze({
  id: "light-warning-appearance-v1",
  authority: "diagnostic",
  scope: "light-warning-default-hover-active-text",
  productionMutation: false,
});

export const WARNING_APPEARANCE_INPUTS = Object.freeze([
  "#507096",
  "#FF0000",
  "#00A86B",
  "#6C3FD1",
  "#00AACC",
  "#777777",
]);

export const WARNING_APPEARANCE_ARMS = Object.freeze([
  Object.freeze({
    id: "current",
    label: "현재안",
    shortLabel: "Current",
    question: "현재 L 0.65 anchor가 실제로 얼마나 탁하게 보이는가?",
    recipe: null,
  }),
  Object.freeze({
    id: "brighter",
    label: "밝기만 증가",
    shortLabel: "L 0.70",
    question: "같은 hue·chroma에서 anchor만 밝히면 충분한가?",
    recipe: Object.freeze({ preferredLightness: 0.7 }),
  }),
  Object.freeze({
    id: "more-chroma",
    label: "Chroma만 증가",
    shortLabel: "C 0.18",
    question: "같은 밝기에서 chroma 요청만 높이면 탁함이 줄어드는가?",
    recipe: Object.freeze({ chroma: 0.18 }),
  }),
  Object.freeze({
    id: "brighter-more-chroma",
    label: "밝기 + Chroma 증가",
    shortLabel: "L 0.70 · C 0.18",
    question: "두 축을 함께 움직인 결과가 더 자연스러운 Warning인가?",
    recipe: Object.freeze({ preferredLightness: 0.7, chroma: 0.18 }),
  }),
]);

export function warningAppearanceArm(id) {
  const arm = WARNING_APPEARANCE_ARMS.find((item) => item.id === id);
  if (!arm) throw new TypeError(`Unknown Warning appearance arm: ${id}.`);
  return arm;
}
