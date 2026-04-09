import { EQUIPPABLE_ITEM_SLOTS } from "@/lib/items/constants";
import {
  getConsumableBonusDelta,
  getConsumableRollBonusBonus,
} from "@/lib/character-stat-rules";
import {
  getItemById,
  getItemMaxStack,
  isItemStackable,
} from "@/lib/items/helpers";
import {
  normalizePositiveQuantity,
  resolveOwnedItemByRecordOrItemId,
} from "@/lib/items/owned-items";
import { formatItemEffectLabel } from "@/lib/stat-effects";

export const EQUIPPABLE_SLOTS = new Set(EQUIPPABLE_ITEM_SLOTS);

export const CHARACTER_SELECT = {
  id: true,
  strength: true,
  dexterity: true,
  constitution: true,
  intelligence: true,
  wisdom: true,
  charisma: true,
  hp: true,
  stamina: true,
  maxStamina: true,
  staminaRegenAt: true,
  heatRestEndsAt: true,
  gold: true,
  xp: true,
  level: true,
  renown: true,
  heat: true,
  nextActivityRollBonus: true,
  updatedAt: true,
};

export const INVENTORY_ITEM_SELECT = {
  id: true,
  itemId: true,
  itemName: true,
  quantity: true,
  isEquipped: true,
  createdAt: true,
};

export { normalizePositiveQuantity };

export function enrichInventoryItems(items) {
  return items.map((item) => {
    const definition = getItemById(item.itemId);

    return {
      ...item,
      slot: definition?.slot ?? "unknown",
      effects: definition?.effects ?? { stats: {} },
      effectLabel: formatItemEffectLabel(definition?.effects),
      isStackable: isItemStackable(item.itemId),
      maxStack: getItemMaxStack(item.itemId),
    };
  });
}

export function resolveOwnedItem(ownedItems, { itemRecordId, itemId }) {
  return resolveOwnedItemByRecordOrItemId(ownedItems, { itemRecordId, itemId });
}

export function buildConsumableDelta(itemDefinition, quantity, character = null) {
  const consumable = itemDefinition?.effects?.consumable ?? {};
  const usedQuantity = normalizePositiveQuantity(quantity, 1);
  const bonusDelta = getConsumableBonusDelta(character, itemDefinition, usedQuantity);
  const heatReduction = (Number(consumable.heatReduction) || 0) * usedQuantity;

  return {
    hp: (Number(consumable.hpRestore) || 0) * usedQuantity + bonusDelta.hp,
    stamina:
      (Number(consumable.staminaRestore) || 0) * usedQuantity + bonusDelta.stamina,
    heat: heatReduction > 0 ? -heatReduction : 0,
  };
}

export function getConsumableRollBonus(itemDefinition, quantity, character = null) {
  const consumable = itemDefinition?.effects?.consumable ?? {};
  const usedQuantity = normalizePositiveQuantity(quantity, 1);

  return (
    (Number(consumable.activityRollModifier) || 0) * usedQuantity +
    getConsumableRollBonusBonus(character, itemDefinition, usedQuantity)
  );
}
