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

export const shopPurchaseSchema = z.object({
  itemId: z.enum(SHOP_ITEM_IDS).optional(),
  itemRecordId: z.string().cuid().optional(),
  action: z.enum(["buy", "sell"]).optional(),
  quantity: z.number().int().positive().optional(),
}).strict();

export const inventoryActionSchema = z.object({
  itemId: z.enum(SHOP_ITEM_IDS).optional(),
  itemRecordId: z.string().cuid().optional(),
  targetItemRecordId: z.string().cuid().optional(),
  action: z
    .enum(["equip", "unequip", "split", "combine", "use"])
    .optional(),
  quantity: z.number().int().positive().optional(),
}).strict();

export const inventoryEquipSchema = inventoryActionSchema;
