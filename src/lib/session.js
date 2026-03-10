import { randomBytes } from "crypto";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE_NAME = "zakzum_session";

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;

function getSessionExpirationDate() {
  return new Date(Date.now() + SESSION_DURATION_MS);
}

export async function createSession(userId) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = getSessionExpirationDate();

  await prisma.session.create({
    data: {
      token,
      userId,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export function getSessionCookieOptions(expiresAt) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  };
}

export function getExpiredSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  };
}

export async function getSessionTokenFromRequestCookies() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}

export async function invalidateSessionByToken(token) {
  if (!token) {
    return;
  }

  await prisma.session.deleteMany({
    where: { token },
  });
}

export async function getActiveSessionUser() {
  const token = await getSessionTokenFromRequestCookies();

  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { token },
    select: {
      id: true,
      expiresAt: true,
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  return session.user;
}
