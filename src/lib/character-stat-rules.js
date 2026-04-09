import { getClassPassiveActivityStaminaCost } from "@/lib/class-identity";
import { getCharacterCarryCapacity } from "@/lib/weight-rules";

const HEAVY_ACTIVITY_GROUP_IDS = new Set(["adventure", "arena"]);

const CONTRACT_STANDING_RANKS = [
  { label: "Freeblade", target: 0 },
  { label: "Road Hand", target: 18 },
  { label: "Trusted Agent", target: 42 },
  { label: "Crown Broker", target: 72 },
  { label: "Realm Envoy", target: 108 },
];

const HEARTLANDS_STANDING_RANKS = [
  { label: "Unknown", target: 0 },
  { label: "Recognized", target: 24 },
  { label: "Border Voice", target: 50 },
  { label: "Regional Hand", target: 82 },
  { label: "Realm Fixture", target: 120 },
];

function toStatScore(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 10;
  }

  return Math.max(1, Math.floor(numericValue));
}

export function getAbilityModifier(score) {
  return Math.floor((toStatScore(score) - 10) / 2);
}

export function getPositiveAbilityModifier(score) {
  return Math.max(0, getAbilityModifier(score));
}

function getHeavyActivityStaminaReduction(strength) {
  const safeStrength = toStatScore(strength);
  let reduction = 0;

  if (safeStrength >= 12) {
    reduction += 1;
  }

  if (safeStrength >= 16) {
    reduction += 1;
  }

  return reduction;
}

export function getIntelligenceXpBonus(intelligence) {
  const safeIntelligence = toStatScore(intelligence);

  if (safeIntelligence >= 16) {
    return 3;
  }

  if (safeIntelligence >= 14) {
    return 2;
  }

  if (safeIntelligence >= 12) {
    return 1;
  }

  return 0;
}

export function getCharismaRenownBonus(charisma) {
  const safeCharisma = toStatScore(charisma);

  if (safeCharisma >= 16) {
    return 2;
  }

  if (safeCharisma >= 12) {
    return 1;
  }

  return 0;
}

export function getCharismaStandingBonus(charisma) {
  return Math.min(12, getPositiveAbilityModifier(charisma) * 3);
}

function getStandingProgress(value, ranks) {
  const safeValue = Math.max(0, Math.floor(Number(value) || 0));
  let currentRank = ranks[0];
  let nextRank = null;

  for (let index = 0; index < ranks.length; index += 1) {
    const rank = ranks[index];

    if (safeValue >= rank.target) {
      currentRank = rank;
      nextRank = ranks[index + 1] ?? null;
      continue;
    }

    nextRank = rank;
    break;
  }

  const lowerBound = currentRank.target;
  const upperBound = nextRank?.target ?? lowerBound;
  const segmentSize = Math.max(1, upperBound - lowerBound);
  const progressWithinSegment = Math.max(0, safeValue - lowerBound);

  return {
    currentRank: currentRank.label,
    nextRank: nextRank?.label ?? null,
    remaining: nextRank ? Math.max(0, nextRank.target - safeValue) : 0,
    progressPercent: nextRank
      ? Math.max(0, Math.min(100, Math.round((progressWithinSegment / segmentSize) * 100)))
      : 100,
  };
}

export function getContractStandingProgress(character) {
  const renown = Math.max(0, Math.floor(Number(character?.renown) || 0));
  const charismaStandingBonus = getCharismaStandingBonus(character?.charisma);
  const effectiveStanding = renown + charismaStandingBonus;
  const progress = getStandingProgress(effectiveStanding, CONTRACT_STANDING_RANKS);

  return {
    ...progress,
    effectiveStanding,
    charismaStandingBonus,
  };
}

export function getRegionalStandingProgress(character, regionName = "Heartlands") {
  const renown = Math.max(0, Math.floor(Number(character?.renown) || 0));
  const charismaStandingBonus = getCharismaStandingBonus(character?.charisma);
  const effectiveStanding = renown + charismaStandingBonus;
  const progress = getStandingProgress(effectiveStanding, HEARTLANDS_STANDING_RANKS);

  return {
    ...progress,
    regionName,
    effectiveStanding,
    charismaStandingBonus,
  };
}

