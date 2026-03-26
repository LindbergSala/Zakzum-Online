import assert from "node:assert/strict";
import test from "node:test";

import {
  buildOnboardingViewModel,
  deriveOnboardingStatus,
  getRecommendedStarterActivity,
  ONBOARDING_STATUS,
} from "../src/lib/onboarding.js";

test("onboarding status is no_character when user has no character", () => {
  const status = deriveOnboardingStatus({
    hasCharacter: false,
    activityRunCount: 0,
  });

  assert.equal(status, ONBOARDING_STATUS.NO_CHARACTER);
});

test("onboarding status is character_created right after character creation", () => {
  const status = deriveOnboardingStatus({
    hasCharacter: true,
    activityRunCount: 0,
    wasCharacterJustCreated: true,
  });

  assert.equal(status, ONBOARDING_STATUS.CHARACTER_CREATED);
});

test("onboarding status is first_activity_pending for character without activity logs", () => {
  const status = deriveOnboardingStatus({
    hasCharacter: true,
    activityRunCount: 0,
    wasCharacterJustCreated: false,
  });

  assert.equal(status, ONBOARDING_STATUS.FIRST_ACTIVITY_PENDING);
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
  });

  assert.equal(status, ONBOARDING_STATUS.ONBOARDING_COMPLETE);
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
});

test("onboarding view model suggests starter activity after character creation", () => {
  const viewModel = buildOnboardingViewModel({
    hasCharacter: true,
    activityRunCount: 0,
    wasCharacterJustCreated: true,
  });

  assert.equal(viewModel.status, ONBOARDING_STATUS.CHARACTER_CREATED);
  assert.match(viewModel.primaryAction.href, /^\/activities\/run\//);
});

test("onboarding view model allows reward claim after first full loop", () => {
  const viewModel = buildOnboardingViewModel({
    hasCharacter: true,
    activityRunCount: 1,
    successfulActivityCount: 1,
    shopActionCount: 1,
    equipActionCount: 0,
    hasClaimedOnboardingReward: false,
  });

  assert.equal(viewModel.status, ONBOARDING_STATUS.ONBOARDING_COMPLETE);
  assert.equal(viewModel.allowRewardClaim, true);
});

test("onboarding view model disables reward claim after reward is claimed", () => {
  const viewModel = buildOnboardingViewModel({
    hasCharacter: true,
    activityRunCount: 1,
    successfulActivityCount: 1,
    shopActionCount: 1,
    equipActionCount: 0,
    hasClaimedOnboardingReward: true,
  });

  assert.equal(viewModel.status, ONBOARDING_STATUS.ONBOARDING_COMPLETE);
  assert.equal(viewModel.allowRewardClaim, false);
});
