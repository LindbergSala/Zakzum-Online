export function formatSlotLabel(slot) {
  if (!slot) {
    return "Unknown";
  }

  return slot.charAt(0).toUpperCase() + slot.slice(1);
}

export function clamp(value, min, max) {
  if (value < min) {
    return min;
  }

  if (value > max) {
    return max;
  }

  return value;
}

export function toInventorySyncPayload(syncAction) {
  if (!syncAction) {
    return null;
  }

  if (typeof syncAction === "string") {
    return {
      action: syncAction,
    };
  }

  if (typeof syncAction !== "object") {
    return null;
  }

  const payload = {
    action: syncAction.type,
  };

  if (syncAction.itemRecordId) {
    payload.itemRecordId = syncAction.itemRecordId;
  }

  if (syncAction.targetItemRecordId) {
    payload.targetItemRecordId = syncAction.targetItemRecordId;
  }

  if (Number.isFinite(syncAction.quantity) && syncAction.quantity > 0) {
    payload.quantity = Math.floor(syncAction.quantity);
  }

  return payload;
}

export async function syncInventoryAction(payload) {
  const response = await fetch("/api/game/inventory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message ?? "Inventory sync failed.");
  }

  return data;
}

export async function syncMarketSellAction(payload) {
  const response = await fetch("/api/game/shop", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message ?? "Market sell failed.");
  }

  return data;
}
