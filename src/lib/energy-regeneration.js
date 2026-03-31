import { prisma } from "@/lib/prisma";
import { getClassPassiveEnergyRefreshBonus } from "@/lib/class-identity";

export const DEFAULT_MAX_ENERGY = 20;
export const ENERGY_REGEN_INTERVAL_SECONDS = 5 * 60;
export const ENERGY_REGEN_INTERVAL_MS = ENERGY_REGEN_INTERVAL_SECONDS * 1000;
export const HP_REGEN_INTERVAL_SECONDS = ENERGY_REGEN_INTERVAL_SECONDS;
export const HP_REGEN_INTERVAL_MS = ENERGY_REGEN_INTERVAL_MS;

const CHARACTER_CLASS_BASE_HP = {
  BARBARIAN: 28,
  BARD: 20,
  CLERIC: 22,
  DRUID: 20,
  FIGHTER: 24,
  MONK: 22,
  PALADIN: 26,
  RANGER: 22,
  ROGUE: 20,
  SORCERER: 18,
  WARLOCK: 18,
  WIZARD: 16,
};

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

function resolveBaseMaxHp(character) {
  const classBaseHp = CHARACTER_CLASS_BASE_HP[character?.characterClass] ?? 20;
  const constitution = Number(character?.constitution);
  const constitutionModifier = Number.isFinite(constitution)
    ? Math.floor((constitution - 10) / 2)
    : 0;

  return Math.max(10, classBaseHp + constitutionModifier * 2);
}

function resolveMaxHp(character) {
  const baseMaxHp = resolveBaseMaxHp(character);
  const currentHp = Number(character?.hp);

  if (!Number.isFinite(currentHp)) {
    return baseMaxHp;
  }

  return Math.max(1, baseMaxHp, Math.floor(currentHp));
}

function resolveHp(character, maxHp) {
  return clampNumeric(character?.hp, 0, maxHp, maxHp);
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

function buildResourceRegenerationMeta({
  resourceKey,
  currentValue,
  maxValue,
  now,
  anchor,
  intervalMs,
}) {
  const isFull = currentValue >= maxValue;
  const nextAt = isFull ? null : new Date(anchor.getTime() + intervalMs);
  const secondsUntilNext = isFull
    ? 0
    : Math.max(0, Math.ceil((nextAt.getTime() - now.getTime()) / 1000));
  const intervalSeconds = Math.floor(intervalMs / 1000);

  const baseMeta = {
    resourceKey,
    currentValue,
    maxValue,
    isFull,
    nextAt: nextAt ? nextAt.toISOString() : null,
    secondsUntilNext,
    regenerationIntervalSeconds: intervalSeconds,
  };

  if (resourceKey === "energy") {
    return {
      ...baseMeta,
      currentEnergy: currentValue,
      maxEnergy: maxValue,
      nextEnergyAt: baseMeta.nextAt,
      secondsUntilNextEnergy: secondsUntilNext,
    };
  }

  return {
    ...baseMeta,
    currentHp: currentValue,
    maxHp: maxValue,
    nextHpAt: baseMeta.nextAt,
    secondsUntilNextHp: secondsUntilNext,
  };
}

export function getEnergyRegenerationMeta(character, nowInput = new Date()) {
  if (!character) {
    return null;
  }

  const now = new Date(nowInput);
  const maxEnergy = resolveMaxEnergy(character);
  const energy = resolveEnergy(character, maxEnergy);
  const energyRegenAt = resolveEnergyAnchor(character, now);

  return buildResourceRegenerationMeta({
    resourceKey: "energy",
    currentValue: energy,
    maxValue: maxEnergy,
    now,
    anchor: energyRegenAt,
    intervalMs: ENERGY_REGEN_INTERVAL_MS,
  });
}

export function getHpRegenerationMeta(character, nowInput = new Date()) {
  if (!character) {
    return null;
  }

  const now = new Date(nowInput);
  const maxHp = resolveMaxHp(character);
  const hp = resolveHp(character, maxHp);
  const energyRegenAt = resolveEnergyAnchor(character, now);

  return buildResourceRegenerationMeta({
    resourceKey: "hp",
    currentValue: hp,
    maxValue: maxHp,
    now,
    anchor: energyRegenAt,
    intervalMs: HP_REGEN_INTERVAL_MS,
  });
}

export async function resolveCharacterEnergyRegeneration(character, options = {}) {
  if (!character) {
    return {
      character: null,
      changed: false,
      energy: null,
      hp: null,
      meta: null,
      hpMeta: null,
    };
  }

  const now = options.now ? new Date(options.now) : new Date();
  const shouldPersist = options.persist !== false;

  const maxEnergy = resolveMaxEnergy(character);
  const maxHp = resolveMaxHp(character);
  const previousEnergy = resolveEnergy(character, maxEnergy);
  const previousHp = resolveHp(character, maxHp);
  const previousAnchor = resolveEnergyAnchor(character, now);

  let nextEnergy = previousEnergy;
  let nextHp = previousHp;
  let nextAnchor = previousAnchor;
  let changed = false;

  if (nextEnergy < maxEnergy || nextHp < maxHp) {
    const elapsedMs = Math.max(0, now.getTime() - previousAnchor.getTime());
    const recoveredUnits = Math.floor(elapsedMs / ENERGY_REGEN_INTERVAL_MS);

    if (recoveredUnits > 0) {
      const availableEnergyCapacity = maxEnergy - nextEnergy;
      const availableHpCapacity = maxHp - nextHp;
      const gainedEnergyFromIntervals = Math.min(availableEnergyCapacity, recoveredUnits);
      const gainedHpFromIntervals = Math.min(availableHpCapacity, recoveredUnits);
      const consumedIntervals = Math.max(gainedEnergyFromIntervals, gainedHpFromIntervals);

      nextEnergy += gainedEnergyFromIntervals;
      nextHp += gainedHpFromIntervals;
      changed = gainedEnergyFromIntervals > 0 || gainedHpFromIntervals > 0;
      const extraEnergyOnRefresh = getClassPassiveEnergyRefreshBonus(
        character.characterClass,
      );

      if (
        gainedEnergyFromIntervals > 0 &&
        extraEnergyOnRefresh > 0 &&
        nextEnergy < maxEnergy
      ) {
        const extraEnergy = Math.min(maxEnergy - nextEnergy, extraEnergyOnRefresh);
        nextEnergy += extraEnergy;
        changed = changed || extraEnergy > 0;
      }

      if (nextEnergy >= maxEnergy && nextHp >= maxHp) {
        nextAnchor = now;
      } else if (consumedIntervals > 0) {
        nextAnchor = new Date(
          previousAnchor.getTime() + consumedIntervals * ENERGY_REGEN_INTERVAL_MS,
        );
      }
    }
  }

  const normalizedCharacter = {
    ...character,
    hp: nextHp,
    energy: nextEnergy,
    maxEnergy,
    energyRegenAt: nextAnchor,
  };

  if (shouldPersist && changed) {
    await prisma.character.update({
      where: { id: character.id },
      data: {
        hp: nextHp,
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
    hp: {
      before: previousHp,
      after: nextHp,
      max: maxHp,
    },
    meta: getEnergyRegenerationMeta(normalizedCharacter, now),
    hpMeta: getHpRegenerationMeta(normalizedCharacter, now),
  };
}
