import assert from "node:assert/strict";
import test from "node:test";

import { NextResponse } from "next/server";

import { createInventoryPostHandler } from "../src/app/api/game/inventory/route.js";

function createSuccessDependencies(overrides = {}) {
  return {
    validateWriteRequestOrigin: () => null,
    requireApiUser: async () => ({ user: { id: "user-1" }, error: null }),
    parseAndValidateJsonRequestBody: async () => ({
      data: { action: "equip", itemRecordId: "item-1" },
      response: null,
    }),
    getResolvedActiveCharacterForUser: async () => ({ id: "character-1" }),
    runSerializableTransaction: async (operation) =>
      operation({
        character: {
          findUnique: async () => ({ id: "character-1", nextActivityRollBonus: 0 }),
        },
        characterItem: {
          findMany: async () => [{ id: "item-1", itemId: "iron-sword", isEquipped: false }],
        },
      }),
    processInventoryActionTransaction: async () => ({
      ok: true,
      status: 200,
      message: "Iron Sword is now equipped.",
      allItems: [{ id: "item-1", itemId: "iron-sword", itemName: "Iron Sword", isEquipped: true }],
      updatedCharacter: {
        hp: 20,
        stamina: 20,
        gold: 10,
        xp: 0,
        level: 1,
        renown: 0,
        heat: 0,
        nextActivityRollBonus: 0,
      },
    }),
    isSerializableConflict: () => false,
    logServerError: () => {},
    ...overrides,
  };
}

test("inventory route blocks invalid origin", async () => {
  const handler = createInventoryPostHandler(
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

test("inventory route returns auth error from requireApiUser", async () => {
  const handler = createInventoryPostHandler(
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

test("inventory route returns validation response", async () => {
  const handler = createInventoryPostHandler(
    createSuccessDependencies({
      parseAndValidateJsonRequestBody: async () => ({
        data: null,
        response: NextResponse.json({ message: "Invalid inventory action." }, { status: 400 }),
      }),
    }),
  );

  const response = await handler({ method: "POST" });
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.equal(payload.message, "Invalid inventory action.");
});

test("inventory route maps serializable conflicts to 409", async () => {
  const handler = createInventoryPostHandler(
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
  assert.equal(payload.message, "Inventory action conflicted with another update. Try again.");
});

test("inventory route returns serialized success payload", async () => {
  const handler = createInventoryPostHandler(createSuccessDependencies());

  const response = await handler({ method: "POST" });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.message, "Iron Sword is now equipped.");
  assert.equal(payload.items.length, 1);
  assert.equal(payload.resources.stamina, 20);
});