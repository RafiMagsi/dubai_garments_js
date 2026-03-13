import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma CLI reads `.env` by default; we keep credentials in `.env.test`.
loadEnv({ path: ".env.test" });
loadEnv();

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/dubai_garments",
  },
  migrations: {
    seed: "./scripts/db-seed.sh",
  },
});
