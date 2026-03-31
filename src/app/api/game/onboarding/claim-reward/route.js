import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { getActiveCharacterForUser } from "@/lib/character";
import { validateWriteRequestOrigin } from "@/lib/csrf";
import {
  buildOnboardingViewModel,
  getOnboardingMetricsForCharacter,
  ONBOARDING_COMPLETION_REWARD_GOLD,
} from "@/lib/onboarding";
import { maybeGrantOnboardingCompletionReward } from "@/lib/onboarding-reward";
import { logServerError } from "@/lib/server-logger";

export function createClaimOnboardingRewardPostHandler(dependencies = {}) {
  const ensureOriginIsValid =
    dependencies.validateWriteRequestOrigin ?? validateWriteRequestOrigin;
  const requireUser = dependencies.requireApiUser ?? requireApiUser;
  const resolveActiveCharacter =
    dependencies.getActiveCharacterForUser ?? getActiveCharacterForUser;
  const resolveOnboardingMetrics =
    dependencies.getOnboardingMetricsForCharacter ??
    getOnboardingMetricsForCharacter;
  const grantOnboardingReward =
    dependencies.maybeGrantOnboardingCompletionReward ??
    maybeGrantOnboardingCompletionReward;
  const logError = dependencies.logServerError ?? logServerError;

  return async function claimOnboardingRewardPost(request) {
    const originError = ensureOriginIsValid(request);
    if (originError) {
      return originError;
    }

    const { user, error } = await requireUser();
    if (error) {
      return error;
    }

    const activeCharacter = await resolveActiveCharacter(user.id);

    if (!activeCharacter) {
      return NextResponse.json(
        { message: "You need an active character before claiming onboarding rewards." },
        { status: 400 },
      );
    }

    try {
      const onboardingMetrics = await resolveOnboardingMetrics(activeCharacter.id);
      const onboardingModel = buildOnboardingViewModel({
        ...onboardingMetrics,
        hasCharacter: true,
      });

      if (!onboardingModel.isComplete) {
        return NextResponse.json(
          { message: "Finish the onboarding loop before claiming this reward." },
          { status: 400 },
        );
      }

      if (!onboardingModel.showRewardClaim) {
        return NextResponse.json(
          {
            claimed: false,
            rewardGold: 0,
            message: "Onboarding reward already claimed.",
          },
          { status: 200 },
        );
      }

      const rewardResult = await grantOnboardingReward(activeCharacter.id);

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
      logError("/api/game/onboarding/claim-reward", caughtError, {
        userId: user.id,
        characterId: activeCharacter.id,
      });

      return NextResponse.json(
        { message: "Something went wrong while claiming your onboarding reward." },
        { status: 500 },
      );
    }
  };
}

export const POST = createClaimOnboardingRewardPostHandler();
