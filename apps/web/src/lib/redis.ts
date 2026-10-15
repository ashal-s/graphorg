import Redis from "ioredis";

import { getEnv } from "@/lib/env";

const globalForRedis = globalThis as unknown as { redis?: Redis };

export function getRedis(): Redis {
  if (!globalForRedis.redis) {
    globalForRedis.redis = new Redis(getEnv().REDIS_URL, {
      // Fail a command after one reconnect attempt rather than hanging the
      // request. The offline queue stays on so a command sent while the
      // connection is still opening waits for it instead of being rejected.
      maxRetriesPerRequest: 1,
      connectTimeout: 2_000,
    });
  }
  return globalForRedis.redis;
}
