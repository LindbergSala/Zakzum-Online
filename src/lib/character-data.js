export const CHARACTER_CLASS_OPTIONS = [
  { value: "FIGHTER", label: "Fighter" },
  { value: "ROGUE", label: "Rogue" },
  { value: "BARBARIAN", label: "Barbarian" },
  { value: "WIZARD", label: "Wizard" },
];

export const CHARACTER_CLASS_VALUES = CHARACTER_CLASS_OPTIONS.map(
  (option) => option.value,
);

const CHARACTER_CLASS_LABELS = Object.fromEntries(
  CHARACTER_CLASS_OPTIONS.map((option) => [option.value, option.label]),
);

export const CHARACTER_STAT_FIELDS = [
  { key: "strength", label: "STR" },
  { key: "dexterity", label: "DEX" },
  { key: "constitution", label: "CON" },
  { key: "intelligence", label: "INT" },
  { key: "wisdom", label: "WIS" },
  { key: "charisma", label: "CHA" },
];

export const CHARACTER_POINT_BUY_MIN_STAT = 8;
export const CHARACTER_POINT_BUY_MAX_STAT = 15;
export const CHARACTER_POINT_BUY_BUDGET = 27;

const POINT_BUY_COST_TABLE = {
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 7,
  15: 9,
};

export function getPointBuyCostForStat(statValue) {
  const numericValue = Number(statValue);

  if (!Number.isInteger(numericValue)) {
    return null;
  }

  if (
    numericValue < CHARACTER_POINT_BUY_MIN_STAT ||
    numericValue > CHARACTER_POINT_BUY_MAX_STAT
  ) {
    return null;
  }

  return POINT_BUY_COST_TABLE[numericValue];
}

export function calculateCharacterPointBuyCost(stats) {
  let totalCost = 0;

  for (const field of CHARACTER_STAT_FIELDS) {
    const cost = getPointBuyCostForStat(stats[field.key]);

    if (cost === null) {
      return null;
    }

    totalCost += cost;
  }

  return totalCost;
}

export function getCharacterClassLabel(characterClassValue) {
  return CHARACTER_CLASS_LABELS[characterClassValue] ?? characterClassValue;
}
