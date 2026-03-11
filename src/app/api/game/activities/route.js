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
  const equippedItems = await prisma.characterItem.findMany({
    where: {
      characterId: activeCharacter.id,
      isEquipped: true,
    },
    select: {
      itemId: true,
    },
  });

  const classPassive = getClassPassive(activeCharacter.characterClass);
  const passiveRollModifier = getClassPassiveRollModifier(
    activeCharacter.characterClass,
  );
  const statSummary = getCharacterEffectiveStats(activeCharacter, equippedItems);
  const rollResult = resolveActivityRoll(statSummary.effective, activity, {
    level: activeCharacter.level,
    passiveRollModifier,
  });
  const passiveResolvedDelta = applyClassPassiveDelta({
    characterClass: activeCharacter.characterClass,
    success: rollResult.success,
    delta: rollResult.delta,
  });

  const calculation = calculateCharacterResourceResult(activeCharacter, {
    energyCost: activity.energyCost,
    delta: passiveResolvedDelta.delta,
  });

  if (!calculation.ok) {
    return NextResponse.json(
      {
        message: calculation.message,
        requiredEnergy: calculation.requiredEnergy,
        resources: getCharacterResourceSnapshot(activeCharacter),
      },
      { status: 400 },
    );
  }

  const leveledUp = calculation.after.level > calculation.before.level;

  const result = await prisma.$transaction(async (tx) => {
    const now = new Date();

    const updatedCharacter = await tx.character.update({
      where: { id: activeCharacter.id },
      data: {
        ...buildCharacterResourceUpdateInput(calculation.after),
        energyRegenAt: now,
      },
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
        characterId: activeCharacter.id,
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
            class: activeCharacter.characterClass,
            passive: classPassive,
            passiveRollModifier,
            passiveDeltaBonus: passiveResolvedDelta.deltaBonus,
          },
          stats: statSummary,
        },
      },
      select: { id: true },
    });

    return { updatedCharacter, logEntry };
  });

  return NextResponse.json(
    {
      message: leveledUp
        ? rollResult.success
          ? `${activity.name} succeeded. Level up! You are now level ${calculation.after.level}.`
          : `${activity.name} failed. Level up! You are now level ${calculation.after.level}.`
        : rollResult.success
          ? `${activity.name} succeeded.`
          : `${activity.name} failed.`,
      action: {
        id: activity.id,
        name: activity.name,
        energyCost: activity.energyCost,
      },
      result: {
        success: rollResult.success,
        energyCost: activity.energyCost,
        progression: {
          leveledUp,
          levelBefore: calculation.before.level,
          levelAfter: calculation.after.level,
          xp: getLevelProgressMeta(calculation.after.level, calculation.after.xp),
        },
        classIdentity: {
          class: activeCharacter.characterClass,
          passive: classPassive,
          passiveRollModifier,
          passiveDeltaBonus: passiveResolvedDelta.deltaBonus,
        },
        roll: {
          value: rollResult.roll,
          total: rollResult.rollTotal,
          target: rollResult.successTarget,
          statModifier: rollResult.statModifier,
          baseStatModifier: rollResult.calculations.baseStatModifier,
          levelModifier: rollResult.calculations.levelModifier,
          passiveRollModifier: rollResult.calculations.passiveRollModifier,
          characterLevel: rollResult.calculations.characterLevel,
          chancePercent: rollResult.chancePercent,
          primaryStat: rollResult.calculations.primaryStat,
          secondaryStat: rollResult.calculations.secondaryStat,
          primaryStatValue: rollResult.calculations.primaryStatValue,
          secondaryStatValue: rollResult.calculations.secondaryStatValue,
          primaryModifier: rollResult.calculations.primaryModifier,
          secondaryModifier: rollResult.calculations.secondaryModifier,
          scale: rollResult.scale,
        },
        stats: statSummary,
        delta: calculation.delta,
        totals: {
          before: calculation.before,
          after: getCharacterResourceSnapshot(result.updatedCharacter),
        },
        logId: result.logEntry.id,
      },
    },
    { status: 200 },
  );
}
