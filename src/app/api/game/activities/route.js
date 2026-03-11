import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { getActiveCharacterForUser } from "@/lib/character";
import {
  applyClassPassiveDelta,
  getClassPassive,
  getClassPassiveRollModifier,
} from "@/lib/class-identity";
import { ACTIVITY_DEFINITION_MAP, ACTIVITY_DEFINITIONS } from "@/lib/core-loop-data";
import { prisma } from "@/lib/prisma";
import { resolveActivityRoll } from "@/lib/roll-engine";
import {
  buildCharacterResourceUpdateInput,
  calculateCharacterResourceResult,
  getCharacterResourceSnapshot,
} from "@/lib/resource-rules";
import { getCharacterEffectiveStats } from "@/lib/stat-effects";
import { getLevelProgressMeta } from "@/lib/level-progression";
import { activityActionSchema } from "@/lib/validators/core-loop";

const ACTIVITY_CHARACTER_SELECT = {
  id: true,
  characterClass: true,
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

  const activity = ACTIVITY_DEFINITION_MAP[parsed.data.activityId];
  const result = await prisma.$transaction(async (tx) => {
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
    const passiveRollModifier = getClassPassiveRollModifier(
      latestCharacter.characterClass,
    );
    const statSummary = getCharacterEffectiveStats(latestCharacter, equippedItems);
    const rollResult = resolveActivityRoll(statSummary.effective, activity, {
      level: latestCharacter.level,
      passiveRollModifier,
    });
    const passiveResolvedDelta = applyClassPassiveDelta({
      characterClass: latestCharacter.characterClass,
      success: rollResult.success,
      delta: rollResult.delta,
    });

    const calculation = calculateCharacterResourceResult(latestCharacter, {
      energyCost: activity.energyCost,
      delta: passiveResolvedDelta.delta,
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

    const now = new Date();
    const updateResult = await tx.character.updateMany({
      where: {
        id: latestCharacter.id,
        updatedAt: latestCharacter.updatedAt,
      },
      data: {
        ...buildCharacterResourceUpdateInput(calculation.after),
        energyRegenAt: now,
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
      },
    });

    const logEntry = await tx.activityLog.create({
      data: {
        characterId: latestCharacter.id,
        type: "ACTIVITY",
        activityId: activity.id,
        activityName: activity.name,
        success: rollResult.success,
        energyCost: activity.energyCost,
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
            statModifier: rollResult.statModifier,
            chancePercent: rollResult.chancePercent,
          },
          classIdentity: {
            class: latestCharacter.characterClass,
            passive: classPassive,
            passiveRollModifier,
            passiveDeltaBonus: passiveResolvedDelta.deltaBonus,
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
      passiveRollModifier,
      passiveResolvedDelta,
      rollResult,
      statSummary,
      calculation,
      leveledUp: calculation.after.level > calculation.before.level,
      characterClass: latestCharacter.characterClass,
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

  return NextResponse.json(
    {
      message: result.leveledUp
        ? result.rollResult.success
          ? `${activity.name} succeeded. Level up! You are now level ${result.calculation.after.level}.`
          : `${activity.name} failed. Level up! You are now level ${result.calculation.after.level}.`
        : result.rollResult.success
          ? `${activity.name} succeeded.`
          : `${activity.name} failed.`,
      action: {
        id: activity.id,
        name: activity.name,
        energyCost: activity.energyCost,
      },
      result: {
        success: result.rollResult.success,
        energyCost: activity.energyCost,
        progression: {
          leveledUp: result.leveledUp,
          levelBefore: result.calculation.before.level,
          levelAfter: result.calculation.after.level,
          xp: getLevelProgressMeta(
            result.calculation.after.level,
            result.calculation.after.xp,
          ),
        },
        classIdentity: {
          class: result.characterClass,
          passive: result.classPassive,
          passiveRollModifier: result.passiveRollModifier,
          passiveDeltaBonus: result.passiveResolvedDelta.deltaBonus,
        },
        roll: {
          value: result.rollResult.roll,
          total: result.rollResult.rollTotal,
          target: result.rollResult.successTarget,
          statModifier: result.rollResult.statModifier,
          baseStatModifier: result.rollResult.calculations.baseStatModifier,
          levelModifier: result.rollResult.calculations.levelModifier,
          passiveRollModifier: result.rollResult.calculations.passiveRollModifier,
          characterLevel: result.rollResult.calculations.characterLevel,
          chancePercent: result.rollResult.chancePercent,
          primaryStat: result.rollResult.calculations.primaryStat,
          secondaryStat: result.rollResult.calculations.secondaryStat,
          primaryStatValue: result.rollResult.calculations.primaryStatValue,
          secondaryStatValue: result.rollResult.calculations.secondaryStatValue,
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
}
