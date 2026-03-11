import { NextResponse } from "next/server";

import { logServerError } from "@/lib/server-logger";
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

    const response = NextResponse.json({ message: "Logged out." }, { status: 200 });
    response.cookies.set(
      SESSION_COOKIE_NAME,
      "",
      getExpiredSessionCookieOptions(),
    );
    return response;
  } catch (error) {
    logServerError("/api/auth/logout", error);
    const response = NextResponse.json(
      { message: "Something went wrong during logout." },
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
