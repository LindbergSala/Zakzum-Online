import assert from "node:assert/strict";
import test from "node:test";

import { NextResponse } from "next/server";

import { createActivitiesPostHandler } from "../src/app/api/game/activities/route.js";
import { ACTIVITY_DEFINITIONS } from "../src/lib/core-loop-data.js";

const ACTIVITY_ID = ACTIVITY_DEFINITIONS[0].id;

function createSuccessDependencies(overrides = {}) {
  return {
    validateWriteRequestOrigin: () => null,
    requireApiUser: async () => ({
      user: { id: "user-1" },
      error: null,
    }),
    parseAndValidateJsonRequestBody: async () => ({
      data: { activityId: ACTIVITY_ID },
      response: null,
    }),
    getResolvedActiveCharacterForUser: async () => ({ id: "character-1" }),
    getSessionTokenFromRequestCookies: async () => null,
    cookies: async () => ({
      get: () => null,
    }),
    runSerializableTransaction: async (operation) => operation({}),
    processActivityTransaction: async () => ({
      ok: true,
      leveledUp: false,
      gainedStatPoints: 0,
      activityGroupId: ACTIVITY_DEFINITIONS[0].groupId,
      activityStaminaCost: ACTIVITY_DEFINITIONS[0].staminaCost,
      characterClass: "FIGHTER",
      classPassive: "steady_hands",
      classRollModifier: 1,
      classPassiveResolvedDelta: { deltaBonus: {} },
      characterRace: "HUMAN",
      racePassive: "adaptable",
      raceRollModifier: 0,
      racePassiveResolvedDelta: { deltaBonus: {} },
      halfOrcRelentlessTriggered: false,
      halfOrcRelentlessDeltaBonus: 0,
      halfOrcRelentlessAlreadyUsed: false,
      itemRollModifier: 0,
      itemResolvedDelta: { deltaBonus: {} },
      consumableRollModifier: 0,
      passiveRollModifier: 1,
      totalRollModifier: 1,
      activityHeatBuildUp: 0,
      statSummary: {
        base: { strength: 2 },
        bonus: { strength: 0 },
        effective: { strength: 2 },
      },
      calculation: {
        before: { hp: 20, stamina: 20, gold: 10, xp: 0, level: 1, renown: 0, heat: 0 },
        after: { hp: 20, stamina: 18, gold: 12, xp: 5, level: 1, renown: 0, heat: 0 },
        delta: { hp: 0, stamina: -2, gold: 2, xp: 5, level: 0, renown: 0, heat: 0 },
      },
      updatedCharacter: {
        hp: 20,
        stamina: 18,
        gold: 12,
        xp: 5,
        level: 1,
        renown: 0,
        heat: 0,
        nextActivityRollBonus: 0,
        unspentStatPoints: 0,
      },
      rollResult: {
        success: true,
        roll: 14,
        rollTotal: 18,
        successTarget: 12,
        baseSuccessTarget: 10,
        difficultyLevelScaling: 2,
        statModifier: 4,
        totalRollBonus: 4,
        chancePercent: 55,
        scale: 1,
        calculations: {
          statContribution: 3,
          primaryContribution: 2,
          secondaryContribution: 1,
          levelContribution: 0,
          baseStatModifier: 3,
          levelModifier: 0,
          characterLevel: 1,
          heat: 0,
          heatRollModifier: 0,
          primaryStat: "strength",
          secondaryStat: "wisdom",
          primaryStatValue: 2,
          secondaryStatValue: 1,
          effectivePrimaryStat: 2,
          effectiveSecondaryStat: 1,
          primaryModifier: 1,
          secondaryModifier: 0,
        },
      },
      loot: null,
      lootBlockedByCarry: null,
      logEntry: { id: "log-1" },
    }),
    isSerializableConflict: () => false,
    logServerError: () => {},
    ...overrides,
  };
}

test("activities route blocks invalid origin", async () => {
  const handler = createActivitiesPostHandler(
    createSuccessDependencies({
      validateWriteRequestOrigin: () =>
        NextResponse.json({ message: "Origin blocked." }, { status: 403 }),
    }),
  );

  const response = await handler({ method: "POST" });
  const payload = await response.json();

  assert.equal(response.status, 403);
  assert.equal(payload.message, "Origin blocked.");
});

test("activities route returns auth error from requireApiUser", async () => {
  const handler = createActivitiesPostHandler(
    createSuccessDependencies({
      requireApiUser: async () => ({
        user: null,
        error: NextResponse.json({ message: "Auth required." }, { status: 401 }),
      }),
    }),
  );

  const response = await handler({ method: "POST" });
  const payload = await response.json();

  assert.equal(response.status, 401);
  assert.equal(payload.message, "Auth required.");
});

test("activities route returns validation response", async () => {
  const handler = createActivitiesPostHandler(
    createSuccessDependencies({
      parseAndValidateJsonRequestBody: async () => ({
        data: null,
        response: NextResponse.json({ message: "Invalid activity." }, { status: 400 }),
      }),
    }),
  );

  const response = await handler({ method: "POST" });
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.equal(payload.message, "Invalid activity.");
});

test("activities route maps serializable conflicts to 409", async () => {
  const handler = createActivitiesPostHandler(
    createSuccessDependencies({
      runSerializableTransaction: async () => {
        throw new Error("retry");
      },
      isSerializableConflict: () => true,
    }),
  );

  const response = await handler({ method: "POST" });
  const payload = await response.json();

  assert.equal(response.status, 409);
  assert.equal(
    payload.message,
    "Activity could not be completed due to a resource conflict. Try again.",
  );
});

test("activities route returns serialized success payload", async () => {
  const handler = createActivitiesPostHandler(createSuccessDependencies());

  const response = await handler({ method: "POST" });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.match(payload.message, /succeeded/);
  assert.equal(payload.action.id, ACTIVITY_ID);
  assert.equal(payload.result.success, true);
  assert.equal(payload.result.logId, "log-1");
});