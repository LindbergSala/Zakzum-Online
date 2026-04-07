import { postJson } from "@/lib/client-json";

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

async function postJsonAction(url, payload, fallbackMessage) {
  const { ok, data } = await postJson(url, payload);

  if (!ok) {
    throw new Error(data.message ?? fallbackMessage);
  }

  return data;
}

export async function syncInventoryAction(payload) {
  return postJsonAction("/api/game/inventory", payload, "Inventory sync failed.");
}

export async function syncMarketSellAction(payload) {
  return postJsonAction("/api/game/shop", payload, "Market sell failed.");
}
