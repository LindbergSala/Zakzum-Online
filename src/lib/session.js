import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";

import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE_NAME = "zakzum_session";

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;
const SESSION_RENEWAL_WINDOW_MS = 1000 * 60 * 60 * 24;

function hashSessionToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function getSessionExpirationDate() {
  return new Date(Date.now() + SESSION_DURATION_MS);
}

export async function createSession(userId) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashSessionToken(token);
  const expiresAt = getSessionExpirationDate();

  await prisma.session.create({
    data: {
      token: tokenHash,
      userId,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export function getSessionCookieOptions(expiresAt) {
  return {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  };
}

export function getExpiredSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "strict",
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

  const tokenHash = hashSessionToken(token);

  await prisma.session.deleteMany({
    where: { token: tokenHash },
  });
}

async function maybeRenewSessionIfNeeded(sessionId, token, expiresAt) {
  if (expiresAt.getTime() - Date.now() > SESSION_RENEWAL_WINDOW_MS) {
    return;
  }

  const renewedExpiresAt = getSessionExpirationDate();

  await prisma.session.update({
    where: { id: sessionId },
    data: { expiresAt: renewedExpiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_COOKIE_NAME,
    token,
    getSessionCookieOptions(renewedExpiresAt),
  );
}

export async function getActiveSessionUser(options = {}) {
  const { renewSession = false } = options;
  const token = await getSessionTokenFromRequestCookies();

  if (!token) {
    return null;
  }

  const tokenHash = hashSessionToken(token);

  const session = await prisma.session.findUnique({
    where: { token: tokenHash },
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

  if (renewSession) {
    await maybeRenewSessionIfNeeded(session.id, token, session.expiresAt);
  }

  return session.user;
}
