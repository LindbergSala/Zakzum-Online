import assert from "node:assert/strict";
import test from "node:test";

import { ITEM_LOOT_SOURCE } from "../src/lib/items/constants.js";
import {
  getActivityLootCandidates,
  getActivityLootProfile,
  resolveActivityLootDrop,
} from "../src/lib/activity-loot.js";
import { getItemLootSources } from "../src/lib/items/helpers.js";

function sequenceRandom(values) {
  let index = 0;
  return () => {
    const value = values[index] ?? values[values.length - 1] ?? 0;
    index += 1;
    return value;
  };
}

test("loot profile maps activity groups to explicit sources and drop chances", () => {
  const questProfile = getActivityLootProfile("quest");
  const adventureProfile = getActivityLootProfile("adventure");
  const arenaProfile = getActivityLootProfile("arena");

  assert.equal(questProfile.source, ITEM_LOOT_SOURCE.QUEST);
  assert.equal(adventureProfile.source, ITEM_LOOT_SOURCE.ADVENTURE);
  assert.equal(arenaProfile.source, ITEM_LOOT_SOURCE.ARENA);
  assert.equal(questProfile.dropChance, 0.36);
  assert.equal(adventureProfile.dropChance, 0.42);
  assert.equal(arenaProfile.dropChance, 0.36);
  assert.ok(adventureProfile.dropChance > questProfile.dropChance);
});

test("loot candidates are filtered by source and tier range", () => {
  const questTierOneCandidates = getActivityLootCandidates({
    activityGroupId: "quest",
    activityTier: 1,
  });

  assert.ok(questTierOneCandidates.length > 0);
  assert.ok(
    questTierOneCandidates.every((item) =>
      getItemLootSources(item).includes(ITEM_LOOT_SOURCE.QUEST),
    ),
  );

  const arenaTierOneCandidates = getActivityLootCandidates({
    activityGroupId: "arena",
    activityTier: 1,
  });
  assert.ok(
    arenaTierOneCandidates.every((item) => {
      const min = Number(item.lootTierRange?.min ?? 1);
      const max = Number(item.lootTierRange?.max ?? 5);
      return min <= 1 && max >= 1;
    }),
  );
});

test("loot is blocked on failed activities when profile requires success", () => {
  const resolution = resolveActivityLootDrop({
    activityGroupId: "quest",
    activityTier: 1,
    success: false,
    random: () => 0,
  });

  assert.equal(resolution.dropped, false);
  assert.equal(resolution.reason, "activity_failed");
  assert.equal(resolution.item, null);
});

test("loot chance miss returns deterministic no-drop payload", () => {
  const resolution = resolveActivityLootDrop({
    activityGroupId: "quest",
    activityTier: 1,
    success: true,
    random: () => 0.99,
  });

  assert.equal(resolution.dropped, false);
  assert.equal(resolution.reason, "chance_miss");
  assert.equal(resolution.item, null);
  assert.ok(typeof resolution.dropChance === "number");
  assert.ok(resolution.candidateCount > 0);
});

test("successful roll can resolve a valid dropped item", () => {
  const resolution = resolveActivityLootDrop({
    activityGroupId: "adventure",
    activityTier: 3,
    success: true,
    random: sequenceRandom([0, 0.15]),
  });

  assert.equal(resolution.dropped, true);
  assert.equal(resolution.reason, "dropped");
  assert.ok(resolution.item);
  assert.ok(
    getItemLootSources(resolution.item).includes(ITEM_LOOT_SOURCE.ADVENTURE),
  );
});
