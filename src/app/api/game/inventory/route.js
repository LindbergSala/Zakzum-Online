import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { getActiveCharacterForUser } from "@/lib/character";
import { SHOP_ITEM_DEFINITION_MAP } from "@/lib/core-loop-data";
import { isSerializableConflict, runSerializableTransaction } from "@/lib/db-transaction";
import { prisma } from "@/lib/prisma";
import { getCharacterResourceSnapshot } from "@/lib/resource-rules";
import { logServerError } from "@/lib/server-logger";
import {
  formatItemEffectLabel,
  getCharacterEffectiveStats,
} from "@/lib/stat-effects";
import { inventoryEquipSchema } from "@/lib/validators/core-loop";

function enrichInventoryItems(items) {
  return items.map((item) => {
    const definition = SHOP_ITEM_DEFINITION_MAP[item.itemId];

    return {
      ...item,
      slot: definition?.slot ?? "unknown",
      effects: definition?.effects ?? { stats: {} },
      effectLabel: formatItemEffectLabel(definition?.effects),
    };
  });
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
    select: {
      id: true,
      itemId: true,
      itemName: true,
      isEquipped: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const enrichedItems = enrichInventoryItems(items);
  const equippedItems = enrichedItems.filter((item) => item.isEquipped);
  const statSummary = getCharacterEffectiveStats(activeCharacter, equippedItems);

  return NextResponse.json(
    {
      items: enrichedItems,
      resources: getCharacterResourceSnapshot(activeCharacter),
      stats: statSummary,
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

  const parsed = inventoryEquipSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Invalid item selection.",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const activeCharacter = await getActiveCharacterForUser(user.id);

  if (!activeCharacter) {
    return NextResponse.json(
      { message: "You must create a character before you can equip items." },
      { status: 400 },
    );
  }

  const itemId = parsed.data.itemId;
  const action = parsed.data.action ?? "equip";
  const itemDefinition = SHOP_ITEM_DEFINITION_MAP[itemId];
  if (!itemDefinition) {
    return NextResponse.json(
      { message: "Unknown item definition." },
      { status: 400 },
    );
  }

  const currentResources = getCharacterResourceSnapshot(activeCharacter);
  let result;
  try {
    result = await runSerializableTransaction(async (tx) => {
      const latestCharacter = await tx.character.findUnique({
        where: { id: activeCharacter.id },
        select: { id: true },
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
        select: {
          id: true,
          itemId: true,
          itemName: true,
          isEquipped: true,
        },
      });
      const ownedItem = ownedItems.find((item) => item.itemId === itemId);

      if (!ownedItem) {
        return {
          ok: false,
          status: 404,
          message: "You do not own this item.",
        };
      }

      let equippedItem = null;
      let wasAlreadyEquipped = Boolean(ownedItem.isEquipped);

      if (action === "equip") {
        const sameSlotItemIds = ownedItems
          .filter(
            (item) =>
              SHOP_ITEM_DEFINITION_MAP[item.itemId]?.slot === itemDefinition.slot,
          )
          .map((item) => item.itemId);

        if (sameSlotItemIds.length > 0) {
          await tx.characterItem.updateMany({
            where: {
              characterId: latestCharacter.id,
              itemId: { in: sameSlotItemIds },
            },
            data: { isEquipped: false },
          });
        }

        equippedItem = await tx.characterItem.update({
          where: {
            characterId_itemId: {
              characterId: latestCharacter.id,
              itemId,
            },
          },
          data: { isEquipped: true },
          select: {
            id: true,
            itemId: true,
            itemName: true,
            isEquipped: true,
          },
        });
      } else {
        if (!ownedItem.isEquipped) {
          return {
            ok: true,
            equippedItem: ownedItem,
            allItems: ownedItems,
            logEntry: null,
            ownedItem,
            wasAlreadyEquipped: false,
            action,
          };
        }

        equippedItem = await tx.characterItem.update({
          where: {
            characterId_itemId: {
              characterId: latestCharacter.id,
              itemId,
            },
          },
          data: { isEquipped: false },
          select: {
            id: true,
            itemId: true,
            itemName: true,
            isEquipped: true,
          },
        });
      }

      const allItems = await tx.characterItem.findMany({
        where: { characterId: latestCharacter.id },
        select: {
          id: true,
          itemId: true,
          itemName: true,
          isEquipped: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      const equippedInSameSlot = allItems.filter(
        (item) =>
          item.isEquipped &&
          SHOP_ITEM_DEFINITION_MAP[item.itemId]?.slot === itemDefinition.slot,
      );

      if (action === "equip" && equippedInSameSlot.length > 1) {
        throw new Error("SLOT_EQUIP_CONFLICT");
      }

      const logEntry = await tx.activityLog.create({
        data: {
          characterId: latestCharacter.id,
          type: "EQUIP",
          activityId: itemId,
          activityName:
            action === "equip"
              ? `Equip: ${ownedItem.itemName}`
              : `Unequip: ${ownedItem.itemName}`,
          success: true,
          energyCost: 0,
          roll: 0,
          rollTotal: 0,
          successTarget: 0,
          statModifier: 0,
          chancePercent: 0,
          delta: {},
          beforeResources: currentResources,
          afterResources: currentResources,
          details: {
            item: {
              id: itemId,
              name: ownedItem.itemName,
              slot: itemDefinition.slot,
              effects: itemDefinition.effects ?? {},
            },
          },
        },
        select: { id: true },
      });

      return {
        ok: true,
        equippedItem,
        allItems,
        logEntry,
        ownedItem,
        wasAlreadyEquipped,
        action,
      };
    });
  } catch (error) {
    if (error instanceof Error && error.message === "SLOT_EQUIP_CONFLICT") {
      return NextResponse.json(
        { message: "Equip conflict detected: only one item can be equipped per slot." },
        { status: 409 },
      );
    }

    if (isSerializableConflict(error)) {
      return NextResponse.json(
        { message: "Equip could not be completed due to a slot conflict. Try again." },
        { status: 409 },
      );
    }

    logServerError("/api/game/inventory", error, {
      userId: user.id,
      characterId: activeCharacter.id,
      itemId,
    });
    return NextResponse.json(
      { message: "Something went wrong while processing equip." },
      { status: 500 },
    );
  }

  if (!result.ok) {
    return NextResponse.json(
      { message: result.message },
      { status: result.status },
    );
  }

  const enrichedItems = enrichInventoryItems(result.allItems);
  const equippedItems = enrichedItems.filter((item) => item.isEquipped);
  const statSummary = getCharacterEffectiveStats(activeCharacter, equippedItems);

  return NextResponse.json(
    {
      message:
        result.action === "unequip"
          ? `${result.ownedItem.itemName} is now unequipped.`
          : result.wasAlreadyEquipped
            ? `${result.ownedItem.itemName} was already equipped.`
            : `${result.ownedItem.itemName} is now equipped.`,
      item: result.equippedItem,
      logId: result.logEntry?.id ?? null,
      items: enrichedItems,
      resources: getCharacterResourceSnapshot(activeCharacter),
      stats: statSummary,
    },
    { status: 200 },
  );
}
