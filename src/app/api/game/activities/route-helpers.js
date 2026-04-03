import { createHash } from "crypto";

import { getActivityLocationContext } from "@/lib/core-loop-data";
import { getItemMaxStack, isItemStackable } from "@/lib/items/helpers";
import {
  getCharacterCarryWeightSummary,
  getItemWeightById,
} from "@/lib/weight-rules";

export const HALF_ORC_RELENTLESS_COOKIE_NAME = "zakzum_half_orc_relentless";

export const ACTIVITY_CHARACTER_SELECT = {
  id: true,
  characterClass: true,
  characterRace: true,
  strength: true,
  dexterity: true,
  constitution: true,
  intelligence: true,
  wisdom: true,
  charisma: true,
  hp: true,
  energy: true,
  maxEnergy: true,
  energyRegenAt: true,
  gold: true,
  xp: true,
  level: true,
  renown: true,
  heat: true,
  nextActivityRollBonus: true,
  unspentStatPoints: true,
  updatedAt: true,
};

export const ACTIVITY_ITEM_SELECT = {
  id: true,
  itemId: true,
  itemName: true,
  quantity: true,
  isEquipped: true,
};

export function buildActivityContext(activity) {
  const context = getActivityLocationContext(activity);
  if (!context) {
    return null;
  }

  return {
    locationId: context.locationId,
    locationName: context.locationName,
    locationTitle: context.locationTitle,
    regionId: context.regionId,
    regionName: context.regionName,
  };
}

export function hashSessionToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function normalizePositiveQuantity(value, fallback = 1) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.max(1, Math.floor(numericValue));
}

export async function applyLootDropToInventory(
  tx,
  characterId,
  characterStrength,
  ownedItems,
  lootDrop,
) {
  if (!lootDrop?.dropped || !lootDrop.item) {
    return {
      loot: null,
      blockedByCarry: null,
    };
  }

  const item = lootDrop.item;
  const stackable = isItemStackable(item);
  const maxStack = getItemMaxStack(item);

  const existingStack = stackable
    ? ownedItems
        .filter((ownedItem) => ownedItem.itemId === item.id && ownedItem.quantity < maxStack)
        .sort((left, right) => left.quantity - right.quantity)[0] ?? null
    : null;
  const projectedOwnedItems = ownedItems.map((ownedItem) => ({
    itemId: ownedItem.itemId,
    quantity: normalizePositiveQuantity(ownedItem.quantity, 1),
  }));

  const existingProjectedEntry = projectedOwnedItems.find(
    (ownedItem) => ownedItem.itemId === item.id,
  );

  if (existingProjectedEntry) {
    existingProjectedEntry.quantity += 1;
  } else {
    projectedOwnedItems.push({
      itemId: item.id,
      quantity: 1,
    });
  }

  const currentCarrySummary = getCharacterCarryWeightSummary(
    characterStrength,
    ownedItems,
  );
  const projectedCarrySummary = getCharacterCarryWeightSummary(
    characterStrength,
    projectedOwnedItems,
  );

  if (projectedCarrySummary.currentWeight > projectedCarrySummary.maxWeight) {
    return {
      loot: null,
      blockedByCarry: {
        reason: "carry_capacity_exceeded",
        itemId: item.id,
        itemName: item.name,
        itemWeight: getItemWeightById(item.id),
        currentWeight: currentCarrySummary.currentWeight,
        projectedWeight: projectedCarrySummary.currentWeight,
        maxWeight: projectedCarrySummary.maxWeight,
      },
    };
  }

  let itemRecord;
  let quantityBefore = 0;

  if (existingStack) {
    quantityBefore = normalizePositiveQuantity(existingStack.quantity, 1);
    itemRecord = await tx.characterItem.update({
      where: { id: existingStack.id },
      data: {
        quantity: {
          increment: 1,
        },
      },
      select: {
        id: true,
        quantity: true,
      },
    });
  } else {
    itemRecord = await tx.characterItem.create({
      data: {
        characterId,
        itemId: item.id,
        itemName: item.name,
        quantity: 1,
        isEquipped: false,
      },
      select: {
        id: true,
        quantity: true,
      },
    });
  }

  return {
    loot: {
      itemId: item.id,
      name: item.name,
      category: item.category,
      rarity: item.rarity,
      quantity: 1,
      stackable,
      maxStack,
      itemRecordId: itemRecord.id,
      quantityBefore,
      quantityAfter: itemRecord.quantity,
    },
    blockedByCarry: null,
  };
}

export function buildLootLogDetails(lootDrop, loot, blockedByCarry = null) {
  if (!lootDrop) {
    return {
      dropped: false,
      reason: "loot_not_resolved",
    };
  }

  if (blockedByCarry) {
    return {
      dropped: false,
      reason: "blocked_by_carry_capacity",
      source: lootDrop.lootSource,
      activityTier: lootDrop.activityTier,
      dropChance: lootDrop.dropChance,
      dropRoll: lootDrop.dropRoll,
      pickRoll: lootDrop.pickRoll,
      candidateCount: lootDrop.candidateCount,
      blockedByCarry,
    };
  }

  if (!lootDrop.dropped || !loot) {
    return {
      dropped: false,
      reason: lootDrop.reason,
      source: lootDrop.lootSource,
      activityTier: lootDrop.activityTier,
      dropChance: lootDrop.dropChance,
      dropRoll: lootDrop.dropRoll,
      candidateCount: lootDrop.candidateCount,
    };
  }

  return {
    dropped: true,
    reason: lootDrop.reason,
    source: lootDrop.lootSource,
    activityTier: lootDrop.activityTier,
    dropChance: lootDrop.dropChance,
    dropRoll: lootDrop.dropRoll,
    pickRoll: lootDrop.pickRoll,
    candidateCount: lootDrop.candidateCount,
    item: loot,
  };
}
