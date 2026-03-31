import {
  getItemGoldCost,
  getItemMaxStack,
  getItemRenownCost,
  getItemSellValue,
  isItemStackable,
} from "./items/helpers";
import { ITEM_CATALOG, ITEM_CATALOG_MAP } from "./items/catalog";
import { ITEM_CATEGORY, ITEM_LOOT_SOURCE, ITEM_RARITY } from "./items/constants";
import {
  HEARTLANDS_REGION_ID,
  HEARTLANDS_REGION_NAME,
  getHeartlandsLocationProfile,
} from "./heartlands-lore";

function createHeartlandsLocationRef(locationId) {
  const locationProfile = getHeartlandsLocationProfile(locationId);
  if (!locationProfile) {
    throw new Error(`Unknown Heartlands location id: ${locationId}`);
  }

  return {
    locationId: locationProfile.id,
    locationName: locationProfile.name,
    locationTitle: locationProfile.title,
    regionId: HEARTLANDS_REGION_ID,
    regionName: HEARTLANDS_REGION_NAME,
  };
}

const HEARTLANDS_LOCATIONS = {
  kingston: createHeartlandsLocationRef("kingston"),
  goldmere: createHeartlandsLocationRef("goldmere"),
  mournstead: createHeartlandsLocationRef("mournstead"),
  saintsHollow: createHeartlandsLocationRef("saints-hollow"),
  elfhome: createHeartlandsLocationRef("elfhome"),
  northwatch: createHeartlandsLocationRef("northwatch"),
  barrowfield: createHeartlandsLocationRef("barrowfield"),
  blackthornHold: createHeartlandsLocationRef("blackthorn-hold"),
};

const QUEST_ACTIVITY_STEPS = [
  {
    ...HEARTLANDS_LOCATIONS.kingston,
    id: "quest-1",
    tier: 1,
    name: `Quest I: ${HEARTLANDS_LOCATIONS.kingston.locationName} Courier`,
    riskProfile: "Low risk, city dispatch",
    pageIntro:
      `Track a missing messenger outside ${HEARTLANDS_LOCATIONS.kingston.locationName} and secure your first payout before panic spreads through the lower wards.`,
    energyCost: 2,
    roll: {
      difficulty: 11,
      levelScaling: 1,
      primaryStat: "wisdom",
      secondaryStat: "dexterity",
    },
    successReward: { gold: 5, xp: 4, renown: 1 },
    failPenalty: { hp: -1, gold: -2, heat: 1 },
  },
  {
    ...HEARTLANDS_LOCATIONS.goldmere,
    id: "quest-2",
    tier: 2,
    name: `Quest II: ${HEARTLANDS_LOCATIONS.goldmere.locationName} Ledger`,
    riskProfile: "Low risk, stable gains",
    pageIntro:
      `Settle a trade dispute in ${HEARTLANDS_LOCATIONS.goldmere.locationName} before guild enforcers turn a shipping ledger disagreement into open violence.`,
    energyCost: 3,
    roll: {
      difficulty: 12,
      levelScaling: 1,
      primaryStat: "wisdom",
      secondaryStat: "dexterity",
    },
    successReward: { gold: 6, xp: 5, renown: 1 },
    failPenalty: { hp: -2, gold: -2, heat: 1 },
  },
  {
    ...HEARTLANDS_LOCATIONS.mournstead,
    id: "quest-3",
    tier: 3,
    name: `Quest III: ${HEARTLANDS_LOCATIONS.mournstead.locationName} Caravan`,
    riskProfile: "Moderate risk, balanced reward",
    pageIntro:
      `Escort a caravan through ${HEARTLANDS_LOCATIONS.mournstead.locationName}, where every passing trader brings rumors and every delay draws bandits.`,
    energyCost: 3,
    roll: {
      difficulty: 13,
      levelScaling: 1,
      primaryStat: "wisdom",
      secondaryStat: "dexterity",
    },
    successReward: { gold: 8, xp: 6, renown: 1 },
    failPenalty: { hp: -2, gold: -3, heat: 1 },
  },
  {
    ...HEARTLANDS_LOCATIONS.saintsHollow,
    id: "quest-4",
    tier: 4,
    name: `Quest IV: Pilgrims of ${HEARTLANDS_LOCATIONS.saintsHollow.locationName}`,
    riskProfile: "Moderate risk, rising pressure",
    pageIntro:
      `Guard a pilgrim column heading to ${HEARTLANDS_LOCATIONS.saintsHollow.locationName} before raiders test the Order's routes at dusk.`,
    energyCost: 4,
    roll: {
      difficulty: 14,
      levelScaling: 1,
      primaryStat: "wisdom",
      secondaryStat: "dexterity",
    },
    successReward: { gold: 9, xp: 7, renown: 2 },
    failPenalty: { hp: -3, gold: -4, heat: 2 },
  },
  {
    ...HEARTLANDS_LOCATIONS.elfhome,
    id: "quest-5",
    tier: 5,
    name: `Quest V: ${HEARTLANDS_LOCATIONS.elfhome.locationName} Boundary Oath`,
    riskProfile: "High quest risk, strong early rewards",
    pageIntro:
      `Recover a stolen ward relic on the edge of ${HEARTLANDS_LOCATIONS.elfhome.locationName} before the forest paths close and diplomatic ties fracture.`,
    energyCost: 4,
    roll: {
      difficulty: 15,
      levelScaling: 1,
      primaryStat: "wisdom",
      secondaryStat: "dexterity",
    },
    successReward: { gold: 11, xp: 8, renown: 2 },
    failPenalty: { hp: -3, gold: -5, heat: 2 },
  },
];

