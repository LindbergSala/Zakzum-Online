import {
  canItemBePurchased,
  canItemBeSold,
  getItemMarketIds,
  getItemGoldCost,
  getItemMaxStack,
  getItemRenownCost,
  getItemSellValue,
  isItemStackable,
} from "@/lib/items/helpers";
import {
  buildProjectedOwnedItemsWithIncrement,
  normalizePositiveQuantity,
  resolveOwnedItemByRecordOrItemId,
} from "@/lib/items/owned-items";
import { formatItemEffectLabel } from "@/lib/stat-effects";

export const SHOP_CHARACTER_SELECT = {
  id: true,
  hp: true,
  stamina: true,
  maxStamina: true,
  heatRestEndsAt: true,
  gold: true,
  xp: true,
  level: true,
  renown: true,
  heat: true,
  strength: true,
  updatedAt: true,
};

export const SHOP_CHARACTER_RESOURCE_SELECT = {
  id: true,
  hp: true,
  stamina: true,
  maxStamina: true,
  heatRestEndsAt: true,
  gold: true,
  xp: true,
  level: true,
  renown: true,
  heat: true,
};

export const OWNED_ITEM_SELECT = {
  id: true,
  itemId: true,
  itemName: true,
  quantity: true,
  isEquipped: true,
  createdAt: true,
};

export { normalizePositiveQuantity };

export function summarizeOwnedByItemId(ownedItems) {
  const summary = {};

  for (const item of ownedItems) {
    const current = summary[item.itemId] ?? {
      quantity: 0,
      equipped: false,
    };

    current.quantity += normalizePositiveQuantity(item.quantity, 1);
    current.equipped = current.equipped || Boolean(item.isEquipped);
    summary[item.itemId] = current;
  }

  return summary;
}

export function buildMarketItemResponse(item, ownedById) {
  const ownedEntry = ownedById[item.id] ?? { quantity: 0, equipped: false };
  const isStackable = isItemStackable(item);
  const ownedQuantity = Number(ownedEntry.quantity) || 0;
  const marketIds = getItemMarketIds(item);

  return {
    id: item.id,
    name: item.name,
    marketId: marketIds[0] ?? null,
    marketIds,
    description: item.description,
    price: getItemGoldCost(item),
    renownPrice: getItemRenownCost(item),
    sellValue: getItemSellValue(item),
    weight: item.weight,
    slot: item.slot,
    effects: item.effects,
    effectLabel: formatItemEffectLabel(item.effects),
    owned: ownedQuantity > 0,
    ownedQuantity,
    equipped: Boolean(ownedEntry.equipped),
    isStackable,
    maxStack: getItemMaxStack(item),
    canBuy: canItemBePurchased(item) && (isStackable ? true : ownedQuantity === 0),
    canSell: ownedQuantity > 0,
  };
}

export function buildBuyDelta(itemDefinition) {
  const delta = {};
  const goldCost = getItemGoldCost(itemDefinition);
  const renownCost = getItemRenownCost(itemDefinition);

  if (goldCost > 0) {
    delta.gold = -goldCost;
  }

  if (renownCost > 0) {
    delta.renown = -renownCost;
  }

  return delta;
}

export function buildSellDelta(itemDefinition, quantity) {
  const sellValue = getItemSellValue(itemDefinition);
  const resolvedQuantity = normalizePositiveQuantity(quantity, 1);
  const delta = {};

  if (sellValue.gold > 0) {
    delta.gold = sellValue.gold * resolvedQuantity;
  }

  if (sellValue.renown > 0) {
    delta.renown = sellValue.renown * resolvedQuantity;
  }

  return delta;
}

export function hasAnySellValue(itemDefinition) {
  return canItemBeSold(itemDefinition);
}

export function buildProjectedOwnedItemsForBuy(ownedItems, itemId) {
  return buildProjectedOwnedItemsWithIncrement(ownedItems, itemId, 1);
}

export function pickSellItemRecord(ownedItems, { itemRecordId, itemId }) {
  return resolveOwnedItemByRecordOrItemId(ownedItems, { itemRecordId, itemId });
}
