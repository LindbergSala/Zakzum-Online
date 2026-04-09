import assert from "node:assert/strict";
import test from "node:test";

import { NextResponse } from "next/server";

import { createLoginPostHandler } from "../src/app/api/auth/login/route.js";
import { createLogoutPostHandler } from "../src/app/api/auth/logout/route.js";
import { createRegisterPostHandler } from "../src/app/api/auth/register/route.js";
import { createCharacterPostHandler } from "../src/app/api/character/route.js";
import {
  createActivitiesGetHandler,
  createActivitiesPostHandler,
} from "../src/app/api/game/activities/route.js";
import {
  createInventoryGetHandler,
  createInventoryPostHandler,
} from "../src/app/api/game/inventory/route.js";
import { createClaimOnboardingRewardPostHandler } from "../src/app/api/game/onboarding/claim-reward/route.js";
import { createCompleteOnboardingLorePostHandler } from "../src/app/api/game/onboarding/complete-lore/route.js";
import {
  createRestGetHandler,
  createRestPostHandler,
} from "../src/app/api/game/rest/route.js";
import { createShopGetHandler, createShopPostHandler } from "../src/app/api/game/shop/route.js";
import { ACTIVITY_DEFINITIONS } from "../src/lib/core-loop-data.js";
import { getCharacterResourceSnapshot } from "../src/lib/resource-rules.js";
import {
  ONBOARDING_COMPLETION_REWARD_ACTIVITY_ID,
  ONBOARDING_COMPLETION_REWARD_GOLD,
  ONBOARDING_ZAKZUM_LORE_ACTIVITY_ID,
} from "../src/lib/onboarding.js";

function createJsonRequest(body, method = "POST") {
  return {
    method,
    async json() {
      return body;
    },
  };
}

