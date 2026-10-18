import { defineConfig } from "drizzle-kit";

// Prefer the direct (unpooled) URL for migrations. Neon PgBouncer in
// transaction mode is fine for app queries, not for drizzle-kit DDL.
const databaseUrl =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Run drizzle-kit via `npm run db:<command>`, which sources apps/web/.env.local first. For Neon, set DATABASE_URL_UNPOOLED to the direct connection string.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  casing: "snake_case",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: databaseUrl,
  },
});
