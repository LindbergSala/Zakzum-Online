import assert from "node:assert/strict";
import test from "node:test";

import {
  serializeInventoryActionPayload,
  serializeInventoryIndexPayload,
} from "../src/app/api/game/inventory/response-serializers.js";

test("inventory index serializer returns empty payload without active character", () => {
  const payload = serializeInventoryIndexPayload({ activeCharacter: null, items: [] });

  assert.deepEqual(payload, { items: [], resources: null, stats: null });
});

test("inventory action serializer preserves message and resources", () => {
  const payload = serializeInventoryActionPayload({
    result: {
      message: "Iron Sword is now equipped.",
      allItems: [{ id: "item-1", itemId: "iron-sword", itemName: "Iron Sword", isEquipped: true }],
      updatedCharacter: {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
        hp: 20,
        stamina: 18,
        maxStamina: 20,
        staminaRegenAt: new Date("2099-01-01T00:00:00.000Z"),
        gold: 10,
        xp: 0,
        level: 1,
        renown: 0,
        heat: 0,
        nextActivityRollBonus: 0,
      },
    },
  });

  assert.equal(payload.message, "Iron Sword is now equipped.");
  assert.equal(payload.items.length, 1);
  assert.equal(payload.resources.stamina, 18);
});