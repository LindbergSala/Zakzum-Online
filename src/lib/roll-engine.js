function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toFiniteInteger(value, fallback = 0) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.floor(numericValue);
}

const DEFAULT_ACTIVITY_LEVEL_DIFFICULTY_SCALING = 2;
const SUCCESS_PRIMARY_MODIFIER_SCALE = 0.04;
const SUCCESS_SECONDARY_MODIFIER_SCALE = 0.02;
const SUCCESS_MARGIN_SCALE = 0.015;
const SUCCESS_SCALE_MIN = 0.7;
const SUCCESS_SCALE_MAX = 1.6;
const FAIL_MARGIN_SCALE = 0.05;
const FAIL_PRIMARY_MODIFIER_SCALE = 0.02;
const FAIL_SECONDARY_MODIFIER_SCALE = 0.01;
const FAIL_SCALE_MIN = 0.7;
const FAIL_SCALE_MAX = 1.6;

export const HEAT_ROLL_PENALTY_THRESHOLDS = [
  { minimumHeat: 80, rollModifier: -4 },
  { minimumHeat: 60, rollModifier: -3 },
  { minimumHeat: 40, rollModifier: -2 },
  { minimumHeat: 20, rollModifier: -1 },
];

export function getHeatRollModifier(heatInput) {
  const heat = clamp(toFiniteInteger(heatInput, 0), 0, 100);

  for (const threshold of HEAT_ROLL_PENALTY_THRESHOLDS) {
    if (heat >= threshold.minimumHeat) {
      return threshold.rollModifier;
    }
  }

  return 0;
}

export function getNextHeatThreshold(heatInput) {
  const heat = clamp(toFiniteInteger(heatInput, 0), 0, 100);

  return (
    HEAT_ROLL_PENALTY_THRESHOLDS
      .slice()
      .reverse()
      .find((threshold) => heat < threshold.minimumHeat) ?? null
  );
}

function toEffectiveStatValue(statValue) {
  const numericValue = Number(statValue);

  if (!Number.isFinite(numericValue)) {
    return 1;
  }

  return Math.max(1, Math.floor(numericValue));
}

export function getStatModifier(effectiveStatValue) {
  return toEffectiveStatValue(effectiveStatValue) - 1;
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
    1 +
      primaryModifier * SUCCESS_PRIMARY_MODIFIER_SCALE +
      secondaryModifier * SUCCESS_SECONDARY_MODIFIER_SCALE +
      margin * SUCCESS_MARGIN_SCALE,
    SUCCESS_SCALE_MIN,
    SUCCESS_SCALE_MAX,
  );
}

function calculateFailScale(primaryModifier, secondaryModifier, missMargin) {
  return clamp(
    1 +
      missMargin * FAIL_MARGIN_SCALE -
      primaryModifier * FAIL_PRIMARY_MODIFIER_SCALE -
      secondaryModifier * FAIL_SECONDARY_MODIFIER_SCALE,
    FAIL_SCALE_MIN,
    FAIL_SCALE_MAX,
  );
}

export function resolveActivityRoll(characterStats, activityDefinition, options = {}) {
  const primaryStat = activityDefinition.roll.primaryStat;
  const secondaryStat = activityDefinition.roll.secondaryStat;
  const baseDifficulty = activityDefinition.roll.difficulty;

  const effectivePrimaryStat = toEffectiveStatValue(characterStats[primaryStat]);
  const effectiveSecondaryStat = toEffectiveStatValue(characterStats[secondaryStat]);
  const primaryModifier = getStatModifier(effectivePrimaryStat);
  const secondaryModifier = getStatModifier(effectiveSecondaryStat);
  const primaryContribution = effectivePrimaryStat * 2;
  const secondaryContribution = effectiveSecondaryStat;
  const statContribution = primaryContribution + secondaryContribution;
  const characterLevel = Math.max(1, Number(options.level) || 1);
  const levelContribution = Math.max(0, characterLevel - 1);
  const activityLevelScaling = Math.max(
    0,
    Number(activityDefinition.roll.levelScaling) ||
      DEFAULT_ACTIVITY_LEVEL_DIFFICULTY_SCALING,
  );
  const difficultyLevelScaling =
    levelContribution * activityLevelScaling;
  const adjustedDifficulty = baseDifficulty + difficultyLevelScaling;
  const passiveRollModifier = Number(options.passiveRollModifier) || 0;
  const heat = clamp(toFiniteInteger(options.heat, 0), 0, 100);
  const heatRollModifier = getHeatRollModifier(heat);
  const totalRollBonus =
    statContribution + levelContribution + passiveRollModifier + heatRollModifier;

  const random =
    typeof options.random === "function" ? options.random : Math.random;
  const roll = Math.floor(random() * 20) + 1;

  const rollTotal = roll + totalRollBonus;
  const success = rollTotal >= adjustedDifficulty;
  const margin = success
    ? rollTotal - adjustedDifficulty
    : adjustedDifficulty - rollTotal;

  const scale = success
    ? calculateSuccessScale(primaryModifier, secondaryModifier, margin)
    : calculateFailScale(primaryModifier, secondaryModifier, margin);

  const baseDelta = success
    ? activityDefinition.successReward
    : activityDefinition.failPenalty;

  const delta = scaleSignedDelta(baseDelta, scale);
  const chancePercent = calculateChancePercent(
    adjustedDifficulty,
    totalRollBonus,
  );

  return {
    success,
    roll,
    rollTotal,
    successTarget: adjustedDifficulty,
    baseSuccessTarget: baseDifficulty,
    difficultyLevelScaling,
    chancePercent,
    statModifier: totalRollBonus,
    totalRollBonus,
    scale: Number(scale.toFixed(2)),
    delta,
    calculations: {
      primaryStat,
      secondaryStat,
      effectivePrimaryStat,
      effectiveSecondaryStat,
      primaryModifier,
      secondaryModifier,
      characterLevel,
      primaryContribution,
      secondaryContribution,
      statContribution,
      levelContribution,
      baseDifficulty,
      activityLevelScaling,
      adjustedDifficulty,
      difficultyLevelScaling,
      passiveRollModifier,
      heat,
      heatRollModifier,
      totalRollBonus,
      // Backward-compatible aliases.
      primaryStatValue: effectivePrimaryStat,
      secondaryStatValue: effectiveSecondaryStat,
      baseStatModifier: statContribution,
      levelModifier: levelContribution,
    },
  };
}
