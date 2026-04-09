import { getClassPassiveStaminaRefreshBonus } from "@/lib/class-identity";
import {
  ACTIVITY_DEFINITIONS,
  ACTIVITY_GROUPS,
  getActivityGroupAvailability,
} from "@/lib/core-loop-data";
import { getLevelProgressMeta } from "@/lib/level-progression";
import { getCharacterResourceSnapshot } from "@/lib/resource-rules";

export function serializeActivity(activity, { includeRiskProfile = false } = {}) {
  const serializedActivity = {
    id: activity.id,
    groupId: activity.groupId,
    tier: activity.tier,
    name: activity.name,
    locationId: activity.locationId ?? null,
    locationName: activity.locationName ?? null,
    locationTitle: activity.locationTitle ?? null,
    regionId: activity.regionId ?? null,
    regionName: activity.regionName ?? null,
    staminaCost: activity.staminaCost,
    successReward: activity.successReward,
    failPenalty: activity.failPenalty,
  };

  if (includeRiskProfile) {
    serializedActivity.riskProfile = activity.riskProfile;
  }

  return serializedActivity;
}

export function serializeActivityGroup(group) {
  return {
    availability: getActivityGroupAvailability(group.id),
    id: group.id,
    name: group.name,
    tagline: group.tagline,
    summary: group.summary,
    regionId: group.regionId ?? null,
    regionName: group.regionName ?? null,
    overviewBadges: group.overviewBadges ?? [],
    activities: ACTIVITY_DEFINITIONS.filter((activity) => activity.groupId === group.id)
      .sort((left, right) => (left.tier ?? 0) - (right.tier ?? 0))
      .map((activity) => serializeActivity(activity, { includeRiskProfile: true })),
  };
}

export function serializeActivitiesIndexPayload({ resources }) {
  return {
    groups: ACTIVITY_GROUPS.map(serializeActivityGroup),
    activities: ACTIVITY_DEFINITIONS.map((activity) => serializeActivity(activity)),
    resources,
  };
}

export function buildActivityCompletionMessage({
  activityName,
  success,
  leveledUp,
  levelAfter,
  gainedStatPoints,
  lootName,
  lootBlockedByCarry,
  storyProgress,
}) {
  const baseMessage = leveledUp
    ? success
      ? `${activityName} succeeded. Level up! You are now level ${levelAfter} and gained ${gainedStatPoints} stat point${gainedStatPoints === 1 ? "" : "s"}.`
      : `${activityName} failed. Level up! You are now level ${levelAfter} and gained ${gainedStatPoints} stat point${gainedStatPoints === 1 ? "" : "s"}.`
    : success
      ? `${activityName} succeeded.`
      : `${activityName} failed.`;
  const storyMessageSuffix = storyProgress
    ? storyProgress.completed
      ? ` Story complete.${storyProgress.nextUnlockedActivityName ? ` ${storyProgress.nextUnlockedActivityName} unlocked.` : ""}`
      : success
        ? ` Story progress ${storyProgress.currentStreak}/${storyProgress.requiredSuccesses}.`
        : ` Story progress reset to 0/${storyProgress.requiredSuccesses}.`
    : "";
  const lootMessageSuffix = lootName ? ` Loot found: ${lootName}.` : "";
  const lootBlockedByCarryMessageSuffix = lootBlockedByCarry
    ? " Loot found, but you are carrying too much to keep it."
    : "";

  return `${baseMessage}${storyMessageSuffix}${lootMessageSuffix}${lootBlockedByCarryMessageSuffix}`;
}

