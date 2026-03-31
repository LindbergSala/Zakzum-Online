import assert from "node:assert/strict";
import test from "node:test";

import {
  ACTIVITY_DEFINITIONS,
  ACTIVITY_GROUPS,
  getActivitiesForGroup,
  getActivitiesForLocation,
  resolveActivityGroupId,
} from "../src/lib/core-loop-data.js";
import {
  HEARTLANDS_REGION_ID,
  HEARTLANDS_REGION_NAME,
  getHeartlandsLocationProfile,
} from "../src/lib/heartlands-lore.js";

test("quest and adventure are grouped into five concrete activities each", () => {
  const questActivities = getActivitiesForGroup("quest");
  const adventureActivities = getActivitiesForGroup("adventure");

  assert.equal(questActivities.length, 5);
  assert.equal(adventureActivities.length, 5);
  assert.equal(questActivities[0].id, "quest-1");
  assert.equal(questActivities[4].id, "quest-5");
  assert.equal(adventureActivities[0].id, "adventure-1");
  assert.equal(adventureActivities[4].id, "adventure-5");
});

test("all concrete activities include group linkage", () => {
  assert.ok(ACTIVITY_GROUPS.length >= 3);

  for (const activity of ACTIVITY_DEFINITIONS) {
    assert.equal(typeof activity.id, "string");
    assert.equal(typeof activity.groupId, "string");
    assert.ok(resolveActivityGroupId(activity.id) === activity.groupId);
  }
});

test("adventure one starts above quest five in progression tuning", () => {
  const questFive = getActivitiesForGroup("quest")[4];
  const adventureOne = getActivitiesForGroup("adventure")[0];

  assert.ok(adventureOne.roll.difficulty > questFive.roll.difficulty);
  assert.ok(adventureOne.energyCost > questFive.energyCost);
  assert.ok(adventureOne.successReward.gold > questFive.successReward.gold);
  assert.ok(adventureOne.failPenalty.hp < questFive.failPenalty.hp);
});

test("quest and adventure activities include heartlands location metadata", () => {
  for (const groupId of ["quest", "adventure"]) {
    const activities = getActivitiesForGroup(groupId);

    for (const activity of activities) {
      assert.equal(typeof activity.locationId, "string");
      assert.equal(typeof activity.locationName, "string");
      assert.equal(typeof activity.regionId, "string");
      assert.equal(typeof activity.regionName, "string");

      const profile = getHeartlandsLocationProfile(activity.locationId);
      assert.ok(profile);
      assert.equal(activity.locationName, profile.name);
      assert.equal(activity.locationTitle, profile.title);
      assert.equal(activity.regionId, HEARTLANDS_REGION_ID);
      assert.equal(activity.regionName, HEARTLANDS_REGION_NAME);
    }
  }
});

test("activities can be filtered by location id", () => {
  const kingstonActivities = getActivitiesForLocation("kingston");

  assert.ok(kingstonActivities.length > 0);
  assert.ok(
    kingstonActivities.every((activity) => activity.locationId === "kingston"),
  );

  const kingstonQuestActivities = getActivitiesForLocation("kingston", "quest");
  assert.ok(
    kingstonQuestActivities.every((activity) => activity.groupId === "quest"),
  );
});