const ADVENTURE_ACTIVITY_STEPS = [
  {
    ...HEARTLANDS_LOCATIONS.northwatch,
    id: "adventure-1",
    tier: 1,
    name: `Adventure I: ${HEARTLANDS_LOCATIONS.northwatch.locationName} Signal Fire`,
    riskProfile: "Higher risk than Quest V",
    pageIntro:
      `Push beyond ${HEARTLANDS_LOCATIONS.northwatch.locationName} and relight dead signal towers before unseen threats breach the frozen passes.`,
    energyCost: 5,
    roll: {
      difficulty: 17,
      levelScaling: 2,
      primaryStat: "strength",
      secondaryStat: "constitution",
    },
    successReward: { gold: 13, xp: 10, renown: 3 },
    failPenalty: { hp: -4, gold: -6, heat: 3 },
  },
  {
    ...HEARTLANDS_LOCATIONS.barrowfield,
    id: "adventure-2",
    tier: 2,
    name: `Adventure II: ${HEARTLANDS_LOCATIONS.barrowfield.locationName} Wake`,
    riskProfile: "High risk, high reward",
    pageIntro:
      `Enter ${HEARTLANDS_LOCATIONS.barrowfield.locationName} to break a grave-surge before the dead organize beneath the mounds.`,
    energyCost: 5,
    roll: {
      difficulty: 18,
      levelScaling: 2,
      primaryStat: "strength",
      secondaryStat: "constitution",
    },
    successReward: { gold: 15, xp: 12, renown: 3 },
    failPenalty: { hp: -5, gold: -7, heat: 3 },
  },
  {
    ...HEARTLANDS_LOCATIONS.blackthornHold,
    id: "adventure-3",
    tier: 3,
    name: `Adventure III: ${HEARTLANDS_LOCATIONS.blackthornHold.locationName} Decree`,
    riskProfile: "Severe risk, major gains",
    pageIntro:
      `Carry a sealed decree from ${HEARTLANDS_LOCATIONS.blackthornHold.locationName} through hostile ridges where failure can trigger regional reprisals.`,
    energyCost: 6,
    roll: {
      difficulty: 19,
      levelScaling: 2,
      primaryStat: "strength",
      secondaryStat: "constitution",
    },
    successReward: { gold: 17, xp: 14, renown: 3 },
    failPenalty: { hp: -6, gold: -8, heat: 4 },
  },
  {
    ...HEARTLANDS_LOCATIONS.kingston,
    id: "adventure-4",
    tier: 4,
    name: `Adventure IV: Siege of ${HEARTLANDS_LOCATIONS.kingston.locationName}`,
    riskProfile: "Extreme risk, elite progression",
    pageIntro:
      `Hold the walls of ${HEARTLANDS_LOCATIONS.kingston.locationName} during a coordinated breach while commanders decide which district can still be saved.`,
    energyCost: 6,
    roll: {
      difficulty: 20,
      levelScaling: 2,
      primaryStat: "strength",
      secondaryStat: "constitution",
    },
    successReward: { gold: 19, xp: 16, renown: 4 },
    failPenalty: { hp: -7, gold: -9, heat: 4 },
  },
  {
    ...HEARTLANDS_LOCATIONS.kingston,
    id: "adventure-5",
    tier: 5,
    name: "Adventure V: Heartlands Reckoning",
    riskProfile: "Maximum risk, top-tier payout",
    pageIntro:
      `Follow converging leads from ${HEARTLANDS_LOCATIONS.kingston.locationName}, ${HEARTLANDS_LOCATIONS.northwatch.locationName}, and ${HEARTLANDS_LOCATIONS.barrowfield.locationName} to stop a realm-wide collapse before it reaches the throne.`,
    energyCost: 7,
    roll: {
      difficulty: 21,
      levelScaling: 2,
      primaryStat: "strength",
      secondaryStat: "constitution",
    },
    successReward: { gold: 22, xp: 18, renown: 5 },
    failPenalty: { hp: -8, gold: -11, heat: 5 },
  },
];

