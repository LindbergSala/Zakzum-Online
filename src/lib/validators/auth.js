import { z } from "zod";

export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Ange en giltig e-postadress.")
    .transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(8, "Losenordet maste vara minst 8 tecken.")
    .max(72, "Losenordet far vara max 72 tecken."),
});

export const loginSchema = registerSchema;