function createJourneyHarness() {
  const starterActivity = ACTIVITY_DEFINITIONS.find(
    (activity) => activity.groupId === "quest",
  );

  if (!starterActivity) {
    throw new Error("Expected at least one quest activity for the player journey test.");
  }

  const state = {
    nextUserId: 1,
    nextCharacterId: 1,
    nextItemRecordId: 1,
    nextLogId: 1,
    users: [],
    character: null,
    items: [],
    logs: [],
    activeUserId: null,
    sessionToken: null,
  };

  const shopCatalog = {
    "iron-sword": {
      id: "iron-sword",
      name: "Iron Sword",
      price: 2,
      marketActivityId: "blacksmith-forge-buy",
    },
    "focus-tonic": {
      id: "focus-tonic",
      name: "Focus Tonic",
      price: 3,
      marketActivityId: "arcane-apothecary-buy",
    },
  };

  function findUserByEmail(email) {
    return state.users.find((user) => user.email === email) ?? null;
  }

  function findUserById(userId) {
    return state.users.find((user) => user.id === userId) ?? null;
  }

  function requireCurrentUser() {
    const user = findUserById(state.activeUserId);

    if (!user) {
      return {
        user: null,
        error: NextResponse.json(
          { message: "You must be logged in to use this endpoint." },
          { status: 401 },
        ),
      };
    }

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      error: null,
    };
  }

  const prismaClient = {
    user: {
      async findUnique({ where }) {
        if (where.email) {
          return findUserByEmail(where.email);
        }

        if (where.id) {
          return findUserById(where.id);
        }

        return null;
      },
      async create({ data }) {
        const createdUser = {
          id: `user-${state.nextUserId++}`,
          email: data.email,
          passwordHash: data.passwordHash,
          createdAt: new Date("2099-01-01T00:00:00.000Z"),
          activeCharacterId: null,
        };
        state.users.push(createdUser);

        return {
          id: createdUser.id,
          email: createdUser.email,
          createdAt: createdUser.createdAt,
        };
      },
      async update({ where, data }) {
        const user = findUserById(where.id);
        if (!user) {
          return null;
        }

        Object.assign(user, data);
        return user;
      },
    },
    character: {
      async findUnique({ where }) {
        if (where.userId) {
          return state.character?.userId === where.userId ? state.character : null;
        }

        if (where.id) {
          return state.character?.id === where.id ? state.character : null;
        }

        return null;
      },
    },
    characterItem: {
      async findMany({ where }) {
        return state.items.filter((item) => item.characterId === where.characterId);
      },
    },
    async $transaction(callback) {
      return callback({
        character: {
          async create({ data }) {
            const createdCharacter = {
              id: `character-${state.nextCharacterId++}`,
              createdAt: new Date("2099-01-01T00:00:00.000Z"),
              nextActivityRollBonus: 0,
              unspentStatPoints: 0,
              ...data,
            };
            state.character = createdCharacter;
            return createdCharacter;
          },
        },
        user: {
          async update({ where, data }) {
            const user = findUserById(where.id);
            if (user) {
              Object.assign(user, data);
            }
            return user;
          },
        },
      });
    },
  };

  function resolveActiveCharacterForUser(userId) {
    const user = findUserById(userId);
    if (!user || !state.character || user.activeCharacterId !== state.character.id) {
      return null;
    }

    return state.character;
  }

  function buildOnboardingMetrics() {
    const activityLogs = state.logs.filter((entry) => entry.type === "ACTIVITY");
    const successfulActivities = activityLogs.filter((entry) => entry.success);
    const shopLogs = state.logs.filter(
      (entry) =>
        entry.type === "SHOP" &&
        entry.activityId !== ONBOARDING_COMPLETION_REWARD_ACTIVITY_ID &&
        entry.activityId !== ONBOARDING_ZAKZUM_LORE_ACTIVITY_ID,
    );
    const rewardLogs = state.logs.filter(
      (entry) => entry.activityId === ONBOARDING_COMPLETION_REWARD_ACTIVITY_ID,
    );
    const loreLogs = state.logs.filter(
      (entry) => entry.activityId === ONBOARDING_ZAKZUM_LORE_ACTIVITY_ID,
    );

    return {
      hasCharacter: Boolean(state.character),
      activityRunCount: activityLogs.length,
      successfulActivityCount: successfulActivities.length,
      shopActionCount: shopLogs.length,
      equipActionCount: 0,
      onboardingRewardClaimCount: rewardLogs.length,
      zakzumLoreOpenCount: loreLogs.length,
      hasViewedZakzumLore: loreLogs.length > 0,
      hasClaimedOnboardingReward: rewardLogs.length > 0,
    };
  }

  function appendLog(entry) {
    const createdEntry = {
      id: `log-${state.nextLogId++}`,
      createdAt: new Date("2099-01-01T00:00:00.000Z"),
      ...entry,
    };
    state.logs.push(createdEntry);
    return createdEntry;
  }

  function buildTransactionCharacter(updatedFields = {}) {
    return {
      ...state.character,
      maxStamina: state.character.maxStamina,
      staminaRegenAt: state.character.staminaRegenAt,
      nextActivityRollBonus: state.character.nextActivityRollBonus,
      unspentStatPoints: state.character.unspentStatPoints,
      ...updatedFields,
    };
  }

  const registerHandler = createRegisterPostHandler({
    validateWriteRequestOrigin: () => null,
    prismaClient,
    hashPassword: async (password) => `hashed:${password}`,
    logServerError: () => {},
  });

  const loginHandler = createLoginPostHandler({
    validateWriteRequestOrigin: () => null,
    prismaClient,
    checkLoginRateLimit: async () => ({
      blocked: false,
      retryAfterSeconds: 0,
      identifierSet: { email: true },
    }),
    clearLoginRateLimit: async () => {},
    recordFailedLoginAttempt: async () => {},
    comparePasswords: async (password, passwordHash) => passwordHash === `hashed:${password}`,
    createSession: async (userId) => {
      state.activeUserId = userId;
      state.sessionToken = `session-${userId}`;
      return {
        token: state.sessionToken,
        expiresAt: new Date("2099-01-08T00:00:00.000Z"),
      };
    },
    logServerError: () => {},
  });

  const logoutHandler = createLogoutPostHandler({
    validateWriteRequestOrigin: () => null,
    getSessionTokenFromRequestCookies: async () => state.sessionToken,
    invalidateSessionByToken: async (token) => {
      if (token && token === state.sessionToken) {
        state.sessionToken = null;
        state.activeUserId = null;
      }
    },
    logServerError: () => {},
  });

  const characterHandler = createCharacterPostHandler({
    validateWriteRequestOrigin: () => null,
    requireApiUser: async () => requireCurrentUser(),
    prismaClient,
    logServerError: () => {},
  });

  const activitiesGetHandler = createActivitiesGetHandler({
    requireApiUser: async () => requireCurrentUser(),
    getResolvedActiveCharacterForUser: async (userId) =>
      resolveActiveCharacterForUser(userId),
    logServerError: () => {},
  });

  const activitiesPostHandler = createActivitiesPostHandler({
    validateWriteRequestOrigin: () => null,
    requireApiUser: async () => requireCurrentUser(),
    getResolvedActiveCharacterForUser: async (userId) =>
      resolveActiveCharacterForUser(userId),
    getSessionTokenFromRequestCookies: async () => state.sessionToken,
    cookies: async () => ({
      get: () => null,
    }),
    runSerializableTransaction: async (operation) => operation({}),
    processActivityTransaction: async ({ activity, activityGroupId }) => {
      if (state.character.heatRestEndsAt && state.character.heatRestEndsAt > new Date()) {
        return {
          ok: false,
          status: 423,
          message: "Rest is active. Cancel rest before doing activities.",
          resources: getCharacterResourceSnapshot(state.character),
        };
      }

      const before = getCharacterResourceSnapshot(state.character);
      const consumedRollBonus = Number(state.character.nextActivityRollBonus) || 0;
      state.character = {
        ...state.character,
        stamina: Math.max(0, state.character.stamina - activity.staminaCost),
        gold: state.character.gold + (activity.successReward?.gold ?? 0),
        xp: state.character.xp + (activity.successReward?.xp ?? 0),
        renown: state.character.renown + (activity.successReward?.renown ?? 0),
        heat: state.character.heat,
        nextActivityRollBonus: 0,
      };
      const after = getCharacterResourceSnapshot(state.character);
      const logEntry = appendLog({
        characterId: state.character.id,
        type: "ACTIVITY",
        activityId: activity.id,
        success: true,
      });

      return {
        ok: true,
        leveledUp: false,
        gainedStatPoints: 0,
        activityGroupId,
        activityStaminaCost: activity.staminaCost,
        characterClass: state.character.characterClass,
        classPassive: "steady_hands",
        classRollModifier: 1,
        classPassiveResolvedDelta: { deltaBonus: {} },
        characterRace: state.character.characterRace,
        racePassive: "adaptable",
        raceRollModifier: 0,
        racePassiveResolvedDelta: { deltaBonus: {} },
        halfOrcRelentlessTriggered: false,
        halfOrcRelentlessDeltaBonus: 0,
        halfOrcRelentlessAlreadyUsed: false,
        itemRollModifier: 0,
        itemResolvedDelta: { deltaBonus: {} },
        consumableRollModifier: consumedRollBonus,
        passiveRollModifier: 1,
        totalRollModifier: 1 + consumedRollBonus,
        activityHeatBuildUp: 0,
        statSummary: {
          base: { strength: state.character.strength },
          bonus: { strength: 0 },
          effective: { strength: state.character.strength },
        },
        calculation: {
          before,
          after,
          delta: {
            hp: after.hp - before.hp,
            stamina: after.stamina - before.stamina,
            gold: after.gold - before.gold,
            xp: after.xp - before.xp,
            level: after.level - before.level,
            renown: after.renown - before.renown,
            heat: after.heat - before.heat,
          },
        },
        updatedCharacter: buildTransactionCharacter(),
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
            characterLevel: state.character.level,
            heat: state.character.heat,
            heatRollModifier: 0,
            primaryStat: activity.roll.primaryStat,
            secondaryStat: activity.roll.secondaryStat,
            primaryStatValue: state.character[activity.roll.primaryStat] ?? 1,
            secondaryStatValue: state.character[activity.roll.secondaryStat] ?? 1,
            effectivePrimaryStat: state.character[activity.roll.primaryStat] ?? 1,
            effectiveSecondaryStat: state.character[activity.roll.secondaryStat] ?? 1,
            primaryModifier: 1,
            secondaryModifier: 1,
          },
        },
        loot: null,
        lootBlockedByCarry: null,
        logEntry,
      };
    },
    logServerError: () => {},
  });

  const shopGetHandler = createShopGetHandler({
    requireApiUser: async () => requireCurrentUser(),
    getResolvedActiveCharacterForUser: async (userId) =>
      resolveActiveCharacterForUser(userId),
    prismaClient,
    logServerError: () => {},
  });

  const shopPostHandler = createShopPostHandler({
    validateWriteRequestOrigin: () => null,
    requireApiUser: async () => requireCurrentUser(),
    getResolvedActiveCharacterForUser: async (userId) =>
      resolveActiveCharacterForUser(userId),
    runSerializableTransaction: async (operation) =>
      operation({
        character: {
          findUnique: async () => state.character,
        },
        characterItem: {
          findMany: async () => state.items,
        },
      }),
    processBuyTransaction: async ({ parsedData }) => {
      const itemDefinition = shopCatalog[parsedData.itemId];

      if (!itemDefinition) {
        return {
          ok: false,
          status: 404,
          message: "Selected item is not sold here.",
        };
      }

      const before = getCharacterResourceSnapshot(state.character);
      state.character = {
        ...state.character,
        gold: state.character.gold - itemDefinition.price,
      };
      const itemRecord = {
        id: `item-record-${state.nextItemRecordId++}`,
        characterId: state.character.id,
        itemId: itemDefinition.id,
        itemName: itemDefinition.name,
        quantity: 1,
        isEquipped: false,
        createdAt: new Date("2099-01-01T00:00:00.000Z"),
      };
      state.items.push(itemRecord);
      const logEntry = appendLog({
        characterId: state.character.id,
        type: "SHOP",
        activityId: itemDefinition.marketActivityId,
        success: true,
      });

      return {
        ok: true,
        status: 200,
        action: "buy",
        itemDefinition: { id: itemDefinition.id, name: itemDefinition.name },
        quantity: 1,
        quantityAfter: 1,
        itemRecord,
        updatedCharacter: buildTransactionCharacter(),
        calculation: {
          before,
          delta: {
            hp: 0,
            stamina: 0,
            gold: -itemDefinition.price,
            xp: 0,
            level: 0,
            renown: 0,
            heat: 0,
          },
        },
        logEntry,
        soldWhileEquipped: false,
      };
    },
    processSellTransaction: async () => {
      throw new Error("Sell flow is not used in the player journey test.");
    },
    logServerError: () => {},
  });

  const inventoryGetHandler = createInventoryGetHandler({
    requireApiUser: async () => requireCurrentUser(),
    getResolvedActiveCharacterForUser: async (userId) =>
      resolveActiveCharacterForUser(userId),
    prismaClient,
    logServerError: () => {},
  });

  const inventoryPostHandler = createInventoryPostHandler({
    validateWriteRequestOrigin: () => null,
    requireApiUser: async () => requireCurrentUser(),
    parseAndValidateJsonRequestBody: async (request) => ({
      data: await request.json(),
      response: null,
    }),
    getResolvedActiveCharacterForUser: async (userId) =>
      resolveActiveCharacterForUser(userId),
    runSerializableTransaction: async (operation) =>
      operation({
        character: {
          findUnique: async () => state.character,
        },
        characterItem: {
          findMany: async () => state.items,
        },
      }),
    processInventoryActionTransaction: async ({ action, selectedItem }) => {
      if (action !== "use") {
        return {
          ok: false,
          status: 400,
          message: "Only consumable use is supported in the player journey test.",
        };
      }

      if (!selectedItem) {
        return {
          ok: false,
          status: 404,
          message: "You do not own this item.",
        };
      }

      const before = getCharacterResourceSnapshot(state.character);
      const updatedItems = [];

      for (const item of state.items) {
        if (item.id !== selectedItem.id) {
          updatedItems.push(item);
          continue;
        }

        const quantityAfter = Math.max(0, Number(item.quantity || 0) - 1);
        if (quantityAfter > 0) {
          updatedItems.push({
            ...item,
            quantity: quantityAfter,
          });
        }
      }

      state.items = updatedItems;

      if (selectedItem.itemId === "focus-tonic") {
        state.character = {
          ...state.character,
          nextActivityRollBonus: (Number(state.character.nextActivityRollBonus) || 0) + 2,
        };
      }

      const logEntry = appendLog({
        characterId: state.character.id,
        type: "INVENTORY",
        activityId: `inventory-use-${selectedItem.itemId}`,
        success: true,
      });

      return {
        ok: true,
        status: 200,
        message: `${selectedItem.itemName} used.`,
        updatedCharacter: buildTransactionCharacter(),
        allItems: state.items,
        calculation: {
          before,
          after: getCharacterResourceSnapshot(state.character),
        },
        logEntry,
      };
    },
    logServerError: () => {},
  });

  const restGetHandler = createRestGetHandler({
    requireApiUser: async () => requireCurrentUser(),
    getResolvedActiveCharacterForUser: async (userId) =>
      resolveActiveCharacterForUser(userId),
    logServerError: () => {},
  });

  const restPostHandler = createRestPostHandler({
    validateWriteRequestOrigin: () => null,
    requireApiUser: async () => requireCurrentUser(),
    getResolvedActiveCharacterForUser: async (userId) =>
      resolveActiveCharacterForUser(userId),
    runSerializableTransaction: async (operation) =>
      operation({
        character: {
          findUnique: async () => state.character,
          updateMany: async ({ where, data }) => {
            if (
              !state.character ||
              state.character.id !== where.id ||
              state.character.updatedAt !== where.updatedAt
            ) {
              return { count: 0 };
            }

            state.character = {
              ...state.character,
              ...data,
            };

            return { count: 1 };
          },
        },
      }),
    logServerError: () => {},
  });

  const completeLoreHandler = createCompleteOnboardingLorePostHandler({
    validateWriteRequestOrigin: () => null,
    requireApiUser: async () => requireCurrentUser(),
    getActiveCharacterForUser: async (userId) => resolveActiveCharacterForUser(userId),
    runSerializableTransaction: async (callback) =>
      callback({
        activityLog: {
          async findFirst({ where }) {
            return (
              state.logs.find(
                (entry) =>
                  entry.characterId === where.characterId &&
                  entry.activityId === where.activityId,
              ) ?? null
            );
          },
          async create({ data }) {
            const created = appendLog(data);
            return { id: created.id };
          },
        },
        character: {
          async findUnique({ where }) {
            return state.character?.id === where.id ? state.character : null;
          },
        },
      }),
    logServerError: () => {},
  });

  const claimRewardHandler = createClaimOnboardingRewardPostHandler({
    validateWriteRequestOrigin: () => null,
    requireApiUser: async () => requireCurrentUser(),
    getActiveCharacterForUser: async (userId) => resolveActiveCharacterForUser(userId),
    getOnboardingMetricsForCharacter: async () => buildOnboardingMetrics(),
    maybeGrantOnboardingCompletionReward: async () => {
      const alreadyClaimed = state.logs.some(
        (entry) => entry.activityId === ONBOARDING_COMPLETION_REWARD_ACTIVITY_ID,
      );

      if (alreadyClaimed) {
        return { granted: false };
      }

      state.character = {
        ...state.character,
        gold: state.character.gold + ONBOARDING_COMPLETION_REWARD_GOLD,
      };
      appendLog({
        characterId: state.character.id,
        type: "SHOP",
        activityId: ONBOARDING_COMPLETION_REWARD_ACTIVITY_ID,
        success: true,
      });

      return { granted: true };
    },
    logServerError: () => {},
  });

  return {
    starterActivity,
    state,
    handlers: {
      registerHandler,
      loginHandler,
      logoutHandler,
      characterHandler,
      activitiesGetHandler,
      activitiesPostHandler,
      shopGetHandler,
      shopPostHandler,
      inventoryGetHandler,
      inventoryPostHandler,
      restGetHandler,
      restPostHandler,
      completeLoreHandler,
      claimRewardHandler,
    },
  };
}

