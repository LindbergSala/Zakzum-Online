import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { getUserWithResolvedActiveCharacter } from "@/lib/character";
import { getEnergyRegenerationMeta } from "@/lib/energy-regeneration";

export async function GET() {
  const { user, error } = await requireApiUser();

  if (error) {
    return error;
  }

  const userWithCharacter = await getUserWithResolvedActiveCharacter(user.id);
  const activeCharacter = userWithCharacter?.activeCharacter ?? null;

  return NextResponse.json(
    {
      message: "Skyddad dashboard-data.",
      user: {
        id: user.id,
        email: user.email,
      },
      activeCharacter,
      energy: activeCharacter ? getEnergyRegenerationMeta(activeCharacter) : null,
    },
    { status: 200 },
  );
}
