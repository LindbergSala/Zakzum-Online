import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOnboardingViewModel,
  deriveOnboardingStatus,
  getRecommendedStarterActivity,
  ONBOARDING_COMPLETION_REWARD_ACTIVITY_ID,
  ONBOARDING_ZAKZUM_LORE_ACTIVITY_ID,
  ONBOARDING_STATUS,
  summarizeOnboardingLogGroups,
} from "../src/lib/onboarding.js";

test("onboarding status is no_character when user has no character", () => {
  const status = deriveOnboardingStatus({
    hasCharacter: false,
    activityRunCount: 0,
  });

  assert.equal(status, ONBOARDING_STATUS.NO_CHARACTER);
});

test("onboarding status is character_created when character exists with no activity logs", () => {
  const status = deriveOnboardingStatus({
    hasCharacter: true,
    activityRunCount: 0,
  });

  assert.equal(status, ONBOARDING_STATUS.CHARACTER_CREATED);
});

test("onboarding status is first_activity_completed after first run", () => {
  const status = deriveOnboardingStatus({
    hasCharacter: true,
    activityRunCount: 1,
    successfulActivityCount: 0,
    shopActionCount: 0,
    equipActionCount: 0,
  });

  assert.equal(status, ONBOARDING_STATUS.FIRST_ACTIVITY_COMPLETED);
});

test("onboarding status remains first_activity_completed without first reward", () => {
  const status = deriveOnboardingStatus({
    hasCharacter: true,
    activityRunCount: 2,
    successfulActivityCount: 0,
    shopActionCount: 1,
    equipActionCount: 0,
  });

  assert.equal(status, ONBOARDING_STATUS.FIRST_ACTIVITY_COMPLETED);
});

test("onboarding status is complete after first full loop", () => {
  const status = deriveOnboardingStatus({
    hasCharacter: true,
    activityRunCount: 1,
    successfulActivityCount: 1,
    shopActionCount: 1,
    equipActionCount: 0,
    hasViewedZakzumLore: true,
  });

  assert.equal(status, ONBOARDING_STATUS.ONBOARDING_COMPLETE);
});

test("onboarding status stays first_activity_completed until zakzum lore is viewed", () => {
  const status = deriveOnboardingStatus({
    hasCharacter: true,
    activityRunCount: 1,
    successfulActivityCount: 1,
    shopActionCount: 1,
    equipActionCount: 0,
    hasViewedZakzumLore: false,
  });

  assert.equal(status, ONBOARDING_STATUS.FIRST_ACTIVITY_COMPLETED);
});

test("recommended starter activity is a quest activity", () => {
  const activity = getRecommendedStarterActivity();

  assert.ok(activity);
  assert.equal(activity.groupId, "quest");
});

test("onboarding view model points no-character players to character creation", () => {
  const viewModel = buildOnboardingViewModel({
    hasCharacter: false,
    activityRunCount: 0,
  });

  assert.equal(viewModel.status, ONBOARDING_STATUS.NO_CHARACTER);
  assert.equal(viewModel.primaryAction.href, "/character/create");
  assert.equal(viewModel.showPanel, true);
});

test("onboarding view model suggests starter activity after character creation", () => {
  const viewModel = buildOnboardingViewModel({
    hasCharacter: true,
    activityRunCount: 0,
  });

  assert.equal(viewModel.status, ONBOARDING_STATUS.CHARACTER_CREATED);
  assert.match(viewModel.primaryAction.href, /^\/activities\/run\//);
  assert.equal(viewModel.showPanel, true);
});

test("onboarding view model allows reward claim after first full loop", () => {
  const viewModel = buildOnboardingViewModel({
    hasCharacter: true,
    activityRunCount: 1,
    successfulActivityCount: 1,
    shopActionCount: 1,
    equipActionCount: 0,
    hasViewedZakzumLore: true,
    hasClaimedOnboardingReward: false,
  });

  assert.equal(viewModel.status, ONBOARDING_STATUS.ONBOARDING_COMPLETE);
  assert.equal(viewModel.isComplete, true);
  assert.equal(viewModel.showRewardClaim, true);
  assert.equal(viewModel.showPanel, true);
});

test("onboarding view model hides onboarding panel after claimed reward", () => {
  const viewModel = buildOnboardingViewModel({
    hasCharacter: true,
    activityRunCount: 1,
    successfulActivityCount: 1,
    shopActionCount: 1,
    equipActionCount: 0,
    hasViewedZakzumLore: true,
    hasClaimedOnboardingReward: true,
  });

  assert.equal(viewModel.status, ONBOARDING_STATUS.ONBOARDING_COMPLETE);
  assert.equal(viewModel.isComplete, true);
  assert.equal(viewModel.showRewardClaim, false);
  assert.equal(viewModel.showPanel, false);
});

test("onboarding system logs are excluded from shop interaction counts", () => {
  const summary = summarizeOnboardingLogGroups([
    {
      type: "SHOP",
      success: true,
      activityId: ONBOARDING_COMPLETION_REWARD_ACTIVITY_ID,
      _count: { _all: 1 },
    },
    {
      type: "SHOP",
      success: true,
      activityId: ONBOARDING_ZAKZUM_LORE_ACTIVITY_ID,
      _count: { _all: 1 },
    },
    {
      type: "SHOP",
      success: true,
      activityId: "potion-healing",
      _count: { _all: 2 },
    },
    {
      type: "EQUIP",
      success: true,
      activityId: "bronze-sword",
      _count: { _all: 1 },
    },
  ]);

  assert.equal(summary.shopActionCount, 2);
  assert.equal(summary.equipActionCount, 1);
  assert.equal(summary.onboardingRewardClaimCount, 1);
  assert.equal(summary.zakzumLoreOpenCount, 1);
});
