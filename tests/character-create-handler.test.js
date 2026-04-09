import assert from "node:assert/strict";
import test from "node:test";

import { NextResponse } from "next/server";

import { createCharacterPostHandler } from "../src/app/api/character/route.js";

function createJsonRequest(body) {
  return {
    method: "POST",
    async json() {
      return body;
    },
  };
}

function createDependencies(overrides = {}) {
  let createdCharacter = null;

  return {
    dependencies: {
      validateWriteRequestOrigin: () => null,
      requireApiUser: async () => ({
        user: { id: "user-1", email: "hero@example.com" },
        error: null,
      }),
      prismaClient: {
        character: {
          async findUnique() {
            return null;
          },
        },
        async $transaction(callback) {
          return callback({
            character: {
              async create({ data }) {
                createdCharacter = {
                  id: "character-1",
                  createdAt: new Date("2099-01-01T00:00:00.000Z"),
                  unspentStatPoints: 0,
                  nextActivityRollBonus: 0,
                  ...data,
                };
                return createdCharacter;
              },
            },
            user: {
              async update() {
                return null;
              },
            },
          });
        },
      },
      logServerError: () => {},
      ...overrides,
    },
    getCreatedCharacter() {
      return createdCharacter;
    },
  };
}

test("character create handler creates a first character", async () => {
  const harness = createDependencies();
  const handler = createCharacterPostHandler(harness.dependencies);

  const response = await handler(
    createJsonRequest({
      name: "Sir Aelric",
      characterClass: "FIGHTER",
      characterRace: "HUMAN",
      characterBackground: "SOLDIER",
      backgroundLore:
        "They were shaped by discipline, orders, and the brutal lessons of conflict.",
    }),
  );
  const payload = await response.json();

  assert.equal(response.status, 201);
  assert.equal(payload.message, "Character created.");
  assert.equal(harness.getCreatedCharacter()?.userId, "user-1");
});

test("character create handler rejects duplicate character", async () => {
  const harness = createDependencies({
    prismaClient: {
      character: {
        async findUnique() {
          return { id: "character-1" };
        },
      },
    },
  });
  const handler = createCharacterPostHandler(harness.dependencies);

  const response = await handler(
    createJsonRequest({
      name: "Sir Aelric",
      characterClass: "FIGHTER",
      characterRace: "HUMAN",
      characterBackground: "SOLDIER",
      backgroundLore:
        "They were shaped by discipline, orders, and the brutal lessons of conflict.",
    }),
  );
  const payload = await response.json();

  assert.equal(response.status, 409);
  assert.equal(payload.message, "You already have a character for this account.");
});

test("character create handler returns auth error unchanged", async () => {
  const harness = createDependencies({
    requireApiUser: async () => ({
      user: null,
      error: NextResponse.json({ message: "Auth required." }, { status: 401 }),
    }),
  });
  const handler = createCharacterPostHandler(harness.dependencies);

  const response = await handler(createJsonRequest({}));
  const payload = await response.json();

  assert.equal(response.status, 401);
  assert.equal(payload.message, "Auth required.");
});