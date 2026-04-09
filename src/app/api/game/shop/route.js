import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { parseAndValidateJsonRequestBody } from "@/lib/api-request";
import { getResolvedActiveCharacterForUser } from "@/lib/character";
import { validateWriteRequestOrigin } from "@/lib/csrf";
import { isSerializableConflict, runSerializableTransaction } from "@/lib/db-transaction";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/server-logger";
import { shopPurchaseSchema } from "@/lib/validators/core-loop";
import { MARKET_DEFINITION_MAP } from "@/lib/market-data";
import {
  buildConflictMessage,
  buildLoadErrorMessage,
  buildProcessingErrorMessage,
  jsonMessageResponse,
} from "../response-helpers";
import {
  OWNED_ITEM_SELECT,
  SHOP_CHARACTER_SELECT,
} from "./route-helpers";
import {
  serializeShopIndexPayload,
  serializeShopTransactionPayload,
} from "./response-serializers";
import { processBuyTransaction, processSellTransaction } from "./transaction-actions";

export function createShopGetHandler(dependencies = {}) {
  const requireUser = dependencies.requireApiUser ?? requireApiUser;
  const resolveActiveCharacter =
    dependencies.getResolvedActiveCharacterForUser ?? getResolvedActiveCharacterForUser;
  const prismaClient = dependencies.prismaClient ?? prisma;
  const logError = dependencies.logServerError ?? logServerError;

  return async function getShop() {
    const { user, error } = await requireUser();

    if (error) {
      return error;
    }

    try {
      const activeCharacter = await resolveActiveCharacter(user.id);
      const ownedItems = activeCharacter
        ? await prismaClient.characterItem.findMany({
            where: { characterId: activeCharacter.id },
            select: {
              itemId: true,
              quantity: true,
              isEquipped: true,
            },
          })
        : [];

      return NextResponse.json(
        serializeShopIndexPayload({ activeCharacter, ownedItems }),
        { status: 200 },
      );
    } catch (caughtError) {
      logError("/api/game/shop [GET]", caughtError, { userId: user.id });

      return jsonMessageResponse(buildLoadErrorMessage("the market"), 500);
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
        return jsonMessageResponse(
          "You must create a character before you can use the market.",
          400,
        );
      }

      if (action === "buy" && !parsedData.itemId) {
        return jsonMessageResponse("Buying requires an item id.", 400);
      }

      const requestedMarket =
        action === "buy" && requestedMarketId
          ? MARKET_DEFINITION_MAP[requestedMarketId] ?? null
          : null;

      if (action === "buy" && !requestedMarketId) {
        return jsonMessageResponse("Buying requires a market id.", 400);
      }

      if (
        action === "buy" &&
        (!requestedMarket ||
          requestedMarket.status !== "open" ||
          !requestedMarket.supportsPurchases)
      ) {
        return jsonMessageResponse(
          "Selected vendor is not available for purchases.",
          400,
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
        return jsonMessageResponse(result.message, result.status, {
          resources: result.resources,
        });
      }

      return NextResponse.json(
        serializeShopTransactionPayload({ result }),
        { status: 200 },
      );
    } catch (caughtError) {
      if (isSerializableConflictError(caughtError)) {
        return jsonMessageResponse(buildConflictMessage("Market transaction"), 409);
      }

      logError("/api/game/shop", caughtError, {
        userId: user.id,
        characterId: activeCharacter?.id,
        action,
        itemId: parsedData?.itemId,
        itemRecordId: parsedData?.itemRecordId,
        quantity: parsedData?.quantity,
      });

      return jsonMessageResponse(buildProcessingErrorMessage("the market transaction"), 500);
    }
  };
}

export const GET = createShopGetHandler();
export const POST = createShopPostHandler();
