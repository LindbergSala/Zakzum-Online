import {
  EQUIPMENT_SLOT_ORDER,
  INVENTORY_GRID_COLUMNS,
  INVENTORY_GRID_ROWS,
  getItemDefinition,
  isConsumableStackable,
} from "./item-types";

function isBackpackPlacement(placement) {
  return placement?.zone === "backpack";
}

function isEquipmentPlacement(placement) {
  return placement?.zone === "equipment";
}

function cloneInventoryState(state) {
  return {
    itemsByKey: Object.fromEntries(
      Object.entries(state.itemsByKey).map(([key, value]) => [key, { ...value }]),
    ),
    placements: Object.fromEntries(
      Object.entries(state.placements).map(([key, value]) => [key, { ...value }]),
    ),
  };
}

function isWithinBackpackBounds(item, x, y, columns, rows) {
  if (x < 0 || y < 0) {
    return false;
  }

  return x + item.width <= columns && y + item.height <= rows;
}

function rectanglesOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

export function normalizeInventoryItems(rawItems = []) {
  return rawItems.map((rawItem, index) => {
    const definition = getItemDefinition(rawItem.itemId);
    const fallbackKey = `${rawItem.itemId}-${index}`;

    return {
      key: rawItem.id ?? fallbackKey,
      id: rawItem.id ?? fallbackKey,
      itemId: rawItem.itemId,
      itemName: rawItem.itemName ?? rawItem.name ?? rawItem.itemId,
      slot: rawItem.slot ?? "unknown",
      effectLabel: rawItem.effectLabel ?? "No effect",
      weight: Number(rawItem.weight) || 0,
      width: definition.width,
      height: definition.height,
      kind: definition.kind,
      stackable: definition.stackable,
      maxStack: definition.maxStack,
      quantity: Math.max(1, Number(rawItem.quantity) || 1),
      isEquipped: Boolean(rawItem.isEquipped),
    };
  });
}

export function toItemsByKey(items) {
  return Object.fromEntries(items.map((item) => [item.key, item]));
}

export function canPlaceInBackpack({
  state,
  itemKey,
  targetX,
  targetY,
  columns = INVENTORY_GRID_COLUMNS,
  rows = INVENTORY_GRID_ROWS,
  ignoreItemKey = itemKey,
}) {
  const item = state.itemsByKey[itemKey];

  if (!item) {
    return {
      ok: false,
      reason: "Item not found.",
    };
  }

  if (!isWithinBackpackBounds(item, targetX, targetY, columns, rows)) {
    return {
      ok: false,
      reason: "Out of bounds.",
    };
  }

  const targetRect = {
    x: targetX,
    y: targetY,
    width: item.width,
    height: item.height,
  };

  for (const [otherKey, placement] of Object.entries(state.placements)) {
    if (otherKey === ignoreItemKey || !isBackpackPlacement(placement)) {
      continue;
    }

    const otherItem = state.itemsByKey[otherKey];

    if (!otherItem) {
      continue;
    }

    const otherRect = {
      x: placement.x,
      y: placement.y,
      width: otherItem.width,
      height: otherItem.height,
    };

    if (rectanglesOverlap(targetRect, otherRect)) {
      return {
        ok: false,
        reason: "Collision detected.",
      };
    }
  }

  return { ok: true };
}

export function findFirstBackpackPosition({
  state,
  itemKey,
  columns = INVENTORY_GRID_COLUMNS,
  rows = INVENTORY_GRID_ROWS,
  ignoreItemKey = itemKey,
}) {
  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const check = canPlaceInBackpack({
        state,
        itemKey,
        targetX: x,
        targetY: y,
        columns,
        rows,
        ignoreItemKey,
      });

      if (check.ok) {
        return { x, y };
      }
    }
  }

  return null;
}

export function getBackpackItemKeyAtCell({ state, x, y, excludeItemKey = null }) {
  for (const [itemKey, placement] of Object.entries(state.placements)) {
    if (itemKey === excludeItemKey || !isBackpackPlacement(placement)) {
      continue;
    }

    const item = state.itemsByKey[itemKey];

    if (!item) {
      continue;
    }

    const inXRange = x >= placement.x && x < placement.x + item.width;
    const inYRange = y >= placement.y && y < placement.y + item.height;

    if (inXRange && inYRange) {
      return itemKey;
    }
  }

  return null;
}

export function getItemKeyInEquipmentSlot(state, slot) {
  return (
    Object.entries(state.placements).find(
      ([, placement]) => isEquipmentPlacement(placement) && placement.slot === slot,
    )?.[0] ?? null
  );
}

export function isCompatibleWithEquipmentSlot(item, slot) {
  return item.slot === slot;
}

