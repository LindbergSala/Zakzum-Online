import {
  getItemById,
  getItemCategory,
  getItemMaxStack,
  isItemStackable,
} from "@/lib/items/helpers";
import {
  buildCharacterResourceUpdateInput,
  calculateCharacterResourceResult,
  getCharacterResourceSnapshot,
} from "@/lib/resource-rules";
import {
  CHARACTER_SELECT,
  EQUIPPABLE_SLOTS,
  INVENTORY_ITEM_SELECT,
  buildConsumableDelta,
  getConsumableRollBonus,
  normalizePositiveQuantity,
} from "./route-helpers";
import { isCharacterResting } from "@/lib/heat-rest";

async function fetchAllCharacterItems(tx, characterId) {
  return tx.characterItem.findMany({
    where: { characterId },
    select: INVENTORY_ITEM_SELECT,
    orderBy: [{ createdAt: "desc" }],
  });
}

async function processCombineAction({
  tx,
  latestCharacter,
  ownedItems,
  parsedData,
}) {
  if (!parsedData.itemRecordId || !parsedData.targetItemRecordId) {
    return {
      ok: false,
      status: 400,
      message: "Combine requires source and target stack ids.",
    };
  }

  if (parsedData.itemRecordId === parsedData.targetItemRecordId) {
    return {
      ok: false,
      status: 400,
      message: "Cannot combine a stack into itself.",
    };
  }

  const sourceItem = ownedItems.find((item) => item.id === parsedData.itemRecordId);
  const targetItem = ownedItems.find((item) => item.id === parsedData.targetItemRecordId);

  if (!sourceItem || !targetItem) {
    return {
      ok: false,
      status: 404,
      message: "Source or target stack was not found.",
    };
  }

  if (sourceItem.itemId !== targetItem.itemId) {
    return {
      ok: false,
      status: 400,
      message: "Stacks must be the same item type to combine.",
    };
  }

  if (!isItemStackable(sourceItem.itemId)) {
    return {
      ok: false,
      status: 400,
      message: "Only stackable consumables can be combined.",
    };
  }

  const maxStack = getItemMaxStack(sourceItem.itemId);
  const requestedQuantity = normalizePositiveQuantity(
    parsedData.quantity,
    Number(sourceItem.quantity) || 1,
  );

  if (requestedQuantity > sourceItem.quantity) {
    return {
      ok: false,
      status: 400,
      message: "Not enough quantity in source stack.",
    };
  }

  const availableInTarget = maxStack - targetItem.quantity;

  if (availableInTarget <= 0) {
    return {
      ok: false,
      status: 400,
      message: "Target stack is already full.",
    };
  }

  if (requestedQuantity > availableInTarget) {
    return {
      ok: false,
      status: 400,
      message: `Target stack can only receive ${availableInTarget} more.`,
    };
  }

  const sourceAfter = sourceItem.quantity - requestedQuantity;

  await tx.characterItem.update({
    where: { id: targetItem.id },
    data: {
      quantity: {
        increment: requestedQuantity,
      },
    },
  });

  if (sourceAfter <= 0) {
    await tx.characterItem.delete({
      where: { id: sourceItem.id },
    });
  } else {
    await tx.characterItem.update({
      where: { id: sourceItem.id },
      data: {
        quantity: sourceAfter,
        isEquipped: false,
      },
    });
  }

  await tx.activityLog.create({
    data: {
      characterId: latestCharacter.id,
      type: "EQUIP",
      activityId: sourceItem.itemId,
      activityName: `Combine stack: ${sourceItem.itemName}`,
      success: true,
      staminaCost: 0,
      roll: 0,
      rollTotal: 0,
      successTarget: 0,
      statModifier: 0,
      chancePercent: 0,
      delta: {},
      beforeResources: getCharacterResourceSnapshot(latestCharacter),
      afterResources: getCharacterResourceSnapshot(latestCharacter),
      details: {
        action: "combine",
        item: {
          id: sourceItem.itemId,
          name: sourceItem.itemName,
          sourceItemRecordId: sourceItem.id,
          targetItemRecordId: targetItem.id,
          quantityChange: requestedQuantity,
          sourceQuantityBefore: sourceItem.quantity,
          sourceQuantityAfter: sourceAfter,
          targetQuantityBefore: targetItem.quantity,
          targetQuantityAfter: targetItem.quantity + requestedQuantity,
        },
      },
    },
  });

  const allItems = await fetchAllCharacterItems(tx, latestCharacter.id);

  return {
    ok: true,
    status: 200,
    message: `Combined ${requestedQuantity} stack item${requestedQuantity === 1 ? "" : "s"}.`,
    allItems,
    updatedCharacter: latestCharacter,
  };
}

