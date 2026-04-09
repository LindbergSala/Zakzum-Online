import assert from "node:assert/strict";
import test from "node:test";

import {
  applyActivityDeltaStatBonuses,
  getContractStandingProgress,
  getCharacterActivityStaminaCost,
  getRegionalStandingProgress,
  getStatPointAllocationPreview,
} from "../src/lib/character-stat-rules.js";
import {
  buildConsumableDelta,
  getConsumableRollBonus,
} from "../src/app/api/game/inventory/route-helpers.js";
import {
  getItemGoldCost,
  getItemSellValue,
} from "../src/lib/items/helpers.js";

test("strength reduces stamina cost for heavy actions", () => {
  assert.equal(
    getCharacterActivityStaminaCost(
      { characterClass: "FIGHTER", strength: 12 },
      "adventure",
      5,
    ),
    4,
  );

  assert.equal(
    getCharacterActivityStaminaCost(
      { characterClass: "FIGHTER", strength: 16 },
      "arena",
      5,
    ),
    3,
  );
});

test("story chapter starts cost 20 stamina before class adjustments", () => {
  assert.equal(
    getCharacterActivityStaminaCost(
      { characterClass: "FIGHTER", strength: 10 },
      "story",
      4,
      {
        storyStatus: { currentStreak: 0 },
      },
    ),
    20,
  );

  assert.equal(
    getCharacterActivityStaminaCost(
      { characterClass: "MONK", strength: 10 },
      "story",
      4,
      {
        storyStatus: { currentStreak: 0 },
      },
    ),
    19,
  );

  assert.equal(
    getCharacterActivityStaminaCost(
      { characterClass: "FIGHTER", strength: 10 },
      "story",
      4,
      {
        storyStatus: { currentStreak: 1 },
      },
    ),
    4,
  );
});

test("activity stat bonuses grant intelligence xp and charisma renown on success", () => {
  const result = applyActivityDeltaStatBonuses({
    character: {
      intelligence: 18,
      charisma: 16,
      dexterity: 10,
      constitution: 10,
    },
    activity: {
      roll: {
        primaryStat: "wisdom",
        secondaryStat: "dexterity",
      },
    },
    success: true,
    delta: {
      xp: 6,
      renown: 1,
      gold: 4,
    },
  });

  assert.equal(result.delta.xp, 9);
  assert.equal(result.delta.renown, 3);
  assert.equal(result.bonus.xp, 3);
  assert.equal(result.bonus.renown, 2);
});

test("constitution and dexterity reduce failed hp penalties", () => {
  const result = applyActivityDeltaStatBonuses({
    character: {
      intelligence: 10,
      charisma: 10,
      dexterity: 16,
      constitution: 16,
    },
    activity: {
      roll: {
        primaryStat: "strength",
        secondaryStat: "constitution",
      },
    },
    success: false,
    delta: {
      hp: -5,
      heat: 2,
    },
  });

  assert.equal(result.delta.hp, -3);
  assert.equal(result.bonus.hpProtection, 2);
});

test("intelligence improves restorative and preparation consumables", () => {
  const smartCharacter = { intelligence: 16 };

  assert.deepEqual(
    buildConsumableDelta({
      effects: {
        consumable: {
          hpRestore: 3,
          staminaRestore: 2,
        },
      },
    }, 2, smartCharacter),
    {
      hp: 8,
      stamina: 6,
      heat: 0,
    },
  );

  assert.equal(
    getConsumableRollBonus(
      {
        effects: {
          consumable: {
            activityRollModifier: 2,
          },
        },
      },
      2,
      smartCharacter,
    ),
    6,
  );
});

test("charisma improves buy and sell values", () => {
  const charmingCharacter = { charisma: 20 };

  assert.equal(getItemGoldCost("iron-sword", charmingCharacter), 18);
  assert.deepEqual(getItemSellValue("iron-sword", charmingCharacter), {
    gold: 13,
    renown: 0,
  });
});

test("charisma also improves contract and regional standing progress", () => {
  const character = { charisma: 16, renown: 40 };

  assert.deepEqual(getContractStandingProgress(character), {
    currentRank: "Trusted Agent",
    nextRank: "Crown Broker",
    remaining: 23,
    progressPercent: 23,
    effectiveStanding: 49,
    charismaStandingBonus: 9,
  });

  assert.deepEqual(getRegionalStandingProgress(character), {
    currentRank: "Recognized",
    nextRank: "Border Voice",
    remaining: 1,
    progressPercent: 96,
    regionName: "Heartlands",
    effectiveStanding: 49,
    charismaStandingBonus: 9,
  });
});

test("stat point preview explains impact only when allocation is available", () => {
  const strengthPreview = getStatPointAllocationPreview("strength", {
    strength: 11,
  });
  const charismaPreview = getStatPointAllocationPreview("charisma", {
    charisma: 15,
  });

  assert.match(strengthPreview.current, /Carry limit 40/);
  assert.match(strengthPreview.next, /hits STR 12/);
  assert.match(charismaPreview.current, /Contract standing \+6/);
  assert.match(charismaPreview.next, /renown \+2/);
});