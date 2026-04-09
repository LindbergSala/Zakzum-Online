import { compare } from "bcryptjs";
import { NextResponse } from "next/server";

import {
  checkLoginRateLimit,
  clearLoginRateLimit,
  recordFailedLoginAttempt,
} from "@/lib/login-rate-limit";
import { parseAndValidateJsonRequestBody } from "@/lib/api-request";
import { prisma } from "@/lib/prisma";
import { validateWriteRequestOrigin } from "@/lib/csrf";
import { logServerError } from "@/lib/server-logger";
import {
  createSession,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/session";
import { loginSchema } from "@/lib/validators/auth";

const INVALID_CREDENTIALS_MESSAGE = "Incorrect email or password.";
const RATE_LIMIT_MESSAGE = "Too many login attempts. Please try again later.";
const DUMMY_PASSWORD_HASH =
  "$2b$12$GK1dFUqDAm57Is0AVxiy5uWaqLdqpiQqF.RDBBo1TTw9jmHp4CEDy";

export function createLoginPostHandler(dependencies = {}) {
  const ensureOriginIsValid =
    dependencies.validateWriteRequestOrigin ?? validateWriteRequestOrigin;
  const parseRequestBody =
    dependencies.parseAndValidateJsonRequestBody ?? parseAndValidateJsonRequestBody;
  const checkRateLimit = dependencies.checkLoginRateLimit ?? checkLoginRateLimit;
  const clearRateLimit = dependencies.clearLoginRateLimit ?? clearLoginRateLimit;
  const recordFailedAttempt =
    dependencies.recordFailedLoginAttempt ?? recordFailedLoginAttempt;
  const prismaClient = dependencies.prismaClient ?? prisma;
  const comparePassword = dependencies.comparePasswords ?? compare;
  const createUserSession = dependencies.createSession ?? createSession;
  const buildSessionCookieOptions =
    dependencies.getSessionCookieOptions ?? getSessionCookieOptions;
  const logError = dependencies.logServerError ?? logServerError;

  return async function loginPost(request) {
    const originError = ensureOriginIsValid(request);
    if (originError) {
      return originError;
    }

    try {
      const { data: parsedData, response: parseResponse } =
        await parseRequestBody(request, {
          schema: loginSchema,
          invalidMessage: "Invalid input.",
        });

      if (parseResponse) {
        return parseResponse;
      }

      const { email, password } = parsedData;
      const rateLimit = await checkRateLimit(request, email);

      if (rateLimit.blocked) {
        return NextResponse.json(
          { message: RATE_LIMIT_MESSAGE },
          {
            status: 429,
            headers: {
              "Retry-After": String(rateLimit.retryAfterSeconds),
            },
          },
        );
      }

      const user = await prismaClient.user.findUnique({
        where: { email },
        select: {
          id: true,
          passwordHash: true,
        },
      });

      const passwordHashToCheck = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
      const isPasswordValid = await comparePassword(password, passwordHashToCheck);

      if (!user || !isPasswordValid) {
        await recordFailedAttempt(rateLimit.identifierSet);
        return NextResponse.json(
          { message: INVALID_CREDENTIALS_MESSAGE },
          { status: 401 },
        );
      }

      await clearRateLimit(rateLimit.identifierSet);

      const { token, expiresAt } = await createUserSession(user.id);

      const response = NextResponse.json(
        { message: "Login successful." },
        { status: 200 },
      );

      response.cookies.set(
        SESSION_COOKIE_NAME,
        token,
        buildSessionCookieOptions(expiresAt),
      );

      return response;
    } catch (error) {
      logError("/api/auth/login", error);
      return NextResponse.json(
        { message: "Something went wrong during login." },
        { status: 500 },
      );
    }
  };
}

export const POST = createLoginPostHandler();
