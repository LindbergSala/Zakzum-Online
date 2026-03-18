import { prisma } from "@/lib/prisma";
import { getClassPassiveEnergyRefreshBonus } from "@/lib/class-identity";

export const DEFAULT_MAX_ENERGY = 20;
export const ENERGY_REGEN_INTERVAL_SECONDS = 5 * 60;
export const ENERGY_REGEN_INTERVAL_MS = ENERGY_REGEN_INTERVAL_SECONDS * 1000;

function clampNumeric(value, min, max, fallback) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.floor(numericValue)));
}

function resolveMaxEnergy(character) {
  return clampNumeric(character?.maxEnergy, 1, 999, DEFAULT_MAX_ENERGY);
}

function resolveEnergy(character, maxEnergy) {
  return clampNumeric(character?.energy, 0, maxEnergy, maxEnergy);
}

function resolveEnergyAnchor(character, now) {
  const anchor = character?.energyRegenAt
    ? new Date(character.energyRegenAt)
    : null;

  if (!anchor || Number.isNaN(anchor.getTime())) {
    return now;
  }

  return anchor;
}

export function getEnergyRegenerationMeta(character, nowInput = new Date()) {
  if (!character) {
    return null;
  }

  const now = new Date(nowInput);
  const maxEnergy = resolveMaxEnergy(character);
  const energy = resolveEnergy(character, maxEnergy);
  const energyRegenAt = resolveEnergyAnchor(character, now);
  const isFull = energy >= maxEnergy;

  if (isFull) {
    return {
      currentEnergy: energy,
      maxEnergy,
      isFull: true,
      nextEnergyAt: null,
      secondsUntilNextEnergy: 0,
      regenerationIntervalSeconds: ENERGY_REGEN_INTERVAL_SECONDS,
    };
  }

  const nextEnergyAt = new Date(energyRegenAt.getTime() + ENERGY_REGEN_INTERVAL_MS);
  const secondsUntilNextEnergy = Math.max(
    0,
    Math.ceil((nextEnergyAt.getTime() - now.getTime()) / 1000),
  );

  return {
    currentEnergy: energy,
    maxEnergy,
    isFull: false,
    nextEnergyAt: nextEnergyAt.toISOString(),
    secondsUntilNextEnergy,
    regenerationIntervalSeconds: ENERGY_REGEN_INTERVAL_SECONDS,
  };
}

export async function resolveCharacterEnergyRegeneration(character, options = {}) {
  if (!character) {
    return {
      character: null,
      changed: false,
      energy: null,
      meta: null,
    };
  }

  const now = options.now ? new Date(options.now) : new Date();
  const shouldPersist = options.persist !== false;

  const maxEnergy = resolveMaxEnergy(character);
  const previousEnergy = resolveEnergy(character, maxEnergy);
  const previousAnchor = resolveEnergyAnchor(character, now);

  let nextEnergy = previousEnergy;
  let nextAnchor = previousAnchor;
  let changed = false;

  if (nextEnergy < maxEnergy) {
    const elapsedMs = Math.max(0, now.getTime() - previousAnchor.getTime());
    const recoveredUnits = Math.floor(elapsedMs / ENERGY_REGEN_INTERVAL_MS);

    if (recoveredUnits > 0) {
      const availableCapacity = maxEnergy - nextEnergy;
      const gainedEnergy = Math.min(availableCapacity, recoveredUnits);

      nextEnergy += gainedEnergy;
      changed = gainedEnergy > 0;
      const extraEnergyOnRefresh = getClassPassiveEnergyRefreshBonus(
        character.characterClass,
      );

      if (gainedEnergy > 0 && extraEnergyOnRefresh > 0 && nextEnergy < maxEnergy) {
        const extraEnergy = Math.min(maxEnergy - nextEnergy, extraEnergyOnRefresh);
        nextEnergy += extraEnergy;
        changed = changed || extraEnergy > 0;
      }

      if (nextEnergy >= maxEnergy) {
        nextAnchor = now;
      } else {
        nextAnchor = new Date(
          previousAnchor.getTime() + gainedEnergy * ENERGY_REGEN_INTERVAL_MS,
        );
      }
    }
  }

  const normalizedCharacter = {
    ...character,
    energy: nextEnergy,
    maxEnergy,
    energyRegenAt: nextAnchor,
  };

  if (shouldPersist && changed) {
    await prisma.character.update({
      where: { id: character.id },
      data: {
        energy: nextEnergy,
        maxEnergy,
        energyRegenAt: nextAnchor,
      },
    });
  }

  return {
    character: normalizedCharacter,
    changed,
    energy: {
      before: previousEnergy,
      after: nextEnergy,
      max: maxEnergy,
    },
    meta: getEnergyRegenerationMeta(normalizedCharacter, now),
  };
}
