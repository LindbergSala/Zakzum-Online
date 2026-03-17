import { z } from "zod";

import {
  ACTIVITY_DEFINITIONS,
  SHOP_ITEM_DEFINITIONS,
} from "@/lib/core-loop-data";

const ACTIVITY_IDS = ACTIVITY_DEFINITIONS.map((activity) => activity.id);
const SHOP_ITEM_IDS = SHOP_ITEM_DEFINITIONS.map((item) => item.id);

export const activityActionSchema = z.object({
  activityId: z.enum(ACTIVITY_IDS),
}).strict();

export const shopPurchaseSchema = z.object({
  itemId: z.enum(SHOP_ITEM_IDS),
}).strict();

export const inventoryEquipSchema = z.object({
  itemId: z.enum(SHOP_ITEM_IDS),
  action: z.enum(["equip", "unequip"]).optional(),
}).strict();
