import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { parseAndValidateJsonRequestBody } from "@/lib/api-request";
import { getResolvedActiveCharacterForUser } from "@/lib/character";
import { validateWriteRequestOrigin } from "@/lib/csrf";
import { isSerializableConflict, runSerializableTransaction } from "@/lib/db-transaction";
import {
  getCharacterHeatRestMeta,
  HEAT_REST_DURATION_MS,
  HEAT_REST_RECOVERY,
  isCharacterResting,
} from "@/lib/heat-rest";
import { logServerError } from "@/lib/server-logger";
import { restActionSchema } from "@/lib/validators/core-loop";
import {
  buildConflictMessage,
  buildLoadErrorMessage,
  buildProcessingErrorMessage,
  jsonMessageResponse,
} from "../response-helpers";
import {
  buildRestStartedMessage,
  serializeRestActionPayload,
  serializeRestStatePayload,
} from "./response-serializers";

const REST_CHARACTER_SELECT = {
  id: true,
  hp: true,
  stamina: true,
  maxStamina: true,
  staminaRegenAt: true,
  heat: true,
  heatRestEndsAt: true,
  gold: true,
  xp: true,
  level: true,
  renown: true,
  nextActivityRollBonus: true,
  updatedAt: true,
};

export function createRestGetHandler(dependencies = {}) {
  const requireUser = dependencies.requireApiUser ?? requireApiUser;
  const resolveActiveCharacter =
    dependencies.getResolvedActiveCharacterForUser ?? getResolvedActiveCharacterForUser;
  const logError = dependencies.logServerError ?? logServerError;

  return async function getRest() {
    const { user, error } = await requireUser();

    if (error) {
      return error;
    }

    try {
      const activeCharacter = await resolveActiveCharacter(user.id);

      return NextResponse.json(
        serializeRestStatePayload({
          activeCharacter,
          rest: activeCharacter ? getCharacterHeatRestMeta(activeCharacter) : null,
        }),
        { status: 200 },
      );
    } catch (caughtError) {
      logError("/api/game/rest [GET]", caughtError, { userId: user.id });

      return jsonMessageResponse(buildLoadErrorMessage("rest state"), 500);
    }
  };
}

export function createRestPostHandler(dependencies = {}) {
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
  const logError = dependencies.logServerError ?? logServerError;

  return async function postRest(request) {
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

    try {
      const parsedRequest = await parseRequestBody(request, {
        schema: restActionSchema,
        invalidMessage: "Invalid rest action.",
      });
      parsedData = parsedRequest.data;

      if (parsedRequest.response) {
        return parsedRequest.response;
      }

      activeCharacter = await resolveActiveCharacter(user.id);

      if (!activeCharacter) {
        return jsonMessageResponse(
          "You must create a character before you can rest.",
          400,
        );
      }

      const result = await runTransaction(async (tx) => {
        const latestCharacter = await tx.character.findUnique({
          where: { id: activeCharacter.id },
          select: REST_CHARACTER_SELECT,
        });

        if (!latestCharacter) {
          return {
            ok: false,
            status: 404,
            message: "Character was not found.",
          };
        }

        if (parsedData.action === "start") {
          if (isCharacterResting(latestCharacter)) {
            return {
              ok: false,
              status: 409,
              message: "Rest is already active.",
              resources: serializeRestStatePayload({
                activeCharacter: latestCharacter,
                rest: getCharacterHeatRestMeta(latestCharacter),
              }).resources,
              rest: getCharacterHeatRestMeta(latestCharacter),
            };
          }

          if ((Number(latestCharacter.heat) || 0) <= 0) {
            return {
              ok: false,
              status: 400,
              message: "Heat is already at 0.",
              resources: serializeRestStatePayload({
                activeCharacter: latestCharacter,
                rest: null,
              }).resources,
              rest: null,
            };
          }

          const heatRestEndsAt = new Date(Date.now() + HEAT_REST_DURATION_MS);
          const updateResult = await tx.character.updateMany({
            where: {
              id: latestCharacter.id,
              updatedAt: latestCharacter.updatedAt,
            },
            data: { heatRestEndsAt },
          });

          if (updateResult.count !== 1) {
            return {
              ok: false,
              status: 409,
              message: "Character state changed. Please try resting again.",
            };
          }

          const updatedCharacter = {
            ...latestCharacter,
            heatRestEndsAt,
          };

          return {
            ok: true,
            status: 200,
            message: buildRestStartedMessage(HEAT_REST_RECOVERY),
            resources: serializeRestStatePayload({
              activeCharacter: updatedCharacter,
              rest: getCharacterHeatRestMeta(updatedCharacter),
            }).resources,
            rest: getCharacterHeatRestMeta(updatedCharacter),
          };
        }

        if (!isCharacterResting(latestCharacter)) {
          return {
            ok: false,
            status: 400,
            message: "No active rest.",
            resources: serializeRestStatePayload({
              activeCharacter: latestCharacter,
              rest: null,
            }).resources,
            rest: null,
          };
        }

        const updateResult = await tx.character.updateMany({
          where: {
            id: latestCharacter.id,
            updatedAt: latestCharacter.updatedAt,
          },
          data: { heatRestEndsAt: null },
        });

        if (updateResult.count !== 1) {
          return {
            ok: false,
            status: 409,
            message: "Character state changed. Please try canceling rest again.",
          };
        }

        const updatedCharacter = {
          ...latestCharacter,
          heatRestEndsAt: null,
        };

        return {
          ok: true,
          status: 200,
          message: "Rest canceled.",
          resources: serializeRestStatePayload({
            activeCharacter: updatedCharacter,
            rest: null,
          }).resources,
          rest: null,
        };
      });

      return NextResponse.json(
        serializeRestActionPayload(result),
        { status: result.status },
      );
    } catch (caughtError) {
      if (isSerializableConflictError(caughtError)) {
        return jsonMessageResponse(buildConflictMessage("Rest action"), 409);
      }

      logError("/api/game/rest", caughtError, {
        userId: user.id,
        characterId: activeCharacter?.id,
        action: parsedData?.action,
      });

      return jsonMessageResponse(buildProcessingErrorMessage("rest"), 500);
    }
  };
}

export const GET = createRestGetHandler();
export const POST = createRestPostHandler();
