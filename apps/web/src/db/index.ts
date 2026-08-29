import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getEnv } from "@/lib/env";

import * as schema from "./schema";

function createDb() {
  const client = postgres(getEnv().DATABASE_URL);
  return drizzle(client, { schema, casing: "snake_case" });
}

export type Database = ReturnType<typeof createDb>;

let _db: Database | null = null;

/**
 * Lazily creates the query client on first use, rather than at module
 * top-level. A plain nullable module-level variable, not a Proxy: some
 * libraries (Auth.js/NextAuth adapters in particular) inspect the db object
 * itself, and a Proxy wrapper can break those checks silently.
 */
export function getDb(): Database {
  if (!_db) {
    _db = createDb();
  }
  return _db;
}