async function processSplitAction({
  tx,
  latestCharacter,
  selectedItem,
  parsedData,
}) {
  const itemDefinition = getItemById(selectedItem.itemId);

  if (!isItemStackable(selectedItem.itemId)) {
    return {
      ok: false,
      status: 400,
      message: "Only stackable consumables can be split.",
    };
  }

  const splitQuantity = normalizePositiveQuantity(
    parsedData.quantity,
    Math.floor((Number(selectedItem.quantity) || 1) / 2),
  );

  if (splitQuantity <= 0 || splitQuantity >= selectedItem.quantity) {
    return {
      ok: false,
      status: 400,
      message: "Split quantity must be smaller than current stack quantity.",
    };
  }

  const sourceAfter = selectedItem.quantity - splitQuantity;

  await tx.characterItem.update({
    where: { id: selectedItem.id },
    data: {
      quantity: sourceAfter,
      isEquipped: false,
    },
  });

  await tx.characterItem.create({
    data: {
      characterId: latestCharacter.id,
      itemId: selectedItem.itemId,
      itemName: selectedItem.itemName,
      quantity: splitQuantity,
      isEquipped: false,
    },
  });

  await tx.activityLog.create({
    data: {
      characterId: latestCharacter.id,
      type: "EQUIP",
      activityId: selectedItem.itemId,
      activityName: `Split stack: ${selectedItem.itemName}`,
      success: true,
      staminaCost: 0,
      roll: 0,
      rollTotal: 0,
      successTarget: 0,
      statModifier: 0,
      chancePercent: 0,
      delta: {},
      beforeResources: getCharacterResourceSnapshot(latestCharacter),
      afterResources: getCharacterResourceSnapshot(latestCharacter),
      details: {
        action: "split",
        item: {
          id: selectedItem.itemId,
          name: selectedItem.itemName,
          itemRecordId: selectedItem.id,
          quantityChange: splitQuantity,
          quantityBefore: selectedItem.quantity,
          quantityAfter: sourceAfter,
          createdStackQuantity: splitQuantity,
          maxStack: getItemMaxStack(itemDefinition),
        },
      },
    },
  });

  const allItems = await fetchAllCharacterItems(tx, latestCharacter.id);

  return {
    ok: true,
    status: 200,
    message: `Split ${selectedItem.itemName} into ${sourceAfter} + ${splitQuantity}.`,
    allItems,
    updatedCharacter: latestCharacter,
  };
}

async function processUseAction({
  tx,
  latestCharacter,
  selectedItem,
  parsedData,
}) {
  const itemDefinition = getItemById(selectedItem.itemId);
  const itemCategory = getItemCategory(selectedItem.itemId);

  if (itemCategory !== "consumable") {
    return {
      ok: false,
      status: 400,
      message:
        `${selectedItem.itemName} cannot be used. ` +
        "Only consumables (like potions and tonics) can be used from inventory.",
    };
  }

  const useQuantity = normalizePositiveQuantity(parsedData.quantity, 1);

  if (useQuantity > selectedItem.quantity) {
    return {
      ok: false,
      status: 400,
      message: `You only have ${selectedItem.quantity} in this stack.`,
    };
  }

  const delta = buildConsumableDelta(itemDefinition, useQuantity);
  const rollBonusGain = getConsumableRollBonus(itemDefinition, useQuantity);
  const calculation = calculateCharacterResourceResult(latestCharacter, {
    delta,
  });

  if (!calculation.ok) {
    return {
      ok: false,
      status: 400,
      message: "Consumable use could not be processed.",
    };
  }

  const nextRollBonusAfterUse = Math.max(
    0,
    (Number(latestCharacter.nextActivityRollBonus) || 0) + rollBonusGain,
  );

  const updateCharacterResult = await tx.character.updateMany({
    where: {
      id: latestCharacter.id,
      updatedAt: latestCharacter.updatedAt,
    },
    data: {
      ...buildCharacterResourceUpdateInput(calculation.after),
      nextActivityRollBonus: nextRollBonusAfterUse,
    },
  });

  if (updateCharacterResult.count !== 1) {
    return {
      ok: false,
      status: 409,
      message: "Character resources changed. Please try again.",
    };
  }

  const quantityAfterUse = selectedItem.quantity - useQuantity;

  if (quantityAfterUse <= 0) {
    await tx.characterItem.delete({
      where: { id: selectedItem.id },
    });
  } else {
    await tx.characterItem.update({
      where: { id: selectedItem.id },
      data: {
        quantity: quantityAfterUse,
      },
    });
  }

  const updatedCharacter = await tx.character.findUnique({
    where: { id: latestCharacter.id },
    select: CHARACTER_SELECT,
  });

  await tx.activityLog.create({
    data: {
      characterId: latestCharacter.id,
      type: "EQUIP",
      activityId: selectedItem.itemId,
      activityName: `Use consumable: ${selectedItem.itemName}`,
      success: true,
      staminaCost: 0,
      roll: 0,
      rollTotal: 0,
      successTarget: 0,
      statModifier: 0,
      chancePercent: 0,
      delta: calculation.delta,
      beforeResources: calculation.before,
      afterResources: calculation.after,
      details: {
        action: "use",
        item: {
          id: selectedItem.itemId,
          name: selectedItem.itemName,
          itemRecordId: selectedItem.id,
          quantityUsed: useQuantity,
          quantityBefore: selectedItem.quantity,
          quantityAfter: quantityAfterUse,
          consumableEffects: itemDefinition?.effects?.consumable ?? {},
          nextActivityRollBonusBefore: latestCharacter.nextActivityRollBonus,
          nextActivityRollBonusAfter: nextRollBonusAfterUse,
        },
      },
    },
  });

  const allItems = await fetchAllCharacterItems(tx, latestCharacter.id);

  return {
    ok: true,
    status: 200,
    message: `Used ${useQuantity} ${selectedItem.itemName}${useQuantity > 1 ? "s" : ""}.`,
    allItems,
    updatedCharacter,
  };
}

