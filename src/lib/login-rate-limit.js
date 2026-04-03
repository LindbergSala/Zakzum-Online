import { createHash } from "crypto";

import { prisma } from "@/lib/prisma";

const DEFAULT_IP_MAX_FAILURES = 10;
const DEFAULT_EMAIL_MAX_FAILURES = 5;
const DEFAULT_WINDOW_MS = 1000 * 60 * 15;
const DEFAULT_BLOCK_MS = 1000 * 60 * 30;

const RATE_LIMIT_SCOPE = {
  IP: "ip",
  EMAIL: "email",
};

function parsePositiveInteger(value, fallback) {
  const numeric = Number.parseInt(value ?? "", 10);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return fallback;
  }

  return numeric;
}

function resolveRateLimitConfig() {
  return {
    [RATE_LIMIT_SCOPE.IP]: {
      maxFailures: parsePositiveInteger(
        process.env.LOGIN_RATE_LIMIT_IP_MAX_FAILURES,
        DEFAULT_IP_MAX_FAILURES,
      ),
      windowMs: parsePositiveInteger(
        process.env.LOGIN_RATE_LIMIT_WINDOW_MS,
        DEFAULT_WINDOW_MS,
      ),
      blockMs: parsePositiveInteger(
        process.env.LOGIN_RATE_LIMIT_IP_BLOCK_MS,
        DEFAULT_BLOCK_MS,
      ),
    },
    [RATE_LIMIT_SCOPE.EMAIL]: {
      maxFailures: parsePositiveInteger(
        process.env.LOGIN_RATE_LIMIT_EMAIL_MAX_FAILURES,
        DEFAULT_EMAIL_MAX_FAILURES,
      ),
      windowMs: parsePositiveInteger(
        process.env.LOGIN_RATE_LIMIT_WINDOW_MS,
        DEFAULT_WINDOW_MS,
      ),
      blockMs: parsePositiveInteger(
        process.env.LOGIN_RATE_LIMIT_EMAIL_BLOCK_MS,
        DEFAULT_BLOCK_MS,
      ),
    },
  };
}

function hashIdentifier(value) {
  return createHash("sha256").update(value).digest("hex");
}

function buildRateLimitId(scope, identifierHash) {
  return `${scope}:${identifierHash}`;
}

function resolveClientIp(request) {
  if (typeof request.ip === "string" && request.ip.trim()) {
    return request.ip.trim();
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const forwardedIp = forwardedFor.split(",")[0]?.trim();
    if (forwardedIp) {
      return forwardedIp;
    }
  }

  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp?.trim()) {
    return cfConnectingIp.trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp?.trim()) {
    return realIp.trim();
  }

  return null;
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function buildIdentifierSet(request, email) {
  const ip = resolveClientIp(request);
  const normalizedEmail = normalizeEmail(email);
  const emailHash = hashIdentifier(normalizedEmail);
  const identifierSet = [
    {
      id: buildRateLimitId(RATE_LIMIT_SCOPE.EMAIL, emailHash),
      scope: RATE_LIMIT_SCOPE.EMAIL,
      identifierHash: emailHash,
    },
  ];

  if (ip) {
    const ipHash = hashIdentifier(ip);
    identifierSet.unshift({
      id: buildRateLimitId(RATE_LIMIT_SCOPE.IP, ipHash),
      scope: RATE_LIMIT_SCOPE.IP,
      identifierHash: ipHash,
    });
  }

  return identifierSet;
}

function resolveActiveBlock(records, config, now) {
  let blockedUntil = null;

  for (const record of records) {
    if (!record?.blockedUntil) {
      continue;
    }

    const scopeConfig = config[record.scope];
    if (!scopeConfig) {
      continue;
    }

    if (record.blockedUntil > now) {
      if (!blockedUntil || record.blockedUntil > blockedUntil) {
        blockedUntil = record.blockedUntil;
      }
    }
  }

  if (!blockedUntil) {
    return { blocked: false, retryAfterSeconds: 0 };
  }

  return {
    blocked: true,
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000),
    ),
  };
}

