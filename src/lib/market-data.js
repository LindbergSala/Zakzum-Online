export const MARKET_DEFINITIONS = [
  {
    id: "blacksmith-forge",
    name: "Blacksmith Forge",
    summary:
      "Heavy weapons, shields, and forged armor. Best for STR and CON builds in Adventure and Arena.",
    status: "open",
    supportsPurchases: true,
  },
  {
    id: "leathermaker-workshop",
    name: "Leathermaker Workshop",
    summary:
      "Light armor and utility gear tuned for DEX-focused mobility and efficient loadouts.",
    status: "open",
    supportsPurchases: true,
  },
  {
    id: "arcanist-sanctum",
    name: "Arcanist Sanctum",
    summary:
      "Staves, charms, and rings focused on INT and WIS progression for caster-style paths.",
    status: "open",
    supportsPurchases: true,
  },
  {
    id: "alchemist-lab",
    name: "Alchemist Lab",
    summary:
      "Potions and restorative brews with future-friendly consumable support.",
    status: "open",
    supportsPurchases: true,
  },
  {
    id: "shadow-bazaar",
    name: "Shadow Bazaar",
    summary:
      "High-risk contraband with powerful effects and dangerous trade-offs.",
    status: "open",
    supportsPurchases: true,
  },
  {
    id: "trophy-merchant",
    name: "Trophy Merchant",
    summary:
      "Prestige inventory gated by Renown, ideal for endgame identity and status builds.",
    status: "open",
    supportsPurchases: true,
  },
];

export const MARKET_DEFINITION_MAP = Object.fromEntries(
  MARKET_DEFINITIONS.map((market) => [market.id, market]),
);
