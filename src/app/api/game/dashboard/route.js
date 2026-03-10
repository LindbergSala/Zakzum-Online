import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { getUserWithResolvedActiveCharacter } from "@/lib/character";

export async function GET() {
  const { user, error } = await requireApiUser();

  if (error) {
    return error;
  }

  const userWithCharacter = await getUserWithResolvedActiveCharacter(user.id);

  return NextResponse.json(
    {
      message: "Skyddad dashboard-data.",
      user: {
        id: user.id,
        email: user.email,
      },
      activeCharacter: userWithCharacter?.activeCharacter ?? null,
    },
    { status: 200 },
  );
}
