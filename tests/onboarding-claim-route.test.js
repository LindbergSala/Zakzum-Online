import assert from "node:assert/strict";
import test from "node:test";

import { createClaimOnboardingRewardPostHandler } from "../src/app/api/game/onboarding/claim-reward/route.js";
import { ONBOARDING_COMPLETION_REWARD_GOLD } from "../src/lib/onboarding.js";

function createCommonDependencies(overrides = {}) {
  return {
    validateWriteRequestOrigin: () => null,
    requireApiUser: async () => ({
      user: { id: "user-1" },
      error: null,
    }),
    getActiveCharacterForUser: async () => ({ id: "character-1" }),
    getOnboardingMetricsForCharacter: async () => ({
      hasCharacter: true,
      activityRunCount: 1,
      successfulActivityCount: 1,
      shopActionCount: 1,
      equipActionCount: 0,
      hasViewedZakzumLore: true,
      hasClaimedOnboardingReward: false,
    }),
    maybeGrantOnboardingCompletionReward: async () => ({ granted: true }),
    logServerError: () => {},
    ...overrides,
  };
}

test("claim route blocks reward claim before onboarding completion", async () => {
  let grantCallCount = 0;
  const handler = createClaimOnboardingRewardPostHandler(
    createCommonDependencies({
      getOnboardingMetricsForCharacter: async () => ({
        hasCharacter: true,
        activityRunCount: 1,
        successfulActivityCount: 1,
        shopActionCount: 1,
        equipActionCount: 0,
        hasViewedZakzumLore: false,
        hasClaimedOnboardingReward: false,
      }),
      maybeGrantOnboardingCompletionReward: async () => {
        grantCallCount += 1;
        return { granted: true };
      },
    }),
  );

  const response = await handler({ method: "POST" });
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.equal(payload.message, "Finish the onboarding loop before claiming this reward.");
  assert.equal(grantCallCount, 0);
});

test("claim route returns already claimed when reward was claimed earlier", async () => {
  let grantCallCount = 0;
  const handler = createClaimOnboardingRewardPostHandler(
    createCommonDependencies({
      getOnboardingMetricsForCharacter: async () => ({
        hasCharacter: true,
        activityRunCount: 1,
        successfulActivityCount: 1,
        shopActionCount: 1,
        equipActionCount: 0,
        hasViewedZakzumLore: true,
        hasClaimedOnboardingReward: true,
      }),
      maybeGrantOnboardingCompletionReward: async () => {
        grantCallCount += 1;
        return { granted: true };
      },
    }),
  );

  const response = await handler({ method: "POST" });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.claimed, false);
  assert.equal(payload.message, "Onboarding reward already claimed.");
  assert.equal(grantCallCount, 0);
});

test("concurrent route claims resolve to one granted reward", async () => {
  let hasGranted = false;
  const handler = createClaimOnboardingRewardPostHandler(
    createCommonDependencies({
      getOnboardingMetricsForCharacter: async () => ({
        hasCharacter: true,
        activityRunCount: 1,
        successfulActivityCount: 1,
        shopActionCount: 1,
        equipActionCount: 0,
        hasViewedZakzumLore: true,
        hasClaimedOnboardingReward: false,
      }),
      maybeGrantOnboardingCompletionReward: async () => {
        if (hasGranted) {
          return { granted: false };
        }

        hasGranted = true;
        return { granted: true };
      },
    }),
  );

  const [responseA, responseB] = await Promise.all([
    handler({ method: "POST" }),
    handler({ method: "POST" }),
  ]);

  const payloadA = await responseA.json();
  const payloadB = await responseB.json();
  const successPayloads = [payloadA, payloadB].filter((payload) => payload.claimed);
  const duplicatePayloads = [payloadA, payloadB].filter((payload) => !payload.claimed);

  assert.equal(successPayloads.length, 1);
  assert.equal(duplicatePayloads.length, 1);
  assert.equal(successPayloads[0].rewardGold, ONBOARDING_COMPLETION_REWARD_GOLD);
  assert.equal(duplicatePayloads[0].message, "Onboarding reward already claimed.");
});
