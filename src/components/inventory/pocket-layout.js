import { isConsumableStackable } from "./item-types";

export const INVENTORY_LAYOUT_STORAGE_PREFIX = "zakzum-inventory-layout";
export const INVENTORY_LAYOUT_STORAGE_VERSION = 3;
export const POCKET_SLOT_COUNT = 4;
export const POCKET_SLOT_STACK_CAP = 5;

export function getInventoryLayoutStorageKey(characterId) {
  return `${INVENTORY_LAYOUT_STORAGE_PREFIX}:${characterId}`;
}

function isValidPocketSlotIndex(slotIndex) {
  return Number.isInteger(slotIndex) && slotIndex >= 0 && slotIndex < POCKET_SLOT_COUNT;
}

function normalizeBackpackPlacements(rawBackpack) {
  if (!rawBackpack || typeof rawBackpack !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(rawBackpack)
      .filter(([, placement]) => Number.isFinite(placement?.x) && Number.isFinite(placement?.y))
      .map(([itemKey, placement]) => [
        itemKey,
        {
          x: Math.max(0, Math.floor(placement.x)),
          y: Math.max(0, Math.floor(placement.y)),
        },
      ]),
  );
}

export function normalizePocketPlacements(rawPockets) {
  if (!rawPockets || typeof rawPockets !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(rawPockets)
      .filter(([itemKey, slotIndex]) => {
        return typeof itemKey === "string" && itemKey.length > 0 && isValidPocketSlotIndex(Number(slotIndex));
      })
      .map(([itemKey, slotIndex]) => [itemKey, Number(slotIndex)]),
  );
}

export function loadStoredInventoryLayout(characterId) {
  if (!characterId || typeof window === "undefined") {
    return {
      backpackPlacements: {},
      pocketPlacements: {},
    };
  }

  try {
    const rawValue = window.localStorage.getItem(getInventoryLayoutStorageKey(characterId));

    if (!rawValue) {
      return {
        backpackPlacements: {},
        pocketPlacements: {},
      };
    }

    const parsed = JSON.parse(rawValue);

    if (parsed?.version === 1) {
      return {
        backpackPlacements: normalizeBackpackPlacements(parsed.backpack),
        pocketPlacements: {},
      };
    }

    if (parsed?.version === 2) {
      return {
        backpackPlacements: normalizeBackpackPlacements(parsed.backpack),
        pocketPlacements: {},
      };
    }

    if (parsed?.version !== INVENTORY_LAYOUT_STORAGE_VERSION) {
      return {
        backpackPlacements: {},
        pocketPlacements: {},
      };
    }

    return {
      backpackPlacements: normalizeBackpackPlacements(parsed.backpack),
      pocketPlacements: normalizePocketPlacements(parsed.pockets),
    };
  } catch {
    return {
      backpackPlacements: {},
      pocketPlacements: {},
    };
  }
}

export function saveStoredInventoryLayout(characterId, { placements }) {
  if (!characterId || typeof window === "undefined") {
    return;
  }

  const backpackPlacements = Object.fromEntries(
    Object.entries(placements ?? {})
      .filter(([, placement]) => placement?.zone === "backpack")
      .map(([itemKey, placement]) => [
        itemKey,
        { x: placement.x, y: placement.y },
      ]),
  );

  const pocketPlacements = Object.fromEntries(
    Object.entries(placements ?? {})
      .filter(([, placement]) => placement?.zone === "pocket")
      .map(([itemKey, placement]) => [itemKey, placement.slotIndex]),
  );

  const payload = {
    version: INVENTORY_LAYOUT_STORAGE_VERSION,
    backpack: backpackPlacements,
    pockets: normalizePocketPlacements(pocketPlacements),
  };

  window.localStorage.setItem(
    getInventoryLayoutStorageKey(characterId),
    JSON.stringify(payload),
  );
}

export function isPocketConsumableItem(item) {
  return isConsumableStackable(item) && (Number(item?.quantity) || 0) <= POCKET_SLOT_STACK_CAP;
}

export function resolvePocketSlots({ pocketPlacements = {}, items = [] }) {
  const itemsByKey = Object.fromEntries(items.map((item) => [item.key ?? item.id, item]));
  return Array.from({ length: POCKET_SLOT_COUNT }, (_, slotIndex) => {
    const itemKey = Object.entries(pocketPlacements).find(
      ([, candidateSlotIndex]) => Number(candidateSlotIndex) === slotIndex,
    )?.[0] ?? "";
    const resolvedItem = itemKey ? itemsByKey[itemKey] ?? null : null;

    return {
      slotIndex,
      itemKey,
      item: resolvedItem
        ? {
            ...resolvedItem,
            displayQuantity: Number(resolvedItem.quantity) || 0,
          }
        : null,
    };
  });
}

export function isValidPocketSlot(slotIndex) {
  return isValidPocketSlotIndex(slotIndex);
}