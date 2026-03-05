import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
    // Optional: only add this if you have a real separate shadow DB URL
    // shadowDatabaseUrl: env("SHADOW_DATABASE_URL"),
  },
});