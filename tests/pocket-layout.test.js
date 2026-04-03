import assert from "node:assert/strict";
import test from "node:test";

import { normalizeInventoryItems } from "../src/components/inventory/inventory-logic.js";
import {
  isPocketConsumableItem,
  resolvePocketSlots,
} from "../src/components/inventory/pocket-layout.js";

function getNormalizedItem(rawItem) {
  return normalizeInventoryItems([rawItem])[0];
}

test("pocket compatibility only accepts stackable consumables up to five", () => {
  const equipmentItem = getNormalizedItem({
    id: "sword-1",
    itemId: "iron-sword",
    itemName: "Iron Sword",
    slot: "weapon",
  });

  assert.equal(isPocketConsumableItem(equipmentItem), false);

  const oversizedConsumable = getNormalizedItem({
    id: "potion-1",
    itemId: "health-potion",
    itemName: "Health Potion",
    slot: "belt",
    quantity: 6,
  });

  assert.equal(isPocketConsumableItem(oversizedConsumable), false);
});

test("pocket slots resolve from placed item keys", () => {
  const items = normalizeInventoryItems([
    {
      id: "potion-a",
      itemId: "health-potion",
      itemName: "Health Potion",
      slot: "belt",
      quantity: 4,
    },
  ]);

  const slots = resolvePocketSlots({
    pocketPlacements: { "potion-a": 0 },
    items,
  });

  assert.equal(slots[0].item.itemName, "Health Potion");
  assert.equal(slots[0].item.quantity, 4);
  assert.equal(slots[0].item.displayQuantity, 4);
  assert.equal(slots[0].itemKey, "potion-a");
});

test("stale pocket placements render as empty slots", () => {
  const slots = resolvePocketSlots({
    pocketPlacements: { "missing-item": 2 },
    items: [],
  });

  assert.equal(slots[2].item, null);
  assert.equal(slots[2].itemKey, "missing-item");
});