import {
  getItemCategory,
  getItemInventorySize,
  getItemMaxStack,
  isItemStackable,
} from "../../lib/items/helpers";

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

export function getItemDefinition(itemId) {
  const inventorySize = getItemInventorySize(itemId);
  const kind = getItemCategory(itemId);

  if (!itemId) {
    return DEFAULT_ITEM_DEFINITION;
  }

  return {
    width: inventorySize.width,
    height: inventorySize.height,
    kind: kind ?? DEFAULT_ITEM_DEFINITION.kind,
    stackable: isItemStackable(itemId),
    maxStack: getItemMaxStack(itemId),
  };
}

export function isConsumableStackable(item) {
  return item.kind === "consumable" && item.stackable === true;
}
