export function normalizePositiveQuantity(value, fallback = 1) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.max(1, Math.floor(numericValue));
}

export function resolveOwnedItemByRecordOrItemId(
  ownedItems,
  { itemRecordId, itemId },
) {
  if (itemRecordId) {
    return ownedItems.find((item) => item.id === itemRecordId) ?? null;
  }

  if (!itemId) {
    return null;
  }

  return (
    ownedItems.find((item) => item.itemId === itemId && item.isEquipped) ??
    ownedItems.find((item) => item.itemId === itemId) ??
    null
  );
}

export function buildProjectedOwnedItemsWithIncrement(
  ownedItems,
  itemId,
  increment = 1,
) {
  const projectedOwnedItems = ownedItems.map((item) => ({
    itemId: item.itemId,
    quantity: normalizePositiveQuantity(item.quantity, 1),
  }));
  const resolvedIncrement = normalizePositiveQuantity(increment, 1);
  const existingEntry = projectedOwnedItems.find((item) => item.itemId === itemId);

  if (existingEntry) {
    existingEntry.quantity += resolvedIncrement;
    return projectedOwnedItems;
  }

  projectedOwnedItems.push({
    itemId,
    quantity: resolvedIncrement,
  });

  return projectedOwnedItems;
}
