import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const DEFAULT_TRANSACTION_RETRIES = 2;

export function isSerializableConflict(error) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

export async function runSerializableTransaction(operation, options = {}) {
  const retries = Math.max(0, Number(options.retries ?? DEFAULT_TRANSACTION_RETRIES));

  let attempt = 0;
  while (attempt <= retries) {
    try {
      return await prisma.$transaction(
        async (tx) => operation(tx, attempt),
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      );
    } catch (error) {
      if (!isSerializableConflict(error) || attempt >= retries) {
        throw error;
      }

      attempt += 1;
    }
  }

  throw new Error("Serializable transaction could not be completed.");
}

