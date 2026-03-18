import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { requireApiUser } from "@/lib/api-auth";
import { getActiveCharacterForUser } from "@/lib/character";
import {
  applyClassPassiveDelta,
  getClassPassive,
  getClassPassiveActivityEnergyCost,
  getClassPassiveEnergyRefreshBonus,
  getClassPassiveRollModifier,
} from "@/lib/class-identity";
import { ACTIVITY_DEFINITION_MAP, ACTIVITY_DEFINITIONS } from "@/lib/core-loop-data";
import { isSerializableConflict, runSerializableTransaction } from "@/lib/db-transaction";
import { resolveActivityRoll } from "@/lib/roll-engine";
import {
  applyHalfOrcRelentless,
  applyRacePassiveDelta,
  getRacePassive,
  getRacePassiveRollModifier,
} from "@/lib/race-identity";
import {
  buildCharacterResourceUpdateInput,
  calculateCharacterResourceResult,
  getCharacterResourceSnapshot,
} from "@/lib/resource-rules";
import { logServerError } from "@/lib/server-logger";
import { getCharacterEffectiveStats } from "@/lib/stat-effects";
import { getLevelProgressMeta } from "@/lib/level-progression";
import { getSessionTokenFromRequestCookies } from "@/lib/session";
import { activityActionSchema } from "@/lib/validators/core-loop";

const HALF_ORC_RELENTLESS_COOKIE_NAME = "zakzum_half_orc_relentless";

const ACTIVITY_CHARACTER_SELECT = {
  id: true,
  characterClass: true,
  characterRace: true,
  strength: true,
  dexterity: true,
  constitution: true,
  intelligence: true,
  wisdom: true,
  charisma: true,
  hp: true,
  energy: true,
  maxEnergy: true,
  energyRegenAt: true,
  gold: true,
  xp: true,
  level: true,
  renown: true,
  heat: true,
  unspentStatPoints: true,
  updatedAt: true,
};

