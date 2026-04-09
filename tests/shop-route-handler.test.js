import assert from "node:assert/strict";
import test from "node:test";

import { NextResponse } from "next/server";

import { createShopPostHandler } from "../src/app/api/game/shop/route.js";

function createSuccessDependencies(overrides = {}) {
  return {
    validateWriteRequestOrigin: () => null,
    requireApiUser: async () => ({ user: { id: "user-1" }, error: null }),
    parseAndValidateJsonRequestBody: async () => ({
      data: { action: "buy", marketId: "blacksmith-forge", itemId: "iron-sword" },
      response: null,
    }),
    getResolvedActiveCharacterForUser: async () => ({ id: "character-1" }),
    runSerializableTransaction: async (operation) =>
      operation({
        character: {
          findUnique: async () => ({ id: "character-1" }),
        },
        characterItem: {
          findMany: async () => [],
        },
      }),
    processBuyTransaction: async () => ({
      ok: true,
      status: 200,
      action: "buy",
      itemDefinition: { id: "iron-sword", name: "Iron Sword" },
      quantity: 1,
      quantityAfter: 1,
      itemRecord: { id: "item-record-1" },
      updatedCharacter: {
        hp: 20,
        stamina: 20,
        gold: 8,
        xp: 0,
        level: 1,
        renown: 0,
        heat: 0,
      },
      calculation: {
        before: { hp: 20, stamina: 20, gold: 10, xp: 0, level: 1, renown: 0, heat: 0 },
        delta: { hp: 0, stamina: 0, gold: -2, xp: 0, level: 0, renown: 0, heat: 0 },
      },
      logEntry: { id: "log-1" },
      soldWhileEquipped: false,
    }),
    processSellTransaction: async () => {
      throw new Error("sell path should not be used");
    },
    isSerializableConflict: () => false,
    logServerError: () => {},
    ...overrides,
  };
}

test("shop route blocks invalid origin", async () => {
  const handler = createShopPostHandler(
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

test("shop route returns auth error from requireApiUser", async () => {
  const handler = createShopPostHandler(
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

test("shop route returns validation response", async () => {
  const handler = createShopPostHandler(
    createSuccessDependencies({
      parseAndValidateJsonRequestBody: async () => ({
        data: null,
        response: NextResponse.json({ message: "Invalid market action." }, { status: 400 }),
      }),
    }),
  );

  const response = await handler({ method: "POST" });
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.equal(payload.message, "Invalid market action.");
});

test("shop route maps serializable conflicts to 409", async () => {
  const handler = createShopPostHandler(
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
  assert.equal(payload.message, "Market transaction conflicted with another update. Try again.");
});

test("shop route returns serialized success payload", async () => {
  const handler = createShopPostHandler(createSuccessDependencies());

  const response = await handler({ method: "POST" });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.message, "Iron Sword purchased.");
  assert.equal(payload.item.id, "iron-sword");
  assert.equal(payload.logId, "log-1");
});