function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function getStatModifier(statValue) {
  const numericValue = Number(statValue);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.floor((numericValue - 10) / 2);
}

function scaleSignedDelta(baseDelta, scale) {
  return Object.fromEntries(
    Object.entries(baseDelta).map(([key, value]) => {
      const scaledValue = Math.round(value * scale);

      if (value > 0) {
        return [key, Math.max(1, scaledValue)];
      }

      if (value < 0) {
        return [key, Math.min(-1, scaledValue)];
      }

      return [key, 0];
    }),
  );
}

function calculateChancePercent(difficulty, statModifier) {
  const threshold = difficulty - statModifier;
  const successOutcomes = clamp(21 - threshold, 0, 20);
  return Math.round((successOutcomes / 20) * 100);
}

function calculateSuccessScale(primaryModifier, secondaryModifier, margin) {
  return clamp(
    1 + primaryModifier * 0.08 + secondaryModifier * 0.04 + margin * 0.02,
    0.65,
    1.9,
  );
}

function calculateFailScale(primaryModifier, secondaryModifier, missMargin) {
  return clamp(
    1 + missMargin * 0.06 - primaryModifier * 0.03 - secondaryModifier * 0.02,
    0.75,
    2,
  );
}

export function resolveActivityRoll(characterStats, activityDefinition, options = {}) {
  const primaryStat = activityDefinition.roll.primaryStat;
  const secondaryStat = activityDefinition.roll.secondaryStat;
  const difficulty = activityDefinition.roll.difficulty;

  const primaryStatValue = Number(characterStats[primaryStat]) || 0;
  const secondaryStatValue = Number(characterStats[secondaryStat]) || 0;
  const primaryModifier = getStatModifier(primaryStatValue);
  const secondaryModifier = getStatModifier(secondaryStatValue);
  const baseStatModifier = primaryModifier * 2 + secondaryModifier;
  const characterLevel = Math.max(1, Number(options.level) || 1);
  const levelModifier = Math.max(0, Math.floor((characterLevel - 1) / 2));
  const statModifier = baseStatModifier + levelModifier;

  const random =
    typeof options.random === "function" ? options.random : Math.random;
  const roll = Math.floor(random() * 20) + 1;

  const rollTotal = roll + statModifier;
  const success = rollTotal >= difficulty;
  const margin = success ? rollTotal - difficulty : difficulty - rollTotal;

  const scale = success
    ? calculateSuccessScale(primaryModifier, secondaryModifier, margin)
    : calculateFailScale(primaryModifier, secondaryModifier, margin);

  const baseDelta = success
    ? activityDefinition.successReward
    : activityDefinition.failPenalty;

  const delta = scaleSignedDelta(baseDelta, scale);
  const chancePercent = calculateChancePercent(difficulty, statModifier);

  return {
    success,
    roll,
    rollTotal,
    successTarget: difficulty,
    chancePercent,
    statModifier,
    scale: Number(scale.toFixed(2)),
    delta,
    calculations: {
      primaryStat,
      secondaryStat,
      primaryStatValue,
      secondaryStatValue,
      primaryModifier,
      secondaryModifier,
      characterLevel,
      baseStatModifier,
      levelModifier,
    },
  };
}
