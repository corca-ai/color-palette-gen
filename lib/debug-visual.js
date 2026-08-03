export function axisMarkerPosition(value, maximum) {
  if (!Number.isFinite(value) || !Number.isFinite(maximum) || maximum <= 0) {
    return 0;
  }
  return Math.max(0, Math.min(100, (value / maximum) * 100));
}

export function parseMeasurement(value) {
  return Number(String(value).match(/\d+(?:\.\d+)?/)?.[0] ?? 0);
}