const ARENA_ACTIVITY_STEPS = [
  {
    id: "arena",
    tier: 1,
    name: "Arena Clash",
    riskProfile: "Duel focus, Renown and XP",
    pageIntro:
      "Face NPC opponents in the arena. Victory mainly grants renown and experience.",
    energyCost: 4,
    roll: {
      difficulty: 16,
      levelScaling: 2,
      primaryStat: "strength",
      secondaryStat: "dexterity",
    },
    successReward: { gold: 4, xp: 14, renown: 4 },
    failPenalty: { hp: -6, gold: -4, heat: 2 },
  },
];

export const ACTIVITY_GROUPS = [
  {
    id: "quest",
    regionId: HEARTLANDS_REGION_ID,
    regionName: HEARTLANDS_REGION_NAME,
    name: "Heartlands Quest Board",
    tagline: "Lower risk contracts across The Heartlands",
    summary:
      "Reliable contracts from Kingston, Goldmere, and nearby roads to build steady momentum.",
    overviewBadges: [
      "Low Risk",
      "Tier I-V",
      "2-4 Energy",
    ],
    lootProfile: {
      source: ITEM_LOOT_SOURCE.QUEST,
      dropChance: 0.32,
      successOnly: true,
      categoryWeights: {
        [ITEM_CATEGORY.TRASH]: 4,
        [ITEM_CATEGORY.MATERIAL]: 3,
        [ITEM_CATEGORY.CONSUMABLE]: 2,
        [ITEM_CATEGORY.EQUIPMENT]: 1,
        [ITEM_CATEGORY.TROPHY]: 0,
      },
      rarityWeights: {
        [ITEM_RARITY.TRASH]: 4,
        [ITEM_RARITY.COMMON]: 4,
        [ITEM_RARITY.RARE]: 1,
        [ITEM_RARITY.EPIC]: 0.2,
      },
    },
    description:
      "Steady, lower-risk jobs rooted in The Heartlands. Learn the core loop while working named routes and settlements from the atlas.",
    activities: QUEST_ACTIVITY_STEPS,
  },
  {
    id: "adventure",
    regionId: HEARTLANDS_REGION_ID,
    regionName: HEARTLANDS_REGION_NAME,
    name: "Heartlands Adventure Board",
    tagline: "Hard contracts beyond city walls",
    summary:
      "Severe deployments from Northwatch to Barrowfield where better rewards always mean higher danger.",
    overviewBadges: [
      "High Risk",
      "Tier I-V",
      "5-7 Energy",
    ],
    lootProfile: {
      source: ITEM_LOOT_SOURCE.ADVENTURE,
      dropChance: 0.5,
      successOnly: true,
      categoryWeights: {
        [ITEM_CATEGORY.TRASH]: 1,
        [ITEM_CATEGORY.MATERIAL]: 2,
        [ITEM_CATEGORY.CONSUMABLE]: 2,
        [ITEM_CATEGORY.EQUIPMENT]: 4,
        [ITEM_CATEGORY.TROPHY]: 0.6,
      },
      rarityWeights: {
        [ITEM_RARITY.TRASH]: 1,
        [ITEM_RARITY.COMMON]: 3,
        [ITEM_RARITY.RARE]: 3,
        [ITEM_RARITY.EPIC]: 1.4,
      },
    },
    description:
      "High-risk Heartlands contracts tied to major locations and political flashpoints. Adventure I starts above Quest V in both danger and payout profile.",
    activities: ADVENTURE_ACTIVITY_STEPS,
  },
  {
    id: "arena",
    name: "Arena Board",
    tagline: "Duel track with renown focus",
    summary:
      "Public duels and prestige fights built for renown, pressure, and direct combat.",
    overviewBadges: [
      "Renown Focus",
      "Single Track",
      "4 Energy",
    ],
    lootProfile: {
      source: ITEM_LOOT_SOURCE.ARENA,
      dropChance: 0.44,
      successOnly: true,
      categoryWeights: {
        [ITEM_CATEGORY.TRASH]: 0.4,
        [ITEM_CATEGORY.MATERIAL]: 1,
        [ITEM_CATEGORY.CONSUMABLE]: 1,
        [ITEM_CATEGORY.EQUIPMENT]: 3,
        [ITEM_CATEGORY.TROPHY]: 4,
      },
      rarityWeights: {
        [ITEM_RARITY.TRASH]: 0.4,
        [ITEM_RARITY.COMMON]: 2,
        [ITEM_RARITY.RARE]: 3,
        [ITEM_RARITY.EPIC]: 2.5,
      },
    },
    description:
      "Direct combat with renown-heavy rewards. Designed for aggressive builds and prestige progression.",
    activities: ARENA_ACTIVITY_STEPS,
  },
];

