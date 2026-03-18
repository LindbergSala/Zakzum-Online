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
  const quest = ACTIVITY_DEFINITION_MAP.quest;
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
  const quest = ACTIVITY_DEFINITION_MAP.quest;
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

  assert.equal(result.successTarget, 13);
  assert.equal(result.chancePercent, 55);
});

test("quest uses its own level scaling for target difficulty", () => {
  const quest = ACTIVITY_DEFINITION_MAP.quest;
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

test("adventure uses steeper level scaling to keep high risk profile", () => {
  const adventure = ACTIVITY_DEFINITION_MAP.adventure;
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

  assert.equal(result.calculations.activityLevelScaling, 3);
  assert.equal(result.baseSuccessTarget, 18);
  assert.equal(result.difficultyLevelScaling, 9);
  assert.equal(result.successTarget, 27);
});
