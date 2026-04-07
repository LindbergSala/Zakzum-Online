import { ITEM_CATEGORY, ITEM_LOOT_SOURCE, ITEM_RARITY } from "@/lib/items/constants";
import {
  HEARTLANDS_REGION_ID,
  HEARTLANDS_REGION_NAME,
  getHeartlandsLocationProfile,
} from "@/lib/heartlands-lore";

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
      `Take a courier contract through ${HEARTLANDS_LOCATIONS.kingston.locationName}, where crowded wards, noble courts, and royal patrols can turn one missing dispatch into a political spark.`,
    staminaCost: 2,
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
      `Broker a ledger dispute in ${HEARTLANDS_LOCATIONS.goldmere.locationName}, where coin, guild pressure, and caravan politics make every handshake feel like a negotiation trap.`,
    staminaCost: 3,
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
      `Ride escort through ${HEARTLANDS_LOCATIONS.mournstead.locationName}, a quiet roadside village where exhausted travelers whisper of danger and bad news never lingers far behind.`,
    staminaCost: 3,
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
      `Guard pilgrims bound for ${HEARTLANDS_LOCATIONS.saintsHollow.locationName} as bells, shrines, and Order patrols hold the road against raiders testing sacred borders.`,
    staminaCost: 4,
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
      `Recover a stolen ward relic near ${HEARTLANDS_LOCATIONS.elfhome.locationName}, where fragile trust between worlds can fracture before dusk if the forest paths close.`,
    staminaCost: 4,
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
      `March beyond ${HEARTLANDS_LOCATIONS.northwatch.locationName} to relight warning fires across wind-cut ridges before whatever moves in the northern dark reaches the Heartlands.`,
    staminaCost: 5,
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
      `Enter ${HEARTLANDS_LOCATIONS.barrowfield.locationName} and contain restless dead beneath the burial mounds before fear spreads from outer roads into settled lands.`,
    staminaCost: 5,
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
      `Carry a sealed Blackthorn decree from ${HEARTLANDS_LOCATIONS.blackthornHold.locationName} through hostile ground where duty is absolute and failure invites ruthless reprisal.`,
    staminaCost: 6,
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
      `Defend ${HEARTLANDS_LOCATIONS.kingston.locationName} during a coordinated breach, choosing which gates, wards, and noble districts can be held before the capital fractures.`,
    staminaCost: 6,
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
      `Follow converging threats from ${HEARTLANDS_LOCATIONS.kingston.locationName}, ${HEARTLANDS_LOCATIONS.northwatch.locationName}, and ${HEARTLANDS_LOCATIONS.barrowfield.locationName} to stop a Heartlands collapse where warning, burial, and crown all fail at once.`,
    staminaCost: 7,
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
    staminaCost: 4,
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
    tagline: "Measured contracts on crown roads and trade routes",
    summary:
      "Reliable work from Kingston couriers to Goldmere ledgers and Mournstead road escorts, where caution and judgment matter as much as steel.",
    overviewBadges: [
      "Low Risk",
      "Tier I-V",
      "2-4 Stamina",
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
      "Lower-risk Heartlands contracts tied to living settlements, pilgrim roads, and fragile border paths. Build momentum through diplomacy, escort duty, and local pressure before open war.",
    activities: QUEST_ACTIVITY_STEPS,
  },
  {
    id: "adventure",
    regionId: HEARTLANDS_REGION_ID,
    regionName: HEARTLANDS_REGION_NAME,
    name: "Heartlands Adventure Board",
    tagline: "Warfront deployments at the realm's breaking points",
    summary:
      "Severe operations from Northwatch ridges through Barrowfield mounds and Blackthorn decrees to Kingston siege lines, where every tier escalates the cost of failure.",
    overviewBadges: [
      "High Risk",
      "Tier I-V",
      "5-7 Stamina",
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
      "High-risk Heartlands contracts across watch towers, burial fields, fortress politics, and capital defense. Adventure I starts above Quest V in both danger and payout, then scales into realm-level crisis response.",
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
      "4 Stamina",
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

const ACTIVITY_GROUP_AVAILABILITY = {
  arena: {
    isOpen: false,
    badgeLabel: "Opening soon",
    reason: "Arena is opening soon and is currently unavailable.",
  },
};

export function isActivityGroupId(groupId) {
  return typeof groupId === "string" && Boolean(ACTIVITY_GROUP_MAP[groupId]);
}

export function getActivityGroupAvailability(groupId) {
  if (!isActivityGroupId(groupId)) {
    return {
      isOpen: false,
      badgeLabel: "Unavailable",
      reason: "Activity group not found.",
    };
  }

  return (
    ACTIVITY_GROUP_AVAILABILITY[groupId] ?? {
      isOpen: true,
      badgeLabel: "Open",
      reason: "",
    }
  );
}

export function isActivityGroupOpen(groupId) {
  return getActivityGroupAvailability(groupId).isOpen;
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

export function isActivityOpen(activityOrId) {
  const activity =
    typeof activityOrId === "object"
      ? activityOrId
      : typeof activityOrId === "string"
        ? ACTIVITY_DEFINITION_MAP[activityOrId]
        : null;

  if (!activity) {
    return false;
  }

  const groupId = activity.groupId ?? activity.id;
  return isActivityGroupOpen(groupId);
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
