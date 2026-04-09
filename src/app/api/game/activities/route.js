import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { requireApiUser } from "@/lib/api-auth";
import { parseAndValidateJsonRequestBody } from "@/lib/api-request";
import { getResolvedActiveCharacterForUser } from "@/lib/character";
import {
  ACTIVITY_DEFINITION_MAP,
  ACTIVITY_DEFINITIONS,
  ACTIVITY_GROUPS,
  getActivityGroupAvailability,
  isActivityGroupOpen,
} from "@/lib/core-loop-data";
import { validateWriteRequestOrigin } from "@/lib/csrf";
import { isSerializableConflict, runSerializableTransaction } from "@/lib/db-transaction";
import { getCharacterResourceSnapshot } from "@/lib/resource-rules";
import { logServerError } from "@/lib/server-logger";
import { getLevelProgressMeta } from "@/lib/level-progression";
import { getClassPassiveStaminaRefreshBonus } from "@/lib/class-identity";
import { getSessionTokenFromRequestCookies, hashSessionToken } from "@/lib/session";
import { activityActionSchema } from "@/lib/validators/core-loop";
import {
  HALF_ORC_RELENTLESS_COOKIE_NAME,
  buildActivityContext,
} from "./route-helpers";
import { processActivityTransaction } from "./transaction-actions";

function serializeActivity(activity, { includeRiskProfile = false } = {}) {
  const serializedActivity = {
    id: activity.id,
    groupId: activity.groupId,
    tier: activity.tier,
    name: activity.name,
    locationId: activity.locationId ?? null,
    locationName: activity.locationName ?? null,
    locationTitle: activity.locationTitle ?? null,
    regionId: activity.regionId ?? null,
    regionName: activity.regionName ?? null,
    staminaCost: activity.staminaCost,
    successReward: activity.successReward,
    failPenalty: activity.failPenalty,
  };

  if (includeRiskProfile) {
    serializedActivity.riskProfile = activity.riskProfile;
  }

  return serializedActivity;
}

function serializeActivityGroup(group) {
  return {
    availability: getActivityGroupAvailability(group.id),
    id: group.id,
    name: group.name,
    tagline: group.tagline,
    summary: group.summary,
    regionId: group.regionId ?? null,
    regionName: group.regionName ?? null,
    overviewBadges: group.overviewBadges ?? [],
    activities: ACTIVITY_DEFINITIONS.filter((activity) => activity.groupId === group.id)
      .sort((left, right) => (left.tier ?? 0) - (right.tier ?? 0))
      .map((activity) => serializeActivity(activity, { includeRiskProfile: true })),
  };
}

export function createActivitiesGetHandler(dependencies = {}) {
  const requireUser = dependencies.requireApiUser ?? requireApiUser;
  const resolveActiveCharacter =
    dependencies.getResolvedActiveCharacterForUser ?? getResolvedActiveCharacterForUser;
  const logError = dependencies.logServerError ?? logServerError;

  return async function getActivities() {
    const { user, error } = await requireUser();

    if (error) {
      return error;
    }

    try {
      const activeCharacter = await resolveActiveCharacter(user.id);

      return NextResponse.json(
        {
          groups: ACTIVITY_GROUPS.map(serializeActivityGroup),
          activities: ACTIVITY_DEFINITIONS.map((activity) =>
            serializeActivity(activity),
          ),
          resources: activeCharacter ? getCharacterResourceSnapshot(activeCharacter) : null,
        },
        { status: 200 },
      );
    } catch (caughtError) {
      logError("/api/game/activities [GET]", caughtError, { userId: user.id });

      return NextResponse.json(
        { message: "Something went wrong while loading activities." },
        { status: 500 },
      );
    }
  };
}

