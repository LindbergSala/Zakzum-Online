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
    price: 25,
    weight: 8,
    slot: "weapon",
    effects: {
      stats: {
        strength: 2,
      },
    },
  },
  {
    id: "leather-armor",
    name: "Leather Armor",
    price: 18,
    weight: 10,
    slot: "armor",
    effects: {
      stats: {
        constitution: 2,
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