function canFullyStackItem(sourceItem, targetItem) {
  if (!isConsumableStackable(sourceItem) || !isConsumableStackable(targetItem)) {
    return false;
  }

  if (sourceItem.itemId !== targetItem.itemId) {
    return false;
  }

  const available = targetItem.maxStack - targetItem.quantity;
  return available >= sourceItem.quantity;
}

export function canDropToBackpack({
  state,
  itemKey,
  targetX,
  targetY,
  columns = INVENTORY_GRID_COLUMNS,
  rows = INVENTORY_GRID_ROWS,
}) {
  const stackedTargetKey = getBackpackItemKeyAtCell({
    state,
    x: targetX,
    y: targetY,
    excludeItemKey: itemKey,
  });

  if (!stackedTargetKey) {
    return canPlaceInBackpack({
      state,
      itemKey,
      targetX,
      targetY,
      columns,
      rows,
    });
  }

  const sourceItem = state.itemsByKey[itemKey];
  const targetItem = state.itemsByKey[stackedTargetKey];

  if (canFullyStackItem(sourceItem, targetItem)) {
    return { ok: true };
  }

  return { ok: false, reason: "Cannot stack on this item." };
}

function stackItemIntoTarget(state, sourceKey, targetKey) {
  const nextState = cloneInventoryState(state);
  const sourceItem = nextState.itemsByKey[sourceKey];
  const targetItem = nextState.itemsByKey[targetKey];

  if (!sourceItem || !targetItem || !canFullyStackItem(sourceItem, targetItem)) {
    return null;
  }

  const movedQuantity = sourceItem.quantity;
  targetItem.quantity += sourceItem.quantity;
  delete nextState.itemsByKey[sourceKey];
  delete nextState.placements[sourceKey];

  return { nextState, movedQuantity };
}

export function moveItemToBackpack({
  state,
  itemKey,
  targetX,
  targetY,
  columns = INVENTORY_GRID_COLUMNS,
  rows = INVENTORY_GRID_ROWS,
}) {
  const item = state.itemsByKey[itemKey];
  const currentPlacement = state.placements[itemKey];

  if (!item || !currentPlacement) {
    return { ok: false, reason: "Item not found." };
  }

  const stackedTargetKey = getBackpackItemKeyAtCell({
    state,
    x: targetX,
    y: targetY,
    excludeItemKey: itemKey,
  });

  if (stackedTargetKey) {
    const stackedState = stackItemIntoTarget(state, itemKey, stackedTargetKey);

    if (!stackedState) {
      return { ok: false, reason: "Cannot stack on this item." };
    }

    return {
      ok: true,
      nextState: stackedState.nextState,
      fromZone: currentPlacement.zone,
      toZone: "backpack",
      syncAction: {
        type: "combine",
        itemRecordId: item.id,
        targetItemRecordId: state.itemsByKey[stackedTargetKey]?.id,
        quantity: stackedState.movedQuantity,
      },
    };
  }

  const check = canPlaceInBackpack({
    state,
    itemKey,
    targetX,
    targetY,
    columns,
    rows,
  });

  if (!check.ok) {
    return check;
  }

  const nextState = cloneInventoryState(state);
  nextState.placements[itemKey] = {
    zone: "backpack",
    x: targetX,
    y: targetY,
  };
  nextState.itemsByKey[itemKey].isEquipped = false;

  return {
    ok: true,
    nextState,
    fromZone: currentPlacement.zone,
    toZone: "backpack",
    syncAction: item.isEquipped
      ? {
          type: "unequip",
          itemRecordId: item.id,
        }
      : null,
  };
}

export function moveItemToEquipment({
  state,
  itemKey,
  slot,
  columns = INVENTORY_GRID_COLUMNS,
  rows = INVENTORY_GRID_ROWS,
}) {
  const item = state.itemsByKey[itemKey];
  const currentPlacement = state.placements[itemKey];

  if (!item || !currentPlacement) {
    return { ok: false, reason: "Item not found." };
  }

  if (!EQUIPMENT_SLOT_ORDER.includes(slot)) {
    return { ok: false, reason: "Unknown equipment slot." };
  }

  if (!isCompatibleWithEquipmentSlot(item, slot)) {
    return { ok: false, reason: `This item cannot be equipped in ${slot}.` };
  }

  if (isEquipmentPlacement(currentPlacement) && currentPlacement.slot === slot) {
    return { ok: true, nextState: state, fromZone: "equipment", toZone: "equipment" };
  }

  const nextState = cloneInventoryState(state);
  const occupyingItemKey = getItemKeyInEquipmentSlot(nextState, slot);

  if (occupyingItemKey && occupyingItemKey !== itemKey) {
    const swapState = cloneInventoryState(nextState);
    swapState.placements[itemKey] = {
      zone: "equipment",
      slot,
    };

    const firstFit = findFirstBackpackPosition({
      state: swapState,
      itemKey: occupyingItemKey,
      columns,
      rows,
      ignoreItemKey: occupyingItemKey,
    });

    if (!firstFit) {
      return { ok: false, reason: "No free backpack space for swap." };
    }

    nextState.placements[occupyingItemKey] = {
      zone: "backpack",
      x: firstFit.x,
      y: firstFit.y,
    };
    nextState.itemsByKey[occupyingItemKey].isEquipped = false;
  }

  nextState.placements[itemKey] = {
    zone: "equipment",
    slot,
  };
  nextState.itemsByKey[itemKey].isEquipped = true;

  return {
    ok: true,
    nextState,
    fromZone: currentPlacement.zone,
    toZone: "equipment",
    syncAction: {
      type: "equip",
      itemRecordId: item.id,
    },
  };
}

