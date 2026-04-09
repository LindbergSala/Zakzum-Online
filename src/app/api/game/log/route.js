import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { getResolvedActiveCharacterForUser } from "@/lib/character";
import { prisma } from "@/lib/prisma";

const LOG_ENTRY_LIMIT = 10;

export async function GET() {
  const { user, error } = await requireApiUser();

  if (error) {
    return error;
  }

  const activeCharacter = await getResolvedActiveCharacterForUser(user.id);

  if (!activeCharacter) {
    return NextResponse.json({ entries: [] }, { status: 200 });
  }

  const entries = await prisma.activityLog.findMany({
    where: { characterId: activeCharacter.id },
    orderBy: { createdAt: "desc" },
    take: LOG_ENTRY_LIMIT,
    select: {
      id: true,
      type: true,
      activityId: true,
      activityName: true,
      success: true,
      staminaCost: true,
      roll: true,
      rollTotal: true,
      successTarget: true,
      statModifier: true,
      chancePercent: true,
      delta: true,
      beforeResources: true,
      afterResources: true,
      details: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ entries }, { status: 200 });
}
