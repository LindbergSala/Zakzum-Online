export const CHARACTER_CLASS_OPTIONS = [
  { value: "BARBARIAN", label: "Barbarian" },
  { value: "BARD", label: "Bard" },
  { value: "CLERIC", label: "Cleric" },
  { value: "DRUID", label: "Druid" },
  { value: "FIGHTER", label: "Fighter" },
  { value: "MONK", label: "Monk" },
  { value: "PALADIN", label: "Paladin" },
  { value: "RANGER", label: "Ranger" },
  { value: "ROGUE", label: "Rogue" },
  { value: "SORCERER", label: "Sorcerer" },
  { value: "WARLOCK", label: "Warlock" },
  { value: "WIZARD", label: "Wizard" },
];

export const CHARACTER_RACE_OPTIONS = [
  { value: "DRAGONBORN", label: "Dragonborn" },
  { value: "HUMAN", label: "Human" },
  { value: "DWARF", label: "Dwarf" },
  { value: "ELF", label: "Elf" },
  { value: "GNOME", label: "Gnome" },
  { value: "HALF_ELF", label: "Half-elf" },
  { value: "HALF_ORC", label: "Half-orc" },
  { value: "HALFLING", label: "Halfling" },
  { value: "TIEFLING", label: "Tiefling" },
];

export const CHARACTER_BACKGROUND_OPTIONS = [
  { value: "ACOLYTE", label: "Acolyte" },
  { value: "CHARLATAN", label: "Charlatan" },
  { value: "CRIMINAL", label: "Criminal" },
  { value: "ENTERTAINER", label: "Entertainer" },
  { value: "FOLK_HERO", label: "Folk Hero" },
  { value: "GUILD_ARTISAN", label: "Guild Artisan" },
  { value: "HERMIT", label: "Hermit" },
  { value: "NOBLE", label: "Noble" },
  { value: "OUTLANDER", label: "Outlander" },
  { value: "SAGE", label: "Sage" },
  { value: "SAILOR", label: "Sailor" },
  { value: "SOLDIER", label: "Soldier" },
  { value: "URCHIN", label: "Urchin" },
];

export const CHARACTER_CLASS_VALUES = CHARACTER_CLASS_OPTIONS.map(
  (option) => option.value,
);

export const CHARACTER_RACE_VALUES = CHARACTER_RACE_OPTIONS.map(
  (option) => option.value,
);

export const CHARACTER_BACKGROUND_VALUES = CHARACTER_BACKGROUND_OPTIONS.map(
  (option) => option.value,
);

const CHARACTER_CLASS_LABELS = Object.fromEntries(
  CHARACTER_CLASS_OPTIONS.map((option) => [option.value, option.label]),
);

const CHARACTER_RACE_LABELS = Object.fromEntries(
  CHARACTER_RACE_OPTIONS.map((option) => [option.value, option.label]),
);

const CHARACTER_BACKGROUND_LABELS = Object.fromEntries(
  CHARACTER_BACKGROUND_OPTIONS.map((option) => [option.value, option.label]),
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
export const CHARACTER_BACKGROUND_LORE_MAX_LENGTH = 2500;

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

export function getCharacterRaceLabel(characterRaceValue) {
  return CHARACTER_RACE_LABELS[characterRaceValue] ?? characterRaceValue;
}

export function getCharacterBackgroundLabel(characterBackgroundValue) {
  return (
    CHARACTER_BACKGROUND_LABELS[characterBackgroundValue] ?? characterBackgroundValue
  );
}