async function registerLoginAndCreateCharacter(
  handlers,
  {
    email = "hero@example.com",
    password = "Sword123",
    name = "Sir Aelric",
  } = {},
) {
  const registerResponse = await handlers.registerHandler(
    createJsonRequest({ email, password }),
  );
  const registerPayload = await registerResponse.json();
  assert.equal(registerResponse.status, 201);
  assert.equal(registerPayload.message, "Account created.");

  const loginResponse = await handlers.loginHandler(
    createJsonRequest({ email, password }),
  );
  const loginPayload = await loginResponse.json();
  assert.equal(loginResponse.status, 200);
  assert.equal(loginPayload.message, "Login successful.");

  const characterResponse = await handlers.characterHandler(
    createJsonRequest({
      name,
      characterClass: "FIGHTER",
      characterRace: "HUMAN",
      characterBackground: "SOLDIER",
      backgroundLore:
        "They were shaped by discipline, orders, and the brutal lessons of conflict.",
    }),
  );
  const characterPayload = await characterResponse.json();
  assert.equal(characterResponse.status, 201);
  assert.equal(characterPayload.message, "Character created.");

  return {
    registerPayload,
    loginPayload,
    characterPayload,
  };
}

test("new player journey flows from account creation to onboarding reward claim", async () => {
  const { starterActivity, state, handlers } = createJourneyHarness();

  const { registerPayload } = await registerLoginAndCreateCharacter(handlers);
  assert.equal(state.activeUserId, registerPayload.user.id);

  const activitiesIndexResponse = await handlers.activitiesGetHandler();
  const activitiesIndexPayload = await activitiesIndexResponse.json();
  assert.equal(activitiesIndexResponse.status, 200);
  assert.ok(Array.isArray(activitiesIndexPayload.groups));
  assert.ok(
    activitiesIndexPayload.activities.some(
      (activity) => activity.id === starterActivity.id,
    ),
  );

  const prematureClaimResponse = await handlers.claimRewardHandler(
    createJsonRequest({}, "POST"),
  );
  const prematureClaimPayload = await prematureClaimResponse.json();
  assert.equal(prematureClaimResponse.status, 400);
  assert.equal(
    prematureClaimPayload.message,
    "Finish the onboarding loop before claiming this reward.",
  );

  const activityResponse = await handlers.activitiesPostHandler(
    createJsonRequest({ activityId: starterActivity.id }),
  );
  const activityPayload = await activityResponse.json();
  assert.equal(activityResponse.status, 200);
  assert.equal(activityPayload.result.success, true);
  assert.equal(activityPayload.action.id, starterActivity.id);

  const marketResponse = await handlers.shopGetHandler();
  const marketPayload = await marketResponse.json();
  assert.equal(marketResponse.status, 200);
  assert.ok(Array.isArray(marketPayload.items));
  assert.ok(marketPayload.items.some((item) => item.id === "iron-sword"));

  const shopResponse = await handlers.shopPostHandler(
    createJsonRequest({
      action: "buy",
      marketId: "blacksmith-forge",
      itemId: "iron-sword",
    }),
  );
  const shopPayload = await shopResponse.json();
  assert.equal(shopResponse.status, 200);
  assert.equal(shopPayload.message, "Iron Sword purchased.");

  const inventoryResponse = await handlers.inventoryGetHandler();
  const inventoryPayload = await inventoryResponse.json();
  assert.equal(inventoryResponse.status, 200);
  assert.ok(
    inventoryPayload.items.some((item) => item.itemId === "iron-sword"),
  );

  const loreResponse = await handlers.completeLoreHandler(
    createJsonRequest({
      regionId: "heartlands",
      regionName: "The Heartlands",
      locationId: "kingston",
      locationName: "Kingston",
    }),
  );
  const lorePayload = await loreResponse.json();
  assert.equal(loreResponse.status, 200);
  assert.equal(lorePayload.recorded, true);

  const rewardResponse = await handlers.claimRewardHandler(
    createJsonRequest({}, "POST"),
  );
  const rewardPayload = await rewardResponse.json();
  assert.equal(rewardResponse.status, 200);
  assert.equal(rewardPayload.claimed, true);
  assert.equal(rewardPayload.rewardGold, ONBOARDING_COMPLETION_REWARD_GOLD);

  assert.ok(
    state.logs.some((entry) => entry.activityId === starterActivity.id && entry.success),
  );
  assert.ok(
    state.logs.some((entry) => entry.activityId === ONBOARDING_ZAKZUM_LORE_ACTIVITY_ID),
  );
  assert.ok(
    state.logs.some(
      (entry) => entry.activityId === ONBOARDING_COMPLETION_REWARD_ACTIVITY_ID,
    ),
  );
  assert.equal(state.character.gold, 43);
});

