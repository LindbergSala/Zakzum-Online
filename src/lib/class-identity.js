const CLASS_PASSIVES = {
  FIGHTER: {
    id: "fighter-battle-discipline",
    name: "Battle Discipline",
    description: "+1 roll modifier in all activities.",
  },
  ROGUE: {
    id: "rogue-opportunist",
    name: "Opportunist",
    description: "On success you gain +2 extra Gold.",
  },
  BARBARIAN: {
    id: "barbarian-thick-skin",
    name: "Thick Skin",
    description: "On failure, HP penalty is reduced by 2.",
  },
  WIZARD: {
    id: "wizard-arcane-insight",
    name: "Arcane Insight",
    description: "On success you gain +2 extra XP.",
  },
};

const CLASS_START_BONUS_STATS = {
  FIGHTER: {
    strength: 2,
    constitution: 1,
  },
  ROGUE: {
    dexterity: 2,
    charisma: 1,
  },
  BARBARIAN: {
    constitution: 2,
    strength: 1,
  },
  WIZARD: {
    intelligence: 2,
    wisdom: 1,
  },
};

const CLASS_STAT_LABELS = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
};

const CLASS_STAT_KEYS = Object.keys(CLASS_STAT_LABELS);

function normalizeStatValue(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.floor(numericValue) : 0;
}

function normalizeDeltaValue(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.floor(numericValue) : 0;
}

export function getClassPassive(characterClass) {
  return (
    CLASS_PASSIVES[characterClass] ?? {
      id: "no-passive",
      name: "No Passive",
      description: "No class passive available.",
    }
  );
}

export function getClassPassiveRollModifier(characterClass) {
  if (characterClass === "FIGHTER") {
    return 1;
  }

  return 0;
}

export function getClassStartBonusStats(characterClass) {
  const configured = CLASS_START_BONUS_STATS[characterClass] ?? {};

  return Object.fromEntries(
    CLASS_STAT_KEYS.map((key) => [key, normalizeDeltaValue(configured[key])]),
  );
}

export function applyClassStartBonuses(statsInput, characterClass) {
  const startBonus = getClassStartBonusStats(characterClass);

  return Object.fromEntries(
    CLASS_STAT_KEYS.map((key) => [
      key,
      Math.max(1, Math.min(20, normalizeStatValue(statsInput[key]) + startBonus[key])),
    ]),
  );
}

export function applyClassPassiveDelta({ characterClass, success, delta }) {
  const nextDelta = {
    hp: normalizeDeltaValue(delta?.hp),
    energy: normalizeDeltaValue(delta?.energy),
    gold: normalizeDeltaValue(delta?.gold),
    xp: normalizeDeltaValue(delta?.xp),
    level: normalizeDeltaValue(delta?.level),
    renown: normalizeDeltaValue(delta?.renown),
    heat: normalizeDeltaValue(delta?.heat),
  };

  let deltaBonus = {};

  if (characterClass === "ROGUE" && success) {
    nextDelta.gold += 2;
    deltaBonus = { gold: 2 };
  } else if (characterClass === "BARBARIAN" && !success && nextDelta.hp < 0) {
    const hpReduction = Math.min(2, Math.abs(nextDelta.hp));
    nextDelta.hp += hpReduction;
    deltaBonus = { hp: hpReduction };
  } else if (characterClass === "WIZARD" && success) {
    nextDelta.xp += 2;
    deltaBonus = { xp: 2 };
  }

  return {
    delta: nextDelta,
    deltaBonus,
  };
}

export function formatClassStartBonusLabel(characterClass) {
  const startBonus = getClassStartBonusStats(characterClass);
  const parts = [];

  for (const key of CLASS_STAT_KEYS) {
    const value = startBonus[key];
    if (value > 0) {
      parts.push(`${CLASS_STAT_LABELS[key]} +${value}`);
    }
  }

  return parts.length > 0 ? parts.join(", ") : "No start bonus";
}
