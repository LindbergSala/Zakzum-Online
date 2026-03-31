import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { getActiveCharacterForUser } from "@/lib/character";
import { validateWriteRequestOrigin } from "@/lib/csrf";
import { runSerializableTransaction } from "@/lib/db-transaction";
import {
  ONBOARDING_ZAKZUM_LORE_ACTIVITY_ID,
  ONBOARDING_ZAKZUM_LORE_LOG_DETAIL_ACTION,
} from "@/lib/onboarding";
import { getCharacterResourceSnapshot } from "@/lib/resource-rules";
import { logServerError } from "@/lib/server-logger";

const CHARACTER_LORE_LOG_SELECT = {
  id: true,
  hp: true,
  energy: true,
  maxEnergy: true,
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
      return NextResponse.json(
        { message: "You need an active character before completing onboarding lore." },
        { status: 400 },
      );
    }

    let payload = {};
    try {
      if (typeof request?.json === "function") {
        payload = await request.json();
      }
    } catch {
      return NextResponse.json(
        { message: "Invalid JSON in request body." },
        { status: 400 },
      );
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
            type: "SHOP",
            activityId: ONBOARDING_ZAKZUM_LORE_ACTIVITY_ID,
            activityName: "Zakzum Lore Discovery",
            success: true,
            energyCost: 0,
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
              category: "ONBOARDING_LORE",
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
        {
          recorded: markResult.recorded,
          message: markResult.recorded
            ? "Zakzum lore step recorded."
            : "Zakzum lore step already recorded.",
        },
        { status: 200 },
      );
    } catch (caughtError) {
      logError("/api/game/onboarding/complete-lore", caughtError, {
        userId: user.id,
        characterId: activeCharacter.id,
      });

      return NextResponse.json(
        { message: "Something went wrong while recording lore onboarding progress." },
        { status: 500 },
      );
    }
  };
}

export const POST = createCompleteOnboardingLorePostHandler();
