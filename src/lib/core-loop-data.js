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
    description:
      "Steady, lower-risk jobs that teach the core loop and build momentum before high danger content.",
    activities: QUEST_ACTIVITY_STEPS,
  },
  {
    id: "adventure",
    name: "Adventure Board",
    tagline: "Harder next-tier progression",
    description:
      "High-risk contracts outside the city walls. Adventure I starts above Quest V in both danger and payout profile.",
    activities: ADVENTURE_ACTIVITY_STEPS,
  },
  {
    id: "arena",
    name: "Arena Board",
    tagline: "Duel track with renown focus",
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

export const SHOP_ITEM_DEFINITIONS = [
  {
    id: "iron-sword",
    name: "Iron Sword",
    marketId: "blacksmith-forge",
    price: 25,
    weight: 8,
    slot: "weapon",
    description: "Reliable steel blade for frontline fighters.",
    effects: {
      stats: {
        strength: 2,
      },
    },
  },
  {
    id: "tower-shield",
    name: "Tower Shield",
    marketId: "blacksmith-forge",
    price: 34,
    weight: 15,
    slot: "shield",
    description: "A wall of steel that favors survivability over mobility.",
    effects: {
      stats: {
        constitution: 1,
      },
    },
  },
  {
    id: "battle-axe",
    name: "Battle Axe",
    marketId: "blacksmith-forge",
    price: 55,
    weight: 18,
    slot: "weapon",
    description: "Heavy two-handed edge with high raw power.",
    effects: {
      stats: {
        strength: 3,
      },
    },
  },
  {
    id: "chain-vest",
    name: "Chain Vest",
    marketId: "blacksmith-forge",
    price: 38,
    weight: 13,
    slot: "armor",
    description: "Linked steel rings that improve endurance in hard fights.",
    effects: {
      stats: {
        constitution: 2,
      },
    },
  },
  {
    id: "leather-armor",
    name: "Leather Armor",
    marketId: "leathermaker-workshop",
    price: 18,
    weight: 10,
    slot: "armor",
    description: "Legacy staple armor still available for balanced builds.",
    effects: {
      stats: {
        constitution: 2,
      },
    },
  },
  {
    id: "soft-leather-armor",
    name: "Soft Leather Armor",
    marketId: "leathermaker-workshop",
    price: 22,
    weight: 6,
    slot: "armor",
    description: "Flexible armor that improves agility.",
    effects: {
      stats: {
        dexterity: 1,
      },
    },
  },
  {
    id: "reinforced-leather-armor",
    name: "Reinforced Leather Armor",
    marketId: "leathermaker-workshop",
    price: 34,
    weight: 9,
    slot: "armor",
    description: "Layered hide with balanced agility and durability bonuses.",
    effects: {
      stats: {
        dexterity: 1,
        constitution: 1,
      },
    },
  },
  {
    id: "scout-hood",
    name: "Scout Hood",
    marketId: "leathermaker-workshop",
    price: 16,
    weight: 2,
    slot: "helmet",
    description: "Light headgear favored by trackers and scouts.",
    effects: {
      stats: {
        wisdom: 1,
      },
    },
  },
  {
    id: "rune-staff",
    name: "Rune Staff",
    marketId: "arcanist-sanctum",
    price: 32,
    weight: 5,
    slot: "weapon",
    description: "Arcane channeling focus for scholars and casters.",
    effects: {
      stats: {
        intelligence: 2,
      },
    },
  },
  {
    id: "focus-charm",
    name: "Focus Charm",
    marketId: "arcanist-sanctum",
    price: 27,
    weight: 1,
    slot: "ring",
    description: "Runed charm that sharpens intellect and clarity.",
    effects: {
      stats: {
        intelligence: 1,
        wisdom: 1,
      },
    },
  },
  {
    id: "mind-ring",
    name: "Mind Ring",
    marketId: "arcanist-sanctum",
    price: 24,
    weight: 1,
    slot: "ring",
    description: "Subtle arcane ring that boosts social precision and insight.",
    effects: {
      stats: {
        charisma: 1,
        wisdom: 1,
      },
    },
  },
  {
    id: "health-potion",
    name: "Health Potion",
    marketId: "alchemist-lab",
    price: 11,
    weight: 1,
    slot: "consumable",
    description: "Restorative brew intended to recover HP when consumed.",
    effects: {
      consumable: {
        hpRestore: 8,
      },
    },
  },
  {
    id: "energy-draught",
    name: "Energy Draught",
    marketId: "alchemist-lab",
    price: 12,
    weight: 1,
    slot: "consumable",
    description: "Concentrated tonic that restores spent Energy.",
    effects: {
      consumable: {
        energyRestore: 8,
      },
    },
  },
  {
    id: "focus-tonic",
    name: "Focus Tonic",
    marketId: "alchemist-lab",
    price: 16,
    weight: 1,
    slot: "consumable",
    description: "Experimental tonic designed to improve the next activity check.",
    effects: {
      consumable: {
        activityRollModifier: 2,
      },
    },
  },
  {
    id: "calm-brew",
    name: "Calm Brew",
    marketId: "alchemist-lab",
    price: 15,
    weight: 1,
    slot: "consumable",
    description: "Cooling draft used to reduce Heat build-up.",
    effects: {
      consumable: {
        heatReduction: 3,
      },
    },
  },
  {
    id: "shadow-dagger",
    name: "Shadow Dagger",
    marketId: "shadow-bazaar",
    price: 49,
    weight: 5,
    slot: "weapon",
    description: "Illicit blade made for quick strikes and social leverage.",
    effects: {
      stats: {
        dexterity: 2,
        charisma: 1,
      },
    },
  },
  {
    id: "infernal-charm",
    name: "Infernal Charm",
    marketId: "shadow-bazaar",
    price: 58,
    weight: 2,
    slot: "ring",
    description: "Powerful charm that boosts CHA but slowly raises Heat.",
    effects: {
      stats: {
        charisma: 2,
      },
      activityDelta: {
        heat: 1,
      },
    },
  },
  {
    id: "smuggler-pack",
    name: "Smuggler Pack",
    marketId: "shadow-bazaar",
    price: 44,
    weight: 4,
    slot: "belt",
    description: "Compartment-heavy belt rig that increases carry utility.",
    effects: {
      carryCapacity: 9,
      stats: {
        dexterity: 1,
      },
    },
  },
  {
    id: "blood-talisman",
    name: "Blood Talisman",
    marketId: "shadow-bazaar",
    price: 67,
    weight: 2,
    slot: "gloves",
    description: "A dangerous artifact with strong power and an HP drawback.",
    effects: {
      stats: {
        strength: 2,
        wisdom: 1,
      },
      activityDelta: {
        hp: -1,
      },
      activityDeltaOnFailure: {
        heat: 1,
      },
    },
  },
  {
    id: "arena-laurel",
    name: "Arena Laurel",
    marketId: "trophy-merchant",
    price: 0,
    renownPrice: 10,
    weight: 2,
    slot: "helmet",
    description: "Renown-forged wreath that improves arena performance.",
    effects: {
      stats: {
        constitution: 1,
        charisma: 1,
      },
      activityRollModifierByActivity: {
        arena: 1,
      },
    },
  },
  {
    id: "champion-belt",
    name: "Champion Belt",
    marketId: "trophy-merchant",
    price: 0,
    renownPrice: 14,
    weight: 3,
    slot: "belt",
    description: "Prestige belt awarded to proven contenders.",
    effects: {
      stats: {
        strength: 1,
        charisma: 1,
      },
    },
  },
  {
    id: "victors-crest",
    name: "Victor's Crest",
    marketId: "trophy-merchant",
    price: 0,
    renownPrice: 20,
    weight: 2,
    slot: "ring",
    description: "High-renown prestige crest for late-game social power.",
    effects: {
      stats: {
        charisma: 2,
        wisdom: 1,
      },
      activityRollModifierByActivity: {
        arena: 1,
        adventure: 1,
      },
    },
  },
];

export const SHOP_ITEM_DEFINITION_MAP = Object.fromEntries(
  SHOP_ITEM_DEFINITIONS.map((item) => [item.id, item]),
);

function toNonNegativeInteger(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.max(0, Math.floor(numericValue)) : 0;
}

export function getShopItemGoldCost(itemOrId) {
  if (!itemOrId) {
    return 0;
  }

  const definition =
    typeof itemOrId === "string" ? SHOP_ITEM_DEFINITION_MAP[itemOrId] : itemOrId;

  return toNonNegativeInteger(definition?.price);
}

export function getShopItemRenownCost(itemOrId) {
  if (!itemOrId) {
    return 0;
  }

  const definition =
    typeof itemOrId === "string" ? SHOP_ITEM_DEFINITION_MAP[itemOrId] : itemOrId;

  return toNonNegativeInteger(definition?.renownPrice);
}

export function getShopItemSellValue(itemOrId) {
  const goldCost = getShopItemGoldCost(itemOrId);
  const renownCost = getShopItemRenownCost(itemOrId);
  const gold = goldCost > 0 ? Math.max(1, Math.floor(goldCost * 0.6)) : 0;
  const renown = renownCost > 0 ? Math.max(1, Math.floor(renownCost * 0.5)) : 0;

  return {
    gold,
    renown,
  };
}

export function isShopItemStackable(itemOrId) {
  if (!itemOrId) {
    return false;
  }

  const definition =
    typeof itemOrId === "string" ? SHOP_ITEM_DEFINITION_MAP[itemOrId] : itemOrId;

  return definition?.slot === "consumable";
}

export function getShopItemMaxStack(itemOrId) {
  if (!itemOrId) {
    return 1;
  }

  return isShopItemStackable(itemOrId) ? 5 : 1;
}
