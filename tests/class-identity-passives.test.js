import assert from "node:assert/strict";
import test from "node:test";

import {
  applyClassPassiveDelta,
  getClassPassiveActivityEnergyCost,
  getClassPassiveEnergyRefreshBonus,
  getClassPassiveRollModifier,
} from "../src/lib/class-identity.js";

test("fighter and ranger roll modifiers are activity-specific", () => {
  assert.equal(getClassPassiveRollModifier("FIGHTER", "arena"), 1);
  assert.equal(getClassPassiveRollModifier("FIGHTER", "adventure"), 1);
  assert.equal(getClassPassiveRollModifier("FIGHTER", "adventure-2"), 1);
  assert.equal(getClassPassiveRollModifier("FIGHTER", "quest"), 0);

  assert.equal(getClassPassiveRollModifier("RANGER", "quest"), 1);
  assert.equal(getClassPassiveRollModifier("RANGER", "quest-4"), 1);
  assert.equal(getClassPassiveRollModifier("RANGER", "adventure"), 1);
  assert.equal(getClassPassiveRollModifier("RANGER", "arena"), 0);
});

test("monk reduces activity energy cost by 1 with minimum 1", () => {
  assert.equal(getClassPassiveActivityEnergyCost("MONK", 5), 4);
  assert.equal(getClassPassiveActivityEnergyCost("MONK", 1), 1);
  assert.equal(getClassPassiveActivityEnergyCost("ROGUE", 5), 5);
});

test("paladin gains renown only on successful arena activity", () => {
  const arenaSuccess = applyClassPassiveDelta({
    characterClass: "PALADIN",
    success: true,
    activityId: "arena",
    delta: { renown: 2 },
  });

  const questSuccess = applyClassPassiveDelta({
    characterClass: "PALADIN",
    success: true,
    activityId: "quest",
    delta: { renown: 2 },
  });

  assert.equal(arenaSuccess.delta.renown, 3);
  assert.deepEqual(arenaSuccess.deltaBonus, { renown: 1 });
  assert.equal(questSuccess.delta.renown, 2);
  assert.deepEqual(questSuccess.deltaBonus, {});
});

test("warlock success adds +3 to dominant reward stat", () => {
  const goldDominant = applyClassPassiveDelta({
    characterClass: "WARLOCK",
    success: true,
    activityId: "quest",
    delta: { gold: 8, xp: 5 },
  });
  const xpDominant = applyClassPassiveDelta({
    characterClass: "WARLOCK",
    success: true,
    activityId: "arena",
    delta: { gold: 4, xp: 14 },
  });

  assert.equal(goldDominant.delta.gold, 11);
  assert.equal(goldDominant.delta.xp, 5);
  assert.deepEqual(goldDominant.deltaBonus, { gold: 3 });

  assert.equal(xpDominant.delta.gold, 4);
  assert.equal(xpDominant.delta.xp, 17);
  assert.deepEqual(xpDominant.deltaBonus, { xp: 3 });
});

test("warlock failure applies an extra penalty", () => {
  const withHpPenalty = applyClassPassiveDelta({
    characterClass: "WARLOCK",
    success: false,
    activityId: "arena",
    delta: { hp: -5, gold: -2, heat: 1 },
  });

  assert.equal(withHpPenalty.delta.hp, -6);
  assert.deepEqual(withHpPenalty.deltaBonus, { hp: -1 });
});

test("druid energy refresh bonus is +1", () => {
  assert.equal(getClassPassiveEnergyRefreshBonus("DRUID"), 1);
  assert.equal(getClassPassiveEnergyRefreshBonus("WIZARD"), 0);
});
