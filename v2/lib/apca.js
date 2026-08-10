const APCA = {
  mainTRC: 2.4,
  sRco: 0.2126729,
  sGco: 0.7151522,
  sBco: 0.072175,
  normBG: 0.56,
  normTXT: 0.57,
  revTXT: 0.62,
  revBG: 0.65,
  blkThrs: 0.022,
  blkClmp: 1.414,
  scaleBoW: 1.14,
  scaleWoB: 1.14,
  loBoWoffset: 0.027,
  loWoBoffset: 0.027,
  deltaYmin: 0.0005,
  loClip: 0.1,
};

function parseHex(hex) {
  if (typeof hex !== "string" || !/^#[0-9a-f]{6}$/i.test(hex)) {
    throw new TypeError("APCA colors must be six-digit hex strings.");
  }
  return [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
}

export function sRgbToApcaY(hex) {
  const [red, green, blue] = parseHex(hex).map((channel) =>
    Math.pow(channel / 255, APCA.mainTRC),
  );
  return red * APCA.sRco + green * APCA.sGco + blue * APCA.sBco;
}

function clampBlack(y) {
  return y > APCA.blkThrs ? y : y + Math.pow(APCA.blkThrs - y, APCA.blkClmp);
}

export function apcaContrast(textHex, backgroundHex) {
  const textY = clampBlack(sRgbToApcaY(textHex));
  const backgroundY = clampBlack(sRgbToApcaY(backgroundHex));
  if (Math.abs(backgroundY - textY) < APCA.deltaYmin) return 0;

  if (backgroundY > textY) {
    const sapc =
      (Math.pow(backgroundY, APCA.normBG) - Math.pow(textY, APCA.normTXT)) *
      APCA.scaleBoW;
    return (sapc < APCA.loClip ? 0 : sapc - APCA.loBoWoffset) * 100;
  }

  const sapc =
    (Math.pow(backgroundY, APCA.revBG) - Math.pow(textY, APCA.revTXT)) *
    APCA.scaleWoB;
  return (sapc > -APCA.loClip ? 0 : sapc + APCA.loWoBoffset) * 100;
}

export function apcaCheck({
  foreground,
  background,
  target,
  role,
  typography,
}) {
  const lc = apcaContrast(foreground, background);
  return {
    role,
    foreground,
    background,
    lc,
    target,
    typography,
    pass: Math.abs(lc) >= target,
  };
}
