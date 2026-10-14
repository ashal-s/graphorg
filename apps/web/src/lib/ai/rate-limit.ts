import { getRedis } from "@/lib/redis";

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export async function checkRateLimit(opts: {
  key: string;
  limit: number;
  windowSeconds: number;
}): Promise<RateLimitResult> {
  const redis = getRedis();
  // Create the counter with its expiry in one step, only if it's new...
  await redis.set(opts.key, 0, "EX", opts.windowSeconds, "NX");
  // ...then count this request.
  const count = await redis.incr(opts.key);
  if (count <= opts.limit) return { allowed: true, retryAfterSeconds: 0 };

  const ttl = await redis.ttl(opts.key);
  return { allowed: false, retryAfterSeconds: Math.max(ttl, 1) };
}
