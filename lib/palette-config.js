export const VIBES = {
  balanced: {
    harmony: "split complementary",
    hueOffsets: [150, 210],
    chromaScale: 1,
    derivedChromaScale: 0.82,
    surfaceTint: 0.02,
    stateLightnessStep: 0.05,
    borderEmphasis: 0.08,
  },
  calm: {
    harmony: "analogous",
    hueOffsets: [-24, 24],
    chromaScale: 0.78,
    derivedChromaScale: 0.68,
    surfaceTint: 0.03,
    stateLightnessStep: 0.035,
    borderEmphasis: 0.06,
  },
  soft: {
    harmony: "soft analogous",
    hueOffsets: [18, 42],
    chromaScale: 0.72,
    derivedChromaScale: 0.56,
    surfaceTint: 0.08,
    stateLightnessStep: 0.025,
    borderEmphasis: 0.04,
  },
  energetic: {
    harmony: "split complementary",
    hueOffsets: [150, 210],
    chromaScale: 1.12,
    derivedChromaScale: 1.08,
    surfaceTint: 0.02,
    stateLightnessStep: 0.07,
    borderEmphasis: 0.1,
  },
  "high contrast": {
    harmony: "complementary",
    hueOffsets: [180, 165],
    chromaScale: 1,
    derivedChromaScale: 1,
    surfaceTint: 0,
    stateLightnessStep: 0.08,
    borderEmphasis: 0.14,
  },
};

export const HARMONY_CANDIDATES = {
  balanced: [
    { id: "default", label: "Split complement", offsets: [150, 210] },
    { id: "analogous", label: "Analogous", offsets: [-30, 30] },
    { id: "triadic", label: "Triadic", offsets: [120, 240] },
  ],
  calm: [
    { id: "default", label: "Analogous", offsets: [-24, 24] },
    { id: "monochromatic", label: "Monochromatic", offsets: [0, 0] },
    { id: "wide-analogous", label: "Wide analogous", offsets: [-42, 42] },
  ],
  soft: [
    { id: "default", label: "Soft analogous", offsets: [18, 42] },
    { id: "monochromatic", label: "Monochromatic", offsets: [0, 0] },
    { id: "wide-analogous", label: "Wide analogous", offsets: [-36, 36] },
  ],
  energetic: [
    { id: "default", label: "Split complement", offsets: [150, 210] },
    { id: "triadic", label: "Triadic", offsets: [120, 240] },
    { id: "complementary", label: "Complementary", offsets: [180, 165] },
  ],
  "high contrast": [
    { id: "default", label: "Complementary", offsets: [180, 165] },
    { id: "split", label: "Split complement", offsets: [150, 210] },
    { id: "triadic", label: "Triadic", offsets: [120, 240] },
  ],
};

export const REQUIRED_FUNCTIONS = [
  "background",
  "surface",
  "main text",
  "secondary text",
  "border",
  "border control",
  "primary button default",
  "primary button hover",
  "primary button active",
  "primary button text",
  "focus ring",
  "secondary accent",
  "secondary accent soft",
  "secondary accent text",
  "decorative accent",
  "decorative accent soft",
  "decorative accent text",
];

export const CONTRAST_CONTRACTS = [
  { foreground: "main text", backgrounds: ["background", "surface"], target: 8, highContrastTarget: 10.5, kind: "text", label: "Primary reading contrast" },
  { foreground: "secondary text", backgrounds: ["background", "surface"], target: 4.7, highContrastTarget: 7, kind: "text", label: "Secondary reading contrast" },
  { foreground: "primary button text", backgrounds: ["primary button default", "primary button hover", "primary button active"], target: 4.5, kind: "text", label: "Shared button text contrast" },
  { foreground: "secondary accent text", backgrounds: ["secondary accent soft"], target: 4.5, kind: "text", label: "Accent text contrast" },
  { foreground: "decorative accent text", backgrounds: ["decorative accent soft"], target: 4.5, kind: "text", label: "Accent text contrast" },
  { foreground: "focus ring", backgrounds: ["background", "surface"], target: 3, kind: "indicator", label: "Focus indicator contrast" },
  { foreground: "border control", backgrounds: ["surface"], target: 3, kind: "boundary", label: "Control boundary contrast" },
];
