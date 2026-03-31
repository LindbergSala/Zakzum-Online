import { z } from "zod";

import {
  ACTIVITY_DEFINITIONS,
} from "@/lib/core-loop-data";
import { ITEM_CATALOG } from "@/lib/items/catalog";

const ACTIVITY_IDS = ACTIVITY_DEFINITIONS.map((activity) => activity.id);
const SHOP_ITEM_IDS = ITEM_CATALOG.map((item) => item.id);

export const activityActionSchema = z.object({
  activityId: z.enum(ACTIVITY_IDS),
}).strict();

function addRequiredFieldIssue(ctx, fieldName, message) {
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path: [fieldName],
    message,
  });
}

function addDisallowedFieldIssue(ctx, fieldName, message) {
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path: [fieldName],
    message,
  });
}

export const shopPurchaseSchema = z.object({
  itemId: z.enum(SHOP_ITEM_IDS).optional(),
  itemRecordId: z.string().cuid().optional(),
  action: z.enum(["buy", "sell"]).optional(),
  quantity: z.number().int().positive().optional(),
}).strict().superRefine((data, ctx) => {
  const action = data.action ?? "buy";

  if (action === "buy") {
    if (!data.itemId) {
      addRequiredFieldIssue(
        ctx,
        "itemId",
        "itemId is required when action is buy.",
      );
    }

    if (data.itemRecordId) {
      addDisallowedFieldIssue(
        ctx,
        "itemRecordId",
        "itemRecordId is not allowed when action is buy.",
      );
    }

    if (data.quantity !== undefined) {
      addDisallowedFieldIssue(
        ctx,
        "quantity",
        "quantity is not allowed when action is buy.",
      );
    }

    return;
  }

  if (!data.itemRecordId && !data.itemId) {
    addRequiredFieldIssue(
      ctx,
      "itemRecordId",
      "itemRecordId or itemId is required when action is sell.",
    );
  }
});

export const inventoryActionSchema = z.object({
  itemId: z.enum(SHOP_ITEM_IDS).optional(),
  itemRecordId: z.string().cuid().optional(),
  targetItemRecordId: z.string().cuid().optional(),
  action: z
    .enum(["equip", "unequip", "split", "combine", "use"])
    .optional(),
  quantity: z.number().int().positive().optional(),
}).strict().superRefine((data, ctx) => {
  const action = data.action ?? "equip";

  if (action === "equip" || action === "unequip") {
    if (!data.itemRecordId && !data.itemId) {
      addRequiredFieldIssue(
        ctx,
        "itemRecordId",
        "itemRecordId or itemId is required when action is equip or unequip.",
      );
    }

    if (data.targetItemRecordId) {
      addDisallowedFieldIssue(
        ctx,
        "targetItemRecordId",
        "targetItemRecordId is only allowed when action is combine.",
      );
    }

    if (data.quantity !== undefined) {
      addDisallowedFieldIssue(
        ctx,
        "quantity",
        "quantity is only allowed when action is split, combine, or use.",
      );
    }

    return;
  }

  if (action === "split" || action === "use") {
    if (!data.itemRecordId) {
      addRequiredFieldIssue(
        ctx,
        "itemRecordId",
        "itemRecordId is required when action is split or use.",
      );
    }

    if (data.itemId) {
      addDisallowedFieldIssue(
        ctx,
        "itemId",
        "itemId is not allowed when action is split or use.",
      );
    }

    if (data.targetItemRecordId) {
      addDisallowedFieldIssue(
        ctx,
        "targetItemRecordId",
        "targetItemRecordId is only allowed when action is combine.",
      );
    }

    return;
  }

  if (action === "combine") {
    if (!data.itemRecordId) {
      addRequiredFieldIssue(
        ctx,
        "itemRecordId",
        "itemRecordId is required when action is combine.",
      );
    }

    if (!data.targetItemRecordId) {
      addRequiredFieldIssue(
        ctx,
        "targetItemRecordId",
        "targetItemRecordId is required when action is combine.",
      );
    }

    if (data.itemId) {
      addDisallowedFieldIssue(
        ctx,
        "itemId",
        "itemId is not allowed when action is combine.",
      );
    }

    if (
      data.itemRecordId &&
      data.targetItemRecordId &&
      data.itemRecordId === data.targetItemRecordId
    ) {
      addDisallowedFieldIssue(
        ctx,
        "targetItemRecordId",
        "Cannot combine a stack into itself.",
      );
    }
  }
});
