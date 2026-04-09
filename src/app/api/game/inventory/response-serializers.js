import { getCharacterResourceSnapshot } from "@/lib/resource-rules";
import { getCharacterEffectiveStats } from "@/lib/stat-effects";

import { enrichInventoryItems } from "./route-helpers";

export function serializeInventoryIndexPayload({ activeCharacter, items }) {
  if (!activeCharacter) {
    return { items: [], resources: null, stats: null };
  }

  const enrichedItems = enrichInventoryItems(items);
  const equippedItems = enrichedItems.filter((item) => item.isEquipped);
  const statSummary = getCharacterEffectiveStats(activeCharacter, equippedItems);

  return {
    items: enrichedItems,
    resources: getCharacterResourceSnapshot(activeCharacter),
    stats: statSummary,
    nextActivityRollBonus: Number(activeCharacter.nextActivityRollBonus) || 0,
  };
}

export function serializeInventoryActionPayload({ result }) {
  const enrichedItems = enrichInventoryItems(result.allItems);
  const equippedItems = enrichedItems.filter((item) => item.isEquipped);
  const statSummary = getCharacterEffectiveStats(result.updatedCharacter, equippedItems);

  return {
    message: result.message,
    items: enrichedItems,
    resources: getCharacterResourceSnapshot(result.updatedCharacter),
    stats: statSummary,
    nextActivityRollBonus: Number(result.updatedCharacter.nextActivityRollBonus) || 0,
  };
}