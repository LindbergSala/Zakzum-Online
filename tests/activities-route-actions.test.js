import assert from "node:assert/strict";
import test from "node:test";

import { processActivityTransaction } from "../src/app/api/game/activities/transaction-actions.js";

function buildTxMock(characterResult) {
  return {
    character: {
      findUnique: async () => characterResult,
    },
  };
}

test("activities transaction returns not found when character lookup fails", async () => {
  const result = await processActivityTransaction({
    tx: buildTxMock(null),
    activeCharacterId: "character-1",
    activity: {
      id: "quest-1",
      name: "Quest I",
      tier: 1,
      staminaCost: 2,
    },
    activityGroupId: "quest",
    activityContext: null,
    halfOrcRelentlessUsedThisSession: false,
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 404);
  assert.equal(result.message, "Character was not found.");
});

test("activities transaction blocks when character hp is zero", async () => {
  const result = await processActivityTransaction({
    tx: buildTxMock({
      id: "character-1",
      hp: 0,
      stamina: 10,
      maxStamina: 20,
      staminaRegenAt: new Date(),
      gold: 0,
      xp: 0,
      level: 1,
      renown: 0,
      heat: 0,
    }),
    activeCharacterId: "character-1",
    activity: {
      id: "quest-1",
      name: "Quest I",
      tier: 1,
      staminaCost: 2,
    },
    activityGroupId: "quest",
    activityContext: null,
    halfOrcRelentlessUsedThisSession: false,
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.equal(result.message, "Not enough HP. Required at least 1, you have 0.");
});