test("player journey preserves progress across logout and login", async () => {
  const { state, handlers } = createJourneyHarness();

  await registerLoginAndCreateCharacter(handlers, {
    email: "traveler@example.com",
    name: "Mara Voss",
  });

  const buyResponse = await handlers.shopPostHandler(
    createJsonRequest({
      action: "buy",
      marketId: "blacksmith-forge",
      itemId: "iron-sword",
    }),
  );
  assert.equal(buyResponse.status, 200);

  const logoutResponse = await handlers.logoutHandler({ method: "POST" });
  const logoutPayload = await logoutResponse.json();
  assert.equal(logoutResponse.status, 200);
  assert.equal(logoutPayload.message, "Logged out.");
  assert.equal(state.activeUserId, null);
  assert.equal(state.sessionToken, null);

  const blockedInventoryResponse = await handlers.inventoryGetHandler();
  const blockedInventoryPayload = await blockedInventoryResponse.json();
  assert.equal(blockedInventoryResponse.status, 401);
  assert.equal(
    blockedInventoryPayload.message,
    "You must be logged in to use this endpoint.",
  );

  const reloginResponse = await handlers.loginHandler(
    createJsonRequest({
      email: "traveler@example.com",
      password: "Sword123",
    }),
  );
  assert.equal(reloginResponse.status, 200);
  assert.equal(state.activeUserId, "user-1");

  const inventoryResponse = await handlers.inventoryGetHandler();
  const inventoryPayload = await inventoryResponse.json();
  assert.equal(inventoryResponse.status, 200);
  assert.ok(
    inventoryPayload.items.some((item) => item.itemId === "iron-sword"),
  );
});

