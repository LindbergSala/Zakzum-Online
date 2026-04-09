import assert from "node:assert/strict";
import test from "node:test";

import { processActivityTransaction } from "../src/app/api/game/activities/transaction-actions.js";
import { processInventoryActionTransaction } from "../src/app/api/game/inventory/transaction-actions.js";
import {
  processBuyTransaction,
  processSellTransaction,
} from "../src/app/api/game/shop/transaction-actions.js";
import {
  getCharacterHeatRestMeta,
  HEAT_REST_RECOVERY,
  isCharacterResting,
  resolveCharacterHeatRest,
} from "../src/lib/heat-rest.js";

function buildRestingCharacter(overrides = {}) {
  return {
    id: "character-1",
    characterClass: "FIGHTER",
    characterRace: "HUMAN",
    strength: 12,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    hp: 20,
    stamina: 12,
    maxStamina: 20,
    staminaRegenAt: new Date("2099-04-07T10:00:00.000Z"),
    heat: 9,
    heatRestEndsAt: new Date("2099-04-07T10:15:00.000Z"),
    gold: 50,
    xp: 0,
    level: 1,
    renown: 0,
    nextActivityRollBonus: 0,
    updatedAt: new Date("2099-04-07T10:00:00.000Z"),
    ...overrides,
  };
}

test("heat rest meta reports active fixed pass countdown", () => {
  const now = new Date("2099-04-07T10:05:00.000Z");
  const character = buildRestingCharacter();

  const meta = getCharacterHeatRestMeta(character, now);

  assert.equal(meta.isResting, true);
  assert.equal(meta.secondsUntilNextRecovery, 600);
  assert.equal(meta.heatRecoveredPerPass, HEAT_REST_RECOVERY);
});

test("completed heat rest removes 4 Heat and schedules the next recovery", async () => {
  const character = buildRestingCharacter({ heat: 7 });
  const now = new Date("2099-04-07T10:16:00.000Z");

  const resolved = await resolveCharacterHeatRest(character, {
    now,
    persist: false,
  });

  assert.equal(resolved.completed, true);
  assert.equal(resolved.character.heat, 3);
  assert.equal(
    resolved.character.heatRestEndsAt.toISOString(),
    "2099-04-07T10:30:00.000Z",
  );
  assert.equal(resolved.recoveredHeat, 4);
});

test("multiple completed rest intervals stack their heat recovery", async () => {
  const character = buildRestingCharacter({ heat: 15 });
  const now = new Date("2099-04-07T10:46:00.000Z");

  const resolved = await resolveCharacterHeatRest(character, {
    now,
    persist: false,
  });

  assert.equal(resolved.character.heat, 3);
  assert.equal(resolved.recoveredHeat, 12);
  assert.equal(
    resolved.character.heatRestEndsAt.toISOString(),
    "2099-04-07T11:00:00.000Z",
  );
});

test("wisdom improves heat recovery per completed rest pass", async () => {
  const character = buildRestingCharacter({ heat: 12, wisdom: 14 });
  const now = new Date("2099-04-07T10:16:00.000Z");

  const resolved = await resolveCharacterHeatRest(character, {
    now,
    persist: false,
  });

  assert.equal(resolved.character.heat, 7);
  assert.equal(resolved.recoveredHeat, 5);
});

test("active heat rest blocks activity transactions", async () => {
  const result = await processActivityTransaction({
    tx: {
      character: {
        findUnique: async () => buildRestingCharacter(),
      },
    },
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
  assert.equal(result.status, 423);
  assert.match(result.message, /currently resting/i);
});

test("active heat rest blocks inventory actions", async () => {
  const result = await processInventoryActionTransaction({
    tx: {},
    action: "use",
    latestCharacter: buildRestingCharacter(),
    ownedItems: [],
    selectedItem: null,
    parsedData: {},
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 423);
  assert.match(result.message, /currently resting/i);
});

test("active heat rest blocks market actions", async () => {
  const latestCharacter = buildRestingCharacter();

  const buyResult = await processBuyTransaction({
    tx: {},
    latestCharacter,
    ownedItems: [],
    parsedData: { itemId: "health-potion" },
    requestedMarket: { id: "alchemist-lab" },
  });
  const sellResult = await processSellTransaction({
    tx: {},
    latestCharacter,
    ownedItems: [],
    parsedData: { itemId: "health-potion", action: "sell" },
  });

  assert.equal(buyResult.ok, false);
  assert.equal(buyResult.status, 423);
  assert.equal(sellResult.ok, false);
  assert.equal(sellResult.status, 423);
});

test("isCharacterResting stays true until rest is canceled", () => {
  const character = buildRestingCharacter();

  const result = isCharacterResting(character, new Date("2099-04-07T10:16:00.000Z"));

  assert.equal(result, true);
});