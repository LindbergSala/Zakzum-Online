import { runSerializableTransaction } from "@/lib/db-transaction";

export const ONBOARDING_COMPLETION_REWARD_GOLD = 50;
export const ONBOARDING_COMPLETION_REWARD_ACTIVITY_ID =
  "onboarding-complete-bonus";

const CHARACTER_REWARD_SELECT = {
  id: true,
  hp: true,
  energy: true,
  maxEnergy: true,
  gold: true,
  xp: true,
  level: true,
  renown: true,
  heat: true,
};

function buildCharacterResourceSnapshot(character) {
  return {
    hp: Number(character.hp) || 0,
    energy: Number(character.energy) || 0,
    maxEnergy: Number(character.maxEnergy) || 0,
    gold: Number(character.gold) || 0,
    xp: Number(character.xp) || 0,
    level: Number(character.level) || 0,
    renown: Number(character.renown) || 0,
    heat: Number(character.heat) || 0,
  };
}

export async function maybeGrantOnboardingCompletionReward(characterId) {
  if (!characterId) {
    return { granted: false };
  }

  return runSerializableTransaction(async (tx) => {
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
        type: "SHOP",
        activityId: ONBOARDING_COMPLETION_REWARD_ACTIVITY_ID,
        activityName: "Onboarding Completion Bonus",
        success: true,
        energyCost: 0,
        roll: 0,
        rollTotal: 0,
        successTarget: 0,
        statModifier: 0,
        chancePercent: 100,
        delta: { gold: ONBOARDING_COMPLETION_REWARD_GOLD },
        beforeResources,
        afterResources,
        details: {
          action: "onboarding_reward",
          rewardGold: ONBOARDING_COMPLETION_REWARD_GOLD,
          item: {
            name: "Starter Bonus",
            slot: "reward",
          },
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
