import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { getActiveCharacterForUser } from "@/lib/character";
import { ACTIVITY_DEFINITION_MAP, ACTIVITY_DEFINITIONS } from "@/lib/core-loop-data";
import { prisma } from "@/lib/prisma";
import { resolveActivityRoll } from "@/lib/roll-engine";
import {
  buildCharacterResourceUpdateInput,
  calculateCharacterResourceResult,
  getCharacterResourceSnapshot,
} from "@/lib/resource-rules";
import { getCharacterEffectiveStats } from "@/lib/stat-effects";
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
      { message: "Ogiltig JSON i request body." },
      { status: 400 },
    );
  }

  const parsed = activityActionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "Ogiltig aktivitet.",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const activeCharacter = await getActiveCharacterForUser(user.id);

  if (!activeCharacter) {
    return NextResponse.json(
      { message: "Du maste skapa en karaktar innan du kan gora aktiviteter." },
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

  const statSummary = getCharacterEffectiveStats(activeCharacter, equippedItems);
  const rollResult = resolveActivityRoll(statSummary.effective, activity);

  const calculation = calculateCharacterResourceResult(activeCharacter, {
    energyCost: activity.energyCost,
    delta: rollResult.delta,
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

  const result = await prisma.$transaction(async (tx) => {
    const updatedCharacter = await tx.character.update({
      where: { id: activeCharacter.id },
      data: buildCharacterResourceUpdateInput(calculation.after),
      select: {
        id: true,
        hp: true,
        energy: true,
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
          stats: statSummary,
        },
      },
      select: { id: true },
    });

    return { updatedCharacter, logEntry };
  });

  return NextResponse.json(
    {
      message: rollResult.success
        ? `${activity.name} lyckades.`
        : `${activity.name} misslyckades.`,
      action: {
        id: activity.id,
        name: activity.name,
        energyCost: activity.energyCost,
      },
      result: {
        success: rollResult.success,
        energyCost: activity.energyCost,
        roll: {
          value: rollResult.roll,
          total: rollResult.rollTotal,
          target: rollResult.successTarget,
          statModifier: rollResult.statModifier,
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
