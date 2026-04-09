import { ITEM_CATEGORY, ITEM_LOOT_SOURCE, ITEM_RARITY } from "@/lib/items/constants";

import {
  HEARTLANDS_REGION_ID,
  HEARTLANDS_REGION_NAME,
} from "./location-refs";
import {
  ADVENTURE_ACTIVITY_STEPS,
  ARENA_ACTIVITY_STEPS,
  QUEST_ACTIVITY_STEPS,
} from "./activity-definitions";

export const ACTIVITY_GROUPS = [
  {
    id: "quest",
    regionId: HEARTLANDS_REGION_ID,
    regionName: HEARTLANDS_REGION_NAME,
    name: "Heartlands Quest Board",
    tagline: "Measured contracts on crown roads and trade routes",
    summary:
      "Reliable work from Kingston couriers to Goldmere ledgers and Mournstead road escorts, where caution and judgment matter as much as steel.",
    overviewBadges: ["Low Risk", "Tier I-V", "2-4 Stamina"],
    lootProfile: {
      source: ITEM_LOOT_SOURCE.QUEST,
      dropChance: 0.36,
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
    overviewBadges: ["High Risk", "Tier I-V", "5-7 Stamina"],
    lootProfile: {
      source: ITEM_LOOT_SOURCE.ADVENTURE,
      dropChance: 0.42,
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
    overviewBadges: ["Renown Focus", "Single Track", "4 Stamina"],
    lootProfile: {
      source: ITEM_LOOT_SOURCE.ARENA,
      dropChance: 0.36,
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

export const ACTIVITY_GROUP_AVAILABILITY = {
  arena: {
    isOpen: false,
    badgeLabel: "Opening soon",
    reason: "Arena is opening soon and is currently unavailable.",
  },
};