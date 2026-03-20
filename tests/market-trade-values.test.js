import assert from "node:assert/strict";
import test from "node:test";

import {
  getShopItemGoldCost,
  getShopItemRenownCost,
  getShopItemSellValue,
  isShopItemStackable,
} from "../src/lib/core-loop-data.js";

test("buy costs resolve correctly for market items", () => {
  assert.equal(getShopItemGoldCost("iron-sword"), 25);
  assert.equal(getShopItemRenownCost("iron-sword"), 0);
  assert.equal(getShopItemGoldCost("arena-laurel"), 0);
  assert.equal(getShopItemRenownCost("arena-laurel"), 10);
});

test("sell values use robust floor ratios with minimum 1 for paid costs", () => {
  assert.deepEqual(getShopItemSellValue("iron-sword"), {
    gold: 15,
    renown: 0,
  });
  assert.deepEqual(getShopItemSellValue("arena-laurel"), {
    gold: 0,
    renown: 5,
  });
  assert.deepEqual(
    getShopItemSellValue({
      price: 1,
      renownPrice: 1,
    }),
    {
      gold: 1,
      renown: 1,
    },
  );
});

test("unknown items have zero trade values", () => {
  assert.equal(getShopItemGoldCost("missing-id"), 0);
  assert.equal(getShopItemRenownCost("missing-id"), 0);
  assert.deepEqual(getShopItemSellValue("missing-id"), {
    gold: 0,
    renown: 0,
  });
});

test("stackable helper identifies consumables", () => {
  assert.equal(isShopItemStackable("health-potion"), true);
  assert.equal(isShopItemStackable("iron-sword"), false);
});
