export const DIAGNOSTIC_RGB_CHANNELS = Object.freeze([
  0, 51, 102, 153, 204, 255,
]);

export function normalizeDiagnosticChannels(channels) {
  if (
    !Array.isArray(channels) ||
    channels.length === 0 ||
    channels.some(
      (channel) => !Number.isInteger(channel) || channel < 0 || channel > 255,
    )
  ) {
    throw new TypeError("channels must contain integers from 0 through 255.");
  }
  return [...new Set(channels)].sort((first, second) => first - second);
}

export function diagnosticInputGrid(channels = DIAGNOSTIC_RGB_CHANNELS) {
  const normalized = normalizeDiagnosticChannels(channels);
  return normalized.flatMap((red) =>
    normalized.flatMap((green) =>
      normalized.map((blue) =>
        `#${[red, green, blue]
          .map((channel) => channel.toString(16).padStart(2, "0"))
          .join("")}`.toUpperCase(),
      ),
    ),
  );
}