export async function GET() {
  const { user, error } = await requireApiUser();

  if (error) {
    return error;
  }

  const activeCharacter = await getActiveCharacterForUser(user.id);

  return NextResponse.json(
    {
      activities: ACTIVITY_DEFINITIONS.map((activity) => ({
        id: activity.id,
        name: activity.name,
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
  const cookieStore = await cookies();
  const halfOrcRelentlessCookieValue =
    cookieStore.get(HALF_ORC_RELENTLESS_COOKIE_NAME)?.value ?? "";
  const halfOrcRelentlessUsedThisSession = Boolean(
    sessionToken && halfOrcRelentlessCookieValue === sessionToken,
  );

  try {
    const activity = ACTIVITY_DEFINITION_MAP[parsed.data.activityId];
    const result = await runSerializableTransaction(async (tx) => {
      const latestCharacter = await tx.character.findUnique({
        where: { id: activeCharacter.id },
        select: ACTIVITY_CHARACTER_SELECT,
      });

      if (!latestCharacter) {
        return {
          ok: false,
          status: 404,
          message: "Character was not found.",
        };
      }

      const equippedItems = await tx.characterItem.findMany({
        where: {
          characterId: latestCharacter.id,
          isEquipped: true,
        },
        select: {
          itemId: true,
        },
      });

      const classPassive = getClassPassive(latestCharacter.characterClass);
      const racePassive = getRacePassive(latestCharacter.characterRace);
      const activityEnergyCost = getClassPassiveActivityEnergyCost(
        latestCharacter.characterClass,
        activity.energyCost,
      );
      const classRollModifier = getClassPassiveRollModifier(
        latestCharacter.characterClass,
        activity.id,
      );
      const raceRollModifier = getRacePassiveRollModifier(
        latestCharacter.characterRace,
        activity.id,
      );
      const passiveRollModifier = classRollModifier + raceRollModifier;
      const statSummary = getCharacterEffectiveStats(latestCharacter, equippedItems);
      const rollResult = resolveActivityRoll(statSummary.effective, activity, {
        level: latestCharacter.level,
        passiveRollModifier,
      });
      const classPassiveResolvedDelta = applyClassPassiveDelta({
        characterClass: latestCharacter.characterClass,
        success: rollResult.success,
        delta: rollResult.delta,
        activityId: activity.id,
      });
      const racePassiveResolvedDelta = applyRacePassiveDelta({
        characterRace: latestCharacter.characterRace,
        success: rollResult.success,
        delta: classPassiveResolvedDelta.delta,
        activityId: activity.id,
      });

      const calculation = calculateCharacterResourceResult(latestCharacter, {
        energyCost: activityEnergyCost,
        delta: racePassiveResolvedDelta.delta,
      });

      if (!calculation.ok) {
        return {
          ok: false,
          status: 400,
          message: calculation.message,
          requiredEnergy: calculation.requiredEnergy,
          resources: getCharacterResourceSnapshot(latestCharacter),
        };
      }

      const halfOrcRelentless = applyHalfOrcRelentless({
        characterRace: latestCharacter.characterRace,
        beforeResources: calculation.before,
        afterResources: calculation.after,
        delta: calculation.delta,
        alreadyUsedThisSession: halfOrcRelentlessUsedThisSession,
      });

      if (halfOrcRelentless.triggered) {
        calculation.after = halfOrcRelentless.afterResources;
        calculation.delta = halfOrcRelentless.delta;
      }

      const gainedLevels = Math.max(
        0,
        calculation.after.level - calculation.before.level,
      );
      const now = new Date();
      const updateResult = await tx.character.updateMany({
        where: {
          id: latestCharacter.id,
          updatedAt: latestCharacter.updatedAt,
        },
        data: {
          ...buildCharacterResourceUpdateInput(calculation.after),
          energyRegenAt: now,
          ...(gainedLevels > 0
            ? { unspentStatPoints: { increment: gainedLevels } }
            : {}),
        },
      });

      if (updateResult.count !== 1) {
        return {
          ok: false,
          status: 409,
          message: "Character resources changed. Please try the action again.",
        };
      }

      const updatedCharacter = await tx.character.findUnique({
        where: { id: latestCharacter.id },
        select: {
          id: true,
          hp: true,
          energy: true,
          maxEnergy: true,
          energyRegenAt: true,
          gold: true,
          xp: true,
          level: true,
          renown: true,
          heat: true,
          unspentStatPoints: true,
        },
      });

      const logEntry = await tx.activityLog.create({
        data: {
          characterId: latestCharacter.id,
          type: "ACTIVITY",
          activityId: activity.id,
          activityName: activity.name,
          success: rollResult.success,
          energyCost: activityEnergyCost,
          roll: rollResult.roll,
          rollTotal: rollResult.rollTotal,
          successTarget: rollResult.successTarget,
          statModifier: rollResult.statModifier,
          chancePercent: rollResult.chancePercent,
          delta: calculation.delta,
          beforeResources: calculation.before,
          afterResources: calculation.after,
          details: {
            roll: {
              value: rollResult.roll,
              total: rollResult.rollTotal,
              target: rollResult.successTarget,
              baseTarget: rollResult.baseSuccessTarget,
              difficultyLevelScaling: rollResult.difficultyLevelScaling,
              statModifier: rollResult.statModifier,
              chancePercent: rollResult.chancePercent,
            },
            classIdentity: {
              class: latestCharacter.characterClass,
              passive: classPassive,
              baseEnergyCost: activity.energyCost,
              effectiveEnergyCost: activityEnergyCost,
              passiveEnergyCostReduction: Math.max(
                0,
                activity.energyCost - activityEnergyCost,
              ),
              classRollModifier,
              passiveEnergyRefreshBonus: getClassPassiveEnergyRefreshBonus(
                latestCharacter.characterClass,
              ),
              passiveDeltaBonus: classPassiveResolvedDelta.deltaBonus,
            },
            raceIdentity: {
              race: latestCharacter.characterRace,
              passive: racePassive,
              raceRollModifier,
              passiveDeltaBonus: racePassiveResolvedDelta.deltaBonus,
              halfOrcRelentlessTriggered: halfOrcRelentless.triggered,
              halfOrcRelentlessDeltaBonus: halfOrcRelentless.deltaBonus,
              halfOrcRelentlessAlreadyUsed: halfOrcRelentlessUsedThisSession,
            },
            stats: statSummary,
          },
        },
        select: { id: true },
      });

      return {
        ok: true,
        updatedCharacter,
        logEntry,
        classPassive,
        racePassive,
        activityEnergyCost,
        classRollModifier,
        raceRollModifier,
        passiveRollModifier,
        classPassiveResolvedDelta,
        racePassiveResolvedDelta,
        halfOrcRelentlessTriggered: halfOrcRelentless.triggered,
        halfOrcRelentlessDeltaBonus: halfOrcRelentless.deltaBonus,
        halfOrcRelentlessAlreadyUsed: halfOrcRelentlessUsedThisSession,
        rollResult,
        statSummary,
        calculation,
        leveledUp: calculation.after.level > calculation.before.level,
        gainedStatPoints: gainedLevels,
        characterClass: latestCharacter.characterClass,
        characterRace: latestCharacter.characterRace,
      };
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          message: result.message,
          requiredEnergy: result.requiredEnergy,
          resources: result.resources,
        },
        { status: result.status },
      );
    }

    const response = NextResponse.json(
      {
        message: result.leveledUp
          ? result.rollResult.success
            ? `${activity.name} succeeded. Level up! You are now level ${result.calculation.after.level} and gained ${result.gainedStatPoints} stat point${result.gainedStatPoints === 1 ? "" : "s"}.`
            : `${activity.name} failed. Level up! You are now level ${result.calculation.after.level} and gained ${result.gainedStatPoints} stat point${result.gainedStatPoints === 1 ? "" : "s"}.`
          : result.rollResult.success
            ? `${activity.name} succeeded.`
            : `${activity.name} failed.`,
        action: {
          id: activity.id,
          name: activity.name,
          energyCost: result.activityEnergyCost,
        },
        result: {
          success: result.rollResult.success,
          energyCost: result.activityEnergyCost,
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
            passiveRollModifier: result.raceRollModifier,
            passiveDeltaBonus: result.racePassiveResolvedDelta.deltaBonus,
            halfOrcRelentlessTriggered: result.halfOrcRelentlessTriggered,
            halfOrcRelentlessDeltaBonus: result.halfOrcRelentlessDeltaBonus,
            halfOrcRelentlessAlreadyUsed: result.halfOrcRelentlessAlreadyUsed,
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
            passiveRollModifier: result.rollResult.calculations.passiveRollModifier,
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
          logId: result.logEntry?.id,
        },
      },
      { status: 200 },
    );

    if (result.halfOrcRelentlessTriggered && sessionToken) {
      response.cookies.set(HALF_ORC_RELENTLESS_COOKIE_NAME, sessionToken, {
        httpOnly: true,
        sameSite: "lax",
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
