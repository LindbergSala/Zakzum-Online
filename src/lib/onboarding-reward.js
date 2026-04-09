import { runSerializableTransaction } from "@/lib/db-transaction";
import { ACTIVITY_LOG_TYPES } from "@/lib/activity-log-types";
import {
  ONBOARDING_COMPLETION_REWARD_ACTIVITY_ID,
  ONBOARDING_COMPLETION_REWARD_GOLD,
  ONBOARDING_REWARD_LOG_DETAIL_ACTION,
} from "@/lib/onboarding";

export {
  ONBOARDING_COMPLETION_REWARD_ACTIVITY_ID,
  ONBOARDING_COMPLETION_REWARD_GOLD,
};

const CHARACTER_REWARD_SELECT = {
  id: true,
  hp: true,
  stamina: true,
  maxStamina: true,
  gold: true,
  xp: true,
  level: true,
  renown: true,
  heat: true,
};

function buildCharacterResourceSnapshot(character) {
  return {
    hp: Number(character.hp) || 0,
    stamina: Number(character.stamina) || 0,
    maxStamina: Number(character.maxStamina) || 0,
    gold: Number(character.gold) || 0,
    xp: Number(character.xp) || 0,
    level: Number(character.level) || 0,
    renown: Number(character.renown) || 0,
    heat: Number(character.heat) || 0,
  };
}

export async function maybeGrantOnboardingCompletionReward(
  characterId,
  options = {},
) {
  if (!characterId) {
    return { granted: false };
  }

  const runTransaction = options.runTransaction ?? runSerializableTransaction;

  return runTransaction(async (tx) => {
    const existingRewardLog = await tx.activityLog.findFirst({
      where: {
        characterId,
        activityId: ONBOARDING_COMPLETION_REWARD_ACTIVITY_ID,
      },
      select: { id: true },
    });

    if (existingRewardLog) {
      return { granted: false };
    }

    const characterBefore = await tx.character.findUnique({
      where: { id: characterId },
      select: CHARACTER_REWARD_SELECT,
    });

    if (!characterBefore) {
      return { granted: false };
    }

    const beforeResources = buildCharacterResourceSnapshot(characterBefore);
    const updatedCharacter = await tx.character.update({
      where: { id: characterId },
      data: {
        gold: {
          increment: ONBOARDING_COMPLETION_REWARD_GOLD,
        },
      },
      select: CHARACTER_REWARD_SELECT,
    });
    const afterResources = buildCharacterResourceSnapshot(updatedCharacter);

    await tx.activityLog.create({
      data: {
        characterId,
        type: ACTIVITY_LOG_TYPES.ONBOARDING,
        activityId: ONBOARDING_COMPLETION_REWARD_ACTIVITY_ID,
        activityName: "Onboarding Completion Bonus",
        success: true,
        staminaCost: 0,
        roll: 0,
        rollTotal: 0,
        successTarget: 0,
        statModifier: 0,
        chancePercent: 100,
        delta: { gold: ONBOARDING_COMPLETION_REWARD_GOLD },
        beforeResources,
        afterResources,
        details: {
          action: ONBOARDING_REWARD_LOG_DETAIL_ACTION,
          category: "ONBOARDING",
          eventKind: "reward",
          isSystemReward: true,
          rewardGold: ONBOARDING_COMPLETION_REWARD_GOLD,
        },
      },
      select: { id: true },
    });

    return {
      granted: true,
      amount: ONBOARDING_COMPLETION_REWARD_GOLD,
    };
  });
}
