import { NextResponse } from "next/server";

import {
  getExpiredSessionCookieOptions,
  getSessionTokenFromRequestCookies,
  invalidateSessionByToken,
  SESSION_COOKIE_NAME,
} from "@/lib/session";

export async function POST() {
  try {
    const token = await getSessionTokenFromRequestCookies();
    await invalidateSessionByToken(token);

    const response = NextResponse.json({ message: "Utloggad." }, { status: 200 });
    response.cookies.set(
      SESSION_COOKIE_NAME,
      "",
      getExpiredSessionCookieOptions(),
    );
    return response;
  } catch {
    const response = NextResponse.json(
      { message: "Nagot gick fel vid utloggning." },
      { status: 500 },
    );
    response.cookies.set(
      SESSION_COOKIE_NAME,
      "",
      getExpiredSessionCookieOptions(),
    );
    return response;
  }
}