function getNextBreakpoint(score, breakpoints) {
  const safeScore = toStatScore(score);
  return breakpoints.find((value) => value > safeScore) ?? null;
}

function formatPercentValue(value) {
  return `${Math.round(value * 100)}%`;
}

export function getStatPointAllocationPreview(statKey, character) {
  const currentScore = toStatScore(character?.[statKey]);
  const nextScore = currentScore + 1;

  if (statKey === "strength") {
    const currentCarry = getCharacterCarryCapacity(currentScore);
    const nextCarry = getCharacterCarryCapacity(nextScore);
    const currentReduction = getHeavyActivityStaminaReduction(currentScore);
    const nextReduction = getHeavyActivityStaminaReduction(nextScore);
    const nextBreakpoint = getNextBreakpoint(currentScore, [12, 16]);

    return {
      current: `Carry limit ${currentCarry}. Heavy adventure and arena runs cost ${currentReduction} less stamina.`,
      next:
        nextReduction > currentReduction
          ? `This point hits STR ${nextScore} and raises heavy-action stamina relief to ${nextReduction}.`
          : `This point raises carry limit to ${nextCarry}. Next stamina breakpoint: STR ${nextBreakpoint ?? nextScore}.`,
    };
  }

  if (statKey === "constitution") {
    const currentHeatProtection = currentScore >= 12 ? 1 : 0;
    const nextHeatProtection = nextScore >= 12 ? 1 : 0;
    const currentHpProtection = currentScore >= 16 ? 1 : 0;
    const nextHpProtection = nextScore >= 16 ? 1 : 0;
    const nextBreakpoint = getNextBreakpoint(currentScore, [12, 16]);

    return {
      current: `Supports max HP scaling. Failed runs ignore ${currentHeatProtection} heat and ${currentHpProtection} HP damage.`,
      next:
        nextHeatProtection > currentHeatProtection || nextHpProtection > currentHpProtection
          ? `This point activates tougher failure recovery: ${nextHeatProtection} heat ignored and ${nextHpProtection} HP damage blocked on failures.`
          : `This point improves your future HP ceiling scaling. Next resilience breakpoint: CON ${nextBreakpoint ?? nextScore}.`,
    };
  }

  if (statKey === "dexterity") {
    const currentLootBonus = formatPercentValue(getDexterityLootChanceBonus(currentScore));
    const nextLootBonus = formatPercentValue(getDexterityLootChanceBonus(nextScore));
    const currentHpProtection = currentScore >= 16 ? 1 : 0;
    const nextHpProtection = nextScore >= 16 ? 1 : 0;
    const nextBreakpoint = getNextBreakpoint(currentScore, [16]);

    return {
      current: `Loot chance bonus ${currentLootBonus}. DEX-led failures currently block ${currentHpProtection} HP damage.`,
      next:
        nextHpProtection > currentHpProtection
          ? `This point reaches DEX ${nextScore} and adds 1 HP fail protection even outside DEX-led rolls.`
          : `This point raises loot bonus to ${nextLootBonus}. Next fail-protection breakpoint: DEX ${nextBreakpoint ?? nextScore}.`,
    };
  }

  if (statKey === "intelligence") {
    const currentXpBonus = getIntelligenceXpBonus(currentScore);
    const nextXpBonus = getIntelligenceXpBonus(nextScore);
    const currentConsumableBoost = currentScore >= 12 ? 1 : 0;
    const nextConsumableBoost = nextScore >= 12 ? 1 : 0;
    const currentPrepBoost = currentScore >= 14 ? 1 : 0;
    const nextPrepBoost = nextScore >= 14 ? 1 : 0;
    const nextBreakpoint = getNextBreakpoint(currentScore, [12, 14, 16]);

    return {
      current: `Success XP bonus +${currentXpBonus}. Restorative consumables add +${currentConsumableBoost} per dose and prep tonics add +${currentPrepBoost}.`,
      next:
        nextXpBonus > currentXpBonus ||
        nextConsumableBoost > currentConsumableBoost ||
        nextPrepBoost > currentPrepBoost
          ? `This point improves INT payouts to XP +${nextXpBonus}, consumables +${nextConsumableBoost}, prep +${nextPrepBoost}.`
          : `This point raises your next INT breakpoint setup. Next reward threshold: INT ${nextBreakpoint ?? nextScore}.`,
    };
  }

  if (statKey === "wisdom") {
    const currentHeatReduction = (currentScore >= 12 ? 1 : 0) + (currentScore >= 18 ? 1 : 0);
    const nextHeatReduction = (nextScore >= 12 ? 1 : 0) + (nextScore >= 18 ? 1 : 0);
    const currentRestHeat = getRestHeatRecoveryBonus(currentScore);
    const nextRestHeat = getRestHeatRecoveryBonus(nextScore);
    const currentRestTick = getRestRecoveryTickBonus(currentScore);
    const nextRestTick = getRestRecoveryTickBonus(nextScore);
    const nextBreakpoint = getNextBreakpoint(currentScore, [12, 14, 16, 18]);

    return {
      current: `Activities build ${currentHeatReduction} less heat. Rest clears +${currentRestHeat} extra heat and +${currentRestTick} extra recovery tick while active.`,
      next:
        nextHeatReduction > currentHeatReduction ||
        nextRestHeat > currentRestHeat ||
        nextRestTick > currentRestTick
          ? `This point improves WIS pacing: heat -${nextHeatReduction}, rest heat +${nextRestHeat}, rest recovery +${nextRestTick}.`
          : `This point moves you toward the next WIS pacing breakpoint at ${nextBreakpoint ?? nextScore}.`,
    };
  }

  const currentRenownBonus = getCharismaRenownBonus(currentScore);
  const nextRenownBonus = getCharismaRenownBonus(nextScore);
  const currentTradeModifier = formatPercentValue(getTradePriceModifier(currentScore));
  const nextTradeModifier = formatPercentValue(getTradePriceModifier(nextScore));
  const currentStandingBonus = getCharismaStandingBonus(currentScore);
  const nextStandingBonus = getCharismaStandingBonus(nextScore);
  const nextBreakpoint = getNextBreakpoint(currentScore, [12, 16]);

  return {
    current: `Success renown bonus +${currentRenownBonus}. Market swing ${currentTradeModifier}. Contract standing +${currentStandingBonus}.`,
    next:
      nextRenownBonus > currentRenownBonus || nextStandingBonus > currentStandingBonus
        ? `This point improves CHA rewards to renown +${nextRenownBonus}, market swing ${nextTradeModifier}, and standing +${nextStandingBonus}.`
        : `This point strengthens trade leverage to ${nextTradeModifier}. Next renown breakpoint: CHA ${nextBreakpoint ?? nextScore}.`,
  };
}

