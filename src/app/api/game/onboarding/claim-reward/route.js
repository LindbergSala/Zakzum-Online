import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { getActiveCharacterForUser } from "@/lib/character";
import { validateWriteRequestOrigin } from "@/lib/csrf";
import {
  buildOnboardingViewModel,
  getOnboardingMetricsForCharacter,
} from "@/lib/onboarding";
import { maybeGrantOnboardingCompletionReward } from "@/lib/onboarding-reward";
import { logServerError } from "@/lib/server-logger";
import {
  buildProcessingErrorMessage,
  jsonMessageResponse,
} from "../../response-helpers";
import {
  serializeOnboardingRewardAlreadyClaimedPayload,
  serializeOnboardingRewardClaimedPayload,
} from "../response-serializers";

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
      return jsonMessageResponse(
        "You need an active character before claiming onboarding rewards.",
        400,
      );
    }

    try {
      const onboardingMetrics = await resolveOnboardingMetrics(activeCharacter.id);
      const onboardingModel = buildOnboardingViewModel({
        ...onboardingMetrics,
        hasCharacter: true,
      });

      if (!onboardingModel.isComplete) {
        return jsonMessageResponse(
          "Finish the onboarding loop before claiming this reward.",
          400,
        );
      }

      if (!onboardingModel.showRewardClaim) {
        return NextResponse.json(
          serializeOnboardingRewardAlreadyClaimedPayload(),
          { status: 200 },
        );
      }

      const rewardResult = await grantOnboardingReward(activeCharacter.id);

      if (!rewardResult.granted) {
        return NextResponse.json(
          serializeOnboardingRewardAlreadyClaimedPayload(),
          { status: 200 },
        );
      }

      return NextResponse.json(serializeOnboardingRewardClaimedPayload(), { status: 200 });
    } catch (caughtError) {
      logError("/api/game/onboarding/claim-reward", caughtError, {
        userId: user.id,
        characterId: activeCharacter.id,
      });

      return jsonMessageResponse(
        buildProcessingErrorMessage("your onboarding reward"),
        500,
      );
    }
  };
}

export const POST = createClaimOnboardingRewardPostHandler();
