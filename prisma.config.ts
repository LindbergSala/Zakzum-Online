import "dotenv/config";
import { defineConfig } from "prisma/config";

const FALLBACK_DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/zakzum?schema=public";
const DATABASE_URL = process.env.DATABASE_URL || FALLBACK_DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: DATABASE_URL,
  },
});
