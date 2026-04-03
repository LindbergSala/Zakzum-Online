"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  createInventoryState,
  findFirstBackpackPosition,
  getItemKeyInPocketSlot,
  moveItemToBackpack,
  moveItemToEquipment,
  moveItemToPocket,
  normalizeInventoryItems,
  splitItemStack,
} from "./inventory-logic";
import {
  loadStoredInventoryLayout,
  resolvePocketSlots,
  saveStoredInventoryLayout,
} from "./pocket-layout";
import {
  EQUIPMENT_SLOT_ORDER,
  INVENTORY_GRID_COLUMNS,
  INVENTORY_GRID_ROWS,
} from "./item-types";

function getItemsByZone(state) {
  const backpackItems = [];
  const equipmentBySlot = Object.fromEntries(
    EQUIPMENT_SLOT_ORDER.map((slot) => [slot, null]),
  );
  const pocketSlots = resolvePocketSlots({
    pocketPlacements: Object.fromEntries(
      Object.entries(state.placements)
        .filter(([, placement]) => placement?.zone === "pocket")
        .map(([itemKey, placement]) => [itemKey, placement.slotIndex]),
    ),
    items: Object.values(state.itemsByKey),
  });
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

    if (placement.zone === "pocket") {
      continue;
    }

    unplacedItems.push(item);
  }

  return {
    backpackItems,
    equipmentBySlot,
    pocketSlots,
    unplacedItems,
  };
}

export function useInventoryStore({ characterId, items }) {
  const normalizedItems = useMemo(() => normalizeInventoryItems(items), [items]);
  const [state, setState] = useState(() => {
    const storedLayout = loadStoredInventoryLayout(characterId);

    return createInventoryState({
      items: normalizedItems,
      storedBackpackPlacements: storedLayout.backpackPlacements,
      storedPocketPlacements: storedLayout.pocketPlacements,
      columns: INVENTORY_GRID_COLUMNS,
      rows: INVENTORY_GRID_ROWS,
    });
  });

  useEffect(() => {
    saveStoredInventoryLayout(characterId, {
      placements: state.placements,
    });
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

  const assignPocket = useCallback(
    ({ itemKey, slotIndex }) => {
      const result = moveItemToPocket({
        state,
        itemKey,
        slotIndex,
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

  const clearPocket = useCallback((slotIndex) => {
    const itemKey = getItemKeyInPocketSlot(state, slotIndex);

    if (!itemKey) {
      return { ok: false, reason: "Pocket slot is already empty." };
    }

    const firstFit = findFirstBackpackPosition({
      state,
      itemKey,
      columns: INVENTORY_GRID_COLUMNS,
      rows: INVENTORY_GRID_ROWS,
    });

    if (!firstFit) {
      return { ok: false, reason: "No free backpack space for this item." };
    }

    const result = moveItemToBackpack({
      state,
      itemKey,
      targetX: firstFit.x,
      targetY: firstFit.y,
      columns: INVENTORY_GRID_COLUMNS,
      rows: INVENTORY_GRID_ROWS,
    });

    if (result.ok && result.nextState) {
      setState(result.nextState);
    }

    return result;
  }, [state]);

  const zoneItems = useMemo(() => getItemsByZone(state), [state]);

  return {
    state,
    columns: INVENTORY_GRID_COLUMNS,
    rows: INVENTORY_GRID_ROWS,
    equipmentSlots: EQUIPMENT_SLOT_ORDER,
    backpackItems: zoneItems.backpackItems,
    equipmentBySlot: zoneItems.equipmentBySlot,
    pocketSlots: zoneItems.pocketSlots,
    unplacedItems: zoneItems.unplacedItems,
    actions: {
      assignPocket,
      clearPocket,
      moveBackpack,
      moveEquipment,
      splitStack,
    },
  };
}
