import { SHOP_ITEM_DEFINITION_MAP } from "@/lib/core-loop-data";

export const CHARACTER_STAT_KEYS = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
];

export const CHARACTER_STAT_LABELS = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
};

const RESOURCE_DELTA_KEYS = [
  "hp",
  "energy",
  "gold",
  "xp",
  "level",
  "renown",
  "heat",
];

function buildZeroStats() {
  return Object.fromEntries(CHARACTER_STAT_KEYS.map((key) => [key, 0]));
}

function buildZeroResourceDelta() {
  return Object.fromEntries(RESOURCE_DELTA_KEYS.map((key) => [key, 0]));
}

function toNumericStatValue(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function normalizeResourceDeltaValues(delta = {}) {
  const normalized = buildZeroResourceDelta();

  for (const key of RESOURCE_DELTA_KEYS) {
    normalized[key] = toNumericStatValue(delta[key]);
  }

  return normalized;
}

function mergeResourceDelta(target, delta = {}) {
  for (const key of RESOURCE_DELTA_KEYS) {
    target[key] += toNumericStatValue(delta[key]);
  }
}

function compactResourceDelta(delta) {
  return Object.fromEntries(
    RESOURCE_DELTA_KEYS.filter((key) => delta[key] !== 0).map((key) => [key, delta[key]]),
  );
}

function formatSignedValue(value) {
  return value > 0 ? `+${value}` : `${value}`;
}

function formatResourceDeltaLabel(delta = {}) {
  const normalized = normalizeResourceDeltaValues(delta);
  const parts = RESOURCE_DELTA_KEYS.filter((key) => normalized[key] !== 0).map(
    (key) => `${key.toUpperCase()} ${formatSignedValue(normalized[key])}`,
  );

  return parts.join(", ");
}

export function getCharacterBaseStats(character) {
  return Object.fromEntries(
    CHARACTER_STAT_KEYS.map((key) => [key, toNumericStatValue(character[key])]),
  );
}

export function normalizeStatBonuses(statBonuses = {}) {
  const normalized = buildZeroStats();

  for (const key of CHARACTER_STAT_KEYS) {
    normalized[key] = toNumericStatValue(statBonuses[key]);
  }

  return normalized;
}

export function addStatObjects(baseStats, bonusStats) {
  return Object.fromEntries(
    CHARACTER_STAT_KEYS.map((key) => [
      key,
      toNumericStatValue(baseStats[key]) + toNumericStatValue(bonusStats[key]),
    ]),
  );
}

export function getItemStatBonuses(itemId) {
  const definition = SHOP_ITEM_DEFINITION_MAP[itemId];
  return normalizeStatBonuses(definition?.effects?.stats);
}

export function getEquippedItemStatBonuses(equippedItems) {
  const total = buildZeroStats();

  for (const item of equippedItems) {
    const bonuses = getItemStatBonuses(item.itemId);

    for (const key of CHARACTER_STAT_KEYS) {
      total[key] += bonuses[key];
    }
  }

  return total;
}

export function getItemActivityRollModifier(itemId, activityId) {
  const effects = SHOP_ITEM_DEFINITION_MAP[itemId]?.effects ?? {};
  const globalModifier = toNumericStatValue(effects.activityRollModifier);
  const byActivityModifier = toNumericStatValue(
    effects.activityRollModifierByActivity?.[activityId],
  );

  return globalModifier + byActivityModifier;
}

export function getEquippedItemRollModifier(equippedItems, activityId) {
  return equippedItems.reduce(
    (total, item) => total + getItemActivityRollModifier(item.itemId, activityId),
    0,
  );
}

function getItemActivityDelta(itemId, { success, activityId }) {
  const effects = SHOP_ITEM_DEFINITION_MAP[itemId]?.effects ?? {};
  const resolvedDelta = buildZeroResourceDelta();

  mergeResourceDelta(resolvedDelta, effects.activityDelta);
  mergeResourceDelta(resolvedDelta, effects.activityDeltaByActivity?.[activityId]);

  if (success) {
    mergeResourceDelta(resolvedDelta, effects.activityDeltaOnSuccess);
    mergeResourceDelta(
      resolvedDelta,
      effects.activityDeltaOnSuccessByActivity?.[activityId],
    );
  } else {
    mergeResourceDelta(resolvedDelta, effects.activityDeltaOnFailure);
    mergeResourceDelta(
      resolvedDelta,
      effects.activityDeltaOnFailureByActivity?.[activityId],
    );
  }

  return resolvedDelta;
}

export function applyEquippedItemActivityDelta({
  equippedItems,
  delta,
  success,
  activityId,
}) {
  const nextDelta = normalizeResourceDeltaValues(delta);
  const totalItemDeltaBonus = buildZeroResourceDelta();

  for (const item of equippedItems) {
    const itemDelta = getItemActivityDelta(item.itemId, { success, activityId });
    mergeResourceDelta(nextDelta, itemDelta);
    mergeResourceDelta(totalItemDeltaBonus, itemDelta);
  }

  return {
    delta: nextDelta,
    deltaBonus: compactResourceDelta(totalItemDeltaBonus),
  };
}

export function getCharacterEffectiveStats(character, equippedItems = []) {
  const base = getCharacterBaseStats(character);
  const bonus = getEquippedItemStatBonuses(equippedItems);
  const effective = addStatObjects(base, bonus);

  return {
    base,
    bonus,
    effective,
  };
}

export function formatStatBonusLabel(statBonuses = {}) {
  const normalized = normalizeStatBonuses(statBonuses);
  const parts = [];

  for (const key of CHARACTER_STAT_KEYS) {
    const value = normalized[key];

    if (value > 0) {
      parts.push(`${CHARACTER_STAT_LABELS[key]} +${value}`);
    } else if (value < 0) {
      parts.push(`${CHARACTER_STAT_LABELS[key]} ${value}`);
    }
  }

  if (parts.length === 0) {
    return "No stat bonus";
  }

  return parts.join(", ");
}

export function formatItemEffectLabel(effects = {}) {
  const parts = [];
  const statLabel = formatStatBonusLabel(effects.stats);
  const carryCapacity = toNumericStatValue(effects.carryCapacity);
  const rollModifier = toNumericStatValue(effects.activityRollModifier);
  const activityRollByActivity = effects.activityRollModifierByActivity ?? {};
  const activityDelta = formatResourceDeltaLabel(effects.activityDelta);
  const successDelta = formatResourceDeltaLabel(effects.activityDeltaOnSuccess);
  const failureDelta = formatResourceDeltaLabel(effects.activityDeltaOnFailure);
  const consumable = effects.consumable ?? {};

  if (statLabel !== "No stat bonus") {
    parts.push(statLabel);
  }

  if (carryCapacity > 0) {
    parts.push(`Carry +${carryCapacity}`);
  }

  if (rollModifier !== 0) {
    parts.push(`Roll ${formatSignedValue(rollModifier)} (all activities)`);
  }

  for (const [activityId, modifier] of Object.entries(activityRollByActivity)) {
    const numericModifier = toNumericStatValue(modifier);
    if (numericModifier !== 0) {
      parts.push(`${activityId}: roll ${formatSignedValue(numericModifier)}`);
    }
  }

  if (activityDelta) {
    parts.push(`Per activity: ${activityDelta}`);
  }

  if (successDelta) {
    parts.push(`On success: ${successDelta}`);
  }

  if (failureDelta) {
    parts.push(`On failure: ${failureDelta}`);
  }

  if (toNumericStatValue(consumable.hpRestore) > 0) {
    parts.push(`Use: restore ${consumable.hpRestore} HP`);
  }

  if (toNumericStatValue(consumable.energyRestore) > 0) {
    parts.push(`Use: restore ${consumable.energyRestore} Energy`);
  }

  if (toNumericStatValue(consumable.activityRollModifier) !== 0) {
    parts.push(
      `Use: next activity roll ${formatSignedValue(consumable.activityRollModifier)}`,
    );
  }

  if (toNumericStatValue(consumable.heatReduction) > 0) {
    parts.push(`Use: -${consumable.heatReduction} Heat`);
  }

  return parts.length > 0 ? parts.join(" | ") : "No active effect";
}
