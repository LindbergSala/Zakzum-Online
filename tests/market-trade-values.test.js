import assert from "node:assert/strict";
import test from "node:test";

import {
  getItemGoldCost,
  getItemRenownCost,
  getItemSellValue,
  isItemStackable,
} from "../src/lib/items/helpers.js";

test("buy costs resolve correctly for market items", () => {
  assert.equal(getItemGoldCost("iron-sword"), 20);
  assert.equal(getItemRenownCost("iron-sword"), 0);
  assert.equal(getItemGoldCost("arena-laurel"), 0);
  assert.equal(getItemRenownCost("arena-laurel"), 10);
});

test("sell values use robust floor ratios with minimum 1 for paid costs", () => {
  assert.deepEqual(getItemSellValue("iron-sword"), {
    gold: 12,
    renown: 0,
  });
  assert.deepEqual(getItemSellValue("arena-laurel"), {
    gold: 0,
    renown: 5,
  });
  assert.deepEqual(
    getItemSellValue({
      price: 1,
      renownPrice: 1,
    }),
    {
      gold: 1,
      renown: 1,
    },
  );
});

test("starter gear stays in an early-game affordable band", () => {
  assert.equal(getItemGoldCost("scout-dagger"), 13);
  assert.equal(getItemGoldCost("apprentice-staff"), 16);
  assert.equal(getItemGoldCost("chain-shirt"), 20);
  assert.equal(getItemGoldCost("apprentice-ring"), 14);
});

test("unknown items have zero trade values", () => {
  assert.equal(getItemGoldCost("missing-id"), 0);
  assert.equal(getItemRenownCost("missing-id"), 0);
  assert.deepEqual(getItemSellValue("missing-id"), {
    gold: 0,
    renown: 0,
  });
});

test("stackable helper identifies consumables", () => {
  assert.equal(isItemStackable("health-potion"), true);
  assert.equal(isItemStackable("iron-sword"), false);
});

test("charisma adjusts displayed trade values when character context is provided", () => {
  const charmingCharacter = { charisma: 20 };

  assert.equal(getItemGoldCost("iron-sword", charmingCharacter), 18);
  assert.equal(getItemRenownCost("arena-laurel", charmingCharacter), 9);
  assert.deepEqual(getItemSellValue("arena-laurel", charmingCharacter), {
    gold: 0,
    renown: 5,
  });
});
