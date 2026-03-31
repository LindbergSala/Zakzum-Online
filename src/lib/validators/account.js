import { z } from "zod";

const PASSWORD_SCHEMA = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password can be at most 72 characters.");

const EMAIL_SCHEMA = z
  .string()
  .trim()
  .email("Enter a valid email address.")
  .transform((value) => value.toLowerCase());

const updateEmailPayloadSchema = z.object({
  action: z.literal("update_email"),
  currentPassword: PASSWORD_SCHEMA,
  nextEmail: EMAIL_SCHEMA,
}).strict();

const updatePasswordPayloadSchema = z.object({
  action: z.literal("update_password"),
  currentPassword: PASSWORD_SCHEMA,
  nextPassword: PASSWORD_SCHEMA,
}).strict();

export const updateAccountSchema = z.discriminatedUnion("action", [
  updateEmailPayloadSchema,
  updatePasswordPayloadSchema,
]);

export const deleteAccountSchema = z.object({
  password: PASSWORD_SCHEMA,
}).strict();
