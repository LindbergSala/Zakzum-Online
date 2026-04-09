import { resolveActivityLootDrop } from "@/lib/activity-loot";
import {
  applyActivityDeltaStatBonuses,
  getBaseActivityStaminaCost,
  getCharacterActivityStaminaCost,
} from "@/lib/character-stat-rules";
import {
  applyClassPassiveDelta,
  getClassPassive,
  getClassPassiveStaminaRefreshBonus,
  getClassPassiveRollModifier,
} from "@/lib/class-identity";
import { resolveActivityRoll } from "@/lib/roll-engine";
import {
  applyHalfOrcRelentless,
  applyRacePassiveDelta,
  getRacePassive,
  getRacePassiveRollModifier,
} from "@/lib/race-identity";
import {
  buildCharacterResourceUpdateInput,
  calculateCharacterResourceResult,
  getCharacterResourceSnapshot,
} from "@/lib/resource-rules";
import {
  applyEquippedItemActivityDelta,
  getCharacterEffectiveStats,
  getEquippedItemRollModifier,
} from "@/lib/stat-effects";
import { getAdjustedActivityHeatBuildUp } from "@/lib/activity-heat";
import { isCharacterResting } from "@/lib/heat-rest";
import {
  buildStoryAttemptProgress,
  getStoryActivityStateForCharacter,
  isStoryActivity,
} from "@/lib/story-progress";
import {
  ACTIVITY_CHARACTER_SELECT,
  ACTIVITY_ITEM_SELECT,
  applyLootDropToInventory,
  buildLootLogDetails,
} from "./route-helpers";

