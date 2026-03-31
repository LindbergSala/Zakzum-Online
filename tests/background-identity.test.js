import assert from "node:assert/strict";
import test from "node:test";

import {
  applyBackgroundStartBonuses,
  formatBackgroundStartBonusLabel,
  getBackgroundLoreTemplate,
  getBackgroundStartBonusStats,
} from "../src/lib/background-identity.js";
import { CHARACTER_BACKGROUND_VALUES } from "../src/lib/character-data.js";

test("every background grants exactly +2 total start stats", () => {
  for (const background of CHARACTER_BACKGROUND_VALUES) {
    const stats = getBackgroundStartBonusStats(background);
    const totalBonus = Object.values(stats).reduce(
      (sum, value) => sum + Number(value || 0),
      0,
    );
    assert.equal(totalBonus, 2, `${background} should provide +2 total`);
  }
});

test("applying background bonuses increments only configured stats", () => {
  const baseStats = {
    strength: 1,
    dexterity: 1,
    constitution: 1,
    intelligence: 1,
    wisdom: 1,
    charisma: 1,
  };

  const afterAcolyte = applyBackgroundStartBonuses(baseStats, "ACOLYTE");
  assert.equal(afterAcolyte.wisdom, 2);
  assert.equal(afterAcolyte.charisma, 2);
  assert.equal(afterAcolyte.strength, 1);
  assert.equal(afterAcolyte.dexterity, 1);
  assert.equal(afterAcolyte.constitution, 1);
  assert.equal(afterAcolyte.intelligence, 1);
});

test("background bonus labels are readable for UI summaries", () => {
  assert.equal(formatBackgroundStartBonusLabel("SAGE"), "INT +1, WIS +1");
});

test("background lore template resolves for each background", () => {
  for (const background of CHARACTER_BACKGROUND_VALUES) {
    const lore = getBackgroundLoreTemplate(background);
    assert.equal(typeof lore, "string");
    assert.ok(lore.length > 50);
  }
});
