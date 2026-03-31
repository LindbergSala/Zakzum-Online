import assert from "node:assert/strict";
import test from "node:test";

import { getCharacterCarryCapacity } from "../src/lib/weight-rules.js";

test("carry capacity starts at 10 for STR 1", () => {
  assert.equal(getCharacterCarryCapacity(1), 10);
});

test("carry capacity scales by +3 per STR above 1", () => {
  assert.equal(getCharacterCarryCapacity(2), 13);
  assert.equal(getCharacterCarryCapacity(5), 22);
});

