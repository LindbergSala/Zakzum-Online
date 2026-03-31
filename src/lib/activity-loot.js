import { getActivityGroup } from "./core-loop-data";
import {
  getItemCategory,
  getItemLootTierRange,
  getItemRarity,
  getLootableItemsForSource,
} from "./items/helpers";
import { ITEM_LOOT_SOURCE } from "./items/constants";

const DEFAULT_ACTIVITY_LOOT_PROFILE = {
  source: ITEM_LOOT_SOURCE.QUEST,
  dropChance: 0.3,
  successOnly: true,
  categoryWeights: {},
  rarityWeights: {},
};

function toFiniteNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeTier(activityTier) {
  return Math.max(1, Math.floor(toFiniteNumber(activityTier, 1)));
}

function resolveRandomRoll(random) {
  const randomFn = typeof random === "function" ? random : Math.random;
  const rawRoll = toFiniteNumber(randomFn(), Math.random());
  return clamp(rawRoll, 0, 0.999999);
}

function getMapWeight(map, key, fallback = 1) {
  const resolvedMap = map && typeof map === "object" ? map : {};
  const value = toFiniteNumber(resolvedMap[key], fallback);
  return value > 0 ? value : 0;
}

function isTierInRange(activityTier, tierRange) {
  const tier = normalizeTier(activityTier);
  const minimumTier = Math.max(1, Math.floor(toFiniteNumber(tierRange?.min, 1)));
  const maximumTier = Math.max(minimumTier, Math.floor(toFiniteNumber(tierRange?.max, 5)));
  return tier >= minimumTier && tier <= maximumTier;
}

function buildWeightedLootPool(candidates, { categoryWeights, rarityWeights }) {
  const weightedPool = candidates
    .map((item) => {
      const categoryWeight = getMapWeight(categoryWeights, getItemCategory(item), 1);
      const rarityWeight = getMapWeight(rarityWeights, getItemRarity(item), 1);
      const totalWeight = categoryWeight * rarityWeight;

      return {
        item,
        weight: totalWeight,
      };
    })
    .filter((entry) => entry.weight > 0);

  if (weightedPool.length > 0) {
    return weightedPool;
  }

  return candidates.map((item) => ({
    item,
    weight: 1,
  }));
}

function pickWeightedLootItem(weightedPool, random) {
  if (!Array.isArray(weightedPool) || weightedPool.length === 0) {
    return { item: null, pickRoll: null };
  }

  const totalWeight = weightedPool.reduce((sum, entry) => sum + entry.weight, 0);
  if (totalWeight <= 0) {
    return { item: null, pickRoll: null };
  }

  const pickRoll = resolveRandomRoll(random);
  let cursor = pickRoll * totalWeight;

  for (const entry of weightedPool) {
    cursor -= entry.weight;
    if (cursor <= 0) {
      return { item: entry.item, pickRoll };
    }
  }

  return {
    item: weightedPool[weightedPool.length - 1]?.item ?? null,
    pickRoll,
  };
}

export function getActivityLootProfile(activityGroupId) {
  const activityGroup = getActivityGroup(activityGroupId);
  if (!activityGroup) {
    return {
      ...DEFAULT_ACTIVITY_LOOT_PROFILE,
      source: activityGroupId || DEFAULT_ACTIVITY_LOOT_PROFILE.source,
    };
  }

  const lootProfile = activityGroup.lootProfile ?? {};
  return {
    ...DEFAULT_ACTIVITY_LOOT_PROFILE,
    ...lootProfile,
    dropChance: clamp(toFiniteNumber(lootProfile.dropChance, 0.3), 0, 1),
    successOnly:
      typeof lootProfile.successOnly === "boolean"
        ? lootProfile.successOnly
        : DEFAULT_ACTIVITY_LOOT_PROFILE.successOnly,
    categoryWeights:
      lootProfile.categoryWeights && typeof lootProfile.categoryWeights === "object"
        ? lootProfile.categoryWeights
        : {},
    rarityWeights:
      lootProfile.rarityWeights && typeof lootProfile.rarityWeights === "object"
        ? lootProfile.rarityWeights
        : {},
  };
}

export function getActivityLootCandidates({ activityGroupId, activityTier }) {
  const lootProfile = getActivityLootProfile(activityGroupId);
  const source = lootProfile.source;
  const tier = normalizeTier(activityTier);

  return getLootableItemsForSource(source).filter((item) =>
    isTierInRange(tier, getItemLootTierRange(item)),
  );
}

export function resolveActivityLootDrop({
  activityGroupId,
  activityTier,
  success,
  random,
}) {
  const lootProfile = getActivityLootProfile(activityGroupId);
  const tier = normalizeTier(activityTier);
  const dropChance = lootProfile.dropChance;

  if (lootProfile.successOnly && !success) {
    return {
      dropped: false,
      reason: "activity_failed",
      lootSource: lootProfile.source,
      activityTier: tier,
      dropChance,
      dropRoll: null,
      candidateCount: 0,
      item: null,
      pickRoll: null,
    };
  }

  const candidates = getActivityLootCandidates({
    activityGroupId,
    activityTier: tier,
  });

  if (candidates.length === 0) {
    return {
      dropped: false,
      reason: "no_candidates",
      lootSource: lootProfile.source,
      activityTier: tier,
      dropChance,
      dropRoll: null,
      candidateCount: 0,
      item: null,
      pickRoll: null,
    };
  }

  const dropRoll = resolveRandomRoll(random);
  if (dropRoll >= dropChance) {
    return {
      dropped: false,
      reason: "chance_miss",
      lootSource: lootProfile.source,
      activityTier: tier,
      dropChance,
      dropRoll,
      candidateCount: candidates.length,
      item: null,
      pickRoll: null,
    };
  }

  const weightedPool = buildWeightedLootPool(candidates, lootProfile);
  const { item, pickRoll } = pickWeightedLootItem(weightedPool, random);

  if (!item) {
    return {
      dropped: false,
      reason: "selection_failed",
      lootSource: lootProfile.source,
      activityTier: tier,
      dropChance,
      dropRoll,
      candidateCount: candidates.length,
      item: null,
      pickRoll,
    };
  }

  return {
    dropped: true,
    reason: "dropped",
    lootSource: lootProfile.source,
    activityTier: tier,
    dropChance,
    dropRoll,
    candidateCount: candidates.length,
    item,
    pickRoll,
  };
}
