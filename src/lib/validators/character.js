import { z } from "zod";

import {
  calculateCharacterPointBuyCost,
  CHARACTER_CLASS_VALUES,
  CHARACTER_POINT_BUY_BUDGET,
  CHARACTER_POINT_BUY_MAX_STAT,
  CHARACTER_POINT_BUY_MIN_STAT,
} from "@/lib/character-data";

const statSchema = z.coerce
  .number()
  .int("Stat maste vara ett heltal.")
  .min(
    CHARACTER_POINT_BUY_MIN_STAT,
    `Stat far inte vara mindre an ${CHARACTER_POINT_BUY_MIN_STAT}.`,
  )
  .max(
    CHARACTER_POINT_BUY_MAX_STAT,
    `Stat far inte vara storre an ${CHARACTER_POINT_BUY_MAX_STAT}.`,
  );

export const createCharacterSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Namn maste vara minst 2 tecken.")
    .max(32, "Namn far vara max 32 tecken."),
  characterClass: z.enum(CHARACTER_CLASS_VALUES, {
    error: "Klass maste vara ett giltigt val.",
  }),
  strength: statSchema,
  dexterity: statSchema,
  constitution: statSchema,
  intelligence: statSchema,
  wisdom: statSchema,
  charisma: statSchema,
})
  .superRefine((data, context) => {
    const totalCost = calculateCharacterPointBuyCost(data);

    if (totalCost === null) {
      return;
    }

    if (totalCost > CHARACTER_POINT_BUY_BUDGET) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pointBudget"],
        message: `Poangbudget overskriden: ${totalCost}/${CHARACTER_POINT_BUY_BUDGET}.`,
      });
    }
  });
