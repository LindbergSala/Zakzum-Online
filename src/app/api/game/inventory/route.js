import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { getActiveCharacterForUser } from "@/lib/character";
import {
  getItemById,
  getItemMaxStack,
  isItemStackable,
} from "@/lib/items/helpers";
import { EQUIPPABLE_ITEM_SLOTS } from "@/lib/items/constants";
import { isSerializableConflict, runSerializableTransaction } from "@/lib/db-transaction";
import { prisma } from "@/lib/prisma";
import { validateWriteRequestOrigin } from "@/lib/csrf";
import {
  buildCharacterResourceUpdateInput,
  calculateCharacterResourceResult,
  getCharacterResourceSnapshot,
} from "@/lib/resource-rules";
import { logServerError } from "@/lib/server-logger";
import {
  formatItemEffectLabel,
  getCharacterEffectiveStats,
} from "@/lib/stat-effects";
import { inventoryActionSchema } from "@/lib/validators/core-loop";

const EQUIPPABLE_SLOTS = new Set(EQUIPPABLE_ITEM_SLOTS);

const CHARACTER_SELECT = {
  id: true,
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
  updatedAt: true,
};

const INVENTORY_ITEM_SELECT = {
  id: true,
  itemId: true,
  itemName: true,
  quantity: true,
  isEquipped: true,
  createdAt: true,
};

function enrichInventoryItems(items) {
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

function normalizePositiveQuantity(value, fallback = 1) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.max(1, Math.floor(numeric));
}

function resolveOwnedItem(ownedItems, { itemRecordId, itemId }) {
  if (itemRecordId) {
    return ownedItems.find((item) => item.id === itemRecordId) ?? null;
  }

  if (!itemId) {
    return null;
  }

  return (
    ownedItems.find((item) => item.itemId === itemId && item.isEquipped) ??
    ownedItems.find((item) => item.itemId === itemId) ??
    null
  );
}

function buildConsumableDelta(itemDefinition, quantity) {
  const consumable = itemDefinition?.effects?.consumable ?? {};
  const usedQuantity = normalizePositiveQuantity(quantity, 1);

  return {
    hp: (Number(consumable.hpRestore) || 0) * usedQuantity,
    energy: (Number(consumable.energyRestore) || 0) * usedQuantity,
    heat: -1 * (Number(consumable.heatReduction) || 0) * usedQuantity,
  };
}

function getConsumableRollBonus(itemDefinition, quantity) {
  const consumable = itemDefinition?.effects?.consumable ?? {};
  const usedQuantity = normalizePositiveQuantity(quantity, 1);

  return (Number(consumable.activityRollModifier) || 0) * usedQuantity;
}

export async function GET() {
  const { user, error } = await requireApiUser();

  if (error) {
    return error;
  }

  const activeCharacter = await getActiveCharacterForUser(user.id);

  if (!activeCharacter) {
    return NextResponse.json(
      { items: [], resources: null, stats: null },
      { status: 200 },
    );
  }

  const items = await prisma.characterItem.findMany({
    where: { characterId: activeCharacter.id },
    select: INVENTORY_ITEM_SELECT,
    orderBy: [{ createdAt: "desc" }],
  });

  const enrichedItems = enrichInventoryItems(items);
  const equippedItems = enrichedItems.filter((item) => item.isEquipped);
  const statSummary = getCharacterEffectiveStats(activeCharacter, equippedItems);

  return NextResponse.json(
    {
      items: enrichedItems,
      resources: getCharacterResourceSnapshot(activeCharacter),
      stats: statSummary,
      nextActivityRollBonus: Number(activeCharacter.nextActivityRollBonus) || 0,
    },
    { status: 200 },
  );
}

