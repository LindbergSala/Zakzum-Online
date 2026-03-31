import { compare } from "bcryptjs";
import { NextResponse } from "next/server";

import {
  checkLoginRateLimit,
  clearLoginRateLimit,
  recordFailedLoginAttempt,
} from "@/lib/login-rate-limit";
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

export async function POST(request) {
  const originError = validateWriteRequestOrigin(request);
  if (originError) {
    return originError;
  }

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { message: "Invalid JSON in request body." },
        { status: 400 },
      );
    }

    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Invalid input.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { email, password } = parsed.data;
    const rateLimit = await checkLoginRateLimit(request, email);

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

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user) {
      await recordFailedLoginAttempt(rateLimit.identifierSet);
      return NextResponse.json(
        { message: INVALID_CREDENTIALS_MESSAGE },
        { status: 401 },
      );
    }

    const isPasswordValid = await compare(password, user.passwordHash);

    if (!isPasswordValid) {
      await recordFailedLoginAttempt(rateLimit.identifierSet);
      return NextResponse.json(
        { message: INVALID_CREDENTIALS_MESSAGE },
        { status: 401 },
      );
    }

    await clearLoginRateLimit(rateLimit.identifierSet);

    const { token, expiresAt } = await createSession(user.id);

    const response = NextResponse.json(
      { message: "Login successful." },
      { status: 200 },
    );

    response.cookies.set(
      SESSION_COOKIE_NAME,
      token,
      getSessionCookieOptions(expiresAt),
    );

    return response;
  } catch (error) {
    logServerError("/api/auth/login", error);
    return NextResponse.json(
      { message: "Something went wrong during login." },
      { status: 500 },
    );
  }
}
