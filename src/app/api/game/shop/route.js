import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { getActiveCharacterForUser } from "@/lib/character";
import {
  canItemBePurchased,
  canItemBeSold,
  getItemMarketIds,
  getShopItemGoldCost,
  getShopItemMaxStack,
  getShopItemRenownCost,
  getShopItemSellValue,
  isShopItemStackable,
  SHOP_ITEM_DEFINITION_MAP,
  SHOP_ITEM_DEFINITIONS,
} from "@/lib/items/helpers";
import { isSerializableConflict, runSerializableTransaction } from "@/lib/db-transaction";
import { prisma } from "@/lib/prisma";
import {
  buildCharacterResourceUpdateInput,
  calculateCharacterResourceResult,
  getCharacterResourceSnapshot,
} from "@/lib/resource-rules";
import { logServerError } from "@/lib/server-logger";
import { formatItemEffectLabel } from "@/lib/stat-effects";
import { shopPurchaseSchema } from "@/lib/validators/core-loop";
import {
  getCharacterCarryWeightSummary,
  getItemWeightById,
} from "@/lib/weight-rules";

const SHOP_CHARACTER_SELECT = {
  id: true,
  hp: true,
  energy: true,
  gold: true,
  xp: true,
  level: true,
  renown: true,
  heat: true,
  strength: true,
  updatedAt: true,
};

const SHOP_CHARACTER_RESOURCE_SELECT = {
  id: true,
  hp: true,
  energy: true,
  gold: true,
  xp: true,
  level: true,
  renown: true,
  heat: true,
};

const OWNED_ITEM_SELECT = {
  id: true,
  itemId: true,
  itemName: true,
  quantity: true,
  isEquipped: true,
  createdAt: true,
};

function normalizePositiveQuantity(value, fallback = 1) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.max(1, Math.floor(numeric));
}

