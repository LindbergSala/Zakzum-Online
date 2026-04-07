import assert from "node:assert/strict";
import test from "node:test";

import { createCompleteOnboardingLorePostHandler } from "../src/app/api/game/onboarding/complete-lore/route.js";
import { ONBOARDING_ZAKZUM_LORE_ACTIVITY_ID } from "../src/lib/onboarding.js";

function createRouteHarness() {
  const logs = [];
  const character = {
    id: "character-1",
    hp: 20,
    stamina: 20,
    maxStamina: 20,
    gold: 10,
    xp: 0,
    level: 1,
    renown: 0,
    heat: 0,
  };

  const tx = {
    activityLog: {
      async findFirst({ where }) {
        return (
          logs.find(
            (entry) =>
              entry.characterId === where.characterId &&
              entry.activityId === where.activityId,
          ) ?? null
        );
      },
      async create({ data }) {
        const created = { id: `log-${logs.length + 1}`, ...data };
        logs.push(created);
        return { id: created.id };
      },
    },
    character: {
      async findUnique({ where }) {
        if (where.id !== character.id) {
          return null;
        }

        return { ...character };
      },
    },
  };

  return {
    logs,
    tx,
    dependencies: {
      validateWriteRequestOrigin: () => null,
      requireApiUser: async () => ({ user: { id: "user-1" }, error: null }),
      getActiveCharacterForUser: async () => ({ id: "character-1" }),
      runSerializableTransaction: async (callback) => callback(tx),
      logServerError: () => {},
    },
  };
}

test("complete lore route records lore progress once", async () => {
  const harness = createRouteHarness();
  const handler = createCompleteOnboardingLorePostHandler(harness.dependencies);

  const firstResponse = await handler({
    method: "POST",
    json: async () => ({
      regionId: "heartlands",
      regionName: "The Heartlands",
      locationId: "kingston",
      locationName: "Kingston",
    }),
  });
  const firstPayload = await firstResponse.json();

  const secondResponse = await handler({
    method: "POST",
    json: async () => ({
      regionId: "heartlands",
      regionName: "The Heartlands",
      locationId: "kingston",
      locationName: "Kingston",
    }),
  });
  const secondPayload = await secondResponse.json();

  assert.equal(firstResponse.status, 200);
  assert.equal(firstPayload.recorded, true);
  assert.equal(secondResponse.status, 200);
  assert.equal(secondPayload.recorded, false);

  const loreLogs = harness.logs.filter(
    (entry) => entry.activityId === ONBOARDING_ZAKZUM_LORE_ACTIVITY_ID,
  );
  assert.equal(loreLogs.length, 1);
  assert.equal(loreLogs[0].details?.locationId, "kingston");
});

test("complete lore route requires active character", async () => {
  const harness = createRouteHarness();
  const handler = createCompleteOnboardingLorePostHandler({
    ...harness.dependencies,
    getActiveCharacterForUser: async () => null,
  });

  const response = await handler({
    method: "POST",
    json: async () => ({}),
  });
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.equal(
    payload.message,
    "You need an active character before completing onboarding lore.",
  );
});

test("complete lore route rejects invalid json body", async () => {
  const harness = createRouteHarness();
  const handler = createCompleteOnboardingLorePostHandler(harness.dependencies);

  const response = await handler({
    method: "POST",
    json: async () => {
      throw new Error("bad json");
    },
  });
  const payload = await response.json();

  assert.equal(response.status, 400);
  assert.equal(payload.message, "Invalid JSON in request body.");
});
