import { ITEM_CATALOG } from "@/lib/items/catalog";
import { getCharacterResourceSnapshot } from "@/lib/resource-rules";

import { buildMarketItemResponse, summarizeOwnedByItemId } from "./route-helpers";

export function serializeShopIndexPayload({ activeCharacter, ownedItems }) {
  const ownedById = summarizeOwnedByItemId(ownedItems ?? []);

  return {
    items: ITEM_CATALOG.map((item) =>
      buildMarketItemResponse(item, ownedById, activeCharacter),
    ),
    resources: activeCharacter ? getCharacterResourceSnapshot(activeCharacter) : null,
  };
}

export function buildShopTransactionMessage(result) {
  const actionPastTense = result.action === "sell" ? "sold" : "purchased";
  const soldWhileEquippedSuffix =
    result.action === "sell" && result.soldWhileEquipped
      ? " Item was unequipped automatically."
      : "";

  return result.quantity > 1
    ? `${result.itemDefinition.name} x${result.quantity} ${actionPastTense}.${soldWhileEquippedSuffix}`
    : `${result.itemDefinition.name} ${actionPastTense}.${soldWhileEquippedSuffix}`;
}

export function serializeShopTransactionPayload({ result }) {
  return {
    message: buildShopTransactionMessage(result),
    action: result.action,
    item: {
      id: result.itemDefinition.id,
      itemName: result.itemDefinition.name,
      quantityAfter: result.quantityAfter,
      itemRecordId: result.itemRecord?.id,
    },
    logId: result.logEntry?.id,
    resources: {
      before: result.calculation.before,
      after: getCharacterResourceSnapshot(result.updatedCharacter),
      delta: result.calculation.delta,
    },
  };
}