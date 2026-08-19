import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Parsed once at server startup (see src/instrumentation.ts). Throws with a
 * readable message if a required variable is missing or malformed, instead
 * of failing later with a raw `undefined` deep in a connection call.
 */
export const env: Env = envSchema.parse(process.env);
