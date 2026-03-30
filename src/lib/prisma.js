import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { validateServerEnv } from "@/lib/env";

const globalForPrisma = globalThis;
const isDevelopment = process.env.NODE_ENV === "development";
const shouldLogPrismaQueries =
  process.env.PRISMA_LOG_QUERIES === "1" ||
  process.env.PRISMA_LOG_QUERIES === "true";

validateServerEnv();
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: isDevelopment && shouldLogPrismaQueries ? ["query", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
