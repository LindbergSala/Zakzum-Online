import { prisma } from "@/lib/prisma";
import { getRestRecoveryTickBonus } from "@/lib/character-stat-rules";
import { getClassPassiveStaminaRefreshBonus } from "@/lib/class-identity";
import { isCharacterResting } from "@/lib/heat-rest";

export const DEFAULT_MAX_STAMINA = 20;
export const STAMINA_REGEN_INTERVAL_SECONDS = 5 * 60;
export const STAMINA_REGEN_INTERVAL_MS = STAMINA_REGEN_INTERVAL_SECONDS * 1000;
export const HP_REGEN_INTERVAL_MS = STAMINA_REGEN_INTERVAL_MS;

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

function resolveMaxStamina(character) {
  return clampNumeric(character?.maxStamina, 1, 999, DEFAULT_MAX_STAMINA);
}

function resolveStamina(character, maxStamina) {
  return clampNumeric(character?.stamina, 0, maxStamina, maxStamina);
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

function resolveStaminaAnchor(character, now) {
  const anchor = character?.staminaRegenAt
    ? new Date(character.staminaRegenAt)
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

  if (resourceKey === "stamina") {
    return {
      ...baseMeta,
      currentStamina: currentValue,
      maxStamina: maxValue,
      nextStaminaAt: baseMeta.nextAt,
      secondsUntilNextStamina: secondsUntilNext,
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

export function getStaminaRegenerationMeta(character, nowInput = new Date()) {
  if (!character) {
    return null;
  }

  const now = new Date(nowInput);
  const maxStamina = resolveMaxStamina(character);
  const stamina = resolveStamina(character, maxStamina);
  const staminaRegenAt = resolveStaminaAnchor(character, now);

  return buildResourceRegenerationMeta({
    resourceKey: "stamina",
    currentValue: stamina,
    maxValue: maxStamina,
    now,
    anchor: staminaRegenAt,
    intervalMs: STAMINA_REGEN_INTERVAL_MS,
  });
}

export function getHpRegenerationMeta(character, nowInput = new Date()) {
  if (!character) {
    return null;
  }

  const now = new Date(nowInput);
  const maxHp = resolveMaxHp(character);
  const hp = resolveHp(character, maxHp);
  const staminaRegenAt = resolveStaminaAnchor(character, now);

  return buildResourceRegenerationMeta({
    resourceKey: "hp",
    currentValue: hp,
    maxValue: maxHp,
    now,
    anchor: staminaRegenAt,
    intervalMs: HP_REGEN_INTERVAL_MS,
  });
}

export async function resolveCharacterStaminaRegeneration(character, options = {}) {
  if (!character) {
    return {
      character: null,
      changed: false,
      stamina: null,
      hp: null,
      meta: null,
      hpMeta: null,
    };
  }

  const now = options.now ? new Date(options.now) : new Date();
  const shouldPersist = options.persist !== false;
  const rawStamina = Number(character?.stamina);
  const rawMaxStamina = Number(character?.maxStamina);
  const rawStaminaRegenAt = character?.staminaRegenAt
    ? new Date(character.staminaRegenAt)
    : null;
  const hasValidStoredAnchor =
    rawStaminaRegenAt !== null && !Number.isNaN(rawStaminaRegenAt.getTime());

  const maxStamina = resolveMaxStamina(character);
  const maxHp = resolveMaxHp(character);
  const previousStamina = resolveStamina(character, maxStamina);
  const previousHp = resolveHp(character, maxHp);
  const previousAnchor = resolveStaminaAnchor(character, now);

  let nextStamina = previousStamina;
  let nextHp = previousHp;
  let nextAnchor = previousAnchor;
  let changed =
    !Number.isFinite(rawStamina) ||
    Math.floor(rawStamina) !== previousStamina ||
    !Number.isFinite(rawMaxStamina) ||
    Math.floor(rawMaxStamina) !== maxStamina ||
    !hasValidStoredAnchor;

  if (nextStamina < maxStamina || nextHp < maxHp) {
    const elapsedMs = Math.max(0, now.getTime() - previousAnchor.getTime());
    const recoveredUnits = Math.floor(elapsedMs / STAMINA_REGEN_INTERVAL_MS);

    if (recoveredUnits > 0) {
      const availableStaminaCapacity = maxStamina - nextStamina;
      const availableHpCapacity = maxHp - nextHp;
      const gainedStaminaFromIntervals = Math.min(availableStaminaCapacity, recoveredUnits);
      const gainedHpFromIntervals = Math.min(availableHpCapacity, recoveredUnits);
      const consumedIntervals = Math.max(gainedStaminaFromIntervals, gainedHpFromIntervals);

      nextStamina += gainedStaminaFromIntervals;
      nextHp += gainedHpFromIntervals;
      changed =
        changed ||
        gainedStaminaFromIntervals > 0 ||
        gainedHpFromIntervals > 0;
      const extraStaminaOnRefresh = getClassPassiveStaminaRefreshBonus(
        character.characterClass,
      );

      if (
        gainedStaminaFromIntervals > 0 &&
        extraStaminaOnRefresh > 0 &&
        nextStamina < maxStamina
      ) {
        const extraStamina = Math.min(maxStamina - nextStamina, extraStaminaOnRefresh);
        nextStamina += extraStamina;
        changed = changed || extraStamina > 0;
      }

      const wisdomRecoveryBonus = getRestRecoveryTickBonus(character?.wisdom);
      if (
        wisdomRecoveryBonus > 0 &&
        isCharacterResting(character, now)
      ) {
        const extraStamina = Math.min(maxStamina - nextStamina, wisdomRecoveryBonus);
        const extraHp = Math.min(maxHp - nextHp, wisdomRecoveryBonus);

        nextStamina += extraStamina;
        nextHp += extraHp;
        changed = changed || extraStamina > 0 || extraHp > 0;
      }

      if (nextStamina >= maxStamina && nextHp >= maxHp) {
        nextAnchor = now;
      } else if (consumedIntervals > 0) {
        nextAnchor = new Date(
          previousAnchor.getTime() + consumedIntervals * STAMINA_REGEN_INTERVAL_MS,
        );
      }
    }
  }

  const normalizedCharacter = {
    ...character,
    hp: nextHp,
    stamina: nextStamina,
    maxStamina,
    staminaRegenAt: nextAnchor,
  };

  if (shouldPersist && changed) {
    await prisma.character.update({
      where: { id: character.id },
      data: {
        hp: nextHp,
        stamina: nextStamina,
        maxStamina,
        staminaRegenAt: nextAnchor,
      },
    });
  }

  return {
    character: normalizedCharacter,
    changed,
    stamina: {
      before: previousStamina,
      after: nextStamina,
      max: maxStamina,
    },
    hp: {
      before: previousHp,
      after: nextHp,
      max: maxHp,
    },
    meta: getStaminaRegenerationMeta(normalizedCharacter, now),
    hpMeta: getHpRegenerationMeta(normalizedCharacter, now),
  };
}

export const DEFAULT_MAX_ENERGY = DEFAULT_MAX_STAMINA;
export const ENERGY_REGEN_INTERVAL_SECONDS = STAMINA_REGEN_INTERVAL_SECONDS;
export const ENERGY_REGEN_INTERVAL_MS = STAMINA_REGEN_INTERVAL_MS;
export const getEnergyRegenerationMeta = getStaminaRegenerationMeta;
export const resolveCharacterEnergyRegeneration = resolveCharacterStaminaRegeneration;
