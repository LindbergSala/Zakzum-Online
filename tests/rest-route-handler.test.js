import assert from "node:assert/strict";
import test from "node:test";

import { NextResponse } from "next/server";

import { createRestPostHandler } from "../src/app/api/game/rest/route.js";

function createSuccessDependencies(overrides = {}) {
  return {
    validateWriteRequestOrigin: () => null,
    requireApiUser: async () => ({ user: { id: "user-1" }, error: null }),
    parseAndValidateJsonRequestBody: async () => ({
      data: { action: "start" },
      response: null,
    }),
    getResolvedActiveCharacterForUser: async () => ({ id: "character-1" }),
    runSerializableTransaction: async () => ({
      ok: true,
      status: 200,
      message: "Rest started. -4 Heat every 15 min until canceled.",
      resources: { hp: 20, stamina: 20, gold: 10, xp: 0, level: 1, renown: 0, heat: 8 },
      rest: { isResting: true, currentHeat: 8 },
    }),
    isSerializableConflict: () => false,
    logServerError: () => {},
    ...overrides,
  };
}

test("rest route blocks invalid origin", async () => {
  const handler = createRestPostHandler(
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

test("rest route returns auth error from requireApiUser", async () => {
  const handler = createRestPostHandler(
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

test("rest route returns validation response", async () => {
  const handler = createRestPostHandler(
    createSuccessDependencies({
      parseAndValidateJsonRequestBody: async () => ({
        data: null,
        response: NextResponse.json({ message: "Invalid rest action." }, { status: 400 }),
      }),
    }),
  );

  const response = await handler({ method: "POST" });
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.equal(payload.message, "Invalid rest action.");
});

test("rest route maps serializable conflicts to 409", async () => {
  const handler = createRestPostHandler(
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
  assert.equal(payload.message, "Rest action conflicted with another update. Try again.");
});

test("rest route returns serialized success payload", async () => {
  const handler = createRestPostHandler(createSuccessDependencies());

  const response = await handler({ method: "POST" });
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.message, "Rest started. -4 Heat every 15 min until canceled.");
  assert.equal(payload.resources.heat, 8);
  assert.equal(payload.rest.isResting, true);
});