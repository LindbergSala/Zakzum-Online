import assert from "node:assert/strict";
import test from "node:test";

import {
  XP_LEVEL_STEP,
  getLevelForXp,
  getLevelProgressMeta,
  getNextLevelXpTarget,
  getXpThresholdForLevel,
} from "../src/lib/level-progression.js";

test("level progression uses the tuned XP step", () => {
  assert.equal(XP_LEVEL_STEP, 80);
  assert.equal(getXpThresholdForLevel(2), 80);
  assert.equal(getXpThresholdForLevel(3), 240);
  assert.equal(getXpThresholdForLevel(4), 480);
});

test("xp thresholds map cleanly to resulting levels", () => {
  assert.equal(getLevelForXp(0), 1);
  assert.equal(getLevelForXp(79), 1);
  assert.equal(getLevelForXp(80), 2);
  assert.equal(getLevelForXp(239), 2);
  assert.equal(getLevelForXp(240), 3);
});

test("level progress meta reports the next tuned milestone", () => {
  assert.equal(getNextLevelXpTarget(1), 80);

  const progress = getLevelProgressMeta(2, 150);

  assert.equal(progress.level, 2);
  assert.equal(progress.xp, 150);
  assert.equal(progress.nextLevelXpTarget, 240);
  assert.equal(progress.xpToNextLevel, 90);
});