export function getCharacterActivityStaminaCost(
  character,
  activityGroupId,
  staminaCostInput,
) {
  const classAdjustedCost = getClassPassiveActivityStaminaCost(
    character?.characterClass,
    staminaCostInput,
  );

  if (!HEAVY_ACTIVITY_GROUP_IDS.has(activityGroupId)) {
    return classAdjustedCost;
  }

  let adjustedCost = classAdjustedCost;
  const strengthReduction = getHeavyActivityStaminaReduction(character?.strength);

  adjustedCost -= strengthReduction;

  return Math.max(1, adjustedCost);
}

export function applyActivityHeatStatAdjustments(baseHeat, options = {}) {
  let nextHeat = Math.max(0, Math.floor(Number(baseHeat) || 0));
  const wisdom = toStatScore(options.wisdom ?? options.character?.wisdom);
  const constitution = toStatScore(
    options.constitution ?? options.character?.constitution,
  );

  if (wisdom >= 12) {
    nextHeat -= 1;
  }

  if (wisdom >= 18) {
    nextHeat -= 1;
  }

  if (options.success === false && constitution >= 12) {
    nextHeat -= 1;
  }

  return Math.max(0, nextHeat);
}

function activityUsesDexterity(activity) {
  return (
    activity?.roll?.primaryStat === "dexterity" ||
    activity?.roll?.secondaryStat === "dexterity"
  );
}

