import {
  canItemBePurchased,
  getItemMarketIds,
  getShopItemGoldCost,
  getShopItemMaxStack,
  getShopItemRenownCost,
  getShopItemSellValue,
  isShopItemStackable,
  SHOP_ITEM_DEFINITION_MAP,
} from "@/lib/items/helpers";
import {
  buildCharacterResourceUpdateInput,
  calculateCharacterResourceResult,
  getCharacterResourceSnapshot,
} from "@/lib/resource-rules";
import {
  getCharacterCarryWeightSummary,
  getItemWeightById,
} from "@/lib/weight-rules";
import {
  OWNED_ITEM_SELECT,
  SHOP_CHARACTER_RESOURCE_SELECT,
  buildBuyDelta,
  buildProjectedOwnedItemsForBuy,
  buildSellDelta,
  hasAnySellValue,
  normalizePositiveQuantity,
  pickSellItemRecord,
} from "./route-helpers";

export async function processSellTransaction({
  tx,
  latestCharacter,
  ownedItems,
  parsedData,
}) {
  const sellItemRecord = pickSellItemRecord(ownedItems, parsedData);

  if (!sellItemRecord) {
    return {
      ok: false,
      status: 404,
      message: "You do not own this item.",
      resources: getCharacterResourceSnapshot(latestCharacter),
    };
  }

  const itemDefinition = SHOP_ITEM_DEFINITION_MAP[sellItemRecord.itemId];

  if (!itemDefinition) {
    return {
      ok: false,
      status: 400,
      message: "Unknown item definition.",
      resources: getCharacterResourceSnapshot(latestCharacter),
    };
  }

  if (!hasAnySellValue(itemDefinition)) {
    return {
      ok: false,
      status: 400,
      message: "This item has no sell value.",
      resources: getCharacterResourceSnapshot(latestCharacter),
    };
  }

  const sellQuantity = normalizePositiveQuantity(parsedData.quantity, 1);

  if (sellQuantity > sellItemRecord.quantity) {
    return {
      ok: false,
      status: 400,
      message: `You only have ${sellItemRecord.quantity} in this stack.`,
      resources: getCharacterResourceSnapshot(latestCharacter),
    };
  }

  const calculation = calculateCharacterResourceResult(latestCharacter, {
    delta: buildSellDelta(itemDefinition, sellQuantity),
  });

  if (!calculation.ok) {
    return {
      ok: false,
      status: 400,
      message: "Sell transaction could not be completed.",
      resources: getCharacterResourceSnapshot(latestCharacter),
    };
  }

  const updateResult = await tx.character.updateMany({
    where: {
      id: latestCharacter.id,
      updatedAt: latestCharacter.updatedAt,
    },
    data: buildCharacterResourceUpdateInput(calculation.after),
  });

  if (updateResult.count !== 1) {
    return {
      ok: false,
      status: 409,
      message: "Character resources changed. Please try selling again.",
    };
  }

  const quantityAfterSell = sellItemRecord.quantity - sellQuantity;

  if (quantityAfterSell <= 0) {
    await tx.characterItem.delete({
      where: { id: sellItemRecord.id },
    });
  } else {
    await tx.characterItem.update({
      where: { id: sellItemRecord.id },
      data: {
        quantity: quantityAfterSell,
        isEquipped: false,
      },
    });
  }

  const updatedCharacter = await tx.character.findUnique({
    where: { id: latestCharacter.id },
    select: SHOP_CHARACTER_RESOURCE_SELECT,
  });

  const logEntry = await tx.activityLog.create({
    data: {
      characterId: latestCharacter.id,
      type: "SHOP",
      activityId: itemDefinition.id,
      activityName: `Sell: ${itemDefinition.name}`,
      success: true,
      energyCost: 0,
      roll: 0,
      rollTotal: 0,
      successTarget: 0,
      statModifier: 0,
      chancePercent: 0,
      delta: calculation.delta,
      beforeResources: calculation.before,
      afterResources: calculation.after,
      details: {
        action: "sell",
        item: {
          id: itemDefinition.id,
          name: itemDefinition.name,
          itemRecordId: sellItemRecord.id,
          marketId: getItemMarketIds(itemDefinition)[0] ?? null,
          slot: itemDefinition.slot,
          sellValue: getShopItemSellValue(itemDefinition),
          quantityChange: -sellQuantity,
          quantityBefore: sellItemRecord.quantity,
          quantityAfter: quantityAfterSell,
          soldWhileEquipped: sellItemRecord.isEquipped,
        },
      },
    },
    select: { id: true },
  });

  return {
    ok: true,
    status: 200,
    action: "sell",
    itemDefinition,
    quantity: sellQuantity,
    quantityAfter: quantityAfterSell,
    soldWhileEquipped: sellItemRecord.isEquipped,
    updatedCharacter,
    calculation,
    logEntry,
  };
}

