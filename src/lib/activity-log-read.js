import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

function shouldFallbackEnumRead(caughtError) {
  return (
    caughtError &&
    typeof caughtError.message === "string" &&
    caughtError.message.includes("Value 'ONBOARDING' not found in enum 'ActivityLogType'")
  );
}

function parseJsonValue(value) {
  if (value == null || typeof value === "object") {
    return value;
  }

  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function normalizeActivityLogRow(row) {
  return {
    ...row,
    delta: parseJsonValue(row.delta),
    beforeResources: parseJsonValue(row.beforeResources),
    afterResources: parseJsonValue(row.afterResources),
    details: parseJsonValue(row.details),
    createdAt: row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt),
  };
}

export async function findActivityLogsForCharacter(characterId, options = {}) {
  const prismaClient = options.prismaClient ?? prisma;
  const take = Math.max(1, Number(options.take) || 10);

  try {
    return await prismaClient.activityLog.findMany({
      where: { characterId },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        characterId: true,
        type: true,
        activityId: true,
        activityName: true,
        success: true,
        staminaCost: true,
        roll: true,
        rollTotal: true,
        successTarget: true,
        statModifier: true,
        chancePercent: true,
        delta: true,
        beforeResources: true,
        afterResources: true,
        details: true,
        createdAt: true,
      },
    });
  } catch (caughtError) {
    if (!shouldFallbackEnumRead(caughtError)) {
      throw caughtError;
    }

    const rows = await prismaClient.$queryRaw(Prisma.sql`
      SELECT
        "id",
        "characterId",
        "type"::text AS "type",
        "activityId",
        "activityName",
        "success",
        "staminaCost",
        "roll",
        "rollTotal",
        "successTarget",
        "statModifier",
        "chancePercent",
        "delta",
        "beforeResources",
        "afterResources",
        "details",
        "createdAt"
      FROM "ActivityLog"
      WHERE "characterId" = ${characterId}
      ORDER BY "createdAt" DESC
      LIMIT ${take}
    `);

    return rows.map(normalizeActivityLogRow);
  }
}

export async function findRecentActivityLogs(options = {}) {
  const prismaClient = options.prismaClient ?? prisma;
  const take = Math.max(1, Number(options.take) || 10);

  try {
    return await prismaClient.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        characterId: true,
        type: true,
        activityId: true,
        activityName: true,
        success: true,
        staminaCost: true,
        roll: true,
        rollTotal: true,
        successTarget: true,
        statModifier: true,
        chancePercent: true,
        delta: true,
        beforeResources: true,
        afterResources: true,
        details: true,
        createdAt: true,
        character: {
          select: {
            name: true,
          },
        },
      },
    });
  } catch (caughtError) {
    if (!shouldFallbackEnumRead(caughtError)) {
      throw caughtError;
    }

    const rows = await prismaClient.$queryRaw(Prisma.sql`
      SELECT
        log."id",
        log."characterId",
        log."type"::text AS "type",
        log."activityId",
        log."activityName",
        log."success",
        log."staminaCost",
        log."roll",
        log."rollTotal",
        log."successTarget",
        log."statModifier",
        log."chancePercent",
        log."delta",
        log."beforeResources",
        log."afterResources",
        log."details",
        log."createdAt",
        json_build_object('name', character."name") AS "character"
      FROM "ActivityLog" AS log
      INNER JOIN "Character" AS character
        ON character."id" = log."characterId"
      ORDER BY log."createdAt" DESC
      LIMIT ${take}
    `);

    return rows.map(normalizeActivityLogRow);
  }
}

export async function groupActivityLogsForCharacter(characterId, options = {}) {
  const prismaClient = options.prismaClient ?? prisma;

  try {
    return await prismaClient.activityLog.groupBy({
      by: ["type", "success", "activityId"],
      where: { characterId },
      _count: { _all: true },
    });
  } catch (caughtError) {
    if (!shouldFallbackEnumRead(caughtError)) {
      throw caughtError;
    }

    const rows = await prismaClient.$queryRaw(Prisma.sql`
      SELECT
        "type"::text AS "type",
        "success",
        "activityId",
        COUNT(*)::int AS "count"
      FROM "ActivityLog"
      WHERE "characterId" = ${characterId}
      GROUP BY "type", "success", "activityId"
    `);

    return rows.map((row) => ({
      type: row.type,
      success: row.success,
      activityId: row.activityId,
      _count: { _all: Number(row.count) || 0 },
    }));
  }
}