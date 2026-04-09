import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { parseAndValidateJsonRequestBody } from "@/lib/api-request";
import { getResolvedActiveCharacterForUser } from "@/lib/character";
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

export function createInventoryGetHandler(dependencies = {}) {
  const requireUser = dependencies.requireApiUser ?? requireApiUser;
  const resolveActiveCharacter =
    dependencies.getResolvedActiveCharacterForUser ?? getResolvedActiveCharacterForUser;
  const logError = dependencies.logServerError ?? logServerError;

  return async function getInventory() {
    const { user, error } = await requireUser();

    if (error) {
      return error;
    }

    try {
      const activeCharacter = await resolveActiveCharacter(user.id);

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
    } catch (caughtError) {
      logError("/api/game/inventory [GET]", caughtError, { userId: user.id });

      return NextResponse.json(
        { message: "Something went wrong while loading inventory." },
        { status: 500 },
      );
    }
  };
}

export function createInventoryPostHandler(dependencies = {}) {
  const ensureOriginIsValid =
    dependencies.validateWriteRequestOrigin ?? validateWriteRequestOrigin;
  const requireUser = dependencies.requireApiUser ?? requireApiUser;
  const parseRequestBody =
    dependencies.parseAndValidateJsonRequestBody ?? parseAndValidateJsonRequestBody;
  const resolveActiveCharacter =
    dependencies.getResolvedActiveCharacterForUser ?? getResolvedActiveCharacterForUser;
  const runTransaction =
    dependencies.runSerializableTransaction ?? runSerializableTransaction;
  const isSerializableConflictError =
    dependencies.isSerializableConflict ?? isSerializableConflict;
  const processTransaction =
    dependencies.processInventoryActionTransaction ?? processInventoryActionTransaction;
  const logError = dependencies.logServerError ?? logServerError;

  return async function postInventory(request) {
    const originError = ensureOriginIsValid(request);
    if (originError) {
      return originError;
    }

    const { user, error } = await requireUser();

    if (error) {
      return error;
    }

    let activeCharacter = null;
    let parsedData = null;
    let action = "equip";

    try {
      const parsedRequest = await parseRequestBody(request, {
        schema: inventoryActionSchema,
        invalidMessage: "Invalid inventory action.",
      });
      parsedData = parsedRequest.data;

      if (parsedRequest.response) {
        return parsedRequest.response;
      }

      action = parsedData.action ?? "equip";
      activeCharacter = await resolveActiveCharacter(user.id);

      if (!activeCharacter) {
        return NextResponse.json(
          { message: "You must create a character before you can manage inventory." },
          { status: 400 },
        );
      }

      const result = await runTransaction(async (tx) => {
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

        return processTransaction({
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
      if (isSerializableConflictError(caughtError)) {
        return NextResponse.json(
          { message: "Inventory action conflicted with another update. Try again." },
          { status: 409 },
        );
      }

      logError("/api/game/inventory", caughtError, {
        userId: user.id,
        characterId: activeCharacter?.id,
        action,
        itemRecordId: parsedData?.itemRecordId,
        itemId: parsedData?.itemId,
        targetItemRecordId: parsedData?.targetItemRecordId,
        quantity: parsedData?.quantity,
      });

      return NextResponse.json(
        { message: "Something went wrong while processing inventory action." },
        { status: 500 },
      );
    }
  };
}

export const GET = createInventoryGetHandler();
export const POST = createInventoryPostHandler();