function buildTempItemKey(itemKey) {
  return `${itemKey}-split-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

export function splitItemStack({
  state,
  itemKey,
  splitQuantity = null,
  columns = INVENTORY_GRID_COLUMNS,
  rows = INVENTORY_GRID_ROWS,
}) {
  const sourceItem = state.itemsByKey[itemKey];
  const sourcePlacement = state.placements[itemKey];

  if (!sourceItem || !sourcePlacement) {
    return { ok: false, reason: "Item not found." };
  }

  if (!isConsumableStackable(sourceItem)) {
    return { ok: false, reason: "Only stackable consumables can be split." };
  }

  if (!isBackpackPlacement(sourcePlacement)) {
    return { ok: false, reason: "Item must be in backpack to split." };
  }

  if (sourceItem.quantity <= 1) {
    return { ok: false, reason: "Stack is too small to split." };
  }

  const resolvedSplitQuantity =
    splitQuantity == null
      ? Math.floor(sourceItem.quantity / 2)
      : Math.max(1, Math.floor(splitQuantity));

  if (resolvedSplitQuantity <= 0 || resolvedSplitQuantity >= sourceItem.quantity) {
    return { ok: false, reason: "Invalid split quantity." };
  }

  const nextState = cloneInventoryState(state);
  const nextSourceItem = nextState.itemsByKey[itemKey];
  nextSourceItem.quantity -= resolvedSplitQuantity;

  const tempKey = buildTempItemKey(itemKey);
  const splitItem = {
    ...nextSourceItem,
    key: tempKey,
    id: tempKey,
    quantity: resolvedSplitQuantity,
    isEquipped: false,
  };
  nextState.itemsByKey[tempKey] = splitItem;

  const firstFit = findFirstBackpackPosition({
    state: nextState,
    itemKey: tempKey,
    columns,
    rows,
    ignoreItemKey: tempKey,
  });

  if (!firstFit) {
    return { ok: false, reason: "No free backpack space for split stack." };
  }

  nextState.placements[tempKey] = {
    zone: "backpack",
    x: firstFit.x,
    y: firstFit.y,
  };

  return {
    ok: true,
    nextState,
    createdItemKey: tempKey,
    syncAction: {
      type: "split",
      itemRecordId: sourceItem.id,
      quantity: resolvedSplitQuantity,
    },
  };
}

export function createInventoryState({
  items,
  storedBackpackPlacements = {},
  columns = INVENTORY_GRID_COLUMNS,
  rows = INVENTORY_GRID_ROWS,
}) {
  const itemsByKey = toItemsByKey(items);
  const state = { itemsByKey, placements: {} };

  const sortedItems = [...items].sort((a, b) => {
    const aArea = a.width * a.height;
    const bArea = b.width * b.height;
    return bArea - aArea;
  });

  for (const item of sortedItems) {
    if (item.isEquipped && EQUIPMENT_SLOT_ORDER.includes(item.slot)) {
      const occupying = getItemKeyInEquipmentSlot(state, item.slot);

      if (!occupying) {
        state.placements[item.key] = {
          zone: "equipment",
          slot: item.slot,
        };
        continue;
      }
    }

    const storedPlacement = storedBackpackPlacements[item.key];

    if (storedPlacement) {
      const check = canPlaceInBackpack({
        state,
        itemKey: item.key,
        targetX: storedPlacement.x,
        targetY: storedPlacement.y,
        columns,
        rows,
      });

      if (check.ok) {
        state.placements[item.key] = {
          zone: "backpack",
          x: storedPlacement.x,
          y: storedPlacement.y,
        };
        state.itemsByKey[item.key].isEquipped = false;
        continue;
      }
    }

    const firstFit = findFirstBackpackPosition({
      state,
      itemKey: item.key,
      columns,
      rows,
    });

    if (firstFit) {
      state.placements[item.key] = {
        zone: "backpack",
        x: firstFit.x,
        y: firstFit.y,
      };
      state.itemsByKey[item.key].isEquipped = false;
    } else {
      state.placements[item.key] = { zone: "unplaced" };
    }
  }

  return state;
}
