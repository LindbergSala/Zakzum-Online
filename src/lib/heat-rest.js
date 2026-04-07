import { prisma } from "@/lib/prisma";

export const HEAT_REST_DURATION_MINUTES = 15;
export const HEAT_REST_DURATION_MS = HEAT_REST_DURATION_MINUTES * 60 * 1000;
export const HEAT_REST_RECOVERY = 4;

function resolveHeat(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  return Math.max(0, Math.floor(numericValue));
}

function resolveHeatRestEnd(character) {
  const restEnd = character?.heatRestEndsAt ? new Date(character.heatRestEndsAt) : null;

  if (!restEnd || Number.isNaN(restEnd.getTime())) {
    return null;
  }

  return restEnd;
}

export function isCharacterResting(character, nowInput = new Date()) {
  const restEnd = resolveHeatRestEnd(character);

  return Boolean(restEnd);
}

export function getCharacterHeatRestMeta(character, nowInput = new Date()) {
  if (!character) {
    return null;
  }

  const now = new Date(nowInput);
  const restEnd = resolveHeatRestEnd(character);

  if (!restEnd) {
    return null;
  }

  const secondsUntilNextRecovery = Math.max(
    0,
    Math.ceil((restEnd.getTime() - now.getTime()) / 1000),
  );

  return {
    isResting: true,
    blockedActions: true,
    currentHeat: resolveHeat(character.heat),
    nextRecoveryAt: restEnd.toISOString(),
    secondsUntilNextRecovery,
    restEndsAt: restEnd.toISOString(),
    secondsUntilRestComplete: secondsUntilNextRecovery,
    durationMinutes: HEAT_REST_DURATION_MINUTES,
    heatRecoveredPerPass: HEAT_REST_RECOVERY,
    heatRecoveredOnComplete: HEAT_REST_RECOVERY,
  };
}

export async function resolveCharacterHeatRest(character, options = {}) {
  if (!character) {
    return {
      character: null,
      changed: false,
      completed: false,
      recoveredHeat: 0,
      meta: null,
    };
  }

  const now = options.now ? new Date(options.now) : new Date();
  const shouldPersist = options.persist !== false;
  const restEnd = resolveHeatRestEnd(character);

  if (!restEnd) {
    const normalizedCharacter = {
      ...character,
      heatRestEndsAt: null,
    };

    if (shouldPersist && character?.heatRestEndsAt) {
      await prisma.character.update({
        where: { id: character.id },
        data: { heatRestEndsAt: null },
      });
    }

    return {
      character: normalizedCharacter,
      changed: Boolean(character?.heatRestEndsAt),
      completed: false,
      recoveredHeat: 0,
      meta: null,
    };
  }

  if (restEnd.getTime() > now.getTime()) {
    return {
      character,
      changed: false,
      completed: false,
      recoveredHeat: 0,
      meta: getCharacterHeatRestMeta(character, now),
    };
  }

  const currentHeat = resolveHeat(character.heat);
  const completedPasses = Math.floor((now.getTime() - restEnd.getTime()) / HEAT_REST_DURATION_MS) + 1;
  const totalRecovery = completedPasses * HEAT_REST_RECOVERY;
  const nextHeat = Math.max(0, currentHeat - totalRecovery);
  const recoveredHeat = currentHeat - nextHeat;
  const nextRecoveryAt = new Date(restEnd.getTime() + completedPasses * HEAT_REST_DURATION_MS);
  const normalizedCharacter = {
    ...character,
    heat: nextHeat,
    heatRestEndsAt: nextRecoveryAt,
  };

  if (shouldPersist) {
    await prisma.character.update({
      where: { id: character.id },
      data: {
        heat: nextHeat,
        heatRestEndsAt: nextRecoveryAt,
      },
    });
  }

  return {
    character: normalizedCharacter,
    changed: true,
    completed: recoveredHeat > 0,
    recoveredHeat,
    meta: getCharacterHeatRestMeta(normalizedCharacter, now),
  };
}