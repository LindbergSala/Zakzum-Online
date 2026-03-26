import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { getActiveCharacterForUser } from "@/lib/character";
import { validateWriteRequestOrigin } from "@/lib/csrf";
import { deriveOnboardingStatus, ONBOARDING_STATUS } from "@/lib/onboarding";
import {
  maybeGrantOnboardingCompletionReward,
  ONBOARDING_COMPLETION_REWARD_ACTIVITY_ID,
  ONBOARDING_COMPLETION_REWARD_GOLD,
} from "@/lib/onboarding-reward";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/server-logger";

async function getOnboardingMetrics(characterId) {
  const [
    activityRunCount,
    successfulActivityCount,
    shopActionCount,
    equipActionCount,
    onboardingRewardClaimCount,
  ] = await Promise.all([
    prisma.activityLog.count({
      where: { characterId, type: "ACTIVITY" },
    }),
    prisma.activityLog.count({
      where: { characterId, type: "ACTIVITY", success: true },
    }),
    prisma.activityLog.count({
      where: { characterId, type: "SHOP" },
    }),
    prisma.activityLog.count({
      where: { characterId, type: "EQUIP" },
    }),
    prisma.activityLog.count({
      where: {
        characterId,
        activityId: ONBOARDING_COMPLETION_REWARD_ACTIVITY_ID,
      },
    }),
  ]);

  return {
    hasCharacter: true,
    activityRunCount,
    successfulActivityCount,
    shopActionCount,
    equipActionCount,
    hasClaimedOnboardingReward: onboardingRewardClaimCount > 0,
  };
}

export async function POST(request) {
  const originError = validateWriteRequestOrigin(request);
  if (originError) {
    return originError;
  }

  const { user, error } = await requireApiUser();
  if (error) {
    return error;
  }

  const activeCharacter = await getActiveCharacterForUser(user.id);

  if (!activeCharacter) {
    return NextResponse.json(
      { message: "You need an active character before claiming onboarding rewards." },
      { status: 400 },
    );
  }

  try {
    const onboardingMetrics = await getOnboardingMetrics(activeCharacter.id);
    const onboardingStatus = deriveOnboardingStatus(onboardingMetrics);

    if (onboardingStatus !== ONBOARDING_STATUS.ONBOARDING_COMPLETE) {
      return NextResponse.json(
        { message: "Finish the onboarding loop before claiming this reward." },
        { status: 400 },
      );
    }

    if (onboardingMetrics.hasClaimedOnboardingReward) {
      return NextResponse.json(
        {
          claimed: false,
          rewardGold: 0,
          message: "Onboarding reward already claimed.",
        },
        { status: 200 },
      );
    }

    const rewardResult = await maybeGrantOnboardingCompletionReward(activeCharacter.id);

    if (!rewardResult.granted) {
      return NextResponse.json(
        {
          claimed: false,
          rewardGold: 0,
          message: "Onboarding reward already claimed.",
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        claimed: true,
        rewardGold: ONBOARDING_COMPLETION_REWARD_GOLD,
        message: `You claimed ${ONBOARDING_COMPLETION_REWARD_GOLD} Gold.`,
      },
      { status: 200 },
    );
  } catch (caughtError) {
    logServerError("/api/game/onboarding/claim-reward", caughtError, {
      userId: user.id,
      characterId: activeCharacter.id,
    });

    return NextResponse.json(
      { message: "Something went wrong while claiming your onboarding reward." },
      { status: 500 },
    );
  }
}
