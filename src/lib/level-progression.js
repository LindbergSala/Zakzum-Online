export const XP_LEVEL_STEP = 80;

function toSafeInteger(value, fallback = 0) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.max(0, Math.floor(numericValue));
}

export function getXpThresholdForLevel(levelInput) {
  const level = Math.max(1, toSafeInteger(levelInput, 1));
  const previousLevel = level - 1;
  return Math.floor((XP_LEVEL_STEP * previousLevel * level) / 2);
}

export function getLevelForXp(xpInput) {
  const xp = toSafeInteger(xpInput, 0);
  let level = 1;

  while (xp >= getXpThresholdForLevel(level + 1)) {
    level += 1;
  }

  return level;
}

export function getNextLevelXpTarget(currentLevelInput) {
  const currentLevel = Math.max(1, toSafeInteger(currentLevelInput, 1));
  return getXpThresholdForLevel(currentLevel + 1);
}

export function getLevelProgressMeta(levelInput, xpInput) {
  const level = Math.max(1, toSafeInteger(levelInput, 1));
  const xp = toSafeInteger(xpInput, 0);
  const nextLevelXpTarget = getNextLevelXpTarget(level);

  return {
    level,
    xp,
    nextLevelXpTarget,
    xpToNextLevel: Math.max(0, nextLevelXpTarget - xp),
  };
}

