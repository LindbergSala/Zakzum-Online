import { SHOP_ITEM_DEFINITION_MAP } from "@/lib/core-loop-data";

const CARRY_WEIGHT_PER_STRENGTH = 3;

function toPositiveNumber(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return 0;
  }

  return numericValue;
}

export function getCharacterCarryCapacity(strength) {
  const safeStrength = Math.max(1, Math.floor(toPositiveNumber(strength)));
  return safeStrength * CARRY_WEIGHT_PER_STRENGTH;
}

export function getItemWeightById(itemId) {
  return toPositiveNumber(SHOP_ITEM_DEFINITION_MAP[itemId]?.weight);
}

export function getItemCarryCapacityBonusById(itemId) {
  return toPositiveNumber(
    SHOP_ITEM_DEFINITION_MAP[itemId]?.effects?.carryCapacity,
  );
}

export function getTotalItemWeight(items = []) {
  return items.reduce((total, item) => {
    const itemId = typeof item === "string" ? item : item?.itemId;
    return total + getItemWeightById(itemId);
  }, 0);
}

export function getTotalCarryCapacityBonus(items = []) {
  return items.reduce((total, item) => {
    const itemId = typeof item === "string" ? item : item?.itemId;
    return total + getItemCarryCapacityBonusById(itemId);
  }, 0);
}

export function getCharacterCarryWeightSummary(strength, items = []) {
  const baseCapacity = getCharacterCarryCapacity(strength);
  const carryBonus = getTotalCarryCapacityBonus(items);
  const maxWeight = baseCapacity + carryBonus;
  const currentWeight = getTotalItemWeight(items);
  const remainingWeight = maxWeight - currentWeight;
  const usagePercent = Math.max(
    0,
    Math.min(100, Math.round((currentWeight / maxWeight) * 100)),
  );

  return {
    baseCapacity,
    carryBonus,
    maxWeight,
    currentWeight,
    remainingWeight,
    isOverweight: remainingWeight < 0,
    usagePercent,
  };
}
