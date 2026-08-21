export const WARNING_APPEARANCE_EXPERIMENT = Object.freeze({
  id: "light-warning-appearance-v2",
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
    id: "prior-best",
    label: "이전 비교의 최선안",
    shortLabel: "L .70 · h 85°",
    question:
      "밝기와 chroma를 함께 높였지만 여전히 탁하다고 판단한 기준점이다.",
    recipe: Object.freeze({
      preferredLightness: 0.7,
      chroma: 0.18,
      anchorHue: 85,
      hueCandidates: Object.freeze([85]),
      lightnessRange: Object.freeze([0.52, 0.82]),
    }),
  }),
  Object.freeze({
    id: "higher-lightness",
    label: "더 밝은 Amber",
    shortLabel: "L .78 · h 85°",
    question: "hue는 유지하고 실제로 움직이는 밝기 축을 더 밀면 선명해지는가?",
    recipe: Object.freeze({
      preferredLightness: 0.78,
      chroma: 0.18,
      anchorHue: 85,
      hueCandidates: Object.freeze([85]),
      lightnessRange: Object.freeze([0.52, 0.82]),
    }),
  }),
  Object.freeze({
    id: "orangeward",
    label: "주황 쪽으로 이동",
    shortLabel: "L .78 · h 70°",
    question:
      "밝기는 같게 두고 갈색 인상을 줄이는 주황 방향이 더 자연스러운가?",
    recipe: Object.freeze({
      preferredLightness: 0.78,
      chroma: 0.18,
      anchorHue: 70,
      hueCandidates: Object.freeze([70]),
      lightnessRange: Object.freeze([0.52, 0.82]),
    }),
  }),
  Object.freeze({
    id: "yellowward",
    label: "노랑 쪽으로 이동",
    shortLabel: "L .78 · h 100°",
    question: "밝기는 같게 두고 더 노란 Warning으로 읽히는 방향을 확인한다.",
    recipe: Object.freeze({
      preferredLightness: 0.78,
      chroma: 0.18,
      anchorHue: 100,
      hueCandidates: Object.freeze([100]),
      lightnessRange: Object.freeze([0.52, 0.82]),
    }),
  }),
]);

export function warningAppearanceArm(id) {
  const arm = WARNING_APPEARANCE_ARMS.find((item) => item.id === id);
  if (!arm) throw new TypeError(`Unknown Warning appearance arm: ${id}.`);
  return arm;
}
