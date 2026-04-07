import assert from "node:assert/strict";
import test from "node:test";

import {
  canPlaceInBackpack,
  createInventoryState,
  moveItemToBackpack,
  moveItemToEquipment,
  moveItemToPocket,
  normalizeInventoryItems,
  splitItemStack,
  toItemsByKey,
} from "../src/components/inventory/inventory-logic.js";

function buildState(rawItems, placements) {
  const items = normalizeInventoryItems(rawItems);
  return {
    itemsByKey: toItemsByKey(items),
    placements,
  };
}

test("blocks placement when item would collide with another item", () => {
  const state = buildState(
    [
      { id: "sword-1", itemId: "iron-sword", itemName: "Iron Sword", slot: "weapon" },
      {
        id: "armor-1",
        itemId: "leather-armor",
        itemName: "Leather Armor",
        slot: "armor",
      },
    ],
    {
      "sword-1": { zone: "backpack", x: 0, y: 0 },
      "armor-1": { zone: "backpack", x: 1, y: 0 },
    },
  );

  const collisionCheck = canPlaceInBackpack({
    state,
    itemKey: "sword-1",
    targetX: 1,
    targetY: 1,
  });

  assert.equal(collisionCheck.ok, false);
  assert.equal(collisionCheck.reason, "Collision detected.");
});

test("blocks out-of-bounds placement", () => {
  const state = buildState(
    [{ id: "armor-1", itemId: "leather-armor", itemName: "Leather Armor", slot: "armor" }],
    {
      "armor-1": { zone: "backpack", x: 0, y: 0 },
    },
  );

  const check = canPlaceInBackpack({
    state,
    itemKey: "armor-1",
    targetX: 9,
    targetY: 5,
  });

  assert.equal(check.ok, false);
  assert.equal(check.reason, "Out of bounds.");
});

test("prevents equipping an item into an incompatible slot", () => {
  const state = buildState(
    [{ id: "armor-1", itemId: "leather-armor", itemName: "Leather Armor", slot: "armor" }],
    {
      "armor-1": { zone: "backpack", x: 0, y: 0 },
    },
  );

  const result = moveItemToEquipment({
    state,
    itemKey: "armor-1",
    slot: "weapon",
  });

  assert.equal(result.ok, false);
  assert.match(result.reason, /cannot be equipped/i);
});

test("moving equipped item back to backpack requests unequip sync", () => {
  const state = buildState(
    [
      {
        id: "sword-1",
        itemId: "iron-sword",
        itemName: "Iron Sword",
        slot: "weapon",
        isEquipped: true,
      },
    ],
    {
      "sword-1": { zone: "equipment", slot: "weapon" },
    },
  );

  const result = moveItemToBackpack({
    state,
    itemKey: "sword-1",
    targetX: 0,
    targetY: 0,
  });

  assert.equal(result.ok, true);
  assert.equal(result.syncAction.type, "unequip");
  assert.equal(result.syncAction.itemRecordId, "sword-1");
  assert.equal(result.nextState.placements["sword-1"].zone, "backpack");
});

test("stacking works only for consumables and merges full stack", () => {
  const state = buildState(
    [
      {
        id: "potion-a",
        itemId: "health-potion",
        itemName: "Health Potion",
        slot: "belt",
        quantity: 2,
      },
      {
        id: "potion-b",
        itemId: "health-potion",
        itemName: "Health Potion",
        slot: "belt",
        quantity: 3,
      },
    ],
    {
      "potion-a": { zone: "backpack", x: 0, y: 0 },
      "potion-b": { zone: "backpack", x: 1, y: 0 },
    },
  );

  const stacked = moveItemToBackpack({
    state,
    itemKey: "potion-b",
    targetX: 0,
    targetY: 0,
  });

  assert.equal(stacked.ok, true);
  assert.equal(stacked.syncAction.type, "combine");
  assert.equal(stacked.syncAction.itemRecordId, "potion-b");
  assert.equal(stacked.syncAction.targetItemRecordId, "potion-a");
  assert.equal(stacked.syncAction.quantity, 3);
  assert.equal(stacked.nextState.itemsByKey["potion-a"].quantity, 5);
  assert.equal(stacked.nextState.itemsByKey["potion-b"], undefined);
});

test("split stack creates a second stack and returns split sync action", () => {
  const state = buildState(
    [
      {
        id: "potion-a",
        itemId: "health-potion",
        itemName: "Health Potion",
        slot: "belt",
        quantity: 5,
      },
    ],
    {
      "potion-a": { zone: "backpack", x: 0, y: 0 },
    },
  );

  const split = splitItemStack({
    state,
    itemKey: "potion-a",
    splitQuantity: 2,
  });

  assert.equal(split.ok, true);
  assert.equal(split.syncAction.type, "split");
  assert.equal(split.syncAction.itemRecordId, "potion-a");
  assert.equal(split.syncAction.quantity, 2);
  assert.equal(split.nextState.itemsByKey["potion-a"].quantity, 3);
  assert.equal(split.nextState.itemsByKey[split.createdItemKey].quantity, 2);
});

test("moving a consumable to pocket removes it from backpack", () => {
  const state = buildState(
    [
      {
        id: "potion-a",
        itemId: "health-potion",
        itemName: "Health Potion",
        slot: "belt",
        quantity: 3,
      },
    ],
    {
      "potion-a": { zone: "backpack", x: 0, y: 0 },
    },
  );

  const result = moveItemToPocket({
    state,
    itemKey: "potion-a",
    slotIndex: 1,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.nextState.placements["potion-a"], {
    zone: "pocket",
    slotIndex: 1,
  });
});

test("pocket swap returns occupying item to backpack", () => {
  const state = buildState(
    [
      {
        id: "potion-a",
        itemId: "health-potion",
        itemName: "Health Potion",
        slot: "belt",
        quantity: 2,
      },
      {
        id: "potion-b",
        itemId: "stamina-draught",
        itemName: "Stamina Draught",
        slot: "belt",
        quantity: 2,
      },
    ],
    {
      "potion-a": { zone: "pocket", slotIndex: 0 },
      "potion-b": { zone: "backpack", x: 0, y: 0 },
    },
  );

  const result = moveItemToPocket({
    state,
    itemKey: "potion-b",
    slotIndex: 0,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.nextState.placements["potion-b"], {
    zone: "pocket",
    slotIndex: 0,
  });
  assert.equal(result.nextState.placements["potion-a"].zone, "backpack");
});

test("initial state places equipped item into its equipment slot", () => {
  const state = createInventoryState({
    items: normalizeInventoryItems([
      {
        id: "sword-1",
        itemId: "iron-sword",
        itemName: "Iron Sword",
        slot: "weapon",
        isEquipped: true,
      },
    ]),
  });

  assert.deepEqual(state.placements["sword-1"], {
    zone: "equipment",
    slot: "weapon",
  });
});

test("initial state restores stored pocket placements before backpack placement", () => {
  const state = createInventoryState({
    items: normalizeInventoryItems([
      {
        id: "potion-1",
        itemId: "health-potion",
        itemName: "Health Potion",
        slot: "belt",
        quantity: 3,
      },
    ]),
    storedPocketPlacements: {
      "potion-1": 2,
    },
  });

  assert.deepEqual(state.placements["potion-1"], {
    zone: "pocket",
    slotIndex: 2,
  });
});
