import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { findActivityLogsForCharacter } from "@/lib/activity-log-read";
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

  const entries = await findActivityLogsForCharacter(activeCharacter.id, {
    prismaClient: prisma,
    take: LOG_ENTRY_LIMIT,
  });

  return NextResponse.json({ entries }, { status: 200 });
}
