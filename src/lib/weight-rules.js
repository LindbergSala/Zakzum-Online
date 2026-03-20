import { getItemById, getItemWeight } from "@/lib/items/helpers";

const CARRY_WEIGHT_PER_STRENGTH = 3;

function toPositiveNumber(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return 0;
  }

  return numericValue;
}

function getItemQuantityValue(item) {
  const quantity =
    typeof item === "object" && item !== null ? Number(item.quantity) : 1;
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return 1;
  }

  return Math.max(1, Math.floor(quantity));
}

export function getCharacterCarryCapacity(strength) {
  const safeStrength = Math.max(1, Math.floor(toPositiveNumber(strength)));
  return safeStrength * CARRY_WEIGHT_PER_STRENGTH;
}

export function getItemWeightById(itemId) {
  return toPositiveNumber(getItemWeight(itemId));
}

export function getItemCarryCapacityBonusById(itemId) {
  return toPositiveNumber(
    getItemById(itemId)?.effects?.carryCapacity,
  );
}

export function getTotalItemWeight(items = []) {
  return items.reduce((total, item) => {
    const itemId = typeof item === "string" ? item : item?.itemId;
    return total + getItemWeightById(itemId) * getItemQuantityValue(item);
  }, 0);
}

export function getTotalCarryCapacityBonus(items = []) {
  return items.reduce((total, item) => {
    const itemId = typeof item === "string" ? item : item?.itemId;
    return total + getItemCarryCapacityBonusById(itemId) * getItemQuantityValue(item);
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
