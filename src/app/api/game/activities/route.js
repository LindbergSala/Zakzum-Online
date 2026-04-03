import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { requireApiUser } from "@/lib/api-auth";
import { getActiveCharacterForUser } from "@/lib/character";
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
import { getClassPassiveEnergyRefreshBonus } from "@/lib/class-identity";
import { getSessionTokenFromRequestCookies } from "@/lib/session";
import { activityActionSchema } from "@/lib/validators/core-loop";
import {
  HALF_ORC_RELENTLESS_COOKIE_NAME,
  buildActivityContext,
  hashSessionToken,
} from "./route-helpers";
import { processActivityTransaction } from "./transaction-actions";

export async function GET() {
  const { user, error } = await requireApiUser();

  if (error) {
    return error;
  }

  const activeCharacter = await getActiveCharacterForUser(user.id);

  return NextResponse.json(
    {
      groups: ACTIVITY_GROUPS.map((group) => ({
        availability: getActivityGroupAvailability(group.id),
        id: group.id,
        name: group.name,
        tagline: group.tagline,
        summary: group.summary,
        regionId: group.regionId ?? null,
        regionName: group.regionName ?? null,
        overviewBadges: group.overviewBadges ?? [],
        activities: ACTIVITY_DEFINITIONS.filter(
          (activity) => activity.groupId === group.id,
        )
          .sort((left, right) => (left.tier ?? 0) - (right.tier ?? 0))
          .map((activity) => ({
            id: activity.id,
            groupId: activity.groupId,
            tier: activity.tier,
            name: activity.name,
            locationId: activity.locationId ?? null,
            locationName: activity.locationName ?? null,
            locationTitle: activity.locationTitle ?? null,
            regionId: activity.regionId ?? null,
            regionName: activity.regionName ?? null,
            energyCost: activity.energyCost,
            riskProfile: activity.riskProfile,
            successReward: activity.successReward,
            failPenalty: activity.failPenalty,
          })),
      })),
      activities: ACTIVITY_DEFINITIONS.map((activity) => ({
        id: activity.id,
        groupId: activity.groupId,
        tier: activity.tier,
        name: activity.name,
        locationId: activity.locationId ?? null,
        locationName: activity.locationName ?? null,
        locationTitle: activity.locationTitle ?? null,
        regionId: activity.regionId ?? null,
        regionName: activity.regionName ?? null,
        energyCost: activity.energyCost,
        successReward: activity.successReward,
        failPenalty: activity.failPenalty,
      })),
      resources: activeCharacter ? getCharacterResourceSnapshot(activeCharacter) : null,
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

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid JSON in request body." },
      { status: 400 },
    );
  }

  const parsed = activityActionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Invalid activity.",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const activeCharacter = await getActiveCharacterForUser(user.id);

  if (!activeCharacter) {
    return NextResponse.json(
      { message: "You must create a character before you can do activities." },
      { status: 400 },
    );
  }

  const sessionToken = await getSessionTokenFromRequestCookies();
  const sessionTokenHash = sessionToken ? hashSessionToken(sessionToken) : null;
  const cookieStore = await cookies();
  const halfOrcRelentlessCookieValue =
    cookieStore.get(HALF_ORC_RELENTLESS_COOKIE_NAME)?.value ?? "";
  const halfOrcRelentlessUsedThisSession = Boolean(
    sessionTokenHash && halfOrcRelentlessCookieValue === sessionTokenHash,
  );

  try {
    const activity = ACTIVITY_DEFINITION_MAP[parsed.data.activityId];
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
        { message: activityGroupAvailability.reason || "This activity group is currently unavailable." },
        { status: 403 },
      );
    }

    const activityContext = buildActivityContext(activity);

    const result = await runSerializableTransaction((tx) =>
      processActivityTransaction({
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
          requiredEnergy: result.requiredEnergy,
          currentEnergy: result.currentEnergy,
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
          energyCost: result.activityEnergyCost,
        },
        result: {
          success: result.rollResult.success,
          energyCost: result.activityEnergyCost,
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
            baseEnergyCost: activity.energyCost,
            effectiveEnergyCost: result.activityEnergyCost,
            passiveEnergyCostReduction: Math.max(
              0,
              activity.energyCost - result.activityEnergyCost,
            ),
            passiveRollModifier: result.classRollModifier,
            passiveEnergyRefreshBonus: getClassPassiveEnergyRefreshBonus(
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
  } catch (error) {
    if (isSerializableConflict(error)) {
      return NextResponse.json(
        { message: "Activity could not be completed due to a resource conflict. Try again." },
        { status: 409 },
      );
    }

    logServerError("/api/game/activities", error, {
      userId: user.id,
      characterId: activeCharacter.id,
      activityId: parsed.data.activityId,
    });
    return NextResponse.json(
      { message: "Something went wrong while processing the activity." },
      { status: 500 },
    );
  }
}
