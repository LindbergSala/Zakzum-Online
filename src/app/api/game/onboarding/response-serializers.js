import { ONBOARDING_COMPLETION_REWARD_GOLD } from "@/lib/onboarding";

export function serializeOnboardingRewardAlreadyClaimedPayload() {
  return {
    claimed: false,
    rewardGold: 0,
    message: "Onboarding reward already claimed.",
  };
}

export function serializeOnboardingRewardClaimedPayload() {
  return {
    claimed: true,
    rewardGold: ONBOARDING_COMPLETION_REWARD_GOLD,
    message: `You claimed ${ONBOARDING_COMPLETION_REWARD_GOLD} Gold.`,
  };
}

export function serializeOnboardingLoreRecordedPayload(recorded) {
  return {
    recorded,
    message: recorded
      ? "Zakzum lore step recorded."
      : "Zakzum lore step already recorded.",
  };
}