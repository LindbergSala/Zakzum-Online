export function clampPercent(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function toNumericValue(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}