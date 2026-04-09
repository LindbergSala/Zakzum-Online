import assert from "node:assert/strict";
import test from "node:test";

import {
  buildActivityCompletionMessage,
  serializeActivity,
  serializeActivitiesIndexPayload,
  serializeActivitySuccessPayload,
} from "../src/app/api/game/activities/response-serializers.js";

test("serializeActivity keeps public activity payload stable", () => {
  const payload = serializeActivity({
    id: "quest-1",
    groupId: "quest",
    tier: 1,
    name: "Quest I",
    locationId: "kingston",
    locationName: "Kingston",
    locationTitle: "The Crown City",
    regionId: "heartlands",
    regionName: "Heartlands",
    staminaCost: 2,
    successReward: { gold: 5 },
    failPenalty: { hp: -1 },
    riskProfile: "Low risk",
  }, { includeRiskProfile: true });

  assert.equal(payload.name, "Quest I");
  assert.equal(payload.riskProfile, "Low risk");
  assert.equal(payload.staminaCost, 2);
});

test("buildActivityCompletionMessage includes level-up and loot notes", () => {
  const message = buildActivityCompletionMessage({
    activityName: "Quest I",
    success: true,
    leveledUp: true,
    levelAfter: 2,
    gainedStatPoints: 1,
    lootName: "Iron Dagger",
    lootBlockedByCarry: true,
  });

  assert.match(message, /Quest I succeeded\./);
  assert.match(message, /Level up!/);
  assert.match(message, /Loot found: Iron Dagger\./);
  assert.match(message, /carrying too much/i);
});

test("serializeActivitiesIndexPayload returns groups, activities, and resources", () => {
  const payload = serializeActivitiesIndexPayload({
    resources: { hp: 10, stamina: 8 },
  });

  assert.ok(Array.isArray(payload.groups));
  assert.ok(Array.isArray(payload.activities));
  assert.deepEqual(payload.resources, { hp: 10, stamina: 8 });
});

test("serializeActivitySuccessPayload preserves critical nested result fields", () => {
  const payload = serializeActivitySuccessPayload({
    activity: {
      id: "quest-1",
      name: "Quest I",
      staminaCost: 2,
    },
    activityContext: {
      locationId: "kingston",
      locationName: "Kingston",
      locationTitle: "The Crown City",
      regionId: "heartlands",
      regionName: "Heartlands",
    },
    result: {
      activityGroupId: "quest",
      activityStaminaCost: 2,
      rollResult: {
        success: true,
        roll: 14,
        rollTotal: 16,
        successTarget: 12,
        baseSuccessTarget: 11,
        difficultyLevelScaling: 1,
        statModifier: 2,
        totalRollBonus: 2,
        chancePercent: 70,
        scale: 1,
        calculations: {
          statContribution: 2,
          primaryContribution: 1,
          secondaryContribution: 1,
          levelContribution: 0,
          baseStatModifier: 2,
          levelModifier: 0,
          characterLevel: 1,
          heat: 0,
          heatRollModifier: 0,
          primaryStat: "wisdom",
          secondaryStat: "dexterity",
          primaryStatValue: 10,
          secondaryStatValue: 10,
          effectivePrimaryStat: 10,
          effectiveSecondaryStat: 10,
          primaryModifier: 1,
          secondaryModifier: 1,
        },
      },
      leveledUp: false,
      gainedStatPoints: 0,
      calculation: {
        before: { level: 1, xp: 0 },
        after: { level: 1, xp: 5 },
        delta: { xp: 5 },
      },
      updatedCharacter: {
        hp: 10,
        stamina: 8,
        maxStamina: 10,
        staminaRegenAt: new Date("2099-01-01T00:00:00.000Z"),
        gold: 5,
        xp: 5,
        level: 1,
        renown: 1,
        heat: 0,
        nextActivityRollBonus: 0,
        unspentStatPoints: 0,
      },
      characterClass: "FIGHTER",
      classPassive: "steady",
      classRollModifier: 1,
      classPassiveResolvedDelta: { deltaBonus: 0 },
      characterRace: "HUMAN",
      racePassive: "adaptable",
      raceRollModifier: 0,
      racePassiveResolvedDelta: { deltaBonus: 0 },
      halfOrcRelentlessTriggered: false,
      halfOrcRelentlessDeltaBonus: 0,
      halfOrcRelentlessAlreadyUsed: false,
      itemRollModifier: 0,
      itemResolvedDelta: { deltaBonus: 0 },
      consumableRollModifier: 0,
      passiveRollModifier: 1,
      totalRollModifier: 1,
      activityHeatBuildUp: 0,
      statSummary: { strength: 10 },
      storyProgress: {
        currentStreak: 2,
        requiredSuccesses: 3,
        completed: false,
        resetOnFailure: false,
        nextUnlockedActivityName: null,
      },
      baseActivityStaminaCost: 20,
      loot: null,
      lootBlockedByCarry: false,
      logEntry: { id: "log-1" },
    },
  });

  assert.equal(payload.action.id, "quest-1");
  assert.equal(payload.result.roll.heatBuildUp, 0);
  assert.equal(payload.result.progression.levelAfter, 1);
  assert.equal(payload.result.storyProgress.currentStreak, 2);
  assert.equal(payload.result.classIdentity.baseStaminaCost, 20);
  assert.equal(payload.result.totals.after.stamina, 8);
  assert.equal(payload.result.logId, "log-1");
});