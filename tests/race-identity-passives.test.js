import assert from "node:assert/strict";
import test from "node:test";

import {
  applyHalfOrcRelentless,
  applyRacePassiveDelta,
  getRacePassiveRollModifier,
} from "../src/lib/race-identity.js";

test("dragonborn and elf roll modifiers are activity-specific", () => {
  assert.equal(getRacePassiveRollModifier("DRAGONBORN", "arena"), 1);
  assert.equal(getRacePassiveRollModifier("DRAGONBORN", "quest"), 0);
  assert.equal(getRacePassiveRollModifier("ELF", "quest"), 1);
  assert.equal(getRacePassiveRollModifier("ELF", "quest-2"), 1);
  assert.equal(getRacePassiveRollModifier("ELF", "adventure"), 0);
});

test("human and half-elf gain mixed success rewards", () => {
  const humanSuccess = applyRacePassiveDelta({
    characterRace: "HUMAN",
    success: true,
    activityId: "quest",
    delta: { gold: 8, xp: 6 },
  });
  const halfElfSuccess = applyRacePassiveDelta({
    characterRace: "HALF_ELF",
    success: true,
    activityId: "quest",
    delta: { gold: 8, xp: 6 },
  });

  assert.equal(humanSuccess.delta.gold, 9);
  assert.equal(humanSuccess.delta.xp, 7);
  assert.deepEqual(humanSuccess.deltaBonus, { gold: 1, xp: 1 });

  assert.equal(halfElfSuccess.delta.gold, 9);
  assert.equal(halfElfSuccess.delta.xp, 7);
  assert.deepEqual(halfElfSuccess.deltaBonus, { gold: 1, xp: 1 });
});

test("dwarf and halfling failure passives apply correctly", () => {
  const dwarfFail = applyRacePassiveDelta({
    characterRace: "DWARF",
    success: false,
    activityId: "arena",
    delta: { hp: -5, stamina: 0 },
  });
  const halflingFail = applyRacePassiveDelta({
    characterRace: "HALFLING",
    success: false,
    activityId: "arena",
    delta: { hp: -5, stamina: 0 },
  });

  assert.equal(dwarfFail.delta.hp, -3);
  assert.deepEqual(dwarfFail.deltaBonus, { hp: 2 });
  assert.equal(halflingFail.delta.stamina, 1);
  assert.deepEqual(halflingFail.deltaBonus, { stamina: 1 });
});

test("tiefling gold bonus only applies on adventure and arena success", () => {
  const arenaSuccess = applyRacePassiveDelta({
    characterRace: "TIEFLING",
    success: true,
    activityId: "arena",
    delta: { gold: 4 },
  });
  const questSuccess = applyRacePassiveDelta({
    characterRace: "TIEFLING",
    success: true,
    activityId: "quest",
    delta: { gold: 8 },
  });

  assert.equal(arenaSuccess.delta.gold, 6);
  assert.deepEqual(arenaSuccess.deltaBonus, { gold: 2 });
  assert.equal(questSuccess.delta.gold, 8);
  assert.deepEqual(questSuccess.deltaBonus, {});

  const adventureTierSuccess = applyRacePassiveDelta({
    characterRace: "TIEFLING",
    success: true,
    activityId: "adventure-1",
    delta: { gold: 6 },
  });
  assert.equal(adventureTierSuccess.delta.gold, 8);
  assert.deepEqual(adventureTierSuccess.deltaBonus, { gold: 2 });
});

test("half-orc relentless can trigger once to survive at 1 HP", () => {
  const triggered = applyHalfOrcRelentless({
    characterRace: "HALF_ORC",
    beforeResources: { hp: 3 },
    afterResources: { hp: 0 },
    delta: { hp: -3 },
    alreadyUsedThisSession: false,
  });

  const alreadyUsed = applyHalfOrcRelentless({
    characterRace: "HALF_ORC",
    beforeResources: { hp: 3 },
    afterResources: { hp: 0 },
    delta: { hp: -3 },
    alreadyUsedThisSession: true,
  });

  assert.equal(triggered.afterResources.hp, 1);
  assert.equal(triggered.delta.hp, -2);
  assert.equal(triggered.triggered, true);
  assert.deepEqual(triggered.deltaBonus, { hp: 1 });

  assert.equal(alreadyUsed.afterResources.hp, 0);
  assert.equal(alreadyUsed.delta.hp, -3);
  assert.equal(alreadyUsed.triggered, false);
  assert.deepEqual(alreadyUsed.deltaBonus, {});
});