export const ACTIVITY_DEFINITIONS = ACTIVITY_GROUPS.flatMap((group) =>
  group.activities.map((activity) => ({
    ...activity,
    groupId: group.id,
    groupName: group.name,
  })),
);

export const ACTIVITY_GROUP_MAP = Object.fromEntries(
  ACTIVITY_GROUPS.map((group) => [group.id, group]),
);

export const ACTIVITY_DEFINITION_MAP = Object.fromEntries(
  ACTIVITY_DEFINITIONS.map((activity) => [activity.id, activity]),
);

export function isActivityGroupId(groupId) {
  return typeof groupId === "string" && Boolean(ACTIVITY_GROUP_MAP[groupId]);
}

export function getActivitiesForGroup(groupId) {
  if (!isActivityGroupId(groupId)) {
    return [];
  }

  return ACTIVITY_DEFINITIONS
    .filter((activity) => activity.groupId === groupId)
    .sort((left, right) => (left.tier ?? 0) - (right.tier ?? 0));
}

export function resolveActivityGroupId(activityOrId) {
  if (!activityOrId) {
    return null;
  }

  if (typeof activityOrId === "object") {
    return (
      activityOrId.groupId ??
      (typeof activityOrId.id === "string"
        ? ACTIVITY_DEFINITION_MAP[activityOrId.id]?.groupId ?? null
        : null)
    );
  }

  if (isActivityGroupId(activityOrId)) {
    return activityOrId;
  }

  return ACTIVITY_DEFINITION_MAP[activityOrId]?.groupId ?? null;
}

export function getActivityGroup(groupId) {
  if (!isActivityGroupId(groupId)) {
    return null;
  }

  return ACTIVITY_GROUP_MAP[groupId];
}

export function getActivityLocationContext(activityOrId) {
  const activity =
    typeof activityOrId === "object"
      ? activityOrId
      : typeof activityOrId === "string"
        ? ACTIVITY_DEFINITION_MAP[activityOrId]
        : null;

  if (!activity || typeof activity.locationId !== "string") {
    return null;
  }

  return {
    locationId: activity.locationId,
    locationName: activity.locationName ?? "",
    locationTitle: activity.locationTitle ?? "",
    regionId: activity.regionId ?? "",
    regionName: activity.regionName ?? "",
  };
}

export function getActivitiesForLocation(locationId, groupId = null) {
  if (typeof locationId !== "string" || locationId.trim().length === 0) {
    return [];
  }

  return ACTIVITY_DEFINITIONS.filter((activity) => {
    if (activity.locationId !== locationId) {
      return false;
    }

    if (groupId && activity.groupId !== groupId) {
      return false;
    }

    return true;
  }).sort((left, right) => (left.tier ?? 0) - (right.tier ?? 0));
}

// Backward-compatible shop exports.
export const SHOP_ITEM_DEFINITIONS = ITEM_CATALOG;
export const SHOP_ITEM_DEFINITION_MAP = ITEM_CATALOG_MAP;
export const getShopItemGoldCost = getItemGoldCost;
export const getShopItemRenownCost = getItemRenownCost;
export const getShopItemSellValue = getItemSellValue;
export const isShopItemStackable = isItemStackable;
export const getShopItemMaxStack = getItemMaxStack;