function buildNextFailureState(existingRecord, scopeConfig, now) {
  const staleWindow =
    !existingRecord?.windowStartedAt ||
    now.getTime() - existingRecord.windowStartedAt.getTime() > scopeConfig.windowMs;

  const windowStartedAt = staleWindow ? now : existingRecord.windowStartedAt;
  const previousFailures = staleWindow ? 0 : existingRecord.failureCount;
  const nextFailures = previousFailures + 1;

  if (nextFailures >= scopeConfig.maxFailures) {
    return {
      failureCount: 0,
      windowStartedAt: null,
      blockedUntil: new Date(now.getTime() + scopeConfig.blockMs),
    };
  }

  return {
    failureCount: nextFailures,
    windowStartedAt,
    blockedUntil: null,
  };
}

async function getRateLimitRecords(ids) {
  const records = await prisma.loginRateLimit.findMany({
    where: {
      id: { in: ids },
    },
    select: {
      id: true,
      scope: true,
      failureCount: true,
      windowStartedAt: true,
      blockedUntil: true,
    },
  });

  return new Map(records.map((record) => [record.id, record]));
}

async function clearExpiredBlocks(ids, now) {
  await prisma.loginRateLimit.updateMany({
    where: {
      id: { in: ids },
      blockedUntil: {
        lte: now,
      },
    },
    data: {
      blockedUntil: null,
      failureCount: 0,
      windowStartedAt: null,
    },
  });
}

export async function checkLoginRateLimit(request, email) {
  const identifierSet = buildIdentifierSet(request, email);
  const ids = identifierSet.map((entry) => entry.id);
  const now = new Date();

  if (ids.length === 0) {
    return {
      blocked: false,
      retryAfterSeconds: 0,
      identifierSet: [],
    };
  }

  await clearExpiredBlocks(ids, now);

  const recordsById = await getRateLimitRecords(ids);
  const config = resolveRateLimitConfig();
  const activeBlock = resolveActiveBlock(
    identifierSet.map((entry) => recordsById.get(entry.id)).filter(Boolean),
    config,
    now,
  );

  return {
    ...activeBlock,
    identifierSet,
  };
}

export async function recordFailedLoginAttempt(identifierSet) {
  if (!Array.isArray(identifierSet) || identifierSet.length === 0) {
    return;
  }

  const config = resolveRateLimitConfig();
  const ids = identifierSet.map((entry) => entry.id);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.loginRateLimit.updateMany({
      where: {
        id: { in: ids },
        blockedUntil: {
          lte: now,
        },
      },
      data: {
        blockedUntil: null,
        failureCount: 0,
        windowStartedAt: null,
      },
    });

    const existingRecords = await tx.loginRateLimit.findMany({
      where: {
        id: { in: ids },
      },
      select: {
        id: true,
        scope: true,
        failureCount: true,
        windowStartedAt: true,
        blockedUntil: true,
      },
    });

    const existingById = new Map(existingRecords.map((record) => [record.id, record]));

    for (const entry of identifierSet) {
      const scopeConfig = config[entry.scope];

      if (!scopeConfig) {
        continue;
      }

      const existing = existingById.get(entry.id);

      if (existing?.blockedUntil && existing.blockedUntil > now) {
        continue;
      }

      const nextState = buildNextFailureState(existing, scopeConfig, now);
      await tx.loginRateLimit.upsert({
        where: { id: entry.id },
        create: {
          id: entry.id,
          scope: entry.scope,
          identifierHash: entry.identifierHash,
          failureCount: nextState.failureCount,
          windowStartedAt: nextState.windowStartedAt,
          blockedUntil: nextState.blockedUntil,
        },
        update: {
          failureCount: nextState.failureCount,
          windowStartedAt: nextState.windowStartedAt,
          blockedUntil: nextState.blockedUntil,
        },
      });
    }
  });
}

export async function clearLoginRateLimit(identifierSet) {
  if (!Array.isArray(identifierSet) || identifierSet.length === 0) {
    return;
  }

  await prisma.loginRateLimit.deleteMany({
    where: {
      id: {
        in: identifierSet.map((entry) => entry.id),
      },
    },
  });
}
