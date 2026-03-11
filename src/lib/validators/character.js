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
  .int("Stat must be an integer.")
  .min(
    CHARACTER_POINT_BUY_MIN_STAT,
    `Stat cannot be lower than ${CHARACTER_POINT_BUY_MIN_STAT}.`,
  )
  .max(
    CHARACTER_POINT_BUY_MAX_STAT,
    `Stat cannot be higher than ${CHARACTER_POINT_BUY_MAX_STAT}.`,
  );

export const createCharacterSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(32, "Name can be at most 32 characters."),
  characterClass: z.enum(CHARACTER_CLASS_VALUES, {
    error: "Class must be a valid option.",
  }),
  strength: statSchema,
  dexterity: statSchema,
  constitution: statSchema,
  intelligence: statSchema,
  wisdom: statSchema,
  charisma: statSchema,
}).strict()
  .superRefine((data, context) => {
    const totalCost = calculateCharacterPointBuyCost(data);

    if (totalCost === null) {
      return;
    }

    if (totalCost > CHARACTER_POINT_BUY_BUDGET) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pointBudget"],
        message: `Point budget exceeded: ${totalCost}/${CHARACTER_POINT_BUY_BUDGET}.`,
      });
    }
  });
