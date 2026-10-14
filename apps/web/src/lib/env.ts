import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  AI_WORKER_URL: z.string().url().default("http://localhost:8001"),
  AI_WORKER_SECRET: z.string().min(1).optional(),
  AI_RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(20),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

/**
 * Validates process.env on first call, then caches the result. Lazy on
 * purpose: importing this module (directly, or via anything that imports
 * it, like the db client) must never trigger validation as a side effect,
 * only calling getEnv() does. src/instrumentation.ts calls it once at
 * server startup so a missing/malformed variable fails fast with a
 * readable message, instead of failing later with a raw `undefined` deep
 * in a connection call.
 */
export function getEnv(): Env {
  if (!_env) {
    _env = envSchema.parse(process.env);
  }
  return _env;
}
