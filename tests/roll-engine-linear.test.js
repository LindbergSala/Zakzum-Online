import assert from "node:assert/strict";
import test from "node:test";

import { resolveActivityRoll, getStatModifier } from "../src/lib/roll-engine.js";
import { ACTIVITY_DEFINITION_MAP } from "../src/lib/core-loop-data.js";

test("linear stat modifier gives immediate +1 per +1 effective stat", () => {
  assert.equal(getStatModifier(1), 0);
  assert.equal(getStatModifier(2), 1);
  assert.equal(getStatModifier(3), 2);
  assert.equal(getStatModifier(10), 9);
});

test("roll bonus uses effective stat contributions and level contribution", () => {
  const quest = ACTIVITY_DEFINITION_MAP["quest-1"];
  const result = resolveActivityRoll(
    {
      wisdom: 5,
      dexterity: 4,
    },
    quest,
    {
      level: 3,
      passiveRollModifier: 1,
      random: () => 0,
    },
  );

  assert.equal(result.calculations.primaryContribution, 10);
  assert.equal(result.calculations.secondaryContribution, 4);
  assert.equal(result.calculations.levelContribution, 2);
  assert.equal(result.calculations.passiveRollModifier, 1);
  assert.equal(result.totalRollBonus, 17);
  assert.equal(result.statModifier, 17);
  assert.equal(result.roll, 1);
  assert.equal(result.rollTotal, 18);
});

test("effective stats include item bonuses before modifier math", () => {
  const arena = ACTIVITY_DEFINITION_MAP.arena;
  const baseResult = resolveActivityRoll(
    {
      strength: 6,
      dexterity: 3,
    },
    arena,
    {
      level: 1,
      random: () => 0.5,
    },
  );

  const withItemBonusResult = resolveActivityRoll(
    {
      strength: 8,
      dexterity: 4,
    },
    arena,
    {
      level: 1,
      random: () => 0.5,
    },
  );

  assert.equal(
    withItemBonusResult.totalRollBonus - baseResult.totalRollBonus,
    5,
  );
});

test("quest baseline chance is tuned around early game balance", () => {
  const quest = ACTIVITY_DEFINITION_MAP["quest-1"];
  const result = resolveActivityRoll(
    {
      wisdom: 1,
      dexterity: 1,
    },
    quest,
    {
      level: 1,
      random: () => 0,
    },
  );

  assert.equal(result.successTarget, 11);
  assert.equal(result.chancePercent, 65);
});

test("quest uses its own level scaling for target difficulty", () => {
  const quest = ACTIVITY_DEFINITION_MAP["quest-3"];
  const result = resolveActivityRoll(
    {
      wisdom: 1,
      dexterity: 1,
    },
    quest,
    {
      level: 3,
      random: () => 0,
    },
  );

  assert.equal(result.calculations.activityLevelScaling, 1);
  assert.equal(result.difficultyLevelScaling, 2);
  assert.equal(result.successTarget, 15);
});

test("adventure uses its own scaling and higher baseline risk", () => {
  const adventure = ACTIVITY_DEFINITION_MAP["adventure-1"];
  const result = resolveActivityRoll(
    {
      strength: 5,
      constitution: 5,
    },
    adventure,
    {
      level: 4,
      random: () => 0,
    },
  );

  assert.equal(result.calculations.activityLevelScaling, 2);
  assert.equal(result.baseSuccessTarget, 17);
  assert.equal(result.difficultyLevelScaling, 6);
  assert.equal(result.successTarget, 23);
});

test("adventure 1 baseline difficulty starts above quest 5", () => {
  const questFive = ACTIVITY_DEFINITION_MAP["quest-5"];
  const adventureOne = ACTIVITY_DEFINITION_MAP["adventure-1"];

  assert.ok(adventureOne.roll.difficulty > questFive.roll.difficulty);
  assert.ok(adventureOne.energyCost > questFive.energyCost);
  assert.ok(adventureOne.failPenalty.hp < questFive.failPenalty.hp);
  assert.ok(adventureOne.successReward.gold > questFive.successReward.gold);
});
