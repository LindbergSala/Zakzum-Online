import assert from "node:assert/strict";
import test from "node:test";

import {
  inventoryActionSchema,
  shopPurchaseSchema,
} from "../src/lib/validators/core-loop.js";

function expectValid(schema, input) {
  const parsed = schema.safeParse(input);
  assert.equal(parsed.success, true);
}

function expectInvalid(schema, input, expectedField) {
  const parsed = schema.safeParse(input);
  assert.equal(parsed.success, false);

  const fieldErrors = parsed.error.flatten().fieldErrors;
  assert.ok(fieldErrors[expectedField]?.length > 0);
}

test("shop schema accepts buy payload with itemId", () => {
  expectValid(shopPurchaseSchema, {
    action: "buy",
    itemId: "iron-sword",
  });
});

test("shop schema rejects empty payload", () => {
  expectInvalid(shopPurchaseSchema, {}, "itemId");
});

test("shop schema rejects buy payload with quantity", () => {
  expectInvalid(
    shopPurchaseSchema,
    {
      action: "buy",
      itemId: "iron-sword",
      quantity: 2,
    },
    "quantity",
  );
});

test("shop schema accepts sell payload with itemRecordId", () => {
  expectValid(shopPurchaseSchema, {
    action: "sell",
    itemRecordId: "cmf8dnf6u0000qq9nccz0m9a1",
    quantity: 2,
  });
});

test("shop schema rejects sell payload without item reference", () => {
  expectInvalid(shopPurchaseSchema, { action: "sell" }, "itemRecordId");
});

test("inventory schema accepts default equip payload with itemId", () => {
  expectValid(inventoryActionSchema, {
    itemId: "iron-sword",
  });
});

test("inventory schema rejects equip payload without item reference", () => {
  expectInvalid(inventoryActionSchema, { action: "equip" }, "itemRecordId");
});

test("inventory schema rejects equip payload with quantity", () => {
  expectInvalid(
    inventoryActionSchema,
    {
      action: "equip",
      itemRecordId: "cmf8dnf6u0000qq9nccz0m9a1",
      quantity: 1,
    },
    "quantity",
  );
});

test("inventory schema accepts split payload with itemRecordId", () => {
  expectValid(inventoryActionSchema, {
    action: "split",
    itemRecordId: "cmf8dnf6u0000qq9nccz0m9a1",
    quantity: 2,
  });
});

test("inventory schema rejects split payload using itemId", () => {
  expectInvalid(
    inventoryActionSchema,
    {
      action: "split",
      itemId: "health-potion",
      quantity: 1,
    },
    "itemRecordId",
  );
});

test("inventory schema accepts combine payload with source and target", () => {
  expectValid(inventoryActionSchema, {
    action: "combine",
    itemRecordId: "cmf8dnf6u0000qq9nccz0m9a1",
    targetItemRecordId: "cmf8doghs0001qq9n9sz8u5e3",
    quantity: 2,
  });
});

test("inventory schema rejects combine payload without target", () => {
  expectInvalid(
    inventoryActionSchema,
    {
      action: "combine",
      itemRecordId: "cmf8dnf6u0000qq9nccz0m9a1",
    },
    "targetItemRecordId",
  );
});
