export const MARKET_DEFINITIONS = [
  {
    id: "adventurers-outfitter",
    name: "Adventurer's Outfitter",
    summary:
      "Reliable baseline gear for early and mid progression. Weapons, armor, and starter essentials.",
    status: "open",
    supportsPurchases: true,
  },
  {
    id: "blacksmith-forge",
    name: "Blacksmith Forge",
    summary:
      "Heavy equipment and hardened steel upgrades focused on frontline builds.",
    status: "coming-soon",
    supportsPurchases: false,
  },
  {
    id: "alchemist-lab",
    name: "Alchemist Lab",
    summary:
      "Consumables, restorative tools, and volatile mixtures for risky runs.",
    status: "coming-soon",
    supportsPurchases: false,
  },
  {
    id: "shadow-bazaar",
    name: "Shadow Bazaar",
    summary:
      "Rare goods and suspicious deals for players chasing high-risk power spikes.",
    status: "coming-soon",
    supportsPurchases: false,
  },
];

export const MARKET_DEFINITION_MAP = Object.fromEntries(
  MARKET_DEFINITIONS.map((market) => [market.id, market]),
);