async function processEquipOrUnequipAction({
  tx,
  action,
  latestCharacter,
  ownedItems,
  selectedItem,
}) {
  const itemDefinition = getItemById(selectedItem.itemId);

  if (!itemDefinition) {
    return {
      ok: false,
      status: 400,
      message: "Unknown item definition.",
    };
  }

  if (!EQUIPPABLE_SLOTS.has(itemDefinition.slot)) {
    return {
      ok: false,
      status: 400,
      message: "This item cannot be equipped.",
    };
  }

  const wasAlreadyEquipped = Boolean(selectedItem.isEquipped);

  if (action === "equip") {
    const sameSlotItemIds = ownedItems
      .filter(
        (item) =>
          getItemById(item.itemId)?.slot === itemDefinition.slot &&
          item.isEquipped,
      )
      .map((item) => item.id);

    if (sameSlotItemIds.length > 0) {
      await tx.characterItem.updateMany({
        where: {
          characterId: latestCharacter.id,
          id: { in: sameSlotItemIds },
        },
        data: { isEquipped: false },
      });
    }

    await tx.characterItem.update({
      where: { id: selectedItem.id },
      data: { isEquipped: true },
    });
  } else if (action === "unequip") {
    if (selectedItem.isEquipped) {
      await tx.characterItem.update({
        where: { id: selectedItem.id },
        data: { isEquipped: false },
      });
    }
  } else {
    return {
      ok: false,
      status: 400,
      message: "Unknown inventory action.",
    };
  }

  await tx.activityLog.create({
    data: {
      characterId: latestCharacter.id,
      type: "EQUIP",
      activityId: selectedItem.itemId,
      activityName:
        action === "equip"
          ? `Equip: ${selectedItem.itemName}`
          : `Unequip: ${selectedItem.itemName}`,
      success: true,
      staminaCost: 0,
      roll: 0,
      rollTotal: 0,
      successTarget: 0,
      statModifier: 0,
      chancePercent: 0,
      delta: {},
      beforeResources: getCharacterResourceSnapshot(latestCharacter),
      afterResources: getCharacterResourceSnapshot(latestCharacter),
      details: {
        action,
        item: {
          id: selectedItem.itemId,
          name: selectedItem.itemName,
          itemRecordId: selectedItem.id,
          slot: itemDefinition.slot,
          effects: itemDefinition.effects ?? {},
        },
      },
    },
  });

  const allItems = await fetchAllCharacterItems(tx, latestCharacter.id);

  return {
    ok: true,
    status: 200,
    message:
      action === "unequip"
        ? `${selectedItem.itemName} is now unequipped.`
        : wasAlreadyEquipped
          ? `${selectedItem.itemName} was already equipped.`
          : `${selectedItem.itemName} is now equipped.`,
    allItems,
    updatedCharacter: latestCharacter,
  };
}

export async function processInventoryActionTransaction({
  tx,
  action,
  latestCharacter,
  ownedItems,
  selectedItem,
  parsedData,
}) {
  if (isCharacterResting(latestCharacter)) {
    return {
      ok: false,
      status: 423,
      message: "You are currently resting. Cancel rest or wait for the rest pass to finish before managing inventory.",
    };
  }

  if (action === "combine") {
    return processCombineAction({
      tx,
      latestCharacter,
      ownedItems,
      parsedData,
    });
  }

  if (action === "split") {
    return processSplitAction({
      tx,
      latestCharacter,
      selectedItem,
      parsedData,
    });
  }

  if (action === "use") {
    return processUseAction({
      tx,
      latestCharacter,
      selectedItem,
      parsedData,
    });
  }

  return processEquipOrUnequipAction({
    tx,
    action,
    latestCharacter,
    ownedItems,
    selectedItem,
  });
}
