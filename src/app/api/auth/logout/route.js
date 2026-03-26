import { NextResponse } from "next/server";

import { validateWriteRequestOrigin } from "@/lib/csrf";
import { logServerError } from "@/lib/server-logger";
import {
  getExpiredSessionCookieOptions,
  getSessionTokenFromRequestCookies,
  invalidateSessionByToken,
  SESSION_COOKIE_NAME,
} from "@/lib/session";

const HALF_ORC_RELENTLESS_COOKIE_NAME = "zakzum_half_orc_relentless";

export async function POST(request) {
  const originError = validateWriteRequestOrigin(request);
  if (originError) {
    return originError;
  }

  try {
    const token = await getSessionTokenFromRequestCookies();
    await invalidateSessionByToken(token);

    const response = NextResponse.json({ message: "Logged out." }, { status: 200 });
    response.cookies.set(
      SESSION_COOKIE_NAME,
      "",
      getExpiredSessionCookieOptions(),
    );
    response.cookies.set(
      HALF_ORC_RELENTLESS_COOKIE_NAME,
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
    response.cookies.set(
      HALF_ORC_RELENTLESS_COOKIE_NAME,
      "",
      getExpiredSessionCookieOptions(),
    );
    return response;
  }
}
