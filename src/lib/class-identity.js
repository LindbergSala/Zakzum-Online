const CLASS_PASSIVES = {
  BARBARIAN: {
    id: "barbarian-thick-skin",
    name: "Thick Skin",
    description: "On failure, HP penalty is reduced by 2.",
  },
  BARD: {
    id: "bard-silver-tongue",
    name: "Silver Tongue",
    description: "Gain +2 extra Gold on all successful activities.",
  },
  CLERIC: {
    id: "cleric-divine-protection",
    name: "Divine Protection",
    description: "Gain +1 HP after every successful activity.",
  },
  DRUID: {
    id: "druid-natural-recovery",
    name: "Natural Recovery",
    description: "Regenerate +1 extra Energy when energy refreshes.",
  },
  FIGHTER: {
    id: "fighter-battle-discipline",
    name: "Battle Discipline",
    description: "+1 roll modifier in Arena and Adventure.",
  },
  MONK: {
    id: "monk-inner-focus",
    name: "Inner Focus",
    description: "Activities cost -1 Energy (minimum 1).",
  },
  PALADIN: {
    id: "paladin-righteous-resolve",
    name: "Righteous Resolve",
    description: "Gain +1 Renown on all successful Arena activities.",
  },
  RANGER: {
    id: "ranger-pathfinder",
    name: "Pathfinder",
    description: "+1 roll modifier in Quest and Adventure.",
  },
  ROGUE: {
    id: "rogue-opportunist",
    name: "Opportunist",
    description: "On success, gain +2 extra Gold.",
  },
  SORCERER: {
    id: "sorcerer-wild-power",
    name: "Wild Power",
    description: "On success, gain +1 extra XP and +1 extra Gold.",
  },
  WARLOCK: {
    id: "warlock-dark-bargain",
    name: "Dark Bargain",
    description:
      "On success, gain +3 extra reward (Gold or XP), but on failure take +1 extra penalty.",
  },
  WIZARD: {
    id: "wizard-arcane-insight",
    name: "Arcane Insight",
    description: "On success you gain +2 extra XP.",
  },
};

const CLASS_START_BONUS_STATS = {
  BARBARIAN: {
    constitution: 2,
    strength: 1,
  },
  BARD: {
    charisma: 2,
    dexterity: 1,
  },
  CLERIC: {
    wisdom: 2,
    constitution: 1,
  },
  DRUID: {
    wisdom: 2,
    intelligence: 1,
  },
  FIGHTER: {
    strength: 2,
    constitution: 1,
  },
  MONK: {
    dexterity: 2,
    wisdom: 1,
  },
  PALADIN: {
    strength: 2,
    charisma: 1,
  },
  RANGER: {
    dexterity: 2,
    wisdom: 1,
  },
  ROGUE: {
    dexterity: 2,
    charisma: 1,
  },
  SORCERER: {
    intelligence: 2,
    charisma: 1,
  },
  WARLOCK: {
    charisma: 2,
    intelligence: 1,
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

export function getClassPassiveRollModifier(characterClass, activityId) {
  if (
    characterClass === "FIGHTER" &&
    (activityId === "arena" || activityId === "adventure")
  ) {
    return 1;
  }

  if (
    characterClass === "RANGER" &&
    (activityId === "quest" || activityId === "adventure")
  ) {
    return 1;
  }

  return 0;
}

export function getClassPassiveActivityEnergyCost(characterClass, energyCostInput) {
  const energyCost = Math.max(0, normalizeDeltaValue(energyCostInput));

  if (characterClass === "MONK") {
    return Math.max(1, energyCost - 1);
  }

  return energyCost;
}

export function getClassPassiveEnergyRefreshBonus(characterClass) {
  if (characterClass === "DRUID") {
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

function getWarlockSuccessBonus(nextDelta) {
  const goldReward = Math.max(0, nextDelta.gold);
  const xpReward = Math.max(0, nextDelta.xp);

  if (xpReward > goldReward) {
    nextDelta.xp += 3;
    return { xp: 3 };
  }

  nextDelta.gold += 3;
  return { gold: 3 };
}

function getWarlockFailurePenalty(nextDelta) {
  if (nextDelta.hp < 0) {
    nextDelta.hp -= 1;
    return { hp: -1 };
  }

  if (nextDelta.gold < 0) {
    nextDelta.gold -= 1;
    return { gold: -1 };
  }

  nextDelta.heat += 1;
  return { heat: 1 };
}

export function applyClassPassiveDelta({
  characterClass,
  success,
  delta,
  activityId,
}) {
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
  } else if (characterClass === "BARD" && success) {
    nextDelta.gold += 2;
    deltaBonus = { gold: 2 };
  } else if (characterClass === "BARBARIAN" && !success && nextDelta.hp < 0) {
    const hpReduction = Math.min(2, Math.abs(nextDelta.hp));
    nextDelta.hp += hpReduction;
    deltaBonus = { hp: hpReduction };
  } else if (characterClass === "CLERIC" && success) {
    nextDelta.hp += 1;
    deltaBonus = { hp: 1 };
  } else if (
    characterClass === "PALADIN" &&
    success &&
    activityId === "arena"
  ) {
    nextDelta.renown += 1;
    deltaBonus = { renown: 1 };
  } else if (characterClass === "SORCERER" && success) {
    nextDelta.xp += 1;
    nextDelta.gold += 1;
    deltaBonus = { xp: 1, gold: 1 };
  } else if (characterClass === "WARLOCK" && success) {
    deltaBonus = getWarlockSuccessBonus(nextDelta);
  } else if (characterClass === "WARLOCK" && !success) {
    deltaBonus = getWarlockFailurePenalty(nextDelta);
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
