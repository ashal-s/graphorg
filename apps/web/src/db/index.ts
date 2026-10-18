import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { getEnv } from "@/lib/env";

import * as schema from "./schema";

function createDb() {
  // Neon pooled URL in production (host contains `-pooler`). Fluid shares
  // this module across concurrent invocations, so keep max > 1 to allow
  // Promise.all fan-out and avoid head-of-line blocking. PgBouncer still
  // multiplexes; attachDatabasePool closes idle clients before suspend.
  const pool = new Pool({
    connectionString: getEnv().DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 20_000,
  });
  attachDatabasePool(pool);
  return drizzle({ client: pool, schema, casing: "snake_case" });
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
