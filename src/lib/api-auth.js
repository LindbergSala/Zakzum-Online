import { NextResponse } from "next/server";

import { getActiveSessionUser } from "@/lib/session";

export async function requireApiUser() {
  const user = await getActiveSessionUser();

  if (!user) {
    return {
      user: null,
      error: NextResponse.json(
        { message: "Du maste vara inloggad for att anvanda denna endpoint." },
        { status: 401 },
      ),
    };
  }

  return { user, error: null };
}

