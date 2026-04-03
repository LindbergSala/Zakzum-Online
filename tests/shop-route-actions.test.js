import assert from "node:assert/strict";
import test from "node:test";

import {
  processBuyTransaction,
  processSellTransaction,
} from "../src/app/api/game/shop/transaction-actions.js";

test("shop buy transaction rejects unknown item id", async () => {
  const result = await processBuyTransaction({
    tx: {},
    latestCharacter: {
      id: "character-1",
      gold: 100,
      renown: 100,
      strength: 10,
    },
    ownedItems: [],
    parsedData: {
      itemId: "unknown-item-id",
    },
    requestedMarket: {
      id: "blacksmith-forge",
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.equal(result.message, "Unknown item.");
});

test("shop sell transaction rejects missing owned item", async () => {
  const result = await processSellTransaction({
    tx: {},
    latestCharacter: {
      id: "character-1",
      hp: 20,
      energy: 20,
      gold: 50,
      xp: 0,
      level: 1,
      renown: 0,
      heat: 0,
      updatedAt: new Date(),
    },
    ownedItems: [],
    parsedData: {
      itemId: "iron-sword",
      action: "sell",
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 404);
  assert.equal(result.message, "You do not own this item.");
});
