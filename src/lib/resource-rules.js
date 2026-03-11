import { getLevelForXp } from "@/lib/level-progression";

const MIN_ZERO_FIELDS = ["hp", "energy", "gold", "xp", "renown", "heat"];

export function getCharacterResourceSnapshot(character) {
  return {
    hp: character.hp,
    energy: character.energy,
    gold: character.gold,
    xp: character.xp,
    level: character.level,
    renown: character.renown,
    heat: character.heat,
  };
}

export function buildCharacterResourceUpdateInput(nextResources) {
  return {
    hp: nextResources.hp,
    energy: nextResources.energy,
    gold: nextResources.gold,
    xp: nextResources.xp,
    level: nextResources.level,
    renown: nextResources.renown,
    heat: nextResources.heat,
  };
}

export function calculateCharacterResourceResult(character, options) {
  const energyCost = options.energyCost ?? 0;
  const delta = options.delta ?? {};

  if (character.energy < energyCost) {
    return {
      ok: false,
      reason: "NOT_ENOUGH_ENERGY",
      message: `Inte tillrackligt med Energy. Kravs ${energyCost}, du har ${character.energy}.`,
      requiredEnergy: energyCost,
      currentEnergy: character.energy,
    };
  }

  const current = getCharacterResourceSnapshot(character);
  const currentLevel = Math.max(1, Number(current.level) || 1);
  const raw = {
    hp: current.hp + (delta.hp ?? 0),
    energy: current.energy - energyCost + (delta.energy ?? 0),
    gold: current.gold + (delta.gold ?? 0),
    xp: current.xp + (delta.xp ?? 0),
    level: current.level + (delta.level ?? 0),
    renown: current.renown + (delta.renown ?? 0),
    heat: current.heat + (delta.heat ?? 0),
  };

  const next = {
    ...raw,
  };

  for (const field of MIN_ZERO_FIELDS) {
    next[field] = Math.max(0, next[field]);
  }

  const levelFromXp = getLevelForXp(next.xp);
  next.level = Math.max(1, currentLevel, next.level, levelFromXp);

  return {
    ok: true,
    before: current,
    after: next,
    delta: {
      hp: next.hp - current.hp,
      energy: next.energy - current.energy,
      gold: next.gold - current.gold,
      xp: next.xp - current.xp,
      level: next.level - current.level,
      renown: next.renown - current.renown,
      heat: next.heat - current.heat,
    },
  };
}
