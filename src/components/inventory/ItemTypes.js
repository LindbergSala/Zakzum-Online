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
  "health-potion": {
    width: 1,
    height: 1,
    kind: "consumable",
    stackable: true,
    maxStack: 5,
  },
};

export function getItemDefinition(itemId) {
  return ITEM_DEFINITION_BY_ID[itemId] ?? DEFAULT_ITEM_DEFINITION;
}

export function isConsumableStackable(item) {
  return item.kind === "consumable" && item.stackable === true;
}
