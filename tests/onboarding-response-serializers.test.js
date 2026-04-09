import assert from "node:assert/strict";
import test from "node:test";

import {
  serializeOnboardingLoreRecordedPayload,
  serializeOnboardingRewardAlreadyClaimedPayload,
  serializeOnboardingRewardClaimedPayload,
} from "../src/app/api/game/onboarding/response-serializers.js";
import { ONBOARDING_COMPLETION_REWARD_GOLD } from "../src/lib/onboarding.js";

test("onboarding reward serializers preserve current payload contract", () => {
  const alreadyClaimed = serializeOnboardingRewardAlreadyClaimedPayload();
  const claimed = serializeOnboardingRewardClaimedPayload();

  assert.equal(alreadyClaimed.claimed, false);
  assert.equal(alreadyClaimed.rewardGold, 0);
  assert.equal(alreadyClaimed.message, "Onboarding reward already claimed.");

  assert.equal(claimed.claimed, true);
  assert.equal(claimed.rewardGold, ONBOARDING_COMPLETION_REWARD_GOLD);
  assert.match(claimed.message, /You claimed/);
});

test("onboarding lore serializer preserves recorded status messaging", () => {
  assert.deepEqual(serializeOnboardingLoreRecordedPayload(true), {
    recorded: true,
    message: "Zakzum lore step recorded.",
  });
  assert.deepEqual(serializeOnboardingLoreRecordedPayload(false), {
    recorded: false,
    message: "Zakzum lore step already recorded.",
  });
});