import assert from "node:assert/strict";
import test from "node:test";

import {
  buildShopTransactionMessage,
  serializeShopTransactionPayload,
} from "../src/app/api/game/shop/response-serializers.js";

test("shop transaction message handles quantity and auto-unequip suffix", () => {
  assert.equal(
    buildShopTransactionMessage({
      action: "buy",
      quantity: 1,
      itemDefinition: { name: "Iron Sword" },
      soldWhileEquipped: false,
    }),
    "Iron Sword purchased.",
  );

  assert.equal(
    buildShopTransactionMessage({
      action: "sell",
      quantity: 2,
      itemDefinition: { name: "Health Potion" },
      soldWhileEquipped: true,
    }),
    "Health Potion x2 sold. Item was unequipped automatically.",
  );
});

test("shop transaction serializer preserves resource summary", () => {
  const payload = serializeShopTransactionPayload({
    result: {
      action: "buy",
      quantity: 1,
      itemDefinition: { id: "iron-sword", name: "Iron Sword" },
      quantityAfter: 1,
      itemRecord: { id: "item-record-1" },
      logEntry: { id: "log-1" },
      updatedCharacter: {
        hp: 20,
        stamina: 20,
        maxStamina: 20,
        staminaRegenAt: new Date("2099-01-01T00:00:00.000Z"),
        gold: 8,
        xp: 0,
        level: 1,
        renown: 0,
        heat: 0,
      },
      calculation: {
        before: { gold: 10 },
        delta: { gold: -2 },
      },
      soldWhileEquipped: false,
    },
  });

  assert.equal(payload.message, "Iron Sword purchased.");
  assert.equal(payload.logId, "log-1");
  assert.equal(payload.resources.after.gold, 8);
});