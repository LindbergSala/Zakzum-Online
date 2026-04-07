const COMPACT_DELTA_ORDER = ["gold", "xp", "renown", "hp", "heat", "stamina"];

export function formatCompactResourceDelta(delta) {
  if (!delta || typeof delta !== "object") {
    return "None";
  }

  const labelMap = {
    stamina: "STAMINA",
  };

  const segments = COMPACT_DELTA_ORDER
    .map((key) => [key, Number(delta[key] ?? 0)])
    .filter(([, value]) => value !== 0)
    .map(([key, value]) => {
      const sign = value > 0 ? "+" : "";
      return `${sign}${value} ${labelMap[key] ?? key.toUpperCase()}`;
    });

  return segments.length > 0 ? segments.join(" • ") : "None";
}