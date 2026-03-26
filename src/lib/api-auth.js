import { NextResponse } from "next/server";

import { getActiveSessionUser } from "@/lib/session";

export async function requireApiUser() {
  const user = await getActiveSessionUser({ renewSession: true });

  if (!user) {
    return {
      user: null,
      error: NextResponse.json(
        { message: "You must be logged in to use this endpoint." },
        { status: 401 },
      ),
    };
  }

  return { user, error: null };
}
