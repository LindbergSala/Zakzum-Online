import assert from "node:assert/strict";
import test from "node:test";

import { getItemImagePath } from "../src/lib/items/helpers.js";

test("weapon item images resolve from the weapons directory", () => {
  assert.equal(
    getItemImagePath("iron-sword"),
    "/images/items/weapons/iron-sword.png",
  );
  assert.equal(
    getItemImagePath("archmage-staff"),
    "/images/items/weapons/archmage-staff.png",
  );
});

test("items without mapped artwork return null", () => {
  assert.equal(
    getItemImagePath("tower-shield"),
    "/images/items/shields/tower-shield.png",
  );
  assert.equal(
    getItemImagePath("warlord-belt"),
    "/images/items/betls/warlord-belt.png",
  );
  assert.equal(getItemImagePath("missing-item"), null);
  assert.equal(getItemImagePath("focus-charm"), null);
});