export function serializeActivitySuccessPayload({
  activity,
  activityContext,
  result,
}) {
  return {
    message: buildActivityCompletionMessage({
      activityName: activity.name,
      success: result.rollResult.success,
      leveledUp: result.leveledUp,
      levelAfter: result.calculation.after.level,
      gainedStatPoints: result.gainedStatPoints,
      lootName: result.loot?.name ?? null,
      lootBlockedByCarry: result.lootBlockedByCarry,
      storyProgress: result.storyProgress ?? null,
    }),
    action: {
      id: activity.id,
      groupId: result.activityGroupId,
      name: activity.name,
      locationId: activityContext?.locationId ?? null,
      locationName: activityContext?.locationName ?? null,
      locationTitle: activityContext?.locationTitle ?? null,
      regionId: activityContext?.regionId ?? null,
      regionName: activityContext?.regionName ?? null,
      staminaCost: result.activityStaminaCost,
    },
    result: {
      success: result.rollResult.success,
      staminaCost: result.activityStaminaCost,
      activityContext,
      progression: {
        leveledUp: result.leveledUp,
        gainedStatPoints: result.gainedStatPoints,
        levelBefore: result.calculation.before.level,
        levelAfter: result.calculation.after.level,
        xp: getLevelProgressMeta(
          result.calculation.after.level,
          result.calculation.after.xp,
        ),
        unspentStatPoints: result.updatedCharacter.unspentStatPoints,
      },
      classIdentity: {
        class: result.characterClass,
        passive: result.classPassive,
        activityGroupId: result.activityGroupId,
        baseStaminaCost: result.baseActivityStaminaCost,
        effectiveStaminaCost: result.activityStaminaCost,
        passiveStaminaCostReduction: Math.max(
          0,
          result.baseActivityStaminaCost - result.activityStaminaCost,
        ),
        passiveRollModifier: result.classRollModifier,
        passiveStaminaRefreshBonus: getClassPassiveStaminaRefreshBonus(
          result.characterClass,
        ),
        passiveDeltaBonus: result.classPassiveResolvedDelta.deltaBonus,
      },
      raceIdentity: {
        race: result.characterRace,
        passive: result.racePassive,
        activityGroupId: result.activityGroupId,
        passiveRollModifier: result.raceRollModifier,
        passiveDeltaBonus: result.racePassiveResolvedDelta.deltaBonus,
        halfOrcRelentlessTriggered: result.halfOrcRelentlessTriggered,
        halfOrcRelentlessDeltaBonus: result.halfOrcRelentlessDeltaBonus,
        halfOrcRelentlessAlreadyUsed: result.halfOrcRelentlessAlreadyUsed,
      },
      itemIdentity: {
        passiveRollModifier: result.itemRollModifier,
        activityGroupId: result.activityGroupId,
        passiveDeltaBonus: result.itemResolvedDelta.deltaBonus,
      },
      consumableIdentity: {
        consumedNextActivityRollBonus: result.consumableRollModifier,
        remainingNextActivityRollBonus: result.updatedCharacter.nextActivityRollBonus,
      },
      roll: {
        value: result.rollResult.roll,
        total: result.rollResult.rollTotal,
        target: result.rollResult.successTarget,
        baseTarget: result.rollResult.baseSuccessTarget,
        difficultyLevelScaling: result.rollResult.difficultyLevelScaling,
        statModifier: result.rollResult.statModifier,
        totalRollBonus: result.rollResult.totalRollBonus,
        statContribution: result.rollResult.calculations.statContribution,
        primaryContribution: result.rollResult.calculations.primaryContribution,
        secondaryContribution: result.rollResult.calculations.secondaryContribution,
        levelContribution: result.rollResult.calculations.levelContribution,
        baseStatModifier: result.rollResult.calculations.baseStatModifier,
        levelModifier: result.rollResult.calculations.levelModifier,
        passiveRollModifier: result.passiveRollModifier,
        itemRollModifier: result.itemRollModifier,
        consumableRollModifier: result.consumableRollModifier,
        totalPassiveRollModifier: result.totalRollModifier,
        characterLevel: result.rollResult.calculations.characterLevel,
        chancePercent: result.rollResult.chancePercent,
        heat: result.rollResult.calculations.heat,
        heatRollModifier: result.rollResult.calculations.heatRollModifier,
        heatBuildUp: result.activityHeatBuildUp,
        primaryStat: result.rollResult.calculations.primaryStat,
        secondaryStat: result.rollResult.calculations.secondaryStat,
        primaryStatValue: result.rollResult.calculations.primaryStatValue,
        secondaryStatValue: result.rollResult.calculations.secondaryStatValue,
        effectivePrimaryStat: result.rollResult.calculations.effectivePrimaryStat,
        effectiveSecondaryStat: result.rollResult.calculations.effectiveSecondaryStat,
        primaryModifier: result.rollResult.calculations.primaryModifier,
        secondaryModifier: result.rollResult.calculations.secondaryModifier,
        scale: result.rollResult.scale,
      },
      stats: result.statSummary,
      delta: result.calculation.delta,
      storyProgress: result.storyProgress ?? null,
      totals: {
        before: result.calculation.before,
        after: getCharacterResourceSnapshot(result.updatedCharacter),
      },
      loot: result.loot ?? null,
      lootBlockedByCarry: result.lootBlockedByCarry ?? null,
      logId: result.logEntry?.id,
    },
  };
}