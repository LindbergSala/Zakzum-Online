import assert from "node:assert/strict";
import test from "node:test";

import { getItemImagePath } from "../src/lib/items/helpers.js";

test("weapon item images resolve from the weapons directory", () => {
  assert.equal(
    getItemImagePath("iron-sword"),
    "/images/items/weapons/iron-sword.png?v=20260403",
  );
  assert.equal(
    getItemImagePath("archmage-staff"),
    "/images/items/weapons/archmage-staff.png?v=20260403",
  );
});

test("newly added item images resolve in their directories", () => {
  assert.equal(
    getItemImagePath("health-potion"),
    "/images/items/potions/health-potion.png?v=20260403",
  );
  assert.equal(
    getItemImagePath("pathfinder-boots"),
    "/images/items/boots/pathfinder-boots.png?v=20260403",
  );
  assert.equal(
    getItemImagePath("iron-greaves"),
    "/images/items/boots/iron-greaves.png?v=20260403",
  );
  assert.equal(
    getItemImagePath("scout-hood"),
    "/images/items/helmets/scout-hood.png?v=20260403",
  );
});

test("mapped and missing artwork cases resolve correctly", () => {
  assert.equal(
    getItemImagePath("tower-shield"),
    "/images/items/shields/tower-shield.png?v=20260403",
  );
  assert.equal(
    getItemImagePath("warlord-belt"),
    "/images/items/belts/warlord-belt.png?v=20260403",
  );
  assert.equal(
    getItemImagePath("focus-charm"),
    "/images/items/jewelry/focus-charm.png?v=20260403",
  );
  assert.equal(
    getItemImagePath("torn-banner"),
    "/images/items/junk/torn-banner.png?v=20260403",
  );
  assert.equal(
    getItemImagePath("cracked-goblet"),
    "/images/items/junk/cracked-goblet.png?v=20260403",
  );
  assert.equal(
    getItemImagePath("monster-fang"),
    "/images/items/junk/monster-fang.png?v=20260403",
  );
  assert.equal(getItemImagePath("missing-item"), null);
});
