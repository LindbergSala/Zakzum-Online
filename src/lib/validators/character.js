import { z } from "zod";

import {
  CHARACTER_CLASS_VALUES,
  CHARACTER_RACE_VALUES,
  CHARACTER_STAT_FIELDS,
} from "@/lib/character-data";

const CHARACTER_STAT_KEYS = CHARACTER_STAT_FIELDS.map((field) => field.key);

export const createCharacterSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(32, "Name can be at most 32 characters."),
  characterClass: z.enum(CHARACTER_CLASS_VALUES, {
    error: "Class must be a valid option.",
  }),
  characterRace: z.enum(CHARACTER_RACE_VALUES, {
    error: "Race must be a valid option.",
  }),
}).strict();

export const allocateStatPointSchema = z.object({
  statKey: z.enum(CHARACTER_STAT_KEYS, {
    error: "Stat key must be a valid option.",
  }),
}).strict();
