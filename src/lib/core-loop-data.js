export const ACTIVITY_DEFINITIONS = [
  {
    id: "quest",
    name: "Quest",
    riskProfile: "Lag risk, stabil progression",
    pageIntro:
      "Folj uppdragstavlan, hjalp bybor och bygg stabil progression med kontrollerad risk.",
    energyCost: 3,
    roll: {
      difficulty: 11,
      primaryStat: "wisdom",
      secondaryStat: "dexterity",
    },
    successReward: { gold: 8, xp: 6, renown: 1 },
    failPenalty: { hp: -2, gold: -3, heat: 1 },
  },
  {
    id: "adventure",
    name: "Adventure",
    riskProfile: "Hog risk, hog reward",
    pageIntro:
      "Ta dig utanfor stadens murar. Storre chans till stora vinster, men straffen blir tydligare.",
    energyCost: 5,
    roll: {
      difficulty: 13,
      primaryStat: "strength",
      secondaryStat: "constitution",
    },
    successReward: { gold: 16, xp: 12, renown: 3 },
    failPenalty: { hp: -5, gold: -7, heat: 3 },
  },
  {
    id: "arena",
    name: "Arena",
    riskProfile: "Duellfokus, renown och XP",
    pageIntro:
      "Mota NPC-motstandare i arenan. Vinst ger framfor allt ryktbarhet och erfarenhet.",
    energyCost: 4,
    roll: {
      difficulty: 12,
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
