import { SHOP_ITEM_DEFINITION_MAP } from "@/lib/core-loop-data";

export const CHARACTER_STAT_KEYS = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
];

export const CHARACTER_STAT_LABELS = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
};

function buildZeroStats() {
  return Object.fromEntries(CHARACTER_STAT_KEYS.map((key) => [key, 0]));
}

function toNumericStatValue(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

export function getCharacterBaseStats(character) {
  return Object.fromEntries(
    CHARACTER_STAT_KEYS.map((key) => [key, toNumericStatValue(character[key])]),
  );
}

export function normalizeStatBonuses(statBonuses = {}) {
  const normalized = buildZeroStats();

  for (const key of CHARACTER_STAT_KEYS) {
    normalized[key] = toNumericStatValue(statBonuses[key]);
  }

  return normalized;
}

export function addStatObjects(baseStats, bonusStats) {
  return Object.fromEntries(
    CHARACTER_STAT_KEYS.map((key) => [
      key,
      toNumericStatValue(baseStats[key]) + toNumericStatValue(bonusStats[key]),
    ]),
  );
}

export function getItemStatBonuses(itemId) {
  const definition = SHOP_ITEM_DEFINITION_MAP[itemId];
  return normalizeStatBonuses(definition?.effects?.stats);
}

export function getEquippedItemStatBonuses(equippedItems) {
  const total = buildZeroStats();

  for (const item of equippedItems) {
    const bonuses = getItemStatBonuses(item.itemId);

    for (const key of CHARACTER_STAT_KEYS) {
      total[key] += bonuses[key];
    }
  }

  return total;
}

export function getCharacterEffectiveStats(character, equippedItems = []) {
  const base = getCharacterBaseStats(character);
  const bonus = getEquippedItemStatBonuses(equippedItems);
  const effective = addStatObjects(base, bonus);

  return {
    base,
    bonus,
    effective,
  };
}

export function formatStatBonusLabel(statBonuses = {}) {
  const normalized = normalizeStatBonuses(statBonuses);
  const parts = [];

  for (const key of CHARACTER_STAT_KEYS) {
    const value = normalized[key];

    if (value > 0) {
      parts.push(`${CHARACTER_STAT_LABELS[key]} +${value}`);
    } else if (value < 0) {
      parts.push(`${CHARACTER_STAT_LABELS[key]} ${value}`);
    }
  }

  if (parts.length === 0) {
    return "Ingen stat-effekt";
  }

  return parts.join(", ");
}
