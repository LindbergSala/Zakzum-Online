import assert from "node:assert/strict";
import test from "node:test";

import { processInventoryActionTransaction } from "../src/app/api/game/inventory/transaction-actions.js";

test("inventory combine action requires source and target ids", async () => {
  const result = await processInventoryActionTransaction({
    tx: {},
    action: "combine",
    latestCharacter: {
      id: "character-1",
    },
    ownedItems: [],
    selectedItem: null,
    parsedData: {},
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.equal(result.message, "Combine requires source and target stack ids.");
});

test("inventory action rejects unknown action type", async () => {
  const result = await processInventoryActionTransaction({
    tx: {},
    action: "invalid-action",
    latestCharacter: {
      id: "character-1",
    },
    ownedItems: [],
    selectedItem: {
      id: "owned-1",
      itemId: "iron-sword",
      itemName: "Iron Sword",
      isEquipped: false,
    },
    parsedData: {},
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, 400);
  assert.equal(result.message, "Unknown inventory action.");
});
