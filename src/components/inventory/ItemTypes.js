export const INVENTORY_GRID_COLUMNS = 10;
export const INVENTORY_GRID_ROWS = 6;

export const EQUIPMENT_SLOT_ORDER = [
  "weapon",
  "armor",
  "shield",
  "helmet",
  "gloves",
  "boots",
  "belt",
  "ring",
];

const DEFAULT_ITEM_DEFINITION = {
  width: 1,
  height: 1,
  kind: "equipment",
  stackable: false,
  maxStack: 1,
};

const ITEM_DEFINITION_BY_ID = {
  "iron-sword": {
    width: 1,
    height: 3,
    kind: "equipment",
    stackable: false,
    maxStack: 1,
  },
  "leather-armor": {
    width: 2,
    height: 3,
    kind: "equipment",
    stackable: false,
    maxStack: 1,
  },
  "tower-shield": {
    width: 2,
    height: 3,
    kind: "equipment",
    stackable: false,
    maxStack: 1,
  },
  "battle-axe": {
    width: 2,
    height: 4,
    kind: "equipment",
    stackable: false,
    maxStack: 1,
  },
  "chain-vest": {
    width: 2,
    height: 3,
    kind: "equipment",
    stackable: false,
    maxStack: 1,
  },
  "soft-leather-armor": {
    width: 2,
    height: 3,
    kind: "equipment",
    stackable: false,
    maxStack: 1,
  },
  "reinforced-leather-armor": {
    width: 2,
    height: 3,
    kind: "equipment",
    stackable: false,
    maxStack: 1,
  },
  "scout-hood": {
    width: 2,
    height: 1,
    kind: "equipment",
    stackable: false,
    maxStack: 1,
  },
  "rune-staff": {
    width: 1,
    height: 4,
    kind: "equipment",
    stackable: false,
    maxStack: 1,
  },
  "focus-charm": {
    width: 1,
    height: 1,
    kind: "equipment",
    stackable: false,
    maxStack: 1,
  },
  "mind-ring": {
    width: 1,
    height: 1,
    kind: "equipment",
    stackable: false,
    maxStack: 1,
  },
  "health-potion": {
    width: 1,
    height: 1,
    kind: "consumable",
    stackable: true,
    maxStack: 5,
  },
  "energy-draught": {
    width: 1,
    height: 1,
    kind: "consumable",
    stackable: true,
    maxStack: 5,
  },
  "focus-tonic": {
    width: 1,
    height: 1,
    kind: "consumable",
    stackable: true,
    maxStack: 5,
  },
  "calm-brew": {
    width: 1,
    height: 1,
    kind: "consumable",
    stackable: true,
    maxStack: 5,
  },
  "shadow-dagger": {
    width: 1,
    height: 2,
    kind: "equipment",
    stackable: false,
    maxStack: 1,
  },
  "infernal-charm": {
    width: 1,
    height: 1,
    kind: "equipment",
    stackable: false,
    maxStack: 1,
  },
  "smuggler-pack": {
    width: 2,
    height: 2,
    kind: "equipment",
    stackable: false,
    maxStack: 1,
  },
  "blood-talisman": {
    width: 1,
    height: 2,
    kind: "equipment",
    stackable: false,
    maxStack: 1,
  },
  "arena-laurel": {
    width: 2,
    height: 1,
    kind: "equipment",
    stackable: false,
    maxStack: 1,
  },
  "champion-belt": {
    width: 2,
    height: 1,
    kind: "equipment",
    stackable: false,
    maxStack: 1,
  },
  "victors-crest": {
    width: 1,
    height: 1,
    kind: "equipment",
    stackable: false,
    maxStack: 1,
  },
};

export function getItemDefinition(itemId) {
  return ITEM_DEFINITION_BY_ID[itemId] ?? DEFAULT_ITEM_DEFINITION;
}

export function isConsumableStackable(item) {
  return item.kind === "consumable" && item.stackable === true;
}
