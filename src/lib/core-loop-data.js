import {
  getItemGoldCost,
  getItemMaxStack,
  getItemRenownCost,
  getItemSellValue,
  isItemStackable,
} from "./items/helpers";
import { ITEM_CATALOG, ITEM_CATALOG_MAP } from "./items/catalog";
import { ITEM_CATEGORY, ITEM_LOOT_SOURCE, ITEM_RARITY } from "./items/constants";

const QUEST_ACTIVITY_STEPS = [
  {
    id: "quest-1",
    tier: 1,
    name: "Quest I: Missing Courier",
    riskProfile: "Low risk, early progression",
    pageIntro:
      "Track a missing messenger near the city gates and secure your first field payout.",
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
    id: "quest-2",
    tier: 2,
    name: "Quest II: Dockside Debt",
    riskProfile: "Low risk, stable gains",
    pageIntro:
      "Settle a tense dispute by the docks before local smugglers turn it into violence.",
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
    id: "quest-3",
    tier: 3,
    name: "Quest III: Old Watchtower",
    riskProfile: "Moderate risk, balanced reward",
    pageIntro:
      "Clear a ruined watchtower and recover supplies marked for the city quartermaster.",
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
    id: "quest-4",
    tier: 4,
    name: "Quest IV: Marsh Escort",
    riskProfile: "Moderate risk, rising pressure",
    pageIntro:
      "Escort a supply wagon through marsh trails where ambushes are common after dusk.",
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
    id: "quest-5",
    tier: 5,
    name: "Quest V: Relic Recovery",
    riskProfile: "High quest risk, strong early rewards",
    pageIntro:
      "Recover a stolen relic from a guarded ruin and return it before rival crews arrive.",
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
    id: "adventure-1",
    tier: 1,
    name: "Adventure I: Border Skirmish",
    riskProfile: "Higher risk than Quest V",
    pageIntro:
      "Push beyond city patrol lines and survive a live skirmish where retreats are costly.",
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
    id: "adventure-2",
    tier: 2,
    name: "Adventure II: Ravine Hunt",
    riskProfile: "High risk, high reward",
    pageIntro:
      "Hunt dangerous beasts in a fractured ravine where one mistake can end the contract.",
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
    id: "adventure-3",
    tier: 3,
    name: "Adventure III: Bandit Outpost",
    riskProfile: "Severe risk, major gains",
    pageIntro:
      "Break a fortified outpost and secure contraband before reinforcements regroup.",
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
    id: "adventure-4",
    tier: 4,
    name: "Adventure IV: Siege Break",
    riskProfile: "Extreme risk, elite progression",
    pageIntro:
      "Join a breach assault and hold the line under pressure while supply morale collapses.",
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
    id: "adventure-5",
    tier: 5,
    name: "Adventure V: Warlord Contract",
    riskProfile: "Maximum risk, top-tier payout",
    pageIntro:
      "Take a warlord bounty deep in hostile territory where retreat can trigger a collapse.",
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
    name: "Quest Board",
    tagline: "Lower risk progression track",
    summary: "Reliable jobs for early growth and safer momentum.",
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
      "Steady, lower-risk jobs that teach the core loop and build momentum before high danger content.",
    activities: QUEST_ACTIVITY_STEPS,
  },
  {
    id: "adventure",
    name: "Adventure Board",
    tagline: "Harder next-tier progression",
    summary:
      "Hard contracts beyond the walls, where stronger rewards come with real danger.",
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
      "High-risk contracts outside the city walls. Adventure I starts above Quest V in both danger and payout profile.",
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

// Backward-compatible shop exports.
export const SHOP_ITEM_DEFINITIONS = ITEM_CATALOG;
export const SHOP_ITEM_DEFINITION_MAP = ITEM_CATALOG_MAP;
export const getShopItemGoldCost = getItemGoldCost;
export const getShopItemRenownCost = getItemRenownCost;
export const getShopItemSellValue = getItemSellValue;
export const isShopItemStackable = isItemStackable;
export const getShopItemMaxStack = getItemMaxStack;