export async function processActivityTransaction({
  tx,
  activeCharacterId,
  activity,
  activityGroupId,
  activityContext,
  halfOrcRelentlessUsedThisSession,
}) {
  const latestCharacter = await tx.character.findUnique({
    where: { id: activeCharacterId },
    select: ACTIVITY_CHARACTER_SELECT,
  });

  if (!latestCharacter) {
    return {
      ok: false,
      status: 404,
      message: "Character was not found.",
    };
  }

  if (isCharacterResting(latestCharacter)) {
    return {
      ok: false,
      status: 423,
      message: "You are currently resting. Cancel rest or wait for the rest pass to finish before doing activities.",
      resources: getCharacterResourceSnapshot(latestCharacter),
    };
  }

  if ((Number(latestCharacter.hp) || 0) <= 0) {
    return {
      ok: false,
      status: 400,
      message: "Not enough HP. Required at least 1, you have 0.",
      requiredHp: 1,
      currentHp: Number(latestCharacter.hp) || 0,
      resources: getCharacterResourceSnapshot(latestCharacter),
    };
  }

  const storyStatus = isStoryActivity(activity)
    ? await getStoryActivityStateForCharacter(latestCharacter.id, activity.id, tx)
    : null;

  if (storyStatus && !storyStatus.isUnlocked) {
    return {
      ok: false,
      status: 403,
      message: storyStatus.lockReason || "This story is locked.",
      resources: getCharacterResourceSnapshot(latestCharacter),
    };
  }

  if (storyStatus?.isCompleted) {
    return {
      ok: false,
      status: 409,
      message: "This story chapter is already complete.",
      resources: getCharacterResourceSnapshot(latestCharacter),
    };
  }

  const ownedItems = await tx.characterItem.findMany({
    where: {
      characterId: latestCharacter.id,
    },
    select: ACTIVITY_ITEM_SELECT,
  });
  const equippedItems = ownedItems
    .filter((item) => item.isEquipped)
    .map((item) => ({ itemId: item.itemId }));

  const classPassive = getClassPassive(latestCharacter.characterClass);
  const racePassive = getRacePassive(latestCharacter.characterRace);
  const baseActivityStaminaCost = getBaseActivityStaminaCost(
    activityGroupId,
    activity.staminaCost,
    { storyStatus },
  );
  const activityStaminaCost = getCharacterActivityStaminaCost(
    latestCharacter,
    activityGroupId,
    activity.staminaCost,
    { storyStatus },
  );
  const classRollModifier = getClassPassiveRollModifier(
    latestCharacter.characterClass,
    activityGroupId,
  );
  const raceRollModifier = getRacePassiveRollModifier(
    latestCharacter.characterRace,
    activityGroupId,
  );
  const consumableRollModifier = Number(latestCharacter.nextActivityRollBonus) || 0;
  const passiveRollModifier = classRollModifier + raceRollModifier;
  const itemRollModifier = getEquippedItemRollModifier(
    equippedItems,
    activityGroupId,
  );
  const totalRollModifier =
    passiveRollModifier + itemRollModifier + consumableRollModifier;
  const statSummary = getCharacterEffectiveStats(latestCharacter, equippedItems);
  const rollResult = resolveActivityRoll(statSummary.effective, activity, {
    level: latestCharacter.level,
    passiveRollModifier: totalRollModifier,
    heat: latestCharacter.heat,
  });
  const classPassiveResolvedDelta = applyClassPassiveDelta({
    characterClass: latestCharacter.characterClass,
    success: rollResult.success,
    delta: rollResult.delta,
    activityId: activityGroupId,
  });
  const racePassiveResolvedDelta = applyRacePassiveDelta({
    characterRace: latestCharacter.characterRace,
    success: rollResult.success,
    delta: classPassiveResolvedDelta.delta,
    activityId: activityGroupId,
  });
  const itemResolvedDelta = applyEquippedItemActivityDelta({
    equippedItems,
    delta: racePassiveResolvedDelta.delta,
    success: rollResult.success,
    activityId: activityGroupId,
  });
  const activityHeatBuildUp = getAdjustedActivityHeatBuildUp(
    activity,
    activityGroupId,
    rollResult.success,
    latestCharacter,
  );
  const storyProgress = storyStatus
    ? buildStoryAttemptProgress(activity, storyStatus, rollResult.success)
    : null;
  const statAdjustedDelta = applyActivityDeltaStatBonuses({
    character: latestCharacter,
    activity,
    success: rollResult.success,
    delta: itemResolvedDelta.delta,
  });
  const resolvedDelta = {
    ...statAdjustedDelta.delta,
    heat: (Number(statAdjustedDelta.delta?.heat) || 0) + activityHeatBuildUp,
  };
  const lootDrop = resolveActivityLootDrop({
    activityGroupId,
    activityTier: activity.tier ?? 1,
    success: rollResult.success,
    dexterity: latestCharacter.dexterity,
  });

  const calculation = calculateCharacterResourceResult(latestCharacter, {
    staminaCost: activityStaminaCost,
    delta: resolvedDelta,
  });

  if (!calculation.ok) {
    return {
      ok: false,
      status: 400,
      message: calculation.message,
      requiredStamina: calculation.requiredStamina,
      currentStamina: calculation.currentStamina,
      resources: getCharacterResourceSnapshot(latestCharacter),
    };
  }

  const halfOrcRelentless = applyHalfOrcRelentless({
    characterRace: latestCharacter.characterRace,
    beforeResources: calculation.before,
    afterResources: calculation.after,
    delta: calculation.delta,
    alreadyUsedThisSession: halfOrcRelentlessUsedThisSession,
  });

  if (halfOrcRelentless.triggered) {
    calculation.after = halfOrcRelentless.afterResources;
    calculation.delta = halfOrcRelentless.delta;
  }

  const gainedLevels = Math.max(
    0,
    calculation.after.level - calculation.before.level,
  );
  const now = new Date();
  const updateResult = await tx.character.updateMany({
    where: {
      id: latestCharacter.id,
      updatedAt: latestCharacter.updatedAt,
    },
    data: {
      ...buildCharacterResourceUpdateInput(calculation.after),
      staminaRegenAt: now,
      nextActivityRollBonus: 0,
      ...(gainedLevels > 0
        ? { unspentStatPoints: { increment: gainedLevels } }
        : {}),
    },
  });

  if (updateResult.count !== 1) {
    return {
      ok: false,
      status: 409,
      message: "Character resources changed. Please try the action again.",
    };
  }

  const lootPersistence = await applyLootDropToInventory(
    tx,
    latestCharacter.id,
    latestCharacter.strength,
    ownedItems,
    lootDrop,
  );
  const loot = lootPersistence.loot;
  const lootBlockedByCarry = lootPersistence.blockedByCarry;

  const updatedCharacter = await tx.character.findUnique({
    where: { id: latestCharacter.id },
    select: {
      id: true,
      hp: true,
      stamina: true,
      maxStamina: true,
      staminaRegenAt: true,
      gold: true,
      xp: true,
      level: true,
      renown: true,
      heat: true,
      nextActivityRollBonus: true,
      unspentStatPoints: true,
    },
  });

  const logEntry = await tx.activityLog.create({
    data: {
      characterId: latestCharacter.id,
      type: "ACTIVITY",
      activityId: activity.id,
      activityName: activity.name,
      success: rollResult.success,
      staminaCost: activityStaminaCost,
      roll: rollResult.roll,
      rollTotal: rollResult.rollTotal,
      successTarget: rollResult.successTarget,
      statModifier: rollResult.statModifier,
      chancePercent: rollResult.chancePercent,
      delta: calculation.delta,
      beforeResources: calculation.before,
      afterResources: calculation.after,
      details: {
        roll: {
          value: rollResult.roll,
          total: rollResult.rollTotal,
          target: rollResult.successTarget,
          baseTarget: rollResult.baseSuccessTarget,
          difficultyLevelScaling: rollResult.difficultyLevelScaling,
          statModifier: rollResult.statModifier,
          chancePercent: rollResult.chancePercent,
          heatBuildUp: activityHeatBuildUp,
        },
        classIdentity: {
          class: latestCharacter.characterClass,
          passive: classPassive,
          activityGroupId,
          baseStaminaCost: baseActivityStaminaCost,
          effectiveStaminaCost: activityStaminaCost,
          passiveStaminaCostReduction: Math.max(
            0,
            baseActivityStaminaCost - activityStaminaCost,
          ),
          classRollModifier,
          passiveStaminaRefreshBonus: getClassPassiveStaminaRefreshBonus(
            latestCharacter.characterClass,
          ),
          passiveDeltaBonus: classPassiveResolvedDelta.deltaBonus,
        },
        heatState: {
          currentHeat: Number(latestCharacter.heat) || 0,
          heatRollModifier: rollResult.calculations.heatRollModifier,
          activityHeatBuildUp,
        },
        raceIdentity: {
          race: latestCharacter.characterRace,
          passive: racePassive,
          activityGroupId,
          raceRollModifier,
          passiveDeltaBonus: racePassiveResolvedDelta.deltaBonus,
          halfOrcRelentlessTriggered: halfOrcRelentless.triggered,
          halfOrcRelentlessDeltaBonus: halfOrcRelentless.deltaBonus,
          halfOrcRelentlessAlreadyUsed: halfOrcRelentlessUsedThisSession,
        },
        itemIdentity: {
          rollModifier: itemRollModifier,
          activityGroupId,
          deltaBonus: itemResolvedDelta.deltaBonus,
        },
        statIdentity: {
          strengthActivityStaminaCost: activityStaminaCost,
          xpBonus: statAdjustedDelta.bonus.xp,
          renownBonus: statAdjustedDelta.bonus.renown,
          hpProtection: statAdjustedDelta.bonus.hpProtection,
        },
        consumableIdentity: {
          consumedNextActivityRollBonus: consumableRollModifier,
          remainingNextActivityRollBonus: 0,
        },
        ...(storyProgress
          ? {
              story: {
                requiredSuccesses: storyProgress.requiredSuccesses,
                consecutiveSuccessesBefore: storyProgress.previousStreak,
                consecutiveSuccessesAfter: storyProgress.currentStreak,
                completed: storyProgress.completed,
                resetOnFailure: storyProgress.resetOnFailure,
                nextUnlockedActivityId: storyProgress.nextUnlockedActivityId,
                overlayStep: storyProgress.overlay?.step ?? null,
              },
            }
          : {}),
        activityContext,
        stats: statSummary,
        loot: buildLootLogDetails(lootDrop, loot, lootBlockedByCarry),
      },
    },
    select: { id: true },
  });

  return {
    ok: true,
    updatedCharacter,
    logEntry,
    classPassive,
    racePassive,
    baseActivityStaminaCost,
    activityStaminaCost,
    classRollModifier,
    raceRollModifier,
    itemRollModifier,
    consumableRollModifier,
    passiveRollModifier,
    totalRollModifier,
    classPassiveResolvedDelta,
    racePassiveResolvedDelta,
    itemResolvedDelta,
    halfOrcRelentlessTriggered: halfOrcRelentless.triggered,
    halfOrcRelentlessDeltaBonus: halfOrcRelentless.deltaBonus,
    halfOrcRelentlessAlreadyUsed: halfOrcRelentlessUsedThisSession,
    rollResult,
    statSummary,
    calculation,
    leveledUp: calculation.after.level > calculation.before.level,
    gainedStatPoints: gainedLevels,
    characterClass: latestCharacter.characterClass,
    characterRace: latestCharacter.characterRace,
    activityGroupId,
    activityHeatBuildUp,
    storyProgress,
    lootDrop,
    loot,
    lootBlockedByCarry,
  };
}