test("player journey covers rest gating and consumable activity prep", async () => {
  const { starterActivity, state, handlers } = createJourneyHarness();

  await registerLoginAndCreateCharacter(handlers, {
    email: "rested@example.com",
    name: "Lysa Renn",
  });

  state.character = {
    ...state.character,
    heat: 4,
  };

  const restStartResponse = await handlers.restPostHandler(
    createJsonRequest({ action: "start" }),
  );
  const restStartPayload = await restStartResponse.json();
  assert.equal(restStartResponse.status, 200);
  assert.equal(
    restStartPayload.message,
    "Rest started. -4 Heat every 15 min until canceled.",
  );
  assert.ok(restStartPayload.rest?.isResting);

  const restStateResponse = await handlers.restGetHandler();
  const restStatePayload = await restStateResponse.json();
  assert.equal(restStateResponse.status, 200);
  assert.ok(restStatePayload.rest?.isResting);

  const blockedActivityResponse = await handlers.activitiesPostHandler(
    createJsonRequest({ activityId: starterActivity.id }),
  );
  const blockedActivityPayload = await blockedActivityResponse.json();
  assert.equal(blockedActivityResponse.status, 423);
  assert.equal(
    blockedActivityPayload.message,
    "Rest is active. Cancel rest before doing activities.",
  );

  const restCancelResponse = await handlers.restPostHandler(
    createJsonRequest({ action: "cancel" }),
  );
  const restCancelPayload = await restCancelResponse.json();
  assert.equal(restCancelResponse.status, 200);
  assert.equal(restCancelPayload.message, "Rest canceled.");
  assert.equal(restCancelPayload.rest, null);

  const buyConsumableResponse = await handlers.shopPostHandler(
    createJsonRequest({
      action: "buy",
      marketId: "blacksmith-forge",
      itemId: "focus-tonic",
    }),
  );
  const buyConsumablePayload = await buyConsumableResponse.json();
  assert.equal(buyConsumableResponse.status, 200);
  assert.equal(buyConsumablePayload.message, "Focus Tonic purchased.");

  const tonicRecord = state.items.find((item) => item.itemId === "focus-tonic");
  assert.ok(tonicRecord);

  const useConsumableResponse = await handlers.inventoryPostHandler(
    createJsonRequest({
      action: "use",
      itemRecordId: tonicRecord.id,
    }),
  );
  const useConsumablePayload = await useConsumableResponse.json();
  assert.equal(useConsumableResponse.status, 200);
  assert.equal(useConsumablePayload.message, "Focus Tonic used.");
  assert.equal(useConsumablePayload.nextActivityRollBonus, 2);

  const preparedActivityResponse = await handlers.activitiesPostHandler(
    createJsonRequest({ activityId: starterActivity.id }),
  );
  const preparedActivityPayload = await preparedActivityResponse.json();
  assert.equal(preparedActivityResponse.status, 200);
  assert.equal(
    preparedActivityPayload.result.consumableIdentity.consumedNextActivityRollBonus,
    2,
  );
  assert.equal(
    preparedActivityPayload.result.consumableIdentity.remainingNextActivityRollBonus,
    0,
  );
  assert.equal(state.character.nextActivityRollBonus, 0);
});