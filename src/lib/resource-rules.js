import { getLevelForXp } from "@/lib/level-progression";

const MIN_ZERO_FIELDS = ["hp", "stamina", "gold", "xp", "renown", "heat"];

function resolveStaminaCap(character) {
  const rawMaxStamina = Number(character?.maxStamina);

  if (!Number.isFinite(rawMaxStamina) || rawMaxStamina <= 0) {
    return null;
  }

  return Math.max(1, Math.floor(rawMaxStamina));
}

function resolveNormalizedCurrentResources(character) {
  const current = getCharacterResourceSnapshot(character);
  const staminaCap = resolveStaminaCap(character);

  if (staminaCap === null) {
    return current;
  }

  const normalizedStamina = Math.min(
    staminaCap,
    Math.max(0, Math.floor(Number(current.stamina) || 0)),
  );

  if (normalizedStamina === current.stamina) {
    return current;
  }

  return {
    ...current,
    stamina: normalizedStamina,
  };
}

export function getCharacterResourceSnapshot(character) {
  return {
    hp: character.hp,
    stamina: character.stamina,
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
    stamina: nextResources.stamina,
    gold: nextResources.gold,
    xp: nextResources.xp,
    level: nextResources.level,
    renown: nextResources.renown,
    heat: nextResources.heat,
  };
}

export function calculateCharacterResourceResult(character, options) {
  const staminaCost = options.staminaCost ?? 0;
  const delta = options.delta ?? {};
  const current = resolveNormalizedCurrentResources(character);
  const staminaCap = resolveStaminaCap(character);

  if (current.stamina < staminaCost) {
    return {
      ok: false,
      reason: "NOT_ENOUGH_STAMINA",
      message: `Not enough Stamina. Required ${staminaCost}, you have ${current.stamina}.`,
      requiredStamina: staminaCost,
      currentStamina: current.stamina,
    };
  }

  const currentLevel = Math.max(1, Number(current.level) || 1);
  const raw = {
    hp: current.hp + (delta.hp ?? 0),
    stamina: current.stamina - staminaCost + (delta.stamina ?? 0),
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

  if (staminaCap !== null) {
    next.stamina = Math.min(next.stamina, staminaCap);
  }

  const levelFromXp = getLevelForXp(next.xp);
  next.level = Math.max(1, currentLevel, next.level, levelFromXp);

  return {
    ok: true,
    before: current,
    after: next,
    delta: {
      hp: next.hp - current.hp,
      stamina: next.stamina - current.stamina,
      gold: next.gold - current.gold,
      xp: next.xp - current.xp,
      level: next.level - current.level,
      renown: next.renown - current.renown,
      heat: next.heat - current.heat,
    },
  };
}
