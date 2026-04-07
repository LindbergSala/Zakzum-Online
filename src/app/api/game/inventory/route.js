import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { parseAndValidateJsonRequestBody } from "@/lib/api-request";
import { getActiveCharacterForUser } from "@/lib/character";
import { isSerializableConflict, runSerializableTransaction } from "@/lib/db-transaction";
import { prisma } from "@/lib/prisma";
import { validateWriteRequestOrigin } from "@/lib/csrf";
import { getCharacterResourceSnapshot } from "@/lib/resource-rules";
import { logServerError } from "@/lib/server-logger";
import { getCharacterEffectiveStats } from "@/lib/stat-effects";
import { inventoryActionSchema } from "@/lib/validators/core-loop";
import {
  CHARACTER_SELECT,
  INVENTORY_ITEM_SELECT,
  enrichInventoryItems,
  resolveOwnedItem,
} from "./route-helpers";
import { processInventoryActionTransaction } from "./transaction-actions";

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

  const { data: parsedData, response: parseResponse } =
    await parseAndValidateJsonRequestBody(request, {
      schema: inventoryActionSchema,
      invalidMessage: "Invalid inventory action.",
    });

  if (parseResponse) {
    return parseResponse;
  }

  const action = parsedData.action ?? "equip";
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

      const selectedItem = resolveOwnedItem(ownedItems, parsedData);

      if ((action === "equip" || action === "unequip" || action === "split" || action === "use") && !selectedItem) {
        return {
          ok: false,
          status: 404,
          message: "You do not own this item.",
        };
      }

      return processInventoryActionTransaction({
        tx,
        action,
        latestCharacter,
        ownedItems,
        selectedItem,
        parsedData,
      });
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
      itemRecordId: parsedData.itemRecordId,
      itemId: parsedData.itemId,
      targetItemRecordId: parsedData.targetItemRecordId,
      quantity: parsedData.quantity,
    });
    return NextResponse.json(
      { message: "Something went wrong while processing inventory action." },
      { status: 500 },
    );
  }
}
