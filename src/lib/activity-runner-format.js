import { toNumericValue } from "@/lib/number-utils";
import { CHARACTER_STAT_LABELS } from "@/lib/stat-effects";

export function formatActivityDelta(delta) {
  if (!delta || typeof delta !== "object") {
    return "No delta.";
  }

  const labelMap = {
    stamina: "STAMINA",
  };

  return Object.entries(delta)
    .map(([key, value]) => {
      const numericValue = toNumericValue(value);
      const sign = numericValue > 0 ? "+" : "";
      const label = labelMap[key] ?? key;
      return `${label}: ${sign}${numericValue}`;
    })
    .join(", ");
}

export function formatReadableOutcomeDelta(delta, options = {}) {
  if (!delta || typeof delta !== "object") {
    return "No resource changes.";
  }

  const includePositive = options.includePositive ?? true;
  const includeNegative = options.includeNegative ?? true;

  const parts = Object.entries(delta)
    .filter(([, value]) => {
      const numericValue = toNumericValue(value);

      if (numericValue === 0) {
        return false;
      }

      if (numericValue > 0) {
        return includePositive;
      }

      return includeNegative;
    })
    .map(([key, value]) => {
      const numericValue = toNumericValue(value);
      const sign = numericValue > 0 ? "+" : "";
      const label = key === "stamina" ? "STAMINA" : key.toUpperCase();
      return `${label} ${sign}${numericValue}`;
    });

  return parts.length > 0 ? parts.join(" | ") : "No resource changes.";
}

export function formatStatWithBonus(statKey, stats) {
  const label = CHARACTER_STAT_LABELS[statKey] ?? statKey.toUpperCase();
  if (!stats) {
    return label;
  }

  return `${label} ${stats.base[statKey]} + ${stats.bonus[statKey]} = ${stats.effective[statKey]}`;
}

export function formatDeltaBonus(deltaBonus) {
  if (!deltaBonus || typeof deltaBonus !== "object") {
    return "No extra bonus on this action.";
  }

  const parts = Object.entries(deltaBonus)
    .filter(([, value]) => toNumericValue(value) !== 0)
    .map(([key, value]) => {
      const numericValue = toNumericValue(value);
      const sign = numericValue > 0 ? "+" : "";
      const label = key === "stamina" ? "stamina" : key;
      return `${label}: ${sign}${numericValue}`;
    });

  return parts.length > 0
    ? parts.join(", ")
    : "No extra bonus on this action.";
}

export function formatLoot(loot) {
  if (!loot) {
    return "No loot dropped.";
  }

  const rarityLabel = loot.rarity ? `, ${loot.rarity}` : "";
  return `${loot.name} x${loot.quantity} (${loot.category}${rarityLabel})`;
}

export function formatSignedNumber(value) {
  const numericValue = toNumericValue(value);
  return numericValue >= 0 ? `+${numericValue}` : `${numericValue}`;
}

export function getRollDisplayValue(rollReveal) {
  if (!rollReveal) {
    return "?";
  }

  if (rollReveal.phase === "rolling") {
    return `${rollReveal.dieValue}`;
  }

  if (!rollReveal.showBonus) {
    return `${rollReveal.dieValue}`;
  }

  if (!rollReveal.showTotal) {
    return formatSignedNumber(rollReveal.bonusValue);
  }

  return `${rollReveal.totalValue}`;
}