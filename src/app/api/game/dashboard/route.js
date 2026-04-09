import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { getResolvedActiveCharacterForUser } from "@/lib/character";
import {
  getStaminaRegenerationMeta,
  getHpRegenerationMeta,
} from "@/lib/stamina-regeneration";
import { getLevelProgressMeta } from "@/lib/level-progression";

export async function GET() {
  const { user, error } = await requireApiUser();

  if (error) {
    return error;
  }

  const activeCharacter = await getResolvedActiveCharacterForUser(user.id);

  return NextResponse.json(
    {
      message: "Protected dashboard data.",
      user: {
        id: user.id,
        email: user.email,
      },
      activeCharacter,
      stamina: activeCharacter ? getStaminaRegenerationMeta(activeCharacter) : null,
      hp: activeCharacter ? getHpRegenerationMeta(activeCharacter) : null,
      progression: activeCharacter
        ? getLevelProgressMeta(activeCharacter.level, activeCharacter.xp)
        : null,
    },
    { status: 200 },
  );
}
