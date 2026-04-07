import { resolveActivityGroupId } from "@/lib/core-loop-data";

const RACE_PASSIVES = {
  DRAGONBORN: {
    id: "dragonborn-draconic-might",
    name: "Draconic Might",
    description: "+1 roll modifier in Arena.",
  },
  DWARF: {
    id: "dwarf-stone-endurance",
    name: "Stone Endurance",
    description: "On failure, reduce HP penalty by 2.",
  },
  ELF: {
    id: "elf-keen-senses",
    name: "Keen Senses",
    description: "+1 roll modifier in Quest.",
  },
  GNOME: {
    id: "gnome-clever-mind",
    name: "Clever Mind",
    description: "On success, gain +2 extra XP.",
  },
  HALF_ELF: {
    id: "half-elf-natural-diplomat",
    name: "Natural Diplomat",
    description: "On success, gain +1 extra Gold and +1 extra XP.",
  },
  HALF_ORC: {
    id: "half-orc-relentless",
    name: "Relentless",
    description:
      "Once per session, when you would be reduced to 0 HP, survive with 1 HP instead.",
  },
  HALFLING: {
    id: "halfling-lucky",
    name: "Lucky",
    description: "On failure, regain 1 Stamina.",
  },
  HUMAN: {
    id: "human-adaptable",
    name: "Adaptable",
    description: "On success, gain +1 extra Gold and +1 extra XP.",
  },
  TIEFLING: {
    id: "tiefling-dark-fortune",
    name: "Dark Fortune",
    description: "On success, gain +2 extra Gold in Adventure and Arena.",
  },
};

function normalizeDeltaValue(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.floor(numericValue) : 0;
}

function buildDeltaSnapshot(delta) {
  return {
    hp: normalizeDeltaValue(delta?.hp),
    stamina: normalizeDeltaValue(delta?.stamina),
    gold: normalizeDeltaValue(delta?.gold),
    xp: normalizeDeltaValue(delta?.xp),
    level: normalizeDeltaValue(delta?.level),
    renown: normalizeDeltaValue(delta?.renown),
    heat: normalizeDeltaValue(delta?.heat),
  };
}

export function getRacePassive(characterRace) {
  return (
    RACE_PASSIVES[characterRace] ?? {
      id: "no-racial-passive",
      name: "No Racial Passive",
      description: "No racial passive available.",
    }
  );
}

export function getRacePassiveRollModifier(characterRace, activityId) {
  const activityGroupId = resolveActivityGroupId(activityId) ?? activityId;

  if (characterRace === "DRAGONBORN" && activityGroupId === "arena") {
    return 1;
  }

  if (characterRace === "ELF" && activityGroupId === "quest") {
    return 1;
  }

  return 0;
}

export function applyRacePassiveDelta({
  characterRace,
  success,
  delta,
  activityId,
}) {
  const activityGroupId = resolveActivityGroupId(activityId) ?? activityId;
  const nextDelta = buildDeltaSnapshot(delta);
  let deltaBonus = {};

  if (characterRace === "DWARF" && !success && nextDelta.hp < 0) {
    const hpReduction = Math.min(2, Math.abs(nextDelta.hp));
    nextDelta.hp += hpReduction;
    deltaBonus = { hp: hpReduction };
  } else if (characterRace === "GNOME" && success) {
    nextDelta.xp += 2;
    deltaBonus = { xp: 2 };
  } else if (characterRace === "HALF_ELF" && success) {
    nextDelta.gold += 1;
    nextDelta.xp += 1;
    deltaBonus = { gold: 1, xp: 1 };
  } else if (characterRace === "HALFLING" && !success) {
    nextDelta.stamina += 1;
    deltaBonus = { stamina: 1 };
  } else if (characterRace === "HUMAN" && success) {
    nextDelta.gold += 1;
    nextDelta.xp += 1;
    deltaBonus = { gold: 1, xp: 1 };
  } else if (
    characterRace === "TIEFLING" &&
    success &&
    (activityGroupId === "adventure" || activityGroupId === "arena")
  ) {
    nextDelta.gold += 2;
    deltaBonus = { gold: 2 };
  }

  return {
    delta: nextDelta,
    deltaBonus,
  };
}

export function applyHalfOrcRelentless({
  characterRace,
  beforeResources,
  afterResources,
  delta,
  alreadyUsedThisSession,
}) {
  const beforeHp = normalizeDeltaValue(beforeResources?.hp);
  const afterHp = normalizeDeltaValue(afterResources?.hp);

  const nextAfter = {
    ...afterResources,
    hp: afterHp,
  };
  const nextDelta = buildDeltaSnapshot(delta);

  if (
    characterRace !== "HALF_ORC" ||
    alreadyUsedThisSession ||
    beforeHp <= 0 ||
    afterHp > 0
  ) {
    return {
      afterResources: nextAfter,
      delta: nextDelta,
      triggered: false,
      deltaBonus: {},
    };
  }

  nextAfter.hp = 1;
  nextDelta.hp = nextAfter.hp - beforeHp;

  return {
    afterResources: nextAfter,
    delta: nextDelta,
    triggered: true,
    deltaBonus: { hp: 1 },
  };
}
