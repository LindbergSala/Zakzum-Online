import assert from "node:assert/strict";
import test from "node:test";

import { calculateCharacterResourceResult } from "../src/lib/resource-rules.js";

test("resource calculation caps stamina at maxStamina", () => {
  const result = calculateCharacterResourceResult(
    {
      hp: 24,
      stamina: 18,
      maxStamina: 20,
      gold: 0,
      xp: 0,
      level: 1,
      renown: 0,
      heat: 0,
    },
    {
      delta: { stamina: 8 },
    },
  );

  assert.equal(result.ok, true);
  assert.equal(result.before.stamina, 18);
  assert.equal(result.after.stamina, 20);
  assert.equal(result.delta.stamina, 2);
});

test("resource calculation enforces stamina cost using normalized stamina", () => {
  const result = calculateCharacterResourceResult(
    {
      hp: 24,
      stamina: 28,
      maxStamina: 20,
      gold: 0,
      xp: 0,
      level: 1,
      renown: 0,
      heat: 0,
    },
    {
      staminaCost: 21,
    },
  );

  assert.equal(result.ok, false);
  assert.equal(result.reason, "NOT_ENOUGH_STAMINA");
  assert.equal(result.message, "Not enough Stamina. Required 21, you have 20.");
  assert.equal(result.currentStamina, 20);
});
