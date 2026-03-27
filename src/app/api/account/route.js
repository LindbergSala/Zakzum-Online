import { Prisma } from "@prisma/client";
import { compare, hash } from "bcryptjs";
import { NextResponse } from "next/server";

import { requireApiUser } from "@/lib/api-auth";
import { validateWriteRequestOrigin } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/server-logger";
import {
  getExpiredSessionCookieOptions,
  getSessionTokenFromRequestCookies,
  invalidateSessionByToken,
  SESSION_COOKIE_NAME,
} from "@/lib/session";
import {
  deleteAccountSchema,
  updateAccountSchema,
} from "@/lib/validators/account";

const HALF_ORC_RELENTLESS_COOKIE_NAME = "zakzum_half_orc_relentless";

async function resolveUserCredentials(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      passwordHash: true,
    },
  });
}

export async function PATCH(request) {
  const originError = validateWriteRequestOrigin(request);
  if (originError) {
    return originError;
  }

  const { user, error } = await requireApiUser();

  if (error) {
    return error;
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

    const parsed = updateAccountSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Invalid input.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const latestUser = await resolveUserCredentials(user.id);

    if (!latestUser) {
      return NextResponse.json(
        { message: "User account was not found." },
        { status: 404 },
      );
    }

    const isPasswordValid = await compare(
      parsed.data.currentPassword,
      latestUser.passwordHash,
    );

    if (!isPasswordValid) {
      return NextResponse.json(
        { message: "Incorrect account password." },
        { status: 401 },
      );
    }

    if (parsed.data.action === "update_email") {
      if (parsed.data.nextEmail === latestUser.email) {
        return NextResponse.json(
          { message: "New email must be different from current email." },
          { status: 400 },
        );
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { email: parsed.data.nextEmail },
      });

      return NextResponse.json(
        { message: "Email updated.", email: parsed.data.nextEmail },
        { status: 200 },
      );
    }

    if (parsed.data.nextPassword === parsed.data.currentPassword) {
      return NextResponse.json(
        { message: "New password must be different from current password." },
        { status: 400 },
      );
    }

    const nextPasswordHash = await hash(parsed.data.nextPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: nextPasswordHash },
    });

    return NextResponse.json(
      { message: "Password updated." },
      { status: 200 },
    );
  } catch (caughtError) {
    if (
      caughtError instanceof Prisma.PrismaClientKnownRequestError &&
      caughtError.code === "P2002"
    ) {
      return NextResponse.json(
        { message: "Email address is already registered." },
        { status: 409 },
      );
    }

    logServerError("/api/account [PATCH]", caughtError, { userId: user.id });
    return NextResponse.json(
      { message: "Something went wrong while updating account settings." },
      { status: 500 },
    );
  }
}

export async function DELETE(request) {
  const originError = validateWriteRequestOrigin(request);
  if (originError) {
    return originError;
  }

  const { user, error } = await requireApiUser();

  if (error) {
    return error;
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

    const parsed = deleteAccountSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Invalid delete request.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const latestUser = await resolveUserCredentials(user.id);

    if (!latestUser) {
      return NextResponse.json(
        { message: "User account was not found." },
        { status: 404 },
      );
    }

    const isPasswordValid = await compare(
      parsed.data.password,
      latestUser.passwordHash,
    );

    if (!isPasswordValid) {
      return NextResponse.json(
        { message: "Incorrect account password." },
        { status: 401 },
      );
    }

    await prisma.user.delete({
      where: { id: user.id },
    });

    const token = await getSessionTokenFromRequestCookies();
    await invalidateSessionByToken(token);

    const response = NextResponse.json(
      { message: "Account deleted permanently." },
      { status: 200 },
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
  } catch (caughtError) {
    logServerError("/api/account [DELETE]", caughtError, { userId: user.id });
    return NextResponse.json(
      { message: "Something went wrong while deleting account." },
      { status: 500 },
    );
  }
}