export function applyActivityDeltaStatBonuses(options = {}) {
  const delta = options.delta ?? {};
  const adjustedDelta = { ...delta };
  const success = options.success === true;
  const character = options.character ?? {};
  const intelligence = toStatScore(character.intelligence);
  const charisma = toStatScore(character.charisma);
  const dexterity = toStatScore(character.dexterity);
  const constitution = toStatScore(character.constitution);

  const bonus = {
    xp: 0,
    renown: 0,
    hpProtection: 0,
  };

  if (success && adjustedDelta.xp > 0) {
    bonus.xp = getIntelligenceXpBonus(intelligence);
    adjustedDelta.xp += bonus.xp;
  }

  if (success && adjustedDelta.renown > 0) {
    bonus.renown = getCharismaRenownBonus(charisma);
    adjustedDelta.renown += bonus.renown;
  }

  if (!success && adjustedDelta.hp < 0) {
    const dexterityProtection =
      dexterity >= 16 || activityUsesDexterity(options.activity) ? 1 : 0;
    const constitutionProtection = constitution >= 16 ? 1 : 0;
    bonus.hpProtection = dexterityProtection + constitutionProtection;
    adjustedDelta.hp = Math.min(0, adjustedDelta.hp + bonus.hpProtection);
  }

  return {
    delta: adjustedDelta,
    bonus,
  };
}

export function getDexterityLootChanceBonus(dexterity) {
  return Math.min(0.15, getPositiveAbilityModifier(dexterity) * 0.03);
}

export function getConsumableBonusDelta(character, itemDefinition, quantity = 1) {
  const usedQuantity = Math.max(1, Math.floor(Number(quantity) || 1));
  const consumable = itemDefinition?.effects?.consumable ?? {};
  const intelligence = toStatScore(character?.intelligence);

  if (intelligence < 12) {
    return { hp: 0, stamina: 0 };
  }

  return {
    hp: (Number(consumable.hpRestore) || 0) > 0 ? usedQuantity : 0,
    stamina: (Number(consumable.staminaRestore) || 0) > 0 ? usedQuantity : 0,
  };
}

export function getConsumableRollBonusBonus(character, itemDefinition, quantity = 1) {
  const usedQuantity = Math.max(1, Math.floor(Number(quantity) || 1));
  const consumable = itemDefinition?.effects?.consumable ?? {};
  const intelligence = toStatScore(character?.intelligence);

  if (intelligence < 14 || (Number(consumable.activityRollModifier) || 0) === 0) {
    return 0;
  }

  return usedQuantity;
}

export function getRestHeatRecoveryBonus(wisdom) {
  return toStatScore(wisdom) >= 14 ? 1 : 0;
}

export function getRestRecoveryTickBonus(wisdom) {
  return toStatScore(wisdom) >= 16 ? 1 : 0;
}

export function getTradePriceModifier(charisma) {
  return Math.min(0.08, getPositiveAbilityModifier(charisma) * 0.02);
}

export function applyBuyPriceModifier(baseValue, charisma) {
  const numericValue = Math.max(0, Math.floor(Number(baseValue) || 0));

  if (numericValue <= 0) {
    return 0;
  }

  const modifier = getTradePriceModifier(charisma);
  return Math.max(1, Math.floor(numericValue * (1 - modifier)));
}

export function applySellPriceModifier(baseValue, charisma) {
  const numericValue = Math.max(0, Math.floor(Number(baseValue) || 0));

  if (numericValue <= 0) {
    return 0;
  }

  const modifier = getTradePriceModifier(charisma);
  return Math.max(1, Math.round(numericValue * (1 + modifier)));
}