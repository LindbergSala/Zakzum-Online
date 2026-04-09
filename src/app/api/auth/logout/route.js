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

export function createLogoutPostHandler(dependencies = {}) {
  const ensureOriginIsValid =
    dependencies.validateWriteRequestOrigin ?? validateWriteRequestOrigin;
  const getSessionToken =
    dependencies.getSessionTokenFromRequestCookies ?? getSessionTokenFromRequestCookies;
  const invalidateSession =
    dependencies.invalidateSessionByToken ?? invalidateSessionByToken;
  const getExpiredCookieOptions =
    dependencies.getExpiredSessionCookieOptions ?? getExpiredSessionCookieOptions;
  const logError = dependencies.logServerError ?? logServerError;

  return async function logoutPost(request) {
    const originError = ensureOriginIsValid(request);
    if (originError) {
      return originError;
    }

    try {
      const token = await getSessionToken();
      await invalidateSession(token);

      const response = NextResponse.json({ message: "Logged out." }, { status: 200 });
      response.cookies.set(
        SESSION_COOKIE_NAME,
        "",
        getExpiredCookieOptions(),
      );
      response.cookies.set(
        HALF_ORC_RELENTLESS_COOKIE_NAME,
        "",
        getExpiredCookieOptions(),
      );
      return response;
    } catch (error) {
      logError("/api/auth/logout", error);
      const response = NextResponse.json(
        { message: "Something went wrong during logout." },
        { status: 500 },
      );
      response.cookies.set(
        SESSION_COOKIE_NAME,
        "",
        getExpiredCookieOptions(),
      );
      response.cookies.set(
        HALF_ORC_RELENTLESS_COOKIE_NAME,
        "",
        getExpiredCookieOptions(),
      );
      return response;
    }
  };
}

export const POST = createLogoutPostHandler();