export async function processBuyTransaction({
  tx,
  latestCharacter,
  ownedItems,
  parsedData,
  requestedMarket,
}) {
  const itemDefinition = SHOP_ITEM_DEFINITION_MAP[parsedData.itemId];

  if (!itemDefinition) {
    return {
      ok: false,
      status: 400,
      message: "Unknown item.",
      resources: getCharacterResourceSnapshot(latestCharacter),
    };
  }
  if (!canItemBePurchased(itemDefinition, requestedMarket.id)) {
    return {
      ok: false,
      status: 400,
      message: "This item is not sold by the selected vendor.",
      resources: getCharacterResourceSnapshot(latestCharacter),
    };
  }

  const isStackable = isShopItemStackable(itemDefinition);
  const ownedSameItem = ownedItems.filter((item) => item.itemId === itemDefinition.id);

  if (!isStackable && ownedSameItem.length > 0) {
    return {
      ok: false,
      status: 409,
      message: "You already own this item.",
      resources: getCharacterResourceSnapshot(latestCharacter),
    };
  }

  const carrySummary = getCharacterCarryWeightSummary(latestCharacter.strength, ownedItems);
  const itemWeight = getItemWeightById(itemDefinition.id);
  const projectedCarrySummary = getCharacterCarryWeightSummary(
    latestCharacter.strength,
    buildProjectedOwnedItemsForBuy(ownedItems, itemDefinition.id),
  );

  if (projectedCarrySummary.currentWeight > projectedCarrySummary.maxWeight) {
    return {
      ok: false,
      status: 400,
      message:
        `Carrying capacity exceeded. ${itemDefinition.name} weighs ${itemWeight}. ` +
        `Current ${carrySummary.currentWeight}/${carrySummary.maxWeight}, ` +
        `projected ${projectedCarrySummary.currentWeight}/${projectedCarrySummary.maxWeight}.`,
      resources: getCharacterResourceSnapshot(latestCharacter),
    };
  }

  const goldCost = getShopItemGoldCost(itemDefinition);
  const renownCost = getShopItemRenownCost(itemDefinition);

  if (latestCharacter.gold < goldCost) {
    return {
      ok: false,
      status: 400,
      message: `Not enough Gold. Item costs ${goldCost}, you have ${latestCharacter.gold}.`,
      resources: getCharacterResourceSnapshot(latestCharacter),
    };
  }

  if (latestCharacter.renown < renownCost) {
    return {
      ok: false,
      status: 400,
      message: `Not enough Renown. Item costs ${renownCost}, you have ${latestCharacter.renown}.`,
      resources: getCharacterResourceSnapshot(latestCharacter),
    };
  }

  const calculation = calculateCharacterResourceResult(latestCharacter, {
    delta: buildBuyDelta(itemDefinition),
  });

  if (!calculation.ok) {
    return {
      ok: false,
      status: 400,
      message: "Purchase could not be completed.",
      resources: getCharacterResourceSnapshot(latestCharacter),
    };
  }

  const updateResult = await tx.character.updateMany({
    where: {
      id: latestCharacter.id,
      updatedAt: latestCharacter.updatedAt,
    },
    data: buildCharacterResourceUpdateInput(calculation.after),
  });

  if (updateResult.count !== 1) {
    return {
      ok: false,
      status: 409,
      message: "Character resources changed. Please try the purchase again.",
    };
  }

  let itemRecord;
  let previousQuantity = 0;

  if (isStackable) {
    const maxStack = getShopItemMaxStack(itemDefinition.id);
    const targetStack =
      ownedSameItem
        .filter((item) => item.quantity < maxStack)
        .sort((a, b) => a.quantity - b.quantity)[0] ?? null;

    if (targetStack) {
      previousQuantity = targetStack.quantity;
      itemRecord = await tx.characterItem.update({
        where: { id: targetStack.id },
        data: {
          quantity: {
            increment: 1,
          },
        },
        select: OWNED_ITEM_SELECT,
      });
    } else {
      itemRecord = await tx.characterItem.create({
        data: {
          characterId: latestCharacter.id,
          itemId: itemDefinition.id,
          itemName: itemDefinition.name,
          quantity: 1,
          isEquipped: false,
        },
        select: OWNED_ITEM_SELECT,
      });
    }
  } else {
    itemRecord = await tx.characterItem.create({
      data: {
        characterId: latestCharacter.id,
        itemId: itemDefinition.id,
        itemName: itemDefinition.name,
        quantity: 1,
        isEquipped: false,
      },
      select: OWNED_ITEM_SELECT,
    });
  }

  const updatedCharacter = await tx.character.findUnique({
    where: { id: latestCharacter.id },
    select: SHOP_CHARACTER_RESOURCE_SELECT,
  });

  const logEntry = await tx.activityLog.create({
    data: {
      characterId: latestCharacter.id,
      type: "SHOP",
      activityId: itemDefinition.id,
      activityName: `Purchase: ${itemDefinition.name}`,
      success: true,
      energyCost: 0,
      roll: 0,
      rollTotal: 0,
      successTarget: 0,
      statModifier: 0,
      chancePercent: 0,
      delta: calculation.delta,
      beforeResources: calculation.before,
      afterResources: calculation.after,
      details: {
        action: "buy",
        item: {
          id: itemDefinition.id,
          name: itemDefinition.name,
          itemRecordId: itemRecord.id,
          marketId: requestedMarket.id,
          slot: itemDefinition.slot,
          price: goldCost,
          renownPrice: renownCost,
          sellValue: getShopItemSellValue(itemDefinition),
          weight: itemDefinition.weight,
          description: itemDefinition.description,
          effects: itemDefinition.effects ?? {},
          quantityChange: 1,
          quantityBefore: previousQuantity,
          quantityAfter: itemRecord.quantity,
        },
      },
    },
    select: { id: true },
  });

  return {
    ok: true,
    status: 200,
    action: "buy",
    itemDefinition,
    quantity: 1,
    quantityAfter: itemRecord.quantity,
    itemRecord,
    updatedCharacter,
    calculation,
    logEntry,
  };
}
