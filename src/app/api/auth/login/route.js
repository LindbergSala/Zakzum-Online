import { compare } from "bcryptjs";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  createSession,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/session";
import { loginSchema } from "@/lib/validators/auth";

const INVALID_CREDENTIALS_MESSAGE = "Incorrect email or password.";

export async function POST(request) {
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

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: INVALID_CREDENTIALS_MESSAGE },
        { status: 401 },
      );
    }

    const isPasswordValid = await compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { message: INVALID_CREDENTIALS_MESSAGE },
        { status: 401 },
      );
    }

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
  } catch {
    return NextResponse.json(
      { message: "Something went wrong during login." },
      { status: 500 },
    );
  }
}