export function createActivitiesPostHandler(dependencies = {}) {
  const ensureOriginIsValid =
    dependencies.validateWriteRequestOrigin ?? validateWriteRequestOrigin;
  const requireUser = dependencies.requireApiUser ?? requireApiUser;
  const parseRequestBody =
    dependencies.parseAndValidateJsonRequestBody ?? parseAndValidateJsonRequestBody;
  const resolveActiveCharacter =
    dependencies.getResolvedActiveCharacterForUser ?? getResolvedActiveCharacterForUser;
  const getSessionToken =
    dependencies.getSessionTokenFromRequestCookies ?? getSessionTokenFromRequestCookies;
  const getCookieStore = dependencies.cookies ?? cookies;
  const runTransaction =
    dependencies.runSerializableTransaction ?? runSerializableTransaction;
  const isSerializableConflictError =
    dependencies.isSerializableConflict ?? isSerializableConflict;
  const processTransaction =
    dependencies.processActivityTransaction ?? processActivityTransaction;
  const logError = dependencies.logServerError ?? logServerError;

  return async function postActivities(request) {
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
        schema: activityActionSchema,
        invalidMessage: "Invalid activity.",
      });
      parsedData = parsedRequest.data;

      if (parsedRequest.response) {
        return parsedRequest.response;
      }

      activeCharacter = await resolveActiveCharacter(user.id);

      if (!activeCharacter) {
        return NextResponse.json(
          { message: "You must create a character before you can do activities." },
          { status: 400 },
        );
      }

      const sessionToken = await getSessionToken();
      const sessionTokenHash = sessionToken ? hashSessionToken(sessionToken) : null;
      const cookieStore = await getCookieStore();
      const halfOrcRelentlessCookieValue =
        cookieStore.get(HALF_ORC_RELENTLESS_COOKIE_NAME)?.value ?? "";
      const halfOrcRelentlessUsedThisSession = Boolean(
        sessionTokenHash && halfOrcRelentlessCookieValue === sessionTokenHash,
      );
      const activity = ACTIVITY_DEFINITION_MAP[parsedData.activityId];

      if (!activity) {
        return NextResponse.json(
          { message: "Activity was not found." },
          { status: 404 },
        );
      }

      const activityGroupId = activity.groupId ?? activity.id;
      const activityGroupAvailability = getActivityGroupAvailability(activityGroupId);

      if (!isActivityGroupOpen(activityGroupId)) {
        return NextResponse.json(
          {
            message:
              activityGroupAvailability.reason ||
              "This activity group is currently unavailable.",
          },
          { status: 403 },
        );
      }

      const activityContext = buildActivityContext(activity);
      const result = await runTransaction((tx) =>
        processTransaction({
          tx,
          activeCharacterId: activeCharacter.id,
          activity,
          activityGroupId,
          activityContext,
          halfOrcRelentlessUsedThisSession,
        }),
      );

      if (!result.ok) {
        return NextResponse.json(
          {
            message: result.message,
            requiredStamina: result.requiredStamina,
            currentStamina: result.currentStamina,
            requiredHp: result.requiredHp,
            currentHp: result.currentHp,
            resources: result.resources,
          },
          { status: result.status },
        );
      }

      const baseMessage = result.leveledUp
        ? result.rollResult.success
          ? `${activity.name} succeeded. Level up! You are now level ${result.calculation.after.level} and gained ${result.gainedStatPoints} stat point${result.gainedStatPoints === 1 ? "" : "s"}.`
          : `${activity.name} failed. Level up! You are now level ${result.calculation.after.level} and gained ${result.gainedStatPoints} stat point${result.gainedStatPoints === 1 ? "" : "s"}.`
        : result.rollResult.success
          ? `${activity.name} succeeded.`
          : `${activity.name} failed.`;
      const lootMessageSuffix = result.loot?.name
        ? ` Loot found: ${result.loot.name}.`
        : "";
      const lootBlockedByCarryMessageSuffix = result.lootBlockedByCarry
        ? " Loot found, but you are carrying too much to keep it."
        : "";

      const response = NextResponse.json(
        {
          message: `${baseMessage}${lootMessageSuffix}${lootBlockedByCarryMessageSuffix}`,
          action: {
            id: activity.id,
            groupId: result.activityGroupId,
            name: activity.name,
            locationId: activityContext?.locationId ?? null,
            locationName: activityContext?.locationName ?? null,
            locationTitle: activityContext?.locationTitle ?? null,
            regionId: activityContext?.regionId ?? null,
            regionName: activityContext?.regionName ?? null,
            staminaCost: result.activityStaminaCost,
          },
          result: {
            success: result.rollResult.success,
            staminaCost: result.activityStaminaCost,
            activityContext,
            progression: {
              leveledUp: result.leveledUp,
              gainedStatPoints: result.gainedStatPoints,
              levelBefore: result.calculation.before.level,
              levelAfter: result.calculation.after.level,
              xp: getLevelProgressMeta(
                result.calculation.after.level,
                result.calculation.after.xp,
              ),
              unspentStatPoints: result.updatedCharacter.unspentStatPoints,
            },
            classIdentity: {
              class: result.characterClass,
              passive: result.classPassive,
              activityGroupId: result.activityGroupId,
              baseStaminaCost: activity.staminaCost,
              effectiveStaminaCost: result.activityStaminaCost,
              passiveStaminaCostReduction: Math.max(
                0,
                activity.staminaCost - result.activityStaminaCost,
              ),
              passiveRollModifier: result.classRollModifier,
              passiveStaminaRefreshBonus: getClassPassiveStaminaRefreshBonus(
                result.characterClass,
              ),
              passiveDeltaBonus: result.classPassiveResolvedDelta.deltaBonus,
            },
            raceIdentity: {
              race: result.characterRace,
              passive: result.racePassive,
              activityGroupId: result.activityGroupId,
              passiveRollModifier: result.raceRollModifier,
              passiveDeltaBonus: result.racePassiveResolvedDelta.deltaBonus,
              halfOrcRelentlessTriggered: result.halfOrcRelentlessTriggered,
              halfOrcRelentlessDeltaBonus: result.halfOrcRelentlessDeltaBonus,
              halfOrcRelentlessAlreadyUsed: result.halfOrcRelentlessAlreadyUsed,
            },
            itemIdentity: {
              passiveRollModifier: result.itemRollModifier,
              activityGroupId: result.activityGroupId,
              passiveDeltaBonus: result.itemResolvedDelta.deltaBonus,
            },
            consumableIdentity: {
              consumedNextActivityRollBonus: result.consumableRollModifier,
              remainingNextActivityRollBonus: result.updatedCharacter.nextActivityRollBonus,
            },
            roll: {
              value: result.rollResult.roll,
              total: result.rollResult.rollTotal,
              target: result.rollResult.successTarget,
              baseTarget: result.rollResult.baseSuccessTarget,
              difficultyLevelScaling: result.rollResult.difficultyLevelScaling,
              statModifier: result.rollResult.statModifier,
              totalRollBonus: result.rollResult.totalRollBonus,
              statContribution: result.rollResult.calculations.statContribution,
              primaryContribution: result.rollResult.calculations.primaryContribution,
              secondaryContribution: result.rollResult.calculations.secondaryContribution,
              levelContribution: result.rollResult.calculations.levelContribution,
              baseStatModifier: result.rollResult.calculations.baseStatModifier,
              levelModifier: result.rollResult.calculations.levelModifier,
              passiveRollModifier: result.passiveRollModifier,
              itemRollModifier: result.itemRollModifier,
              consumableRollModifier: result.consumableRollModifier,
              totalPassiveRollModifier: result.totalRollModifier,
              characterLevel: result.rollResult.calculations.characterLevel,
              chancePercent: result.rollResult.chancePercent,
              heat: result.rollResult.calculations.heat,
              heatRollModifier: result.rollResult.calculations.heatRollModifier,
              heatBuildUp: result.activityHeatBuildUp,
              primaryStat: result.rollResult.calculations.primaryStat,
              secondaryStat: result.rollResult.calculations.secondaryStat,
              primaryStatValue: result.rollResult.calculations.primaryStatValue,
              secondaryStatValue: result.rollResult.calculations.secondaryStatValue,
              effectivePrimaryStat: result.rollResult.calculations.effectivePrimaryStat,
              effectiveSecondaryStat: result.rollResult.calculations.effectiveSecondaryStat,
              primaryModifier: result.rollResult.calculations.primaryModifier,
              secondaryModifier: result.rollResult.calculations.secondaryModifier,
              scale: result.rollResult.scale,
            },
            stats: result.statSummary,
            delta: result.calculation.delta,
            totals: {
              before: result.calculation.before,
              after: getCharacterResourceSnapshot(result.updatedCharacter),
            },
            loot: result.loot ?? null,
            lootBlockedByCarry: result.lootBlockedByCarry ?? null,
            logId: result.logEntry?.id,
          },
        },
        { status: 200 },
      );

      if (result.halfOrcRelentlessTriggered && sessionTokenHash) {
        response.cookies.set(HALF_ORC_RELENTLESS_COOKIE_NAME, sessionTokenHash, {
          httpOnly: true,
          sameSite: "strict",
          secure: process.env.NODE_ENV === "production",
          path: "/",
        });
      }

      return response;
    } catch (caughtError) {
      if (isSerializableConflictError(caughtError)) {
        return NextResponse.json(
          { message: "Activity could not be completed due to a resource conflict. Try again." },
          { status: 409 },
        );
      }

      logError("/api/game/activities", caughtError, {
        userId: user.id,
        characterId: activeCharacter?.id,
        activityId: parsedData?.activityId,
      });

      return NextResponse.json(
        { message: "Something went wrong while processing the activity." },
        { status: 500 },
      );
    }
  };
}

export const GET = createActivitiesGetHandler();
export const POST = createActivitiesPostHandler();
