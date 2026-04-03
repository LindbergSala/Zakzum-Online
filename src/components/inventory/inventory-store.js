"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createInventoryState,
  moveItemToBackpack,
  moveItemToEquipment,
  normalizeInventoryItems,
  splitItemStack,
} from "./inventory-logic";
import {
  EQUIPMENT_SLOT_ORDER,
  INVENTORY_GRID_COLUMNS,
  INVENTORY_GRID_ROWS,
} from "./item-types";

const STORAGE_PREFIX = "zakzum-inventory-layout";
const STORAGE_VERSION = 1;

function getStorageKey(characterId) {
  return `${STORAGE_PREFIX}:${characterId}`;
}

function loadStoredBackpackPlacements(characterId) {
  if (!characterId || typeof window === "undefined") {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem(getStorageKey(characterId));

    if (!rawValue) {
      return {};
    }

    const parsed = JSON.parse(rawValue);

    if (parsed?.version !== STORAGE_VERSION) {
      return {};
    }

    if (!parsed.backpack || typeof parsed.backpack !== "object") {
      return {};
    }

    return parsed.backpack;
  } catch {
    return {};
  }
}

function saveStoredBackpackPlacements(characterId, placements) {
  if (!characterId || typeof window === "undefined") {
    return;
  }

  const backpackPlacements = Object.fromEntries(
    Object.entries(placements)
      .filter(([, placement]) => placement?.zone === "backpack")
      .map(([itemKey, placement]) => [
        itemKey,
        { x: placement.x, y: placement.y },
      ]),
  );

  const payload = {
    version: STORAGE_VERSION,
    backpack: backpackPlacements,
  };

  window.localStorage.setItem(getStorageKey(characterId), JSON.stringify(payload));
}

function getItemsByZone(state) {
  const backpackItems = [];
  const equipmentBySlot = Object.fromEntries(
    EQUIPMENT_SLOT_ORDER.map((slot) => [slot, null]),
  );
  const unplacedItems = [];

  for (const [itemKey, placement] of Object.entries(state.placements)) {
    const item = state.itemsByKey[itemKey];

    if (!item) {
      continue;
    }

    if (placement.zone === "backpack") {
      backpackItems.push({
        ...item,
        placement,
      });
      continue;
    }

    if (placement.zone === "equipment") {
      equipmentBySlot[placement.slot] = {
        ...item,
        placement,
      };
      continue;
    }

    unplacedItems.push(item);
  }

  return {
    backpackItems,
    equipmentBySlot,
    unplacedItems,
  };
}

export function useInventoryStore({ characterId, items }) {
  const normalizedItems = useMemo(() => normalizeInventoryItems(items), [items]);
  const [state, setState] = useState(() =>
    createInventoryState({
      items: normalizedItems,
      storedBackpackPlacements: loadStoredBackpackPlacements(characterId),
      columns: INVENTORY_GRID_COLUMNS,
      rows: INVENTORY_GRID_ROWS,
    }),
  );

  useEffect(() => {
    saveStoredBackpackPlacements(characterId, state.placements);
  }, [characterId, state.placements]);

  const moveBackpack = useCallback(
    ({ itemKey, targetX, targetY }) => {
      const result = moveItemToBackpack({
        state,
        itemKey,
        targetX,
        targetY,
        columns: INVENTORY_GRID_COLUMNS,
        rows: INVENTORY_GRID_ROWS,
      });

      if (result.ok && result.nextState) {
        setState(result.nextState);
      }

      return result;
    },
    [state],
  );

  const moveEquipment = useCallback(
    ({ itemKey, slot }) => {
      const result = moveItemToEquipment({
        state,
        itemKey,
        slot,
        columns: INVENTORY_GRID_COLUMNS,
        rows: INVENTORY_GRID_ROWS,
      });

      if (result.ok && result.nextState) {
        setState(result.nextState);
      }

      return result;
    },
    [state],
  );

  const splitStack = useCallback(
    ({ itemKey, splitQuantity }) => {
      const result = splitItemStack({
        state,
        itemKey,
        splitQuantity,
        columns: INVENTORY_GRID_COLUMNS,
        rows: INVENTORY_GRID_ROWS,
      });

      if (result.ok && result.nextState) {
        setState(result.nextState);
      }

      return result;
    },
    [state],
  );

  const zoneItems = useMemo(() => getItemsByZone(state), [state]);

  return {
    state,
    columns: INVENTORY_GRID_COLUMNS,
    rows: INVENTORY_GRID_ROWS,
    equipmentSlots: EQUIPMENT_SLOT_ORDER,
    backpackItems: zoneItems.backpackItems,
    equipmentBySlot: zoneItems.equipmentBySlot,
    unplacedItems: zoneItems.unplacedItems,
    actions: {
      moveBackpack,
      moveEquipment,
      splitStack,
    },
  };
}
