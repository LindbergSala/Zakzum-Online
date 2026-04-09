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
  buildConflictMessage,
  buildLoadErrorMessage,
  buildProcessingErrorMessage,
  jsonMessageResponse,
} from "../response-helpers";
import {
  CHARACTER_SELECT,
  INVENTORY_ITEM_SELECT,
  enrichInventoryItems,
  resolveOwnedItem,
} from "./route-helpers";
import {
  serializeInventoryActionPayload,
  serializeInventoryIndexPayload,
} from "./response-serializers";
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
        serializeInventoryIndexPayload({ activeCharacter, items }),
        { status: 200 },
      );
    } catch (caughtError) {
      logError("/api/game/inventory [GET]", caughtError, { userId: user.id });

      return jsonMessageResponse(buildLoadErrorMessage("inventory"), 500);
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
        return jsonMessageResponse(
          "You must create a character before you can manage inventory.",
          400,
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
        return jsonMessageResponse(result.message, result.status);
      }

      return NextResponse.json(
        serializeInventoryActionPayload({ result }),
        { status: 200 },
      );
    } catch (caughtError) {
      if (isSerializableConflictError(caughtError)) {
        return jsonMessageResponse(buildConflictMessage("Inventory action"), 409);
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

      return jsonMessageResponse(buildProcessingErrorMessage("inventory action"), 500);
    }
  };
}

export const GET = createInventoryGetHandler();
export const POST = createInventoryPostHandler();