function summarizeOwnedByItemId(ownedItems) {
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

function buildMarketItemResponse(item, ownedById) {
  const ownedEntry = ownedById[item.id] ?? { quantity: 0, equipped: false };
  const isStackable = isShopItemStackable(item);
  const ownedQuantity = Number(ownedEntry.quantity) || 0;
  const marketIds = getItemMarketIds(item);

  return {
    id: item.id,
    name: item.name,
    marketId: marketIds[0] ?? null,
    marketIds,
    description: item.description,
    price: getShopItemGoldCost(item),
    renownPrice: getShopItemRenownCost(item),
    sellValue: getShopItemSellValue(item),
    weight: item.weight,
    slot: item.slot,
    effects: item.effects,
    effectLabel: formatItemEffectLabel(item.effects),
    owned: ownedQuantity > 0,
    ownedQuantity,
    equipped: Boolean(ownedEntry.equipped),
    isStackable,
    maxStack: getShopItemMaxStack(item),
    canBuy: canItemBePurchased(item) && (isStackable ? true : ownedQuantity === 0),
    canSell: ownedQuantity > 0,
  };
}

function buildBuyDelta(itemDefinition) {
  const delta = {};
  const goldCost = getShopItemGoldCost(itemDefinition);
  const renownCost = getShopItemRenownCost(itemDefinition);

  if (goldCost > 0) {
    delta.gold = -goldCost;
  }

  if (renownCost > 0) {
    delta.renown = -renownCost;
  }

  return delta;
}

function buildSellDelta(itemDefinition, quantity) {
  const sellValue = getShopItemSellValue(itemDefinition);
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

function hasAnySellValue(itemDefinition) {
  return canItemBeSold(itemDefinition);
}

function buildProjectedOwnedItemsForBuy(ownedItems, itemId) {
  const projected = ownedItems.map((item) => ({
    itemId: item.itemId,
    quantity: normalizePositiveQuantity(item.quantity, 1),
  }));

  const existing = projected.find((item) => item.itemId === itemId);

  if (existing) {
    existing.quantity += 1;
    return projected;
  }

  projected.push({
    itemId,
    quantity: 1,
  });

  return projected;
}

function pickSellItemRecord(ownedItems, { itemRecordId, itemId }) {
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

export async function GET() {
  const { user, error } = await requireApiUser();

  if (error) {
    return error;
  }

  const activeCharacter = await getActiveCharacterForUser(user.id);

  const ownedItems = activeCharacter
    ? await prisma.characterItem.findMany({
        where: { characterId: activeCharacter.id },
        select: {
          itemId: true,
          quantity: true,
          isEquipped: true,
        },
      })
    : [];

  const ownedById = summarizeOwnedByItemId(ownedItems);

  return NextResponse.json(
    {
      items: SHOP_ITEM_DEFINITIONS.map((item) =>
        buildMarketItemResponse(item, ownedById),
      ),
      resources: activeCharacter ? getCharacterResourceSnapshot(activeCharacter) : null,
    },
    { status: 200 },
  );
}

export async function POST(request) {
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

  const parsed = shopPurchaseSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Invalid market action.",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const action = parsed.data.action ?? "buy";
  const activeCharacter = await getActiveCharacterForUser(user.id);

  if (!activeCharacter) {
    return NextResponse.json(
      { message: "You must create a character before you can use the market." },
      { status: 400 },
    );
  }

  if (action === "buy" && !parsed.data.itemId) {
    return NextResponse.json(
      { message: "Buying requires an item id." },
      { status: 400 },
    );
  }

  try {
    const result = await runSerializableTransaction(async (tx) => {
      const latestCharacter = await tx.character.findUnique({
        where: { id: activeCharacter.id },
        select: SHOP_CHARACTER_SELECT,
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
        select: OWNED_ITEM_SELECT,
      });

      if (action === "sell") {
        const sellItemRecord = pickSellItemRecord(ownedItems, parsed.data);

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

        const sellQuantity = normalizePositiveQuantity(parsed.data.quantity, 1);

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

      const itemDefinition = SHOP_ITEM_DEFINITION_MAP[parsed.data.itemId];

      if (!itemDefinition) {
        return {
          ok: false,
          status: 400,
          message: "Unknown item.",
          resources: getCharacterResourceSnapshot(latestCharacter),
        };
      }
      if (!canItemBePurchased(itemDefinition)) {
        return {
          ok: false,
          status: 400,
          message: "This item cannot be purchased from market vendors.",
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
              marketId: getItemMarketIds(itemDefinition)[0] ?? null,
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
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          message: result.message,
          resources: result.resources,
        },
        { status: result.status },
      );
    }

    const actionPastTense = result.action === "sell" ? "sold" : "purchased";
    const soldWhileEquippedSuffix =
      result.action === "sell" && result.soldWhileEquipped
        ? " Item was unequipped automatically."
        : "";

    return NextResponse.json(
      {
        message:
          result.quantity > 1
            ? `${result.itemDefinition.name} x${result.quantity} ${actionPastTense}.${soldWhileEquippedSuffix}`
            : `${result.itemDefinition.name} ${actionPastTense}.${soldWhileEquippedSuffix}`,
        action: result.action,
        item: {
          id: result.itemDefinition.id,
          itemName: result.itemDefinition.name,
          quantityAfter: result.quantityAfter,
          itemRecordId: result.itemRecord?.id,
        },
        logId: result.logEntry?.id,
        resources: {
          before: result.calculation.before,
          after: getCharacterResourceSnapshot(result.updatedCharacter),
          delta: result.calculation.delta,
        },
      },
      { status: 200 },
    );
  } catch (caughtError) {
    if (isSerializableConflict(caughtError)) {
      return NextResponse.json(
        { message: "Market transaction conflicted with another update. Try again." },
        { status: 409 },
      );
    }

    logServerError("/api/game/shop", caughtError, {
      userId: user.id,
      characterId: activeCharacter.id,
      action,
      itemId: parsed.data.itemId,
      itemRecordId: parsed.data.itemRecordId,
      quantity: parsed.data.quantity,
    });
    return NextResponse.json(
      { message: "Something went wrong while processing the market transaction." },
      { status: 500 },
    );
  }
}