export async function POST(request) {
  const originError = validateWriteRequestOrigin(request);
  if (originError) {
    return originError;
  }

  const { user, error } = await requireApiUser();

  if (error) {
    return error;
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid JSON in request body." },
      { status: 400 },
    );
  }

  const parsed = inventoryActionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Invalid inventory action.",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const action = parsed.data.action ?? "equip";
  const activeCharacter = await getActiveCharacterForUser(user.id);

  if (!activeCharacter) {
    return NextResponse.json(
      { message: "You must create a character before you can manage inventory." },
      { status: 400 },
    );
  }

  try {
    const result = await runSerializableTransaction(async (tx) => {
      const latestCharacter = await tx.character.findUnique({
        where: { id: activeCharacter.id },
        select: CHARACTER_SELECT,
      });

      if (!latestCharacter) {
        return {
          ok: false,
          status: 404,
          message: "Character was not found.",
        };
      }

      const ownedItems = await tx.characterItem.findMany({
        where: { characterId: latestCharacter.id },
        select: INVENTORY_ITEM_SELECT,
      });

      const selectedItem = resolveOwnedItem(ownedItems, parsed.data);

      if ((action === "equip" || action === "unequip" || action === "split" || action === "use") && !selectedItem) {
        return {
          ok: false,
          status: 404,
          message: "You do not own this item.",
        };
      }

      if (action === "combine") {
        if (!parsed.data.itemRecordId || !parsed.data.targetItemRecordId) {
          return {
            ok: false,
            status: 400,
            message: "Combine requires source and target stack ids.",
          };
        }

        if (parsed.data.itemRecordId === parsed.data.targetItemRecordId) {
          return {
            ok: false,
            status: 400,
            message: "Cannot combine a stack into itself.",
          };
        }

        const sourceItem = ownedItems.find((item) => item.id === parsed.data.itemRecordId);
        const targetItem = ownedItems.find((item) => item.id === parsed.data.targetItemRecordId);

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
          parsed.data.quantity,
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
            energyCost: 0,
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

        const allItems = await tx.characterItem.findMany({
          where: { characterId: latestCharacter.id },
          select: INVENTORY_ITEM_SELECT,
          orderBy: [{ createdAt: "desc" }],
        });

        return {
          ok: true,
          status: 200,
          message: `Combined ${requestedQuantity} stack item${requestedQuantity === 1 ? "" : "s"}.`,
          allItems,
          updatedCharacter: latestCharacter,
        };
      }

      if (action === "split") {
        const itemDefinition = getItemById(selectedItem.itemId);

        if (!isItemStackable(selectedItem.itemId)) {
          return {
            ok: false,
            status: 400,
            message: "Only stackable consumables can be split.",
          };
        }

        const splitQuantity = normalizePositiveQuantity(
          parsed.data.quantity,
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
            energyCost: 0,
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

        const allItems = await tx.characterItem.findMany({
          where: { characterId: latestCharacter.id },
          select: INVENTORY_ITEM_SELECT,
          orderBy: [{ createdAt: "desc" }],
        });

        return {
          ok: true,
          status: 200,
          message: `Split ${selectedItem.itemName} into ${sourceAfter} + ${splitQuantity}.`,
          allItems,
          updatedCharacter: latestCharacter,
        };
      }

      if (action === "use") {
        const itemDefinition = getItemById(selectedItem.itemId);

        if (!isItemStackable(selectedItem.itemId)) {
          return {
            ok: false,
            status: 400,
            message: "Only consumables can be used from inventory.",
          };
        }

        const useQuantity = normalizePositiveQuantity(parsed.data.quantity, 1);

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

        const allItems = await tx.characterItem.findMany({
          where: { characterId: latestCharacter.id },
          select: INVENTORY_ITEM_SELECT,
          orderBy: [{ createdAt: "desc" }],
        });

        return {
          ok: true,
          status: 200,
          message: `Used ${useQuantity} ${selectedItem.itemName}${useQuantity > 1 ? "s" : ""}.`,
          allItems,
          updatedCharacter,
        };
      }

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
          energyCost: 0,
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

      const allItems = await tx.characterItem.findMany({
        where: { characterId: latestCharacter.id },
        select: INVENTORY_ITEM_SELECT,
        orderBy: [{ createdAt: "desc" }],
      });

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
    });

    if (!result.ok) {
      return NextResponse.json(
        { message: result.message },
        { status: result.status },
      );
    }

    const enrichedItems = enrichInventoryItems(result.allItems);
    const equippedItems = enrichedItems.filter((item) => item.isEquipped);
    const statSummary = getCharacterEffectiveStats(result.updatedCharacter, equippedItems);

    return NextResponse.json(
      {
        message: result.message,
        items: enrichedItems,
        resources: getCharacterResourceSnapshot(result.updatedCharacter),
        stats: statSummary,
        nextActivityRollBonus:
          Number(result.updatedCharacter.nextActivityRollBonus) || 0,
      },
      { status: 200 },
    );
  } catch (caughtError) {
    if (isSerializableConflict(caughtError)) {
      return NextResponse.json(
        { message: "Inventory action conflicted with another update. Try again." },
        { status: 409 },
      );
    }

    logServerError("/api/game/inventory", caughtError, {
      userId: user.id,
      characterId: activeCharacter.id,
      action,
      itemRecordId: parsed.data.itemRecordId,
      itemId: parsed.data.itemId,
      targetItemRecordId: parsed.data.targetItemRecordId,
      quantity: parsed.data.quantity,
    });
    return NextResponse.json(
      { message: "Something went wrong while processing inventory action." },
      { status: 500 },
    );
  }
}
