import { z } from "zod";

import {
  CHARACTER_BACKGROUND_LORE_MAX_LENGTH,
  CHARACTER_BACKGROUND_VALUES,
  CHARACTER_CLASS_VALUES,
  CHARACTER_RACE_VALUES,
  CHARACTER_STAT_FIELDS,
} from "@/lib/character-data";

const CHARACTER_STAT_KEYS = CHARACTER_STAT_FIELDS.map((field) => field.key);
const CHARACTER_NAME_PATTERN = /^[\p{L}\p{N}]+(?:[ '-][\p{L}\p{N}]+)*$/u;

function normalizeCharacterName(value) {
  return value.replace(/\s+/g, " ");
}

export const createCharacterSchema = z.object({
  name: z
    .string()
    .trim()
    .transform(normalizeCharacterName)
    .pipe(
      z
        .string()
        .min(2, "Name must be at least 2 characters.")
        .max(32, "Name can be at most 32 characters.")
        .refine(
          (value) => CHARACTER_NAME_PATTERN.test(value),
          "Name can only contain letters, numbers, spaces, apostrophes, and hyphens.",
        ),
    ),
  characterClass: z.enum(CHARACTER_CLASS_VALUES, {
    error: "Class must be a valid option.",
  }),
  characterRace: z.enum(CHARACTER_RACE_VALUES, {
    error: "Race must be a valid option.",
  }),
  characterBackground: z.enum(CHARACTER_BACKGROUND_VALUES, {
    error: "Background must be a valid option.",
  }),
  backgroundLore: z
    .string()
    .trim()
    .min(1, "Background lore is required.")
    .max(
      CHARACTER_BACKGROUND_LORE_MAX_LENGTH,
      `Background lore can be at most ${CHARACTER_BACKGROUND_LORE_MAX_LENGTH} characters.`,
    ),
  avatarImage: z
    .string()
    .trim()
    .min(1, "Avatar image is required.")
    .max(255, "Avatar image path is too long.")
    .optional(),
}).strict();

export const allocateStatPointSchema = z.object({
  statKey: z.enum(CHARACTER_STAT_KEYS, {
    error: "Stat key must be a valid option.",
  }),
}).strict();

export const deleteCharacterSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(72, "Password can be at most 72 characters."),
}).strict();
