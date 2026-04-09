import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { parseAndValidateJsonRequestBody } from "@/lib/api-request";
import { getResolvedActiveCharacterForUser } from "@/lib/character";
import { ITEM_CATALOG } from "@/lib/items/catalog";
import { validateWriteRequestOrigin } from "@/lib/csrf";
import { isSerializableConflict, runSerializableTransaction } from "@/lib/db-transaction";
import { prisma } from "@/lib/prisma";
import { getCharacterResourceSnapshot } from "@/lib/resource-rules";
import { logServerError } from "@/lib/server-logger";
import { shopPurchaseSchema } from "@/lib/validators/core-loop";
import { MARKET_DEFINITION_MAP } from "@/lib/market-data";
import {
  OWNED_ITEM_SELECT,
  SHOP_CHARACTER_SELECT,
  buildMarketItemResponse,
  summarizeOwnedByItemId,
} from "./route-helpers";
import { processBuyTransaction, processSellTransaction } from "./transaction-actions";

export function createShopGetHandler(dependencies = {}) {
  const requireUser = dependencies.requireApiUser ?? requireApiUser;
  const resolveActiveCharacter =
    dependencies.getResolvedActiveCharacterForUser ?? getResolvedActiveCharacterForUser;
  const logError = dependencies.logServerError ?? logServerError;

  return async function getShop() {
    const { user, error } = await requireUser();

    if (error) {
      return error;
    }

    try {
      const activeCharacter = await resolveActiveCharacter(user.id);
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
          items: ITEM_CATALOG.map((item) =>
            buildMarketItemResponse(item, ownedById),
          ),
          resources: activeCharacter ? getCharacterResourceSnapshot(activeCharacter) : null,
        },
        { status: 200 },
      );
    } catch (caughtError) {
      logError("/api/game/shop [GET]", caughtError, { userId: user.id });

      return NextResponse.json(
        { message: "Something went wrong while loading the market." },
        { status: 500 },
      );
    }
  };
}

export function createShopPostHandler(dependencies = {}) {
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
  const processBuy = dependencies.processBuyTransaction ?? processBuyTransaction;
  const processSell = dependencies.processSellTransaction ?? processSellTransaction;
  const logError = dependencies.logServerError ?? logServerError;

  return async function postShop(request) {
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
    let action = "buy";

    try {
      const parsedRequest = await parseRequestBody(request, {
        schema: shopPurchaseSchema,
        invalidMessage: "Invalid market action.",
      });
      parsedData = parsedRequest.data;

      if (parsedRequest.response) {
        return parsedRequest.response;
      }

      action = parsedData.action ?? "buy";
      const requestedMarketId = parsedData.marketId ?? null;
      activeCharacter = await resolveActiveCharacter(user.id);

      if (!activeCharacter) {
        return NextResponse.json(
          { message: "You must create a character before you can use the market." },
          { status: 400 },
        );
      }

      if (action === "buy" && !parsedData.itemId) {
        return NextResponse.json(
          { message: "Buying requires an item id." },
          { status: 400 },
        );
      }

      const requestedMarket =
        action === "buy" && requestedMarketId
          ? MARKET_DEFINITION_MAP[requestedMarketId] ?? null
          : null;

      if (action === "buy" && !requestedMarketId) {
        return NextResponse.json(
          { message: "Buying requires a market id." },
          { status: 400 },
        );
      }

      if (
        action === "buy" &&
        (!requestedMarket ||
          requestedMarket.status !== "open" ||
          !requestedMarket.supportsPurchases)
      ) {
        return NextResponse.json(
          { message: "Selected vendor is not available for purchases." },
          { status: 400 },
        );
      }

      const result = await runTransaction(async (tx) => {
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
          return processSell({
            tx,
            latestCharacter,
            ownedItems,
            parsedData,
          });
        }

        return processBuy({
          tx,
          latestCharacter,
          ownedItems,
          parsedData,
          requestedMarket,
        });
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
      if (isSerializableConflictError(caughtError)) {
        return NextResponse.json(
          { message: "Market transaction conflicted with another update. Try again." },
          { status: 409 },
        );
      }

      logError("/api/game/shop", caughtError, {
        userId: user.id,
        characterId: activeCharacter?.id,
        action,
        itemId: parsedData?.itemId,
        itemRecordId: parsedData?.itemRecordId,
        quantity: parsedData?.quantity,
      });

      return NextResponse.json(
        { message: "Something went wrong while processing the market transaction." },
        { status: 500 },
      );
    }
  };
}

export const GET = createShopGetHandler();
export const POST = createShopPostHandler();
