export const ACTIVITY_DEFINITIONS = [
  {
    id: "quest",
    name: "Quest",
    riskProfile: "Low risk, stable progression",
    pageIntro:
      "Follow the quest board, help townsfolk, and build steady progression with controlled risk.",
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
    id: "adventure",
    name: "Adventure",
    riskProfile: "High risk, high reward",
    pageIntro:
      "Venture outside the city walls. Higher chance for big wins, but penalties are harsher.",
    energyCost: 5,
    roll: {
      difficulty: 18,
      levelScaling: 3,
      primaryStat: "strength",
      secondaryStat: "constitution",
    },
    successReward: { gold: 16, xp: 12, renown: 3 },
    failPenalty: { hp: -5, gold: -7, heat: 3 },
  },
  {
    id: "arena",
    name: "Arena",
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

export const ACTIVITY_DEFINITION_MAP = Object.fromEntries(
  ACTIVITY_DEFINITIONS.map((activity) => [activity.id, activity]),
);

export const SHOP_ITEM_DEFINITION_MAP = Object.fromEntries(
  SHOP_ITEM_DEFINITIONS.map((item) => [item.id, item]),
);
