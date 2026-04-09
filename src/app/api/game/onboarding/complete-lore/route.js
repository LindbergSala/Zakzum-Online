import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { parseJsonRequestBody } from "@/lib/api-request";
import { ACTIVITY_LOG_TYPES } from "@/lib/activity-log-types";
import { getActiveCharacterForUser } from "@/lib/character";
import { validateWriteRequestOrigin } from "@/lib/csrf";
import { runSerializableTransaction } from "@/lib/db-transaction";
import {
  ONBOARDING_ZAKZUM_LORE_ACTIVITY_ID,
  ONBOARDING_ZAKZUM_LORE_LOG_DETAIL_ACTION,
} from "@/lib/onboarding";
import { getCharacterResourceSnapshot } from "@/lib/resource-rules";
import { logServerError } from "@/lib/server-logger";
import {
  buildProcessingErrorMessage,
  jsonMessageResponse,
} from "../../response-helpers";
import { serializeOnboardingLoreRecordedPayload } from "../response-serializers";

const CHARACTER_LORE_LOG_SELECT = {
  id: true,
  hp: true,
  stamina: true,
  maxStamina: true,
  gold: true,
  xp: true,
  level: true,
  renown: true,
  heat: true,
};

function normalizeLorePayload(payload = {}) {
  const locationId =
    typeof payload.locationId === "string" ? payload.locationId.trim() : "";
  const locationName =
    typeof payload.locationName === "string" ? payload.locationName.trim() : "";
  const regionId =
    typeof payload.regionId === "string" ? payload.regionId.trim() : "";
  const regionName =
    typeof payload.regionName === "string" ? payload.regionName.trim() : "";

  return {
    locationId,
    locationName,
    regionId,
    regionName,
  };
}

export function createCompleteOnboardingLorePostHandler(dependencies = {}) {
  const ensureOriginIsValid =
    dependencies.validateWriteRequestOrigin ?? validateWriteRequestOrigin;
  const requireUser = dependencies.requireApiUser ?? requireApiUser;
  const resolveActiveCharacter =
    dependencies.getActiveCharacterForUser ?? getActiveCharacterForUser;
  const runTransaction =
    dependencies.runSerializableTransaction ?? runSerializableTransaction;
  const logError = dependencies.logServerError ?? logServerError;

  return async function completeOnboardingLorePost(request) {
    const originError = ensureOriginIsValid(request);
    if (originError) {
      return originError;
    }

    const { user, error } = await requireUser();
    if (error) {
      return error;
    }

    const activeCharacter = await resolveActiveCharacter(user.id);

    if (!activeCharacter) {
      return jsonMessageResponse(
        "You need an active character before completing onboarding lore.",
        400,
      );
    }

    const { body: payload, response: parseResponse } = await parseJsonRequestBody(
      request,
      {
        allowMissingJsonMethod: true,
        fallbackBody: {},
      },
    );

    if (parseResponse) {
      return parseResponse;
    }

    const lorePayload = normalizeLorePayload(payload);

    try {
      const markResult = await runTransaction(async (tx) => {
        const existingLoreLog = await tx.activityLog.findFirst({
          where: {
            characterId: activeCharacter.id,
            activityId: ONBOARDING_ZAKZUM_LORE_ACTIVITY_ID,
          },
          select: { id: true },
        });

        if (existingLoreLog) {
          return { recorded: false };
        }

        const character = await tx.character.findUnique({
          where: { id: activeCharacter.id },
          select: CHARACTER_LORE_LOG_SELECT,
        });

        if (!character) {
          return { recorded: false };
        }

        const resourcesSnapshot = getCharacterResourceSnapshot(character);

        await tx.activityLog.create({
          data: {
            characterId: activeCharacter.id,
            type: ACTIVITY_LOG_TYPES.ONBOARDING,
            activityId: ONBOARDING_ZAKZUM_LORE_ACTIVITY_ID,
            activityName: "Zakzum Lore Discovery",
            success: true,
            staminaCost: 0,
            roll: 0,
            rollTotal: 0,
            successTarget: 0,
            statModifier: 0,
            chancePercent: 100,
            delta: {},
            beforeResources: resourcesSnapshot,
            afterResources: resourcesSnapshot,
            details: {
              action: ONBOARDING_ZAKZUM_LORE_LOG_DETAIL_ACTION,
              category: "ONBOARDING",
              eventKind: "lore",
              locationId: lorePayload.locationId,
              locationName: lorePayload.locationName,
              regionId: lorePayload.regionId,
              regionName: lorePayload.regionName,
              isSystemLog: true,
            },
          },
          select: { id: true },
        });

        return { recorded: true };
      });

      return NextResponse.json(
        serializeOnboardingLoreRecordedPayload(markResult.recorded),
        { status: 200 },
      );
    } catch (caughtError) {
      logError("/api/game/onboarding/complete-lore", caughtError, {
        userId: user.id,
        characterId: activeCharacter.id,
      });

      return jsonMessageResponse(
        buildProcessingErrorMessage("lore onboarding progress"),
        500,
      );
    }
  };
}

export const POST = createCompleteOnboardingLorePostHandler();
