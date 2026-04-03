import assert from "node:assert/strict";
import test from "node:test";

import { calculateCharacterResourceResult } from "../src/lib/resource-rules.js";

test("resource calculation caps energy at maxEnergy", () => {
  const result = calculateCharacterResourceResult(
    {
      hp: 24,
      energy: 18,
      maxEnergy: 20,
      gold: 0,
      xp: 0,
      level: 1,
      renown: 0,
      heat: 0,
    },
    {
      delta: { energy: 8 },
    },
  );

  assert.equal(result.ok, true);
  assert.equal(result.before.energy, 18);
  assert.equal(result.after.energy, 20);
  assert.equal(result.delta.energy, 2);
});

test("resource calculation enforces energy cost using normalized energy", () => {
  const result = calculateCharacterResourceResult(
    {
      hp: 24,
      energy: 28,
      maxEnergy: 20,
      gold: 0,
      xp: 0,
      level: 1,
      renown: 0,
      heat: 0,
    },
    {
      energyCost: 21,
    },
  );

  assert.equal(result.ok, false);
  assert.equal(result.reason, "NOT_ENOUGH_ENERGY");
  assert.equal(result.currentEnergy, 20);
});